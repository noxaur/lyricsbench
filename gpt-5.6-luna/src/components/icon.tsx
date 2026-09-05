import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "play"
  | "pause"
  | "back"
  | "forward"
  | "search"
  | "arrow-right"
  | "arrow-left"
  | "volume"
  | "volume-off"
  | "sun"
  | "moon"
  | "sliders"
  | "expand"
  | "shrink"
  | "repeat"
  | "spark"
  | "check"
  | "plus"
  | "music"
  | "close"
  | "link"
  | "queue";

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
};

const paths: Record<IconName, ReactNode> = {
  play: <path d="M6.75 4.8v14.4L18.6 12 6.75 4.8Z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <path d="M7 5.5v13" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M17 5.5v13" strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  back: <path d="M19 18 12 12l7-6M5 19V5" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />,
  forward: <path d="m5 18 7-6-7-6M19 19V5" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />,
  search: <><circle cx="10.8" cy="10.8" r="5.8" strokeWidth="1.9" /><path d="m15.2 15.2 4 4" strokeWidth="1.9" strokeLinecap="round" /></>,
  "arrow-right": <path d="M5 12h14m-6-6 6 6-6 6" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />,
  "arrow-left": <path d="M19 12H5m6 6-6-6 6-6" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />,
  volume: <><path d="M4 10v4h4l5 4V6L8 10H4Z" strokeWidth="1.8" strokeLinejoin="round" /><path d="M16 9c1 .8 1.5 1.8 1.5 3S17 14.2 16 15m2.6-8.6C20 7.8 20.7 9.7 20.7 12s-.7 4.2-2.1 5.6" strokeWidth="1.7" strokeLinecap="round" /></>,
  "volume-off": <><path d="M4 10v4h4l5 4V6L8 10H4Z" strokeWidth="1.8" strokeLinejoin="round" /><path d="m17 9 4 4m0-4-4 4" strokeWidth="1.8" strokeLinecap="round" /></>,
  sun: <><circle cx="12" cy="12" r="3.5" strokeWidth="1.8" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" strokeWidth="1.8" strokeLinecap="round" /></>,
  moon: <path d="M19.4 15.1A8.2 8.2 0 0 1 8.9 4.6 8.2 8.2 0 1 0 19.4 15.1Z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
  sliders: <><path d="M4 6h16M4 12h16M4 18h16" strokeWidth="1.8" strokeLinecap="round" /><circle cx="9" cy="6" r="2" fill="var(--surface)" strokeWidth="1.8" /><circle cx="15" cy="12" r="2" fill="var(--surface)" strokeWidth="1.8" /><circle cx="7" cy="18" r="2" fill="var(--surface)" strokeWidth="1.8" /></>,
  expand: <path d="M8 4H4v4M16 4h4v4M20 16v4h-4M4 16v4h4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
  shrink: <path d="M9 4v5H4M15 4v5h5M4 15h5v5M20 15h-5v5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
  repeat: <path d="M17 2.8 20.2 6 17 9.2M3.8 6h16.4M7 21.2 3.8 18 7 14.8M20.2 18H3.8" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
  spark: <path d="m12 2 1.55 6.45L20 10l-6.45 1.55L12 18l-1.55-6.45L4 10l6.45-1.55L12 2Zm7 14 0.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" strokeWidth="1.35" strokeLinejoin="round" />,
  check: <path d="m5 12.5 4.2 4.1L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  plus: <path d="M12 5v14M5 12h14" strokeWidth="1.9" strokeLinecap="round" />,
  music: <><path d="M9 18.5a2.5 2.5 0 1 1-2.5-2.5A2.5 2.5 0 0 1 9 18.5Zm0 0V6l10-2v11.5a2.5 2.5 0 1 1-2.5-2.5A2.5 2.5 0 0 1 19 15.5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></>,
  close: <path d="m6 6 12 12M18 6 6 18" strokeWidth="1.9" strokeLinecap="round" />,
  link: <path d="M10 13.8a4 4 0 0 0 5.7.1l2.1-2.1a4 4 0 0 0-5.7-5.7l-1.2 1.2M14 10.2a4 4 0 0 0-5.7-.1l-2.1 2.1a4 4 0 0 0 5.7 5.7l1.2-1.2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
  queue: <><path d="M4 6h10M4 12h10M4 18h6" strokeWidth="1.8" strokeLinecap="round" /><path d="m18 15 3 3-3 3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></>,
};

export function Icon({ name, size = 20, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
