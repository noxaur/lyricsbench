import React from 'react';
import { usePlayerStore } from '../stores/player-store';
import { Play, Pause } from 'lucide-react';
import { cn } from '../lib/utils';

export function TransportControls() {
  const { isPlaying, duration, currentTime, setYoutubeId } = usePlayerStore();
  
  if (!duration) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-surface-card bg-opacity-95 border-t border-border-subtle z-40 flex items-center px-4 gap-4 backdrop-blur-md opacity-0 hover:opacity-100 transition-opacity">
      
      {/* Fake progress bar since we can't reliably seek the iframe if we don't hold a ref to it,
          but visually it's nice. */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-surface-muted">
        <div 
          className="h-full bg-stage-violet"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex justify-center items-center gap-4">
        {/* We would wire play/pause if we expose the player ref */}
        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-muted text-ink-primary hover:bg-stage-violet hover:text-stage-violet-ink transition-colors">
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
      </div>

      <div className="text-sm font-medium text-ink-muted">
          {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      <button 
        onClick={() => setYoutubeId(null)}
        className="text-sm font-medium text-ink-muted hover:text-ink-primary"
      >
        Exit
      </button>
    </div>
  );
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
