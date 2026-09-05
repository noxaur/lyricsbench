import { create } from 'zustand';
import type { LyricLine } from '../lib/lrc-parser';

interface PlayerState {
  youtubeId: string | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  lyrics: LyricLine[];
  activeLineIndex: number;
  
  setYoutubeId: (id: string | null) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setLyrics: (lyrics: LyricLine[]) => void;
  setActiveLineIndex: (index: number) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  youtubeId: null,
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  lyrics: [],
  activeLineIndex: -1,
  
  setYoutubeId: (youtubeId) => set({ youtubeId }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setLyrics: (lyrics) => set({ lyrics }),
  setActiveLineIndex: (activeLineIndex) => set({ activeLineIndex }),
}));
