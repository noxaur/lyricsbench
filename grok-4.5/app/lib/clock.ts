/**
 * Playback clock that lives outside React.
 *
 * YouTube's IFrame API only samples a few times per second. Karaoke needs
 * frame cadence, so we interpolate between samples with performance.now().
 * Seek snaps the sample immediately so the stage does not lag the scrubber.
 */
export class PlaybackClock {
  private timeSec = 0
  private playing = false
  private sampledAt = 0

  sample(timeSec: number, playing: boolean) {
    this.timeSec = timeSec
    this.playing = playing
    this.sampledAt = performance.now()
  }

  now(): number {
    if (!this.playing) return this.timeSec
    const elapsed = (performance.now() - this.sampledAt) / 1000
    return this.timeSec + elapsed
  }

  get isPlaying() {
    return this.playing
  }
}

export function interpolateClock(
  sampleTimeSec: number,
  playing: boolean,
  sampledAt: number,
  now = performance.now(),
): number {
  if (!playing) return sampleTimeSec
  return sampleTimeSec + (now - sampledAt) / 1000
}
