import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Code, Video, Globe } from 'lucide-react';
import { cn } from '../lib/utils';

const DockItem = ({ icon: Icon, label, onClick, isActive, isDanger, isDarkMode }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.1, y: -5 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-3 rounded-2xl transition-colors duration-200 group relative",
        isActive 
          ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" // Updated active state
          : isDarkMode 
            ? "hover:bg-white/10 text-zinc-400 hover:text-white"
            : "hover:bg-black/5 text-zinc-600 hover:text-black"
      )}
      title={label}
    >
      <Icon 
        size={24} 
        strokeWidth={1.5} 
        className={cn(
            "transition-colors",
            isDanger ? "text-red-500" : ""
        )} 
      />
      
      <span className={cn(
          "absolute -top-10 scale-0 group-hover:scale-100 transition-transform px-2 py-1 rounded text-xs whitespace-nowrap border backdrop-blur-md",
          isDarkMode ? "bg-black/80 text-white border-white/10" : "bg-white/80 text-black border-zinc-200"
      )}>
        {label}
      </span>
    </motion.button>
  );
};

export const ControlDock = ({ onSnapshot, onSource, isRecording, toggleRecording, isDarkMode }) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className={cn(
          "flex items-center gap-2 px-4 py-3 backdrop-blur-2xl border rounded-3xl shadow-2xl ring-1 transition-colors duration-300",
          isDarkMode ? "bg-zinc-900/60 border-white/10 shadow-black/50 ring-white/5" : "bg-white/60 border-zinc-200 shadow-zinc-200/50 ring-black/5"
      )}>
        <DockItem icon={Camera} label="Snapshot" onClick={onSnapshot} isDarkMode={isDarkMode} />
        <DockItem icon={Code} label="Capture DOM" onClick={onSource} isDarkMode={isDarkMode} />
        
        <div className={cn("w-px h-8 mx-2", isDarkMode ? "bg-white/10" : "bg-black/10")} />
        
        <DockItem 
          icon={Video} 
          label={isRecording ? "Stop Recording" : "Start Recording"} 
          onClick={toggleRecording} 
          isActive={isRecording}
          isDanger={true}
          isDarkMode={isDarkMode}
        />
      </div>
    </div>
  );
};

export default ControlDock;
