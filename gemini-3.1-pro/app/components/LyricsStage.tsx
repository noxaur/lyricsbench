import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { usePlayerStore } from '../stores/player-store';
import { cn } from '../lib/utils';
import clsx from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cnFallback(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function LyricsStage() {
  const { lyrics, currentTime, activeLineIndex, setActiveLineIndex } = usePlayerStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine active line
  useEffect(() => {
    if (!lyrics.length) return;
    
    // Find the last line whose time is <= currentTime
    let newIndex = -1;
    for (let i = 0; i < lyrics.length; i++) {
        if (currentTime >= lyrics[i].time) {
            newIndex = i;
        } else {
            break;
        }
    }
    
    if (newIndex !== activeLineIndex) {
        setActiveLineIndex(newIndex);
    }
  }, [currentTime, lyrics, activeLineIndex, setActiveLineIndex]);

  // Scroll active line into view
  useEffect(() => {
    if (activeLineIndex >= 0 && containerRef.current) {
        const activeEl = containerRef.current.children[activeLineIndex] as HTMLElement;
        if (activeEl) {
            const containerHeight = containerRef.current.clientHeight;
            const scrollPos = activeEl.offsetTop - containerHeight / 2 + activeEl.clientHeight / 2;
            
            containerRef.current.scrollTo({
                top: Math.max(0, scrollPos),
                behavior: 'smooth'
            });
        }
    }
  }, [activeLineIndex]);

  if (!lyrics.length) {
    return (
        <div className="flex-1 flex items-center justify-center text-ink-muted">
            No lyrics loaded
        </div>
    );
  }

  return (
    <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto py-[40vh] px-4 md:px-8 custom-scrollbar relative no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
        {lyrics.map((line, index) => {
            const isActive = index === activeLineIndex;
            const isPassed = index < activeLineIndex;
            const isUnsung = index > activeLineIndex;
            
            return (
                <motion.div
                    key={index}
                    className={cnFallback(
                        "mb-8 md:mb-12 origin-left transition-all duration-300 ease-out",
                        isActive ? "text-lyric-active scale-105 font-bold" : 
                        isPassed ? "text-lyric-muted scale-100 font-semibold" : 
                                 "text-lyric-unsung scale-100 font-semibold"
                    )}
                    initial={false}
                    animate={{
                        opacity: isActive ? 1 : isPassed ? 0.7 : 0.4,
                        scale: isActive ? 1.05 : 1,
                        filter: isActive ? 'blur(0px)' : (Math.abs(index - activeLineIndex) > 3 ? 'blur(2px)' : 'blur(0px)')
                    }}
                >
                    <h2 className="text-3xl md:text-5xl lg:text-6xl leading-tight">
                        {line.text || "♪"}
                    </h2>
                </motion.div>
            );
        })}
    </div>
  );
}
