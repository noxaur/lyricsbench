import type { LyricsResult } from "../types/lyrics"

export type SampleSong = {
  videoId: string
  title: string
  artist: string
  track: string
  album: string
  durationSec: number
  thumbnail: string
  audioUrl?: string
  lyrics: LyricsResult
}

export const SAMPLE_SONGS: SampleSong[] = [
  {
    videoId: "dQw4w9WgXcQ",
    title: "Rick Astley - Never Gonna Give You Up",
    artist: "Rick Astley",
    track: "Never Gonna Give You Up",
    album: "Whenever You Need Somebody",
    durationSec: 213,
    thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    lyrics: {
      id: "sample-rick",
      providerId: "lrclib",
      plainLyrics: `We're no strangers to love
You know the rules and so do I
A full commitment's what I'm thinking of
You wouldn't get this from any other guy
I just wanna tell you how I'm feeling
Gotta make you understand

Never gonna give you up
Never gonna let you down
Never gonna run around and desert you
Never gonna make you cry
Never gonna say goodbye
Never gonna tell a lie and hurt you`,
      syncedLyrics: `[00:18.50]We're no strangers to love
[00:22.80]You know the rules and so do I
[00:27.10]A full commitment's what I'm thinking of
[00:31.40]You wouldn't get this from any other guy
[00:35.30]I just wanna tell you how I'm feeling
[00:39.90]Gotta make you understand
[00:43.10][Chorus]
[00:43.30]Never gonna give you up
[00:45.40]Never gonna let you down
[00:47.50]Never gonna run around and desert you
[00:51.80]Never gonna make you cry
[00:53.90]Never gonna say goodbye
[00:56.20]Never gonna tell a lie and hurt you
[01:00.60]We've known each other for so long
[01:04.90]Your heart's been aching, but you're too shy to say it
[01:09.10]Inside, we both know what's been going on
[01:13.40]We know the game, and we're gonna play it
[01:17.30]And if you ask me how I'm feeling
[01:22.00]Don't tell me you're too blind to see
[01:25.20][Chorus]
[01:25.40]Never gonna give you up
[01:27.50]Never gonna let you down
[01:29.70]Never gonna run around and desert you
[01:33.90]Never gonna make you cry
[01:36.00]Never gonna say goodbye
[01:38.20]Never gonna tell a lie and hurt you`,
    },
  },
  {
    videoId: "fJ9rUzIMcZQ",
    title: "Queen – Bohemian Rhapsody",
    artist: "Queen",
    track: "Bohemian Rhapsody",
    album: "A Night at the Opera",
    durationSec: 359,
    thumbnail: "https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg",
    lyrics: {
      id: "sample-queen",
      providerId: "lrclib",
      syncedLyrics: `[00:00.50]Is this the real life?
[00:04.20]Is this just fantasy?
[00:08.50]Caught in a landside
[00:11.80]No escape from reality
[00:16.40]Open your eyes
[00:20.50]Look up to the skies and see
[00:27.50]I'm just a poor boy, I need no sympathy
[00:34.00]Because I'm easy come, easy go
[00:37.50]Little high, little low
[00:41.20]Any way the wind blows doesn't really matter to me, to me
[00:55.50]Mama, just killed a man
[01:03.00]Put a gun against his head, pulled my trigger, now he's dead
[01:13.20]Mama, life had just begun
[01:20.50]But now I've gone and thrown it all away
[01:29.00]Mama, ooh, didn't mean to make you cry
[01:38.50]If I'm not back again this time tomorrow
[01:43.80]Carry on, carry on as if nothing really matters`,
    },
  },
  {
    videoId: "SX_ViT4Ra7k",
    title: "米津玄師 - Lemon (Kenshi Yonezu)",
    artist: "米津玄師 (Kenshi Yonezu)",
    track: "Lemon",
    album: "STRAY SHEEP",
    durationSec: 256,
    thumbnail: "https://i.ytimg.com/vi/SX_ViT4Ra7k/hqdefault.jpg",
    lyrics: {
      id: "sample-lemon",
      providerId: "lrclib",
      syncedLyrics: `[00:00.00]夢ならばどれほどよかったでしょう
[00:06.50]未だにあなたのことを夢にみる
[00:13.20]忘れた物を取りに帰るように
[00:19.80]古びた思い出の埃を払う
[00:27.00]戻らない幸せがあることを
[00:33.50]最後にあなたが教えてくれた
[00:40.20]言えずに隠してた昏い過去も
[00:47.00]あなたがいなきゃ永遠に昏いまま
[00:54.00][Chorus]
[00:54.20]きっともうこれ以上 傷つくことなど
[01:00.50]ありはしないとわかっている
[01:07.00]あの日の悲しみさえ あの日の苦しみさえ
[01:14.20]そのすべてを愛してた あなたとともに
[01:21.00]胸に残り離れない 苦いレモンの匂い
[01:27.80]雨が降り止むまでは帰れない
[01:34.50]今でもあなたはわたしの光`,
    },
  },
]
