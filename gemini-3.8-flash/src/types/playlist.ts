import type { TrackMetadata } from "./song"

export type PlaylistTrack = TrackMetadata & {
  addedAt: number
}

export type Playlist = {
  id: string
  title: string
  description?: string
  createdAt: number
  updatedAt: number
  tracks: PlaylistTrack[]
}
