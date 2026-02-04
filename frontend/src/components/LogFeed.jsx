import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Terminal, Clock, FileText, Image as ImageIcon, MousePointer2 } from 'lucide-react';
import { cn } from '../lib/utils';

const LogItem = ({ log, isDarkMode }) => {
  const getIcon = (type) => {
    switch (type) {
      case 'screenshot': return <ImageIcon size={12} className="text-purple-400" />;
      case 'html': return <FileText size={12} className="text-blue-400" />;
      case 'input': return <MousePointer2 size={12} className={isDarkMode ? "text-zinc-500" : "text-zinc-400"} />;
      default: return <Terminal size={12} className={isDarkMode ? "text-zinc-500" : "text-zinc-400"} />;
    }
  };

  return (
    <div className={cn(
        "flex gap-3 text-xs p-2 border-b transition-colors group",
        isDarkMode ? "border-white/5 hover:bg-white/5" : "border-black/5 hover:bg-black/5"
    )}>
      <div className="mt-0.5 opacity-50">{getIcon(log.type)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <span className={cn(
            "font-medium",
            log.type === 'screenshot' ? "text-purple-400" :
            log.type === 'html' ? "text-blue-400" : 
            isDarkMode ? "text-zinc-300" : "text-zinc-700"
          )}>
            {log.title || log.type.toUpperCase()}
          </span>
          <span className={cn("text-[10px] font-mono", isDarkMode ? "text-zinc-600" : "text-zinc-400")}>{log.time}</span>
        </div>
        <p className={cn("truncate font-mono text-[10px]", isDarkMode ? "text-zinc-500" : "text-zinc-500")}>{log.details}</p>
      </div>
    </div>
  );
};

export const LogFeed = ({ logs, isOpen, toggle, isDarkMode }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <>
        {/* Toggle Button - Bottom Left */}
        <button 
            onClick={toggle}
            className={cn(
                "fixed bottom-4 left-4 z-50 backdrop-blur border p-3 rounded-full transition-colors shadow-lg hover:scale-110 active:scale-95 group",
                isDarkMode ? "bg-zinc-900/80 border-white/10 text-zinc-400 hover:text-white" : "bg-white/80 border-zinc-200 text-zinc-600 hover:text-black"
            )}
            title="Toggle Live Inspector"
        >
            <Terminal size={18} />
            <span className={cn(
                "absolute left-full ml-3 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border",
                isDarkMode ? "bg-black/80 text-white border-white/10" : "bg-white/80 text-black border-zinc-200"
            )}>
                Live Inspector
            </span>
        </button>

        {/* Sidebar Panel - Left Side */}
        <div className="fixed left-0 top-14 bottom-0 z-30 pointer-events-none flex flex-col items-start">
        <AnimatePresence>
            {isOpen && (
            <motion.div
                initial={{ x: -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                className={cn(
                    "pointer-events-auto w-80 h-full backdrop-blur-xl border-r flex flex-col shadow-2xl mr-0 transition-colors duration-300",
                    isDarkMode ? "bg-zinc-950/90 border-white/10" : "bg-white/90 border-zinc-200"
                )}
            >
                <div className={cn("h-10 flex items-center justify-between px-4 border-b", isDarkMode ? "border-white/10 bg-zinc-900/50" : "border-zinc-200 bg-zinc-50")}>
                <span className={cn("text-xs font-medium flex items-center gap-2", isDarkMode ? "text-zinc-400" : "text-zinc-600")}>
                    <Clock size={12} /> Live Inspector
                </span>
                <button onClick={toggle} className={cn("rotate-180", isDarkMode ? "text-zinc-600 hover:text-white" : "text-zinc-400 hover:text-black")}>
                    <ChevronRight size={14} />
                </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar" ref={scrollRef}>
                {logs.length === 0 ? (
                    <div className={cn("flex flex-col items-center justify-center h-full text-xs gap-2", isDarkMode ? "text-zinc-700" : "text-zinc-400")}>
                    <Terminal size={24} className="opacity-20" />
                    <span>Waiting for events...</span>
                    </div>
                ) : (
                    logs.map((log, i) => <LogItem key={i} log={log} isDarkMode={isDarkMode} />)
                )}
                </div>
                
                <div className={cn("h-6 border-t flex items-center px-4 text-[10px] font-mono", isDarkMode ? "bg-zinc-900/80 border-white/10 text-zinc-600" : "bg-zinc-50 border-zinc-200 text-zinc-400")}>
                    {logs.length} Events Captured
                </div>
            </motion.div>
            )}
        </AnimatePresence>
        </div>
    </>
  );
};

export default LogFeed;
