/** Smoke checks for v2 pure libs + loaders. Bundled with esbuild, run with node. */
import { parseLrc, parsePlain, parseLyricsText, lineId } from "./src/lib/lrc";
import { activeIndexAt, indexAtTime, stageAt } from "./src/lib/sync";
import { guessTrack, tokenOverlap } from "./src/lib/track";
import { extractVideoId, extractVideoRef, parseTimestampSeconds, isSpotifyTrackUrl } from "./src/lib/ids";
import { dominantScript, looksEnglish, needsEnglishCounterpart } from "./src/lib/language";
import { scoreHit } from "./src/lib/lrclib";
import { playLoader } from "./src/routes/play";
import { watchLoader } from "./src/routes/watch";
import { homeAction } from "./src/routes/home";

let failures = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) console.log(`ok   ${name}`);
  else {
    failures++;
    console.log(`FAIL ${name}`, extra ?? "");
  }
}

// 1. Multi-timestamp fan-out.
const multi = parseLrc("[00:12.00][00:45.00]chorus words\n[00:20.00]verse\n", 120_000);
check("multi-tag fans out to 3 lines", multi.lines.length === 3, multi.lines.length);
check(
  "multi-tag timestamps land on both hits",
  multi.lines.some((l) => l.startMs === 12_000 && l.text === "chorus words") &&
    multi.lines.some((l) => l.startMs === 45_000 && l.text === "chorus words"),
);
check("multi-tag sorted", multi.lines.map((l) => l.startMs).join(",") === "12000,20000,45000");

// 2. Offset + length + hour tags; deterministic ids.
const off = parseLrc("[offset:+500]\n[00:10.00]hello\n", 60_000);
check("offset header applied", off.lines[0]?.startMs === 10_500, off.lines[0]?.startMs);
const hour = parseLrc("[01:02:03.00]late line\n", 4_000_000);
check("hour tag parsed", hour.lines[0]?.startMs === 3723000, hour.lines[0]?.startMs);
const withLen = parseLrc("[length:03:30]\n[00:10.00]a\n", 0);
check("length header extends last line", (withLen.lines[0]?.endMs ?? 0) >= 200_000, withLen.lines[0]?.endMs);
check("deterministic ids stable", lineId(12000, "x") === lineId(12000, "x"));

// 3. Overlap repair: sloppy file can't double-highlight.
const overlap = parseLrc("[00:10.00]one\n[00:11.00]two\n", 60_000);
check(
  "overlap repaired",
  (overlap.lines[0]?.endMs ?? -1) === 11_000,
  overlap.lines.map((l) => [l.startMs, l.endMs]),
);

// 4. Section headers marked, never singable-stealing.
const sec = parseLrc("[00:10.00][Chorus]\n[00:12.00]sing this\n", 60_000);
check("section flagged", sec.lines[0]?.isSection === true && sec.lines[1]?.isSection === false, sec.lines);
check("active skips section header", activeIndexAt(sec.lines, 10_500, 0) === -1, activeIndexAt(sec.lines, 10_500, 0));

// 5. Metadata/empty skipped; endMs from next line.
const meta = parseLrc("[ar:Artist]\n[ti:Title]\n[00:01.00]a\n[00:02.00]\n[00:03.00]b\n", 60_000);
check("metadata/empty skipped", meta.lines.length === 2, meta.lines.length);
check("endMs inferred", meta.lines[0]?.endMs === 3_000, meta.lines[0]?.endMs);

// 6. Plain fallback weighted + adaptive intro.
const plain = parsePlain("short\nthis is a much longer lyric line here\n", 62_000);
check("plain yields 2 lines", plain.lines.length === 2);
check("plain first after intro", (plain.lines[0]?.startMs ?? 0) >= 800, plain.lines[0]?.startMs);
check(
  "plain longer gets more time",
  (plain.lines[1]?.endMs ?? 0) - (plain.lines[1]?.startMs ?? 0) >
    ((plain.lines[0]?.endMs ?? 0) - (plain.lines[0]?.startMs ?? 0)),
  plain.lines.map((l) => l.endMs - l.startMs),
);
check("plain autoTimed", plain.autoTimed && !plain.synced);
check("unified prefers synced", parseLyricsText("[00:01.00]x\n", 10_000).synced);
check("unified falls back", parseLyricsText("just words\n", 10_000).autoTimed);

// 7. Sync core.
const lines = parseLrc("[00:10.00]one\n[00:20.00]two\n[00:30.00]three\n", 60_000).lines;
check("indexAtTime binary search", indexAtTime(lines, 25_000) === 1);
check("active inside line", activeIndexAt(lines, 21_000, 0) === 1);
check("active before first is -1", activeIndexAt(lines, 5_000, 0) === -1);
const gapped = [
  { id: "a", startMs: 10_000, endMs: 12_000, text: "one", isSection: false },
  { id: "b", startMs: 20_000, endMs: 25_000, text: "two", isSection: false },
];
check("soft-gap hold keeps line", activeIndexAt(gapped, 12_500, 0) === 0);
check("past hold clears", activeIndexAt(gapped, 15_000, 0) === -1);
check("offset shifts active", activeIndexAt(lines, 19_800, 500) === 1);
const st = stageAt(lines, 5_000, 0, 60_000);
check("stage intro", st.mode === "intro" && st.gapLabel === "♪ Intro ♪", st);
check("stage outro", stageAt(lines, 62_000, 0, 60_000).mode === "outro");
check("last line holds past end", stageAt(lines, 60_500, 0, 60_000).mode === "lyric");

// 8. Title guesses incl. venue tail + colon + by-pattern.
const g1 = guessTrack("YOASOBI - Yoru ni Kakeru (Official Music Video)", "YOASOBI");
check("dash + promo strip", g1.artist === "YOASOBI" && g1.track === "Yoru ni Kakeru", g1);
const g2 = guessTrack("Never Gonna Give You Up", "Rick Astley");
check("author fallback", g2.artist === "Rick Astley" && g2.track === "Never Gonna Give You Up", g2);
const g3 = guessTrack("Artist - Track - Live at Royal Albert Hall", "Artist");
check("venue tail stripped", g3.track === "Track", g3);
const g4 = guessTrack("Hello (by Adele)", "");
check("by-pattern", g4.artist === "Adele" && g4.track === "Hello", g4);
check("token overlap sane", tokenOverlap("lovely day", "love") < tokenOverlap("lovely day", "lovely day"));

// 9. LRCLIB ranker prefers token overlap over substring.
const hitA = { id: 1, trackName: "Love", artistName: "X", albumName: "", duration: 200, instrumental: false, plainLyrics: "a", syncedLyrics: "[00:01.00]a" };
const hitB = { id: 2, trackName: "Lovely Day", artistName: "X", albumName: "", duration: 200, instrumental: false, plainLyrics: "a", syncedLyrics: "[00:01.00]a" };
check("ranker prefers closer title", scoreHit(hitB, "Lovely Day", "X", 200) > scoreHit(hitA, "Lovely Day", "X", 200));

// 10. URL extraction + timestamps.
check("watch URL", extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ") === "dQw4w9WgXcQ");
check("youtu.be", extractVideoId("https://youtu.be/dQw4w9WgXcQ?si=abc") === "dQw4w9WgXcQ");
check("shorts", extractVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ") === "dQw4w9WgXcQ");
check("bare id", extractVideoId("dQw4w9WgXcQ") === "dQw4w9WgXcQ");
check("relative /play", extractVideoId("/play/dQw4w9WgXcQ") === "dQw4w9WgXcQ");
check("garbage null", extractVideoId("not a link") === null);
check("spotify detected", isSpotifyTrackUrl("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQ") === true);
check("spotify not youtube", extractVideoId("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQ") === null);
check("t= preserved", extractVideoRef("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90")?.startAt === 90);
check("1m30s parsed", parseTimestampSeconds("1m30s") === 90);
check("1:30 parsed", parseTimestampSeconds("1:30") === 90);

// 11. Language routing.
check("english detected", looksEnglish("and the time is now we will go together") === true);
check("latin non-english not english", looksEnglish("soramimi word salad zyx qqq") === false);
check("cjk needs counterpart", needsEnglishCounterpart("夜に駆ける 君と") === true);
check("english needs none", needsEnglishCounterpart("and the time is now we will go together forever") === false);
check("script cjk", dominantScript("夜に駆ける") === "cjk");

// 12. Loaders + action.
const good = (await playLoader({
  params: { videoId: "dQw4w9WgXcQ" },
  request: new Request("http://localhost/play/dQw4w9WgXcQ"),
} as never)) as { videoId: string; startAt: number };
check("loader accepts valid id", good.videoId === "dQw4w9WgXcQ", good);
const timed = (await playLoader({
  params: { videoId: "dQw4w9WgXcQ" },
  request: new Request("http://localhost/play/dQw4w9WgXcQ?t=90"),
} as never)) as { startAt: number };
check("loader keeps ?t=", timed.startAt === 90, timed);

let threw: Response | null = null;
try {
  await playLoader({ params: { videoId: "too-short" }, request: new Request("http://localhost/") } as never);
} catch (e) {
  threw = e as Response;
}
check("loader rejects bad id with 404", threw instanceof Response && threw.status === 404, threw?.status);

const watchRedir = (await watchLoader({
  request: new Request("http://localhost/watch?v=dQw4w9WgXcQ&t=65"),
} as never)) as Response;
check(
  "watch redirects with timestamp",
  watchRedir instanceof Response && watchRedir.headers.get("Location") === "/play/dQw4w9WgXcQ?t=65",
  watchRedir instanceof Response ? watchRedir.headers.get("Location") : watchRedir,
);

function postAction(url: string) {
  const form = new FormData();
  form.set("url", url);
  return homeAction({ request: new Request("http://localhost/", { method: "POST", body: form }) } as never);
}

const redir = (await postAction("https://www.youtube.com/watch?v=dQw4w9WgXcQ")) as unknown as Response;
check(
  "action redirects valid link",
  redir instanceof Response && redir.status === 302 && redir.headers.get("Location") === "/play/dQw4w9WgXcQ",
  redir instanceof Response ? `${redir.status} ${redir.headers.get("Location")}` : redir,
);

const timedAction = (await postAction("https://youtu.be/dQw4w9WgXcQ?t=75")) as unknown as Response;
check(
  "action preserves timestamp",
  timedAction instanceof Response && timedAction.headers.get("Location") === "/play/dQw4w9WgXcQ?t=75",
  timedAction instanceof Response ? timedAction.headers.get("Location") : timedAction,
);

const bad = (await postAction("hello world")) as unknown as { error?: string };
check("action errors on garbage", typeof bad?.error === "string" && bad.error.length > 0, bad);

const spot = (await postAction("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQ")) as unknown as {
  error?: string;
};
check("action explains spotify", typeof spot?.error === "string" && /spotify/i.test(spot.error), spot);

if (failures > 0) {
  console.log(`\n${failures} FAILURE(S)`);
  process.exit(1);
}
console.log("\nall smoke checks passed");
