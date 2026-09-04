// Novel: rAF extrapolator with explicit sample, epsilon, and pause handling.
// Fixes old bug where extrapolation drifted and caused jank on seek.

import { useEffect, useRef } from "react"

export type Clock = { timeSec: number; playing: boolean }

export function useLyricsSync(getClock: () => Clock, onTick: (timeSec: number) => void) {
  const ref = useRef(getClock)
  ref.current = getClock
  const cbRef = useRef(onTick)
  cbRef.current = onTick
  const sampleRef = useRef({ timeSec: 0, playing: false, at: 0 })

  useEffect(() => {
    let raf = 0
    const loop = () => {
      const { timeSec, playing } = ref.current()
      const now = performance.now()
      const s = sampleRef.current
      if (Math.abs(timeSec - s.timeSec) > 0.002 || playing !== s.playing) {
        sampleRef.current = { timeSec, playing, at: now }
      }
      const cur = sampleRef.current
      const resolved = cur.playing ? cur.timeSec + (now - cur.at) / 1000 : cur.timeSec
      cbRef.current(resolved)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
}
