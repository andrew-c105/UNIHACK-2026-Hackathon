import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function NativeDelete({ onDelete, onConfirm }) {
  const [confirming, setConfirming] = useState(false);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirming) {
      setConfirming(true);
      if (onConfirm) onConfirm();
      
      // Auto reset after 3 seconds
      setTimeout(() => {
        setConfirming(false);
      }, 3000);
    } else {
      onDelete();
      setConfirming(false);
    }
  };

  const handlePointerLeave = () => {
    if (confirming) {
      // Optional: reset when mouse leaves
      // setConfirming(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      onPointerLeave={handlePointerLeave}
      className={`relative flex items-center justify-center h-10 px-4 rounded-lg font-medium text-sm transition-all overflow-hidden ${
        confirming
          ? 'bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500/30'
          : 'bg-[#0a0a0a] border border-white/10 text-[#e0e0e0]/70 hover:text-white hover:border-[#e0e0e0]/50'
      }`}
      style={{ minWidth: confirming ? '100px' : '96px' }}
    >
      <AnimatePresence mode="wait">
        {!confirming ? (
          <motion.div
            key="delete"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="flex items-center gap-2"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Delete</span>
          </motion.div>
        ) : (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="font-bold flex items-center justify-center w-full"
          >
            Sure?
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
