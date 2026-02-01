import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

// Connect to the backend service.
// Assuming backend is exposed at port 4000 on localhost.
const SOCKET_URL = 'http://localhost:4000';

function App() {
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [inputUrl, setInputUrl] = useState('https://www.google.com');

  const startSession = (url) => {
      if (socketRef.current) return;
      
      const targetUrl = url || inputUrl;
      // Initialize Socket with the target URL
      const socket = io(SOCKET_URL, {
          query: { url: targetUrl }
      });
      socketRef.current = socket;
      setIsSessionActive(true);

      socket.on('connect', () => {
        console.log('Connected to backend');
        setIsConnected(true);
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
        console.log('Disconnected from backend');
        setIsConnected(false);
        setIsSessionActive(false);
        socketRef.current = null;
      });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // ... (Mouse/Keyboard Handlers remain the same, just ensure they check socketRef.current)
  const handleMouseMove = (e) => {
    if (!socketRef.current) return;
    const canvas = e.target;
    // ... logic ...
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    socketRef.current.emit('mousemove', { x, y });
  };

  const handleMouseDown = () => { if (socketRef.current) socketRef.current.emit('mousedown'); };
  const handleMouseUp = () => { if (socketRef.current) socketRef.current.emit('mouseup'); };
  
  const handleWheel = (e) => {
    if (socketRef.current) {
      socketRef.current.emit('wheel', { deltaX: e.deltaX, deltaY: e.deltaY });
    }
  };

  // Global keyboard listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (socketRef.current) {
        socketRef.current.emit('keydown', { key: e.key });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = (action) => {
    if (socketRef.current) {
      socketRef.current.emit('navigate', { action });
    }
  };

  if (!isSessionActive) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-4">
            <div className="bg-gray-800 p-8 rounded-xl shadow-2xl max-w-md w-full border border-gray-700">
                <h1 className="text-3xl font-bold mb-6 text-center text-blue-400">RBI Launcher</h1>
                <p className="mb-4 text-gray-400 text-center">Enter a URL to verify safely in the remote browser.</p>
                
                <input 
                    type="text" 
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    className="w-full bg-gray-900 text-white border border-gray-600 rounded p-3 mb-4 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="https://example.com"
                />
                
                <button 
                    onClick={() => startSession()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition-colors mb-3"
                >
                    Launch Browser
                </button>
                
                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-gray-700"></div>
                    <span className="flex-shrink mx-4 text-gray-500">OR</span>
                    <div className="flex-grow border-t border-gray-700"></div>
                </div>

                <button 
                    onClick={() => startSession('https://www.google.com')}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded transition-colors"
                >
                    Start with Google
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-4 overflow-hidden">
      
      {/* Header & Controls */}
      <div className="w-full flex items-center justify-between mb-2 max-w-[177.78vh]"> 
        <div className="flex space-x-2">
            <button onClick={() => handleNavigate('back')} className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-full transition-colors" title="Go Back">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
            </button>
            <button onClick={() => handleNavigate('forward')} className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-full transition-colors" title="Go Forward">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            </button>
            <button onClick={() => handleNavigate('reload')} className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-full transition-colors" title="Reload">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
            </button>
        </div>

        {/* URL Display Area */}
        <div className="flex-1 mx-4 bg-gray-800 rounded px-4 py-2 text-gray-300 text-sm truncate border border-gray-700">
            {inputUrl}
        </div>

        <h1 className="text-xl font-bold text-gray-300 hidden md:block">RBI PoC</h1>
      </div>

      <div className="relative w-full flex-1 flex items-center justify-center border-2 border-gray-700 rounded-lg overflow-hidden shadow-2xl bg-black">
        {!isConnected && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
                <span className="text-xl">Connecting to remote browser...</span>
            </div>
        )}
        <canvas
          ref={canvasRef}
          width={1920}
          height={1080}
          className="cursor-crosshair block bg-white max-w-full max-h-full aspect-video"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
        />
      </div>
      <p className="mt-2 text-gray-400 text-sm">
        Interact with the canvas to control the remote browser. Type to send keys.
      </p>
    </div>
  );
}

export default App;
