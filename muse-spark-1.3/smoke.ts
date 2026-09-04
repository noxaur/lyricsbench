/** Smoke checks for the pure lyric libs. Run: bundled with esbuild, executed with node. */
import { parseLrc, parsePlain, parseLyricsText } from "./src/lib/lrc";
import { activeIndexAt, indexAtTime, stageAt } from "./src/lib/sync";
import { guessTrack } from "./src/lib/title";
import { extractVideoId, isSpotifyTrackUrl } from "./src/lib/youtube";
import { dominantScript, looksEnglish, needsEnglishCounterpart } from "./src/lib/language";
import { playLoader } from "./src/routes/play";
import { homeAction } from "./src/routes/home";

let failures = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) console.log(`ok   ${name}`);
  else {
    failures++;
    console.log(`FAIL ${name}`, extra ?? "");
  }
}

// 1. Multi-timestamp fan-out (the old #78 bug: second tag dropped).
const multi = parseLrc("[00:12.00][00:45.00]chorus words\n[00:20.00]verse\n", 120_000);
check("multi-tag fans out to 3 lines", multi.lines.length === 3, multi.lines.length);
check(
  "multi-tag timestamps land on both hits",
  multi.lines.some((l) => l.startMs === 12_000 && l.text === "chorus words") &&
    multi.lines.some((l) => l.startMs === 45_000 && l.text === "chorus words"),
);
check("multi-tag sorted", multi.lines.map((l) => l.startMs).join(",") === "12000,20000,45000");

// 2. [offset:] header shifts every line (old parser ignored it).
const off = parseLrc("[offset:+500]\n[00:10.00]hello\n", 60_000);
check("offset header applied", off.lines[0]?.startMs === 10_500, off.lines[0]?.startMs);

// 3. Metadata + timestamp-only separators skipped; endMs inferred from next line.
const meta = parseLrc("[ar:Artist]\n[ti:Title]\n[00:01.00]a\n[00:02.00]\n[00:03.00]b\n", 60_000);
check("metadata/empty lines skipped", meta.lines.length === 2, meta.lines.length);
check("endMs inferred from next start", meta.lines[0]?.endMs === 3_000, meta.lines[0]?.endMs);

// 4. Plain fallback is weighted, not equal-sliced; intro lead-in exists.
const plain = parsePlain("short\nthis is a much longer lyric line here\n", 62_000);
check("plain yields 2 lines", plain.lines.length === 2);
check("plain first line after intro", (plain.lines[0]?.startMs ?? 0) >= 1000, plain.lines[0]?.startMs);
check(
  "plain longer line gets more time",
  (plain.lines[1]?.endMs ?? 0) - (plain.lines[1]?.startMs ?? 0) >
    ((plain.lines[0]?.endMs ?? 0) - (plain.lines[0]?.startMs ?? 0)),
  plain.lines.map((l) => l.endMs - l.startMs),
);
check("plain flagged autoTimed", plain.autoTimed && !plain.synced);

// 5. parseLyricsText prefers LRC, falls back to plain.
check("unified prefers synced", parseLyricsText("[00:01.00]x\n", 10_000).synced);
check("unified falls back", parseLyricsText("just words\n", 10_000).autoTimed);

// 6. Sync: binary search + single active definition.
const lines = parseLrc("[00:10.00]one\n[00:20.00]two\n[00:30.00]three\n", 60_000).lines;
check("indexAtTime binary search", indexAtTime(lines, 25_000) === 1);
check("active inside line", activeIndexAt(lines, 21_000, 0) === 1);
check("active before first is -1", activeIndexAt(lines, 5_000, 0) === -1);
// Real gap: hand-built lines where line 0 ends well before line 1 starts.
const gapped = [
  { id: "a", startMs: 10_000, endMs: 12_000, text: "one" },
  { id: "b", startMs: 20_000, endMs: 25_000, text: "two" },
];
check("soft-gap hold keeps line", activeIndexAt(gapped, 12_500, 0) === 0);
check("past hold window clears", activeIndexAt(gapped, 15_000, 0) === -1);
check("offset shifts active", activeIndexAt(lines, 19_800, 500) === 1, activeIndexAt(lines, 19_800, 500));
const st = stageAt(lines, 5_000, 0, 60_000);
check("stage intro mode", st.mode === "intro" && st.gapLabel === "♪ Intro ♪", st);
const stOut = stageAt(lines, 62_000, 0, 60_000);
check("stage outro mode", stOut.mode === "outro", stOut);
check(
  "last line holds briefly past its end",
  stageAt(lines, 60_500, 0, 60_000).mode === "lyric",
);
const stIdle = stageAt(
  [
    { id: "a", startMs: 10_000, endMs: 12_000, text: "one" },
    { id: "b", startMs: 20_000, endMs: 40_000, text: "two" },
  ],
  50_000,
  0,
  60_000,
);
check("far past outro window is idle", stIdle.mode === "idle", stIdle);

// 7. Title guesses.
const g1 = guessTrack("YOASOBI - Yoru ni Kakeru (Official Music Video)", "YOASOBI");
check("dash split + promo strip", g1.artist === "YOASOBI" && g1.track === "Yoru ni Kakeru", g1);
const g2 = guessTrack("Never Gonna Give You Up", "Rick Astley");
check("author fallback", g2.artist === "Rick Astley" && g2.track === "Never Gonna Give You Up", g2);

// 8. URL extraction single-pass.
check("watch URL", extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ") === "dQw4w9WgXcQ");
check("youtu.be", extractVideoId("https://youtu.be/dQw4w9WgXcQ?si=abc") === "dQw4w9WgXcQ");
check("shorts", extractVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ") === "dQw4w9WgXcQ");
check("bare id", extractVideoId("dQw4w9WgXcQ") === "dQw4w9WgXcQ");
check("relative /play", extractVideoId("/play/dQw4w9WgXcQ") === "dQw4w9WgXcQ");
check("garbage null", extractVideoId("not a link") === null);
check("spotify detected", isSpotifyTrackUrl("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQ") === true);
check("spotify not confused with youtube", extractVideoId("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQ") === null);

// 9. Language routing (bug #77: never assume non-English).
check("english detected", looksEnglish("and the time is now we will go together") === true);
check("latin non-english not english", looksEnglish("soramimi word salad zyx qqq") === false);
check("cjk needs counterpart", needsEnglishCounterpart("夜に駆ける 君と") === true);
check("english needs none", needsEnglishCounterpart("and the time is now we will go together forever") === false);
check("script cjk", dominantScript("夜に駆ける") === "cjk");

// 10. Route layer: loader validation + home action.
const good = (await playLoader({ params: { videoId: "dQw4w9WgXcQ" } }) as unknown as {
  videoId: string;
});
check("loader accepts valid id", good.videoId === "dQw4w9WgXcQ", good);

let threw: Response | null = null;
try {
  await playLoader({ params: { videoId: "too-short" } });
} catch (e) {
  threw = e as Response;
}
check("loader rejects bad id with 404", threw instanceof Response && threw.status === 404, threw?.status);

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
