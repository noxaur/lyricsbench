import React, { useRef, useEffect } from 'react';
import YouTube from 'react-youtube';
import { usePlayerStore } from '../stores/player-store';

export function YouTubePlayer() {
  const { youtubeId, setCurrentTime, setDuration, setIsPlaying } = usePlayerStore();
  const playerRef = useRef<any>(null);
  const rAFRef = useRef<number | null>(null);

  useEffect(() => {
    const loop = async () => {
      if (playerRef.current) {
        try {
          const currentTime = await playerRef.current.getCurrentTime();
          if (typeof currentTime === 'number') {
            setCurrentTime(currentTime);
          }
        } catch (e) {}
      }
      rAFRef.current = requestAnimationFrame(loop);
    };

    rAFRef.current = requestAnimationFrame(loop);
    
    return () => {
      if (rAFRef.current) {
        cancelAnimationFrame(rAFRef.current);
      }
    };
  }, [setCurrentTime]); // Note: playerRef won't trigger re-binds but loop closures handle it.

  const onReady = (event: any) => {
    playerRef.current = event.target;
    setDuration(event.target.getDuration());
  };

  const onPlay = () => setIsPlaying(true);
  const onPause = () => setIsPlaying(false);

  if (!youtubeId) return null;

  return (
    <div className="fixed bottom-0 right-0 w-64 h-36 opacity-50 hover:opacity-100 transition-opacity z-50">
      <YouTube
        videoId={youtubeId}
        opts={{
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            controls: 1,
            modestbranding: 1,
          },
        }}
        onReady={onReady}
        onPlay={onPlay}
        onPause={onPause}
      />
    </div>
  );
}
