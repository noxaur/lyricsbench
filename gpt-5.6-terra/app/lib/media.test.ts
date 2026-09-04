import { describe, expect, it } from "vitest"
import { parseMediaInput } from "~/lib/media"

describe("media input", () => {
  it("accepts common YouTube URL shapes without opening a player first", () => {
    expect(parseMediaInput("https://youtu.be/dQw4w9WgXcQ?feature=share")).toEqual({
      kind: "youtube",
      videoId: "dQw4w9WgXcQ",
    })
    expect(parseMediaInput("youtube.com/shorts/dQw4w9WgXcQ")).toEqual({
      kind: "youtube",
      videoId: "dQw4w9WgXcQ",
    })
  })

  it("accepts Spotify links and URIs", () => {
    const id = "3n3Ppam7vgaVa1iaRUc9Lp"
    expect(parseMediaInput(`https://open.spotify.com/track/${id}?si=a`)).toEqual({ kind: "spotify", trackId: id })
    expect(parseMediaInput(`spotify:track:${id}`)).toEqual({ kind: "spotify", trackId: id })
  })

  it("keeps a normal phrase as a search instead of treating it as a broken URL", () => {
    expect(parseMediaInput("Mr Brightside The Killers")).toEqual({ kind: "query", query: "Mr Brightside The Killers" })
  })
})
