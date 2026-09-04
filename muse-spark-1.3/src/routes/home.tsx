import { useEffect, useState } from "react";
import {
  Form,
  Link,
  redirect,
  useActionData,
  type ActionFunctionArgs,
} from "react-router";
import { extractVideoId, isSpotifyTrackUrl, thumbnailUrl } from "@/lib/youtube";
import { clearRecent, pushRecent, readRecent, recentLabel, type RecentSong } from "@/lib/recent";

/**
 * Home action: validate pasted input server-style (in the loader/action
 * layer, not in component state). Invalid input re-renders the form with
 * an error; valid input redirects to the player. Spotify links get their
 * own honest message — the old app's silent Spotify→YouTube matching was
 * a top source of wrong-song/wrong-lyrics reports.
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
  const videoId = extractVideoId(raw);
  if (!videoId) {
    return { error: "That doesn't look like a YouTube link or video ID. Try a watch, youtu.be, Shorts, or embed URL." };
  }
  return redirect(`/play/${videoId}`);
}

export function Home() {
  const actionData = useActionData() as { error?: string } | undefined;
  const [recent, setRecent] = useState<RecentSong[]>(() => readRecent());

  useEffect(() => {
    setRecent(readRecent());
  }, []);

  return (
    <section className="home">
      <div>
        <h1>
          umbra<span style={{ color: "var(--stage-violet)" }}>.</span>
        </h1>
        <p>
          Sing along — paste a YouTube link and get synced lyrics over the video.
        </p>
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
        In the player: <kbd>Space</kbd> plays/pauses, arrow keys seek,{" "}
        <kbd>+</kbd>/<kbd>−</kbd> nudge lyric timing, clicking a line seeks to it.
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
