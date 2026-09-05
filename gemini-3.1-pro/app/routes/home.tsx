import { Form, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/home";
import { LyricsStage } from "../components/LyricsStage";
import { YouTubePlayer } from "../components/YoutubePlayer";
import { TransportControls } from "../components/TransportControls";
import { ClientOnly } from "../components/ClientOnly";
import { usePlayerStore } from "../stores/player-store";
import { extractYoutubeId, getYoutubeTitle, cleanTrackTitle } from "../lib/youtube";
import { searchLyrics } from "../lib/lrclib";
import { useEffect } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Umbra Lyrics Reader" },
    { name: "description", content: "A cool minimal lyrics player" },
  ];
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const input = formData.get("input")?.toString() || "";
  
  const id = extractYoutubeId(input);
  if (!id) {
    return { error: "Could not find a valid YouTube ID in the input." };
  }

  const title = await getYoutubeTitle(id);
  if (!title) {
    return { error: "Failed to fetch YouTube metadata." };
  }

  const q = cleanTrackTitle(title);
  const lyrics = await searchLyrics(q);

  return { 
    youtubeId: id,
    title,
    lyrics: lyrics || [] 
  };
}

export default function Home() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const { setYoutubeId, setLyrics, youtubeId } = usePlayerStore();

  useEffect(() => {
    if (actionData && !("error" in actionData)) {
        setYoutubeId((actionData as any).youtubeId);
        setLyrics((actionData as any).lyrics);
    }
  }, [actionData, setYoutubeId, setLyrics]);

  const isLoading = navigation.state === "submitting" || navigation.state === "loading";

  return (
    <div className="w-full h-screen flex flex-col items-center overflow-hidden relative">
      {/* Header / Setup */}
      <div className={`w-full max-w-2xl px-6 py-6 z-10 transition-all duration-700 ease-in-out ${youtubeId ? 'opacity-0 hover:opacity-100 absolute top-0' : 'pt-[30vh] opacity-100 flex-none'}`}>
          <h1 className="text-2xl font-bold mb-6 text-center text-ink-primary">Umbra</h1>
          <Form method="post" className="flex flex-col gap-4">
              <div className="flex gap-2">
                 <input 
                    name="input"
                    type="text" 
                    placeholder="Paste YouTube link (e.g. youtu.be/...)"
                    className="flex-1 bg-surface-card text-ink-primary border border-border-subtle rounded-lg h-[2.75rem] px-[0.75rem] outline-none focus:border-stage-violet focus:ring-1 focus:ring-stage-violet transition-all"
                    autoComplete="off"
                    required
                 />
                 <button 
                    type="submit" 
                    disabled={isLoading}
                    className="bg-stage-violet text-stage-violet-ink font-semibold h-[2.75rem] px-[1rem] rounded-lg hover:opacity-90 flex items-center justify-center min-w-[80px]"
                 >
                    {isLoading ? <span className="animate-pulse">...</span> : "Play"}
                 </button>
              </div>
              {actionData && "error" in actionData && (
                  <p className="text-red-400 text-sm text-center">{(actionData as any).error}</p>
              )}
          </Form>
      </div>

      {/* Main Lyrics Stage */}
      {youtubeId && (
          <>
            <LyricsStage />
            <TransportControls />
          </>
      )}

      {/* Embedded Player */}
      <ClientOnly>
        <YouTubePlayer />
      </ClientOnly>
    </div>
  );
}
