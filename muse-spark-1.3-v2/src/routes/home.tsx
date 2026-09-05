import { useEffect, useState } from "react";
import { Form, Link, redirect, useActionData, type ActionFunctionArgs } from "react-router";
import { extractVideoRef, isSpotifyTrackUrl, thumbnailUrl } from "@/lib/ids";
import { clearRecent, pushRecent, readRecent, recentLabel, type RecentSong } from "@/lib/store";

/**
 * Home action: validate in the action layer, not component state. Valid
 * input redirects (preserving ?t= start offsets); Spotify gets an honest
 * message instead of a wrong-song YouTube guess.
 */
export async function homeAction({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const raw = String(form.get("url") ?? "").trim();
  if (!raw) return { error: "Paste a YouTube link or video ID to start." };
  if (isSpotifyTrackUrl(raw)) {
    return {
      error:
        "Spotify links can't be resolved here yet — open the track, copy its YouTube link, and paste that instead.",
    };
  }
  const ref = extractVideoRef(raw);
  if (!ref) {
    return { error: "That doesn't look like a YouTube link or video ID. Try a watch, youtu.be, Shorts, or embed URL." };
  }
  const suffix = ref.startAt > 0 ? `?t=${ref.startAt}` : "";
  return redirect(`/play/${ref.videoId}${suffix}`);
}

export function Home() {
  const actionData = useActionData() as { error?: string } | undefined;
  const [recent, setRecent] = useState<RecentSong[]>(() => {
    try {
      return readRecent();
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      setRecent(readRecent());
    } catch {
      // ignore
    }
  }, []);

  return (
    <section className="home">
      <div>
        <h1>
          umbra<span className="accent">.</span>
        </h1>
        <p>Sing along — paste a YouTube link and get synced lyrics over the video.</p>
      </div>

      <Form method="post" className="url-form">
        <input
          name="url"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="Paste a YouTube link or video ID…"
          aria-label="YouTube link or video ID"
        />
        <button type="submit" className="btn btn-primary">
          Sing
        </button>
      </Form>
      {actionData?.error && (
        <p className="form-error" role="alert">
          {actionData.error}
        </p>
      )}

      <p className="hint">
        In the player: <kbd>Space</kbd> plays/pauses, arrow keys seek, <kbd>+</kbd>/<kbd>−</kbd> nudge lyric
        timing, clicking a line seeks to it. Timestamped links (<kbd>?t=1m30s</kbd>) start there.
      </p>

      {recent.length > 0 && (
        <div className="recent">
          <div className="recent-head">
            <h2>Recent</h2>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                clearRecent();
                setRecent([]);
              }}
            >
              Clear
            </button>
          </div>
          <ul>
            {recent.map((song) => (
              <li key={song.videoId}>
                <Link
                  to={`/play/${song.videoId}`}
                  onClick={() => {
                    pushRecent({
                      videoId: song.videoId,
                      title: song.title,
                      artist: song.artist,
                      track: song.track,
                    });
                  }}
                >
                  <img
                    src={thumbnailUrl(song.videoId)}
                    alt=""
                    width={68}
                    height={38}
                    loading="lazy"
                    aria-hidden="true"
                  />
                  <span className="label">{recentLabel(song)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
