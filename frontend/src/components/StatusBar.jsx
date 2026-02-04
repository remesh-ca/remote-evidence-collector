import React from 'react';
import { Lock, Radio, ArrowLeft, ArrowRight, RotateCw, Maximize, Power, Sun, Moon } from 'lucide-react';
import { cn } from '../lib/utils';

export const StatusBar = ({ 
  isRecording, 
  isConnected, 
  sessionDuration, 
  onNavigate, 
  url,
  onToggleFullScreen,
  onEndSession,
  isDarkMode,
  onToggleTheme
}) => {
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const themeClasses = {
    header: isDarkMode ? "bg-zinc-900/60 border-white/5 text-zinc-400" : "bg-white/60 border-black/5 text-zinc-600",
    button: isDarkMode ? "text-zinc-400 hover:text-white hover:bg-white/10" : "text-zinc-600 hover:text-black hover:bg-black/5",
    addressBar: isDarkMode ? "bg-black/40 border-white/5 text-zinc-300" : "bg-white/50 border-black/5 text-zinc-700",
    divider: isDarkMode ? "bg-white/10" : "bg-black/10",
    dangerButton: isDarkMode ? "bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20" : "bg-red-500/10 hover:bg-red-500/20 text-red-600 border-red-500/20"
  };

  return (
    <header className={cn(
        "fixed top-0 left-0 right-0 h-14 backdrop-blur-md border-b flex items-center justify-between px-4 z-40 gap-4 transition-colors duration-300",
        themeClasses.header
    )}>
      
      {/* Left: Navigation Controls */}
      <div className="flex items-center gap-2">
        <button onClick={() => onNavigate('back')} className={cn("p-2 rounded-lg transition-colors", themeClasses.button)}>
          <ArrowLeft size={16} />
        </button>
        <button onClick={() => onNavigate('forward')} className={cn("p-2 rounded-lg transition-colors", themeClasses.button)}>
          <ArrowRight size={16} />
        </button>
        <button onClick={() => onNavigate('reload')} className={cn("p-2 rounded-lg transition-colors", themeClasses.button)}>
          <RotateCw size={16} />
        </button>
      </div>

      {/* Center: Address Bar & Status */}
      <div className={cn(
        "flex-1 max-w-2xl flex items-center gap-3 border rounded-full px-4 py-1.5 mx-auto transition-colors duration-300",
        themeClasses.addressBar
      )}>
        <div className={cn(
          "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors cursor-help",
          isConnected ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
        )} title={isConnected ? "Secure Connection" : "Disconnected"}>
          <Lock size={10} />
          <span className="hidden sm:inline">{isConnected ? "Secure" : "Offline"}</span>
        </div>

        <span className="flex-1 text-xs font-mono truncate text-center opacity-80 select-all">
          {url}
        </span>

        {/* Recording & Timer */}
        <div className={cn("flex items-center gap-3 text-[10px] font-medium border-l pl-3", themeClasses.divider)}>
            {isRecording && (
            <div className="flex items-center gap-1.5 text-red-500 animate-pulse whitespace-nowrap">
                <Radio size={10} />
                <span className="hidden sm:inline">REC</span>
            </div>
            )}
            <div className="font-mono tabular-nums opacity-70">
                {formatTime(sessionDuration)}
            </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button 
            onClick={onToggleTheme} 
            className={cn("p-2 rounded-lg transition-colors", themeClasses.button)} 
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button onClick={onToggleFullScreen} className={cn("p-2 rounded-lg transition-colors", themeClasses.button)} title="Fullscreen">
            <Maximize size={16} />
        </button>
        <div className={cn("w-px h-6 mx-1", themeClasses.divider)} />
        <button onClick={onEndSession} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border", themeClasses.dangerButton)}>
            <Power size={14} />
            <span className="hidden sm:inline">End Session</span>
        </button>
      </div>

    </header>
  );
};

export default StatusBar;
