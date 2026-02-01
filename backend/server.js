const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ffmpeg = require('fluent-ffmpeg');
const { PassThrough } = require('stream');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const BROWSER_WS = process.env.BROWSER_WS || 'ws://browserless:3000/chrome';
const TOKEN = process.env.TOKEN || 'SECRET_TOKEN';
const EVIDENCE_DIR = path.join(__dirname, 'evidence');

// Ensure evidence root exists
if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

// Integrity Helper: Save file -> calc hash -> update manifest
async function logArtifact(sessionId, filename, buffer, description) {
    const sessionDir = path.join(EVIDENCE_DIR, sessionId);
    const filePath = path.join(sessionDir, filename);
    const manifestPath = path.join(sessionDir, 'manifest.json');

    // Write file
    fs.writeFileSync(filePath, buffer);

    // Calculate Hash
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const timestamp = new Date().toISOString();

    // Update Manifest
    const entry = {
        filename,
        description,
        timestamp,
        hash,
        size: buffer.length
    };

    let manifest = [];
    if (fs.existsSync(manifestPath)) {
        manifest = JSON.parse(fs.readFileSync(manifestPath));
    }
    manifest.push(entry);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    return entry;
}

io.on('connection', async (socket) => {
    const sessionId = `session_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const sessionDir = path.join(EVIDENCE_DIR, sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });

    console.log(`[${sessionId}] Client connected: ${socket.id}`);

    // --- 1. Passive Logging Setup ---
    const eventsPath = path.join(sessionDir, 'events.jsonl');
    const eventsStream = fs.createWriteStream(eventsPath, { flags: 'a' });
    
    const logEvent = (type, data) => {
        const event = {
            timestamp: new Date().toISOString(),
            type,
            data
        };
        eventsStream.write(JSON.stringify(event) + '\n');
    };
    
    // Log init
    logEvent('connection', { socketId: socket.id, query: socket.handshake.query });

    // --- 2. Video Recording Setup (FFmpeg Pipe) ---
    const videoStreamInput = new PassThrough();
    const videoPath = path.join(sessionDir, 'session.mp4');
    
    const ffmpegCommand = ffmpeg(videoStreamInput)
        .inputFormat('image2pipe')
        .inputFPS(24) // Approx stream rate
        .outputOptions([
            '-c:v libx264',
            '-pix_fmt yuv420p',
            '-preset ultrafast', // Low CPU usage
            '-movflags +faststart'
        ])
        .save(videoPath)
        .on('start', (cmd) => console.log(`[${sessionId}] Recording started: ${cmd}`))
        .on('error', (err) => console.error(`[${sessionId}] Recording error:`, err))
        .on('end', () => console.log(`[${sessionId}] Recording finished`));

    let browser, context, page, client;

    try {
        const browserType = socket.handshake.query.browser || 'chrome';
        const baseUrl = BROWSER_WS.replace('/chrome', '').replace(/\/$/, '');
        let connectionUrl = `${baseUrl}/${browserType}?token=${TOKEN}`;
        
        if (browserType === 'chrome') {
            connectionUrl += '&stealth=true';
        }

        console.log(`[${sessionId}] Connecting to browserless...`);
        browser = await chromium.connectOverCDP(connectionUrl);

        // --- 3. Network Logging (HAR) ---
        const harPath = path.join(sessionDir, 'network.har');
        
        context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            recordHar: { path: harPath }
        });

        page = await context.newPage();

        const startUrl = socket.handshake.query.url || "https://www.google.com";
        logEvent('navigation', { url: startUrl });
        await page.goto(startUrl);

        client = await context.newCDPSession(page);
        
        await client.send('Page.startScreencast', {
            format: 'jpeg',
            quality: 80,
            maxWidth: 1920,
            maxHeight: 1080
        });

        client.on('Page.screencastFrame', async (frame) => {
            const { data, sessionId: frameSessionId } = frame;
            await client.send('Page.screencastFrameAck', { sessionId: frameSessionId });
            
            // 1. Send to Frontend
            socket.emit('render_frame', data);

            // 2. Pipe to Recording
            const buffer = Buffer.from(data, 'base64');
            videoStreamInput.write(buffer);
        });

        // --- 4. Interactive Events (Intercept & Log) ---
        
        const attachHandler = (event, handler) => {
            socket.on(event, (data) => {
                logEvent('input', { event, data });
                handler(data);
            });
        };

        attachHandler('mousemove', async ({ x, y }) => {
            try {
                await page.mouse.move(x * 1920, y * 1080);
            } catch (e) {}
        });

        attachHandler('mousedown', async () => {
            try { await page.mouse.down(); } catch (e) {}
        });

        attachHandler('mouseup', async () => {
            try { await page.mouse.up(); } catch (e) {}
        });

        attachHandler('wheel', async ({ deltaX, deltaY }) => {
            try { await page.mouse.wheel(deltaX, deltaY); } catch (e) {}
        });

        attachHandler('keydown', async ({ key }) => {
            try { await page.keyboard.press(key); } catch (e) {}
        });

        attachHandler('navigate', async ({ action }) => {
            try {
                if (action === 'back') await page.goBack();
                else if (action === 'forward') await page.goForward();
                else if (action === 'reload') await page.reload();
            } catch (e) {}
        });

        // --- 5. Active Evidence Handlers ---

        socket.on('evidence:screenshot', async () => {
            logEvent('evidence_captured', { type: 'screenshot' });
            try {
                const buffer = await page.screenshot({ fullPage: false });
                const filename = `screenshot_${Date.now()}.png`;
                const entry = await logArtifact(sessionId, filename, buffer, 'Manual Screenshot');
                socket.emit('evidence_ack', { type: 'screenshot', entry });
            } catch (err) {
                console.error(`[${sessionId}] Screenshot failed:`, err);
            }
        });

        socket.on('evidence:html', async () => {
            logEvent('evidence_captured', { type: 'html' });
            try {
                const html = await page.content();
                const buffer = Buffer.from(html);
                const filename = `source_${Date.now()}.html`;
                const entry = await logArtifact(sessionId, filename, buffer, 'Page Source');
                socket.emit('evidence_ack', { type: 'html', entry });
            } catch (err) {
                console.error(`[${sessionId}] HTML capture failed:`, err);
            }
        });

        socket.on('disconnect', async () => {
            console.log(`[${sessionId}] Disconnected. Cleaning up...`);
            logEvent('disconnect', { socketId: socket.id });
            
            // Close streams
            eventsStream.end();
            videoStreamInput.end();
            
            // Close browser
            if (context) await context.close().catch(() => {});
            if (browser) await browser.close().catch(() => {});
            
            console.log(`[${sessionId}] Session finalized.`);
        });

    } catch (error) {
        console.error('Session Error:', error);
        logEvent('error', { message: error.message });
        socket.disconnect();
    }
});

server.listen(4000, () => console.log('Backend running on port 4000'));
