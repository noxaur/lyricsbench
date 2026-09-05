export type LyricWord = {
  text: string;
  at: number;
};

export type LyricLine = {
  at: number;
  text: string;
  translation: string;
  words?: LyricWord[];
  section?: string;
};

export type Song = {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  accent: string;
  accentSoft: string;
  artwork: "violet" | "coral" | "blue" | "gold";
  lyrics: LyricLine[];
};

function words(start: number, line: string, pace = 0.42): LyricWord[] {
  return line.split(" ").map((text, index) => ({ text, at: start + index * pace }));
}

const midnightLyrics: LyricLine[] = [
  {
    at: 0,
    text: "The room is holding its breath",
    translation: "The room is holding its breath",
    section: "Opening",
    words: words(0, "The room is holding its breath"),
  },
  {
    at: 7,
    text: "while the city learns to glow",
    translation: "while the city learns to glow",
    words: words(7, "while the city learns to glow"),
  },
  {
    at: 14,
    text: "I leave the window open",
    translation: "I leave the window open",
    words: words(14, "I leave the window open"),
  },
  {
    at: 21,
    text: "for the blue noise down below",
    translation: "for the blue noise down below",
    words: words(21, "for the blue noise down below"),
  },
  {
    at: 30,
    text: "Every red light turns to water",
    translation: "Every red light turns to water",
    section: "Verse one",
    words: words(30, "Every red light turns to water", 0.38),
  },
  {
    at: 38,
    text: "every shadow knows my name",
    translation: "every shadow knows my name",
    words: words(38, "every shadow knows my name"),
  },
  {
    at: 46,
    text: "I was looking for a signal",
    translation: "I was looking for a signal",
    words: words(46, "I was looking for a signal"),
  },
  {
    at: 54,
    text: "then I found you in the frame",
    translation: "then I found you in the frame",
    words: words(54, "then I found you in the frame"),
  },
  {
    at: 65,
    text: "Stay where the light can find us",
    translation: "Stay where the light can find us",
    section: "Refrain",
    words: words(65, "Stay where the light can find us", 0.36),
  },
  {
    at: 73,
    text: "slow enough to feel it move",
    translation: "slow enough to feel it move",
    words: words(73, "slow enough to feel it move"),
  },
  {
    at: 81,
    text: "We are only ever orbiting",
    translation: "We are only ever orbiting",
    words: words(81, "We are only ever orbiting"),
  },
  {
    at: 89,
    text: "something we can almost prove",
    translation: "something we can almost prove",
    words: words(89, "something we can almost prove"),
  },
  {
    at: 102,
    text: "I keep a little thunder",
    translation: "I keep a little thunder",
    section: "Verse two",
    words: words(102, "I keep a little thunder"),
  },
  {
    at: 109,
    text: "in the pocket of my coat",
    translation: "in the pocket of my coat",
    words: words(109, "in the pocket of my coat"),
  },
  {
    at: 117,
    text: "so the quiet has a rhythm",
    translation: "so the quiet has a rhythm",
    words: words(117, "so the quiet has a rhythm"),
  },
  {
    at: 125,
    text: "when it catches in my throat",
    translation: "when it catches in my throat",
    words: words(125, "when it catches in my throat"),
  },
  {
    at: 137,
    text: "Stay where the light can find us",
    translation: "Stay where the light can find us",
    section: "Refrain",
    words: words(137, "Stay where the light can find us", 0.36),
  },
  {
    at: 145,
    text: "slow enough to feel it move",
    translation: "slow enough to feel it move",
    words: words(145, "slow enough to feel it move"),
  },
  {
    at: 153,
    text: "We are only ever orbiting",
    translation: "We are only ever orbiting",
    words: words(153, "We are only ever orbiting"),
  },
  {
    at: 161,
    text: "something we can almost prove",
    translation: "something we can almost prove",
    words: words(161, "something we can almost prove"),
  },
  {
    at: 178,
    text: "When morning writes its answer",
    translation: "When morning writes its answer",
    section: "Outro",
    words: words(178, "When morning writes its answer"),
  },
  {
    at: 186,
    text: "across the glass and through the haze",
    translation: "across the glass and through the haze",
    words: words(186, "across the glass and through the haze", 0.36),
  },
  {
    at: 194,
    text: "we will still be turning softly",
    translation: "we will still be turning softly",
    words: words(194, "we will still be turning softly"),
  },
  {
    at: 202,
    text: "toward the color of our names",
    translation: "toward the color of our names",
    words: words(202, "toward the color of our names"),
  },
];

const translations = [
  "La habitación contiene el aliento",
  "mientras la ciudad aprende a brillar",
  "Dejo la ventana abierta",
  "para el rumor azul de abajo",
  "Cada luz roja se vuelve agua",
  "cada sombra conoce mi nombre",
  "Buscaba una señal",
  "y te encontré dentro del cuadro",
  "Quédate donde pueda encontrarnos la luz",
  "lo bastante lento para sentirla moverse",
  "Solo estamos orbitando",
  "algo que casi podemos demostrar",
  "Guardo un pequeño trueno",
  "en el bolsillo de mi abrigo",
  "para que el silencio tenga ritmo",
  "cuando se queda atrapado en mi garganta",
  "Quédate donde pueda encontrarnos la luz",
  "lo bastante lento para sentirla moverse",
  "Solo estamos orbitando",
  "algo que casi podemos demostrar",
  "Cuando la mañana escriba su respuesta",
  "en el cristal y a través de la bruma",
  "seguiremos girando suavemente",
  "hacia el color de nuestros nombres",
];

const translatedLyrics = midnightLyrics.map((line, index) => ({
  ...line,
  translation: translations[index] ?? line.text,
}));

export const songs: Song[] = [
  {
    id: "midnight-amethyst",
    title: "Midnight in Amethyst",
    artist: "Luna Vale",
    album: "Soft geometry",
    duration: 218,
    accent: "#d7a8ff",
    accentSoft: "#6d4b85",
    artwork: "violet",
    lyrics: translatedLyrics,
  },
  {
    id: "glass-horizon",
    title: "Glass Horizon",
    artist: "Nori June",
    album: "Out of focus",
    duration: 218,
    accent: "#ffbd99",
    accentSoft: "#7b4a4e",
    artwork: "coral",
    lyrics: translatedLyrics,
  },
  {
    id: "after-the-rain",
    title: "After the Rain Learns",
    artist: "Mara Venn",
    album: "Luminous weather",
    duration: 218,
    accent: "#9cc8ff",
    accentSoft: "#315d8f",
    artwork: "blue",
    lyrics: translatedLyrics,
  },
  {
    id: "low-sun",
    title: "A Low Sun, A Long Way",
    artist: "Arden Hall",
    album: "Northbound",
    duration: 218,
    accent: "#ffd783",
    accentSoft: "#846525",
    artwork: "gold",
    lyrics: translatedLyrics,
  },
];

export function songForId(id: string | undefined): Song {
  const match = songs.find((song) => song.id === id);
  if (match) return match;

  const cleanId = (id || "untitled").replace(/[-_]+/g, " ").trim();
  const title = cleanId
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");

  return {
    ...songs[0],
    id: id || "untitled",
    title: title || "Untitled signal",
    artist: "From your queue",
    album: "Local session",
  };
}

export function findSongs(query: string): Song[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return songs;
  return songs.filter((song) =>
    `${song.title} ${song.artist} ${song.album}`.toLowerCase().includes(needle),
  );
}
