import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { motion } from 'framer-motion';
import { StatusBar } from './components/StatusBar';
import { ControlDock } from './components/ControlDock';
import { LogFeed } from './components/LogFeed';

// Connect to the backend service.
const SOCKET_URL = 'http://localhost:4000';

import { cn } from './lib/utils'; // Create strict import

function App() {
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const containerRef = useRef(null);

  const [isConnected, setIsConnected] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isSessionEnded, setIsSessionEnded] = useState(false);
  const [inputUrl, setInputUrl] = useState('https://www.google.com');
  const [isRecording, setIsRecording] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [timer, setTimer] = useState(0);
  const [logs, setLogs] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toastMsg, setToastMsg] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Timer Logic
  useEffect(() => {
    let interval;
    if (isRecording && sessionStartTime) {
      interval = setInterval(() => {
        setTimer(Date.now() - sessionStartTime);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, sessionStartTime]);

  const addLog = (type, title, details) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [...prev, { type, title, details, time }]);
  };

  const startSession = (url) => {
    if (socketRef.current) return;
    
    const targetUrl = url || inputUrl;
    const socket = io(SOCKET_URL, { query: { url: targetUrl } });
    socketRef.current = socket;
    setIsSessionActive(true);
    setIsSessionEnded(false); // Reset end state
    setSessionStartTime(Date.now());
    setIsRecording(true); 

    socket.on('connect', () => {
      console.log('Connected to backend');
      setIsConnected(true);
      addLog('system', 'CONNECTED', 'Secure tunnel established');
    });

    socket.on('evidence_ack', (data) => {
      const msg = `Saved: ${data.entry.filename}`;
      setToastMsg(msg);
      setTimeout(() => setToastMsg(null), 3000);

      addLog(
        data.type === 'screenshot' ? 'screenshot' : 'html', 
        'EVIDENCE CAPTURED', 
        `${data.entry.filename} (${(data.entry.size / 1024).toFixed(1)} KB)`
      );
    });

    socket.on('render_frame', (base64Data) => {
      const canvas = canvasRef.current;
      if (canvas && base64Data) {
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = `data:image/jpeg;base64,${base64Data}`;
      }
    });

    socket.on('disconnect', () => {
        setIsConnected(false);
        setIsSessionActive(false);
        setIsSessionEnded(true); // Trigger Thank You screen
        setIsRecording(false);
        setSessionStartTime(null);
        setLogs([]); // Clear logs as requested
        socketRef.current = null;
        setToastMsg(null);
    });
  };

  const handleEvidence = (type) => {
    if (socketRef.current) {
        socketRef.current.emit(`evidence:${type}`);
    }
  };

  const endSession = () => {
    if (socketRef.current) {
        socketRef.current.disconnect();
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
        containerRef.current?.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
  };

  const handleNavigate = (action) => {
    if (socketRef.current) {
      socketRef.current.emit('navigate', { action });
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // I/O Handlers
  const handleMouseMove = (e) => {
    if (!socketRef.current) return;
    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    socketRef.current.emit('mousemove', { x, y });
  };

  const ioHandlers = {
      onMouseDown: () => socketRef.current?.emit('mousedown'),
      onMouseUp: () => socketRef.current?.emit('mouseup'),
      onWheel: (e) => socketRef.current?.emit('wheel', { deltaX: e.deltaX, deltaY: e.deltaY })
  };

  useEffect(() => {
    const handleKeyDown = (e) => socketRef.current?.emit('keydown', { key: e.key });
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const themeClasses = {
      bg: isDarkMode ? "bg-zinc-950" : "bg-zinc-50",
      text: isDarkMode ? "text-white" : "text-zinc-900",
      subText: isDarkMode ? "text-zinc-400" : "text-zinc-500",
      input: isDarkMode ? "bg-zinc-900/50 border-white/10 text-white placeholder:text-zinc-600 focus:ring-blue-500/50" : "bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:ring-blue-500/30",
      card: isDarkMode ? "bg-zinc-900/50 border-white/10" : "bg-white border-zinc-200 shadow-xl",
      primaryBtn: isDarkMode ? "bg-white text-black" : "bg-black text-white",
      secondaryBtn: isDarkMode ? "text-zinc-500 hover:text-white" : "text-zinc-400 hover:text-black",
      canvasContainer: isDarkMode ? "bg-black border-white/10 shadow-black/80" : "bg-zinc-900 border-zinc-200 shadow-xl"
  };

  // --- Render: Landing Page & Thank You ---
  if (!isSessionActive) {
      return (
        <div className={cn("flex flex-col items-center justify-center h-screen font-sans selection:bg-blue-500/30 transition-colors duration-300", themeClasses.bg, themeClasses.text)}>
            {/* Theme Toggle on Landing */}
            <button 
                onClick={toggleTheme}
                className={cn("absolute top-6 right-6 p-3 rounded-full transition-all", isDarkMode ? "bg-zinc-900 hover:bg-zinc-800 text-white" : "bg-white hover:bg-zinc-100 text-black shadow-sm")}
            >
                {isDarkMode ? "☀️" : "🌙"}
            </button>

            {isSessionEnded ? (
                // Thank You Screen
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn("w-full max-w-lg p-12 backdrop-blur-xl border rounded-[3rem] text-center space-y-6 shadow-2xl transition-colors", themeClasses.card)}
                >
                    <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full mx-auto flex items-center justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                    </div>
                    <div>
                        <h2 className={cn("text-3xl font-bold mb-2", themeClasses.text)}>Session Complete</h2>
                        <p className={themeClasses.subText}>Your secure session has ended. All forensic evidence has been safely stored.</p>
                    </div>
                    <button 
                        onClick={() => setIsSessionEnded(false)}
                        className={cn("w-full font-bold rounded-full py-4 text-lg hover:scale-105 transition-transform", themeClasses.primaryBtn)}
                    >
                        Go to Homepage
                    </button>
                </motion.div>
            ) : (
                // Launcher
                <div className="w-full max-w-lg p-8 space-y-8">
                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-3xl mx-auto shadow-2xl shadow-blue-900/20 mb-6 flex items-center justify-center">
                            <div className="w-8 h-8 bg-white rounded-full opacity-20" />
                        </div>
                        <h1 className={cn("text-4xl font-bold tracking-tight", themeClasses.text)}>Forensic Browser</h1>
                        <p className={cn("text-lg", themeClasses.subText)}>Secure. Isolated. Auditable.</p>
                    </div>

                    <div className="space-y-4">
                        <div className="relative">
                            <input 
                                type="text" 
                                value={inputUrl}
                                onChange={(e) => setInputUrl(e.target.value)}
                                className={cn("w-full border rounded-full px-6 py-4 focus:outline-none focus:ring-2 transition-all font-mono text-sm pl-6", themeClasses.input)}
                                placeholder="https://example.com"
                            />
                        </div>
                        
                        <button 
                            onClick={() => startSession()}
                            className={cn("w-full font-semibold rounded-full py-4 hover:scale-[1.02] active:scale-[0.98] transition-all", themeClasses.primaryBtn)}
                        >
                            Launch Secure Session
                        </button>
                        
                        <button 
                            onClick={() => startSession('https://www.google.com')}
                            className={cn("w-full text-sm transition-colors", themeClasses.secondaryBtn)}
                        >
                            Or start with Google
                        </button>
                    </div>
                </div>
            )}
        </div>
      );
  }

  // --- Render: Command Center ---
  return (
    <div className={cn("h-screen w-screen overflow-hidden relative font-sans transition-colors duration-300", themeClasses.bg, themeClasses.text)}>
      
      <StatusBar 
        isRecording={isRecording} 
        isConnected={isConnected} 
        sessionDuration={timer}
        onNavigate={handleNavigate}
        url={inputUrl}
        onToggleFullScreen={toggleFullScreen}
        onEndSession={endSession}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />

      {/* Main Stage */}
      {/* Increased bottom padding to avoid Dock overlap (pb-32) */}
      <div className="absolute inset-0 pt-16 pb-32 flex items-center justify-center">
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className={cn("relative shadow-2xl rounded-xl overflow-hidden border aspect-video max-h-full max-w-[90vw]", themeClasses.canvasContainer)}
            ref={containerRef}
        >
            {!isConnected && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm z-10 gap-3">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-zinc-400 font-mono text-sm">Establishing secure tunnel...</span>
                </div>
            )}
            
            <canvas
                ref={canvasRef}
                width={1920}
                height={1080}
                className="w-full h-full cursor-crosshair block"
                onMouseMove={handleMouseMove}
                {...ioHandlers}
            />
        </motion.div>
      </div>

      {/* Toast Notification - Bottom Left (Stacked above Inspector Button) */}
      {toastMsg && (
          <div className={cn("fixed bottom-20 left-4 px-6 py-3 rounded-full shadow-lg z-50 backdrop-blur-md flex items-center gap-2 animate-in slide-in-from-bottom-5 fade-in duration-300 border", isDarkMode ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-white border-zinc-200 text-green-600 shadow-xl")}>
              <span className="text-lg">✅</span>
              <span className="text-sm font-medium">{toastMsg}</span>
          </div>
      )}

      <LogFeed 
        logs={logs} 
        isOpen={sidebarOpen} 
        toggle={() => setSidebarOpen(!sidebarOpen)} 
        isDarkMode={isDarkMode}
      />

      <ControlDock 
        onSnapshot={() => handleEvidence('screenshot')}
        onSource={() => handleEvidence('html')}
        isRecording={isRecording}
        toggleRecording={toggleRecording}
        isDarkMode={isDarkMode}
      />

    </div>
  );
}

export default App;
