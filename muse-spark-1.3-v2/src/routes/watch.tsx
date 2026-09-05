import { redirect, type LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData } from "react-router";
import { extractVideoRef, isSpotifyTrackUrl, parseTimestampSeconds, VIDEO_ID_RE } from "@/lib/ids";

/**
 * /watch compatibility loader: accepts the shapes users actually paste —
 * /watch?v=ID, /watch?url=<youtube link>, bare ?v= on any host — and turns
 * them into a /play redirect WITHOUT mounting anything. Timestamps survive
 * (?t= / ?start= / #t=); Spotify gets a 400 with an honest message instead
 * of a wrong-song guess.
 */
export function watchLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const raw =
    url.searchParams.get("v") ??
    url.searchParams.get("url") ??
    url.searchParams.get("id") ??
    "";
  if (!raw.trim()) {
    throw new Response("Missing video: use /watch?v=<11-char YouTube ID> or paste a full YouTube link as ?url=.", {
      status: 404,
      statusText: "Missing video",
    });
  }
  if (isSpotifyTrackUrl(raw)) {
    throw new Response("Spotify links can't be played here — paste the YouTube link for the track instead.", {
      status: 400,
      statusText: "Spotify unsupported",
    });
  }
  // The ?v= value may itself carry a timestamp (?v=ID&t=90).
  const combined = raw.includes("://") || raw.includes("youtube") || raw.includes("youtu.be") ? raw : `https://www.youtube.com/watch?v=${raw}&t=${url.searchParams.get("t") ?? ""}&start=${url.searchParams.get("start") ?? ""}`;
  let ref = extractVideoRef(combined) ?? extractVideoRef(raw);
  if (ref && ref.startAt === 0) {
    const outer =
      parseTimestampSeconds(url.searchParams.get("t") ?? url.searchParams.get("start") ?? "");
    if (outer !== null && outer > 0) ref = { videoId: ref.videoId, startAt: outer };
  }
  if (!ref || !VIDEO_ID_RE.test(ref.videoId)) {
    throw new Response(
      `"${raw.slice(0, 60)}" isn't a valid YouTube video ID or link. Check the link and try again.`,
      { status: 404, statusText: "Invalid video" },
    );
  }
  const suffix = ref.startAt > 0 ? `?t=${ref.startAt}` : "";
  return redirect(`/play/${ref.videoId}${suffix}`);
}

export function Watch() {
  const data = useLoaderData() as { videoId?: string } | undefined;
  return (
    <section className="center-page">
      <h1>Redirecting…</h1>
      <p>Taking you to the player.</p>
      {data?.videoId ? <Link to={`/play/${data.videoId}`}>Continue to player</Link> : <Link to="/">Back home</Link>}
    </section>
  );
}
