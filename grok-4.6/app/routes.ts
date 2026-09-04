import { type RouteConfig, index, route } from "@react-router/dev/routes"

export default [
  index("routes/home.tsx"),
  route("play/:videoId", "routes/play.$videoId.tsx"),
  route("playlists", "routes/playlists.tsx"),
  route("playlists/:playlistId", "routes/playlists.$id.tsx"),
  route("themes", "routes/themes.tsx"),
  route("watch", "routes/watch.tsx"),
  route("api/lyrics", "routes/api.lyrics.ts"),
  route("api/search", "routes/api.search.ts"),
  route("api/oembed", "routes/api.oembed.ts"),
  route("api/spotify", "routes/api.spotify.ts"),
  route("api/translate", "routes/api.translate.ts"),
] satisfies RouteConfig
