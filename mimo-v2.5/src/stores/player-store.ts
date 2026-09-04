import { create } from "zustand";
import type { LyricDisplayMode, LyricLine, LyricsProviderId } from "@/types/lyrics";

export type PlayerStatus = "idle" | "loading" | "ready" | "error";
export type LyricsFollowMode = "follow" | "manual";
export type LyricsSource = LyricsProviderId | "pasted" | null;
export type EnglishLyricsStatus = "ready" | "loading" | "failed" | "skipped" | null;
export type RomajiLyricsStatus = "ready" | "skipped" | null;
export type LyricsSearchStep = { provider: string; phase: "searching" | "done" } | null;

type PlayerState = {
  videoId: string | null;
  title: string;
  artist: string;
  track: string;
  status: PlayerStatus;
  error: string | null;

  lyrics: LyricLine[];
  englishLines: string[];
  romajiLines: string[];
  englishStatus: EnglishLyricsStatus;
  romajiStatus: RomajiLyricsStatus;
  lyricsSynced: boolean;
  lyricsAutoTimed: boolean;
  lyricsSource: LyricsSource;
  languageCode: string;

  displayMode: LyricDisplayMode;
  currentTime: number;
  syncOffsetMs: number;
  durationMs: number;

  videoHidden: boolean;
  focusMode: boolean;
  stageFullscreen: boolean;
  tvMode: boolean;
  showTimestamps: boolean;

  activeIndex: number;
  wordProgress: number;

  lyricsFollowMode: LyricsFollowMode;
  lyricsSearchPhase: string | null;
  lyricsSearchStep: LyricsSearchStep;

  playRef: (() => void) | null;
  pauseRef: (() => void) | null;
  seekRef: ((sec: number) => void) | null;
  isPlaying: boolean;

  setVideoId: (id: string) => void;
  setMeta: (meta: { title: string; artist: string; track: string }) => void;
  setStatus: (status: PlayerStatus, error?: string | null) => void;
  setLyrics: (lines: LyricLine[], synced: boolean, source?: LyricsSource, autoTimed?: boolean) => void;
  setEnglishLines: (lines: string[], status?: EnglishLyricsStatus) => void;
  setRomajiLines: (lines: string[], status?: RomajiLyricsStatus) => void;
  setLanguageCode: (code: string) => void;
  setDisplayMode: (mode: LyricDisplayMode) => void;
  setCurrentTime: (t: number) => void;
  setDurationMs: (ms: number) => void;
  setSyncOffset: (ms: number) => void;
  adjustOffset: (deltaMs: number) => void;
  resetSyncOffset: () => void;
  setVideoHidden: (hidden: boolean) => void;
  setFocusMode: (on: boolean) => void;
  setStageFullscreen: (on: boolean) => void;
  setTvMode: (on: boolean) => void;
  setShowTimestamps: (show: boolean) => void;
  setActive: (index: number, progress: number) => void;
  setLyricsFollowMode: (mode: LyricsFollowMode) => void;
  setLyricsSearchPhase: (phase: string | null) => void;
  setLyricsSearchStep: (step: LyricsSearchStep) => void;
  bindControls: (controls: { play: () => void; pause: () => void; seek: (s: number) => void; isPlaying: boolean }) => void;
  togglePlay: () => void;
  seekBy: (deltaSec: number) => void;
  seekToMs: (ms: number) => void;
  reset: () => void;
};

const STORAGE_KEYS = {
  videoHidden: "umbra-video-hidden",
  focusMode: "umbra-focus-mode",
  tvMode: "umbra-tv-mode",
  showTimestamps: "umbra-show-timestamps",
} as const;

function readBool(key: string): boolean {
  try { return localStorage.getItem(key) === "true"; } catch { return false; }
}

function writeBool(key: string, value: boolean) {
  try { localStorage.setItem(key, String(value)); } catch {}
}

const initialState = {
  videoId: null as string | null,
  title: "",
  artist: "",
  track: "",
  status: "idle" as PlayerStatus,
  error: null as string | null,
  lyrics: [] as LyricLine[],
  englishLines: [] as string[],
  romajiLines: [] as string[],
  englishStatus: null as EnglishLyricsStatus,
  romajiStatus: null as RomajiLyricsStatus,
  lyricsSynced: true,
  lyricsAutoTimed: false,
  lyricsSource: null as LyricsSource,
  languageCode: "en",
  displayMode: "native" as LyricDisplayMode,
  currentTime: 0,
  syncOffsetMs: 0,
  durationMs: 0,
  videoHidden: readBool(STORAGE_KEYS.videoHidden),
  focusMode: readBool(STORAGE_KEYS.focusMode),
  stageFullscreen: false,
  tvMode: readBool(STORAGE_KEYS.tvMode),
  showTimestamps: readBool(STORAGE_KEYS.showTimestamps),
  activeIndex: -1,
  wordProgress: 0,
  lyricsFollowMode: "follow" as LyricsFollowMode,
  lyricsSearchPhase: null as string | null,
  lyricsSearchStep: null as LyricsSearchStep,
  playRef: null as (() => void) | null,
  pauseRef: null as (() => void) | null,
  seekRef: null as ((sec: number) => void) | null,
  isPlaying: false,
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  ...initialState,

  setVideoId: (id) => set({ videoId: id }),
  setMeta: (meta) => set(meta),
  setStatus: (status, error = null) => set({ status, error }),
  setLyrics: (lines, synced, source = "lrclib", autoTimed = false) =>
    set({ lyrics: lines, lyricsSynced: synced, lyricsAutoTimed: autoTimed, lyricsSource: source }),
  setEnglishLines: (lines, status = lines.length > 0 ? "ready" : null) =>
    set({ englishLines: lines, englishStatus: status }),
  setRomajiLines: (lines, status = lines.length > 0 ? "ready" : null) =>
    set({ romajiLines: lines, romajiStatus: status }),
  setLanguageCode: (code) => set({ languageCode: code }),
  setDisplayMode: (mode) => set({ displayMode: mode }),
  setCurrentTime: (t) => set({ currentTime: t }),
  setDurationMs: (ms) => set({ durationMs: ms }),
  setSyncOffset: (ms) => set({ syncOffsetMs: Math.max(-5000, Math.min(5000, ms)) }),
  adjustOffset: (deltaMs) =>
    set((s) => ({ syncOffsetMs: Math.max(-5000, Math.min(5000, s.syncOffsetMs + deltaMs)) })),
  resetSyncOffset: () => set({ syncOffsetMs: 0 }),
  setVideoHidden: (hidden) => { writeBool(STORAGE_KEYS.videoHidden, hidden); set({ videoHidden: hidden }); },
  setFocusMode: (on) => { writeBool(STORAGE_KEYS.focusMode, on); set({ focusMode: on }); },
  setStageFullscreen: (on) => set({ stageFullscreen: on }),
  setTvMode: (on) => { writeBool(STORAGE_KEYS.tvMode, on); set({ tvMode: on }); },
  setShowTimestamps: (show) => { writeBool(STORAGE_KEYS.showTimestamps, show); set({ showTimestamps: show }); },
  setActive: (index, progress) => set({ activeIndex: index, wordProgress: progress }),
  setLyricsFollowMode: (mode) => set({ lyricsFollowMode: mode }),
  setLyricsSearchPhase: (phase) => set({ lyricsSearchPhase: phase }),
  setLyricsSearchStep: (step) => set({ lyricsSearchStep: step }),
  bindControls: ({ play, pause, seek, isPlaying }) =>
    set({ playRef: play, pauseRef: pause, seekRef: seek, isPlaying }),
  togglePlay: () => {
    const { isPlaying, playRef, pauseRef } = get();
    if (isPlaying) pauseRef?.(); else playRef?.();
  },
  seekBy: (deltaSec) => {
    const { currentTime, seekRef } = get();
    seekRef?.(Math.max(0, currentTime + deltaSec));
  },
  seekToMs: (ms) => {
    get().seekRef?.(ms / 1000);
  },
  reset: () => set({ ...initialState, videoHidden: readBool(STORAGE_KEYS.videoHidden), focusMode: readBool(STORAGE_KEYS.focusMode), tvMode: readBool(STORAGE_KEYS.tvMode), showTimestamps: readBool(STORAGE_KEYS.showTimestamps) }),
}));
