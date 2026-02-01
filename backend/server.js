const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { chromium } = require("playwright-core");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = 4000;
const BROWSER_WS = process.env.BROWSER_WS || 'ws://browserless:3000/chrome';
const TOKEN = process.env.TOKEN || "SECRET_TOKEN";

io.on("connection", async (socket) => {
  console.log("Client connected:", socket.id);

  let browser;
  let context;
  let page;
  let client;

  try {
    console.log(`Connecting to browserless at ${BROWSER_WS}`);
    browser = await chromium.connectOverCDP(`${BROWSER_WS}?token=${TOKEN}&stealth`);
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      locale: 'en-IN',
      timezoneId: 'Asia/Kolkata',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    page = await context.newPage();

    // Navigate to the requested URL or default to Google
    const startUrl = socket.handshake.query.url || "https://www.google.com";
    console.log(`Navigating to: ${startUrl}`);
    await page.goto(startUrl);

    client = await context.newCDPSession(page);

    // Start Casting
    await client.send("Page.startScreencast", {
      format: "jpeg",
      quality: 75,
      everyNthFrame: 2,
    });

    client.on("Page.screencastFrame", async (params) => {
      const { data, sessionId, metadata } = params;
      socket.emit("render_frame", data); // Base64 encoded frame

      try {
        await client.send("Page.screencastFrameAck", { sessionId });
      } catch (e) {
        console.error("Error acking frame:", e);
      }
    });

    // Input Handling
    socket.on("mousemove", async ({ x, y }) => {
      if (!page) return;
      try {
        const viewport = page.viewportSize();
        if (viewport) {
          await page.mouse.move(x * viewport.width, y * viewport.height);
        }
      } catch (error) {
        console.error("Mouse move error:", error);
      }
    });

    socket.on("mousedown", async () => {
      if (!page) return;
      try {
        await page.mouse.down();
      } catch (error) {
        console.error("Mouse down error:", error);
      }
    });

    socket.on("mouseup", async () => {
      if (!page) return;
      try {
        await page.mouse.up();
      } catch (error) {
        console.error("Mouse up error:", error);
      }
    });

    socket.on("wheel", async ({ deltaX, deltaY }) => {
      if (!page) return;
      try {
        await page.mouse.wheel(deltaX, deltaY);
      } catch (error) {
        console.error("Wheel error:", error);
      }
    });

        socket.on('keydown', async ({ key }) => {
            if (!page) return;
            try {
                await page.keyboard.press(key);
            } catch (error) { console.error('Keydown error:', error); }
        });

        socket.on('navigate', async ({ action }) => {
            if (!page) return;
            try {
                if (action === 'back') await page.goBack();
                if (action === 'forward') await page.goForward();
                if (action === 'reload') await page.reload();
            } catch (error) { console.error('Navigation error:', error); }
        });

        socket.on('disconnect', async () => {
            console.log('Client disconnected:', socket.id);
            if (context) {
                console.log('Closing browser context...');
                await context.close().catch(console.error);
            }
            if (browser) {
                console.log('Closing browser instance...');
                await browser.close().catch(console.error);
                console.log('Browser instance closed.');
            }
        });
  } catch (err) {
    console.error("Error in session:", err);
    socket.emit("error", "Failed to start browser session");
    if (browser) await browser.close().catch(() => {});
  }
});

server.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
