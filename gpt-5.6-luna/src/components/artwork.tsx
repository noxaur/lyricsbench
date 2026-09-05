import type { Song } from "../data/songs";

export function Artwork({ song, small = false }: { song: Song; small?: boolean }) {
  return (
    <div
      className={`artwork artwork--${song.artwork}${small ? " artwork--small" : ""}`}
      aria-label={`${song.album} artwork`}
      role="img"
    >
      <div className="artwork__grain" />
      <div className="artwork__sun" />
      <div className="artwork__arc artwork__arc--one" />
      <div className="artwork__arc artwork__arc--two" />
      <div className="artwork__mark">u</div>
      {!small && (
        <div className="artwork__type">
          <span>{song.artist}</span>
          <strong>{song.album}</strong>
        </div>
      )}
    </div>
  );
}
