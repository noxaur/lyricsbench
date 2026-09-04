import type { CSSProperties, RefObject } from "react"
import { PlayIcon, VideoIcon } from "~/components/icons"
import { videoThumbnail } from "~/lib/media"
import type { TrackMetadata } from "~/lib/types"

export function VideoSurface({
  mountRef,
  videoId,
  metadata,
  demo,
  isPlaying,
  error,
}: {
  mountRef: RefObject<HTMLDivElement | null>
  videoId: string
  metadata: TrackMetadata
  demo: boolean
  isPlaying: boolean
  error: string | null
}) {
  if (demo) {
    return (
      <div className="demo-visual" data-playing={isPlaying || undefined} aria-label="Night Signal lyric timing preview">
        <div className="demo-visual__moon" aria-hidden />
        <div className="demo-visual__horizon" aria-hidden />
        <div className="demo-visual__bars" aria-hidden>
          {Array.from({ length: 18 }, (_, index) => <span key={index} style={{ "--bar-index": index } as CSSProperties} />)}
        </div>
        <div className="demo-visual__label"><PlayIcon size={15} /> Live timing preview</div>
      </div>
    )
  }

  return (
    <div className="video-surface">
      <div className="video-surface__placeholder" aria-hidden="true">
        <img src={videoThumbnail(videoId, "hq")} alt="" />
        <span><VideoIcon size={17} /> Loading video</span>
      </div>
      <div className="video-surface__embed" ref={mountRef} />
      {error ? <p className="video-surface__error">{error}</p> : null}
      <p className="video-surface__caption">{metadata.artist ? `${metadata.artist} · ` : ""}{metadata.title}</p>
    </div>
  )
}
