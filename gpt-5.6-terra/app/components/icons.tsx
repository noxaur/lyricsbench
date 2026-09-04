import type { SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function IconFrame({ size = 20, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export function PlayIcon(props: IconProps) {
  return <IconFrame {...props}><path d="m8 5 11 7-11 7V5Z" fill="currentColor" stroke="none" /></IconFrame>
}

export function PauseIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M8 5v14M16 5v14" strokeWidth="2.4" /></IconFrame>
}

export function BackIcon(props: IconProps) {
  return <IconFrame {...props}><path d="m15 18-6-6 6-6" /><path d="M9 12h10" /></IconFrame>
}

export function SearchIcon(props: IconProps) {
  return <IconFrame {...props}><circle cx="10.7" cy="10.7" r="5.8" /><path d="m15.2 15.2 4.2 4.2" /></IconFrame>
}

export function LinkIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M10.1 13.9a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.2 1.2" /><path d="M13.9 10.1a5 5 0 0 0-7.1-.1l-2 2a5 5 0 0 0 7.1 7.1l1.2-1.2" /></IconFrame>
}

export function ArrowIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M5 12h13" /><path d="m13 6 6 6-6 6" /></IconFrame>
}

export function MoonIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M20.4 15.1A8.3 8.3 0 0 1 8.9 3.6 8.3 8.3 0 1 0 20.4 15.1Z" /></IconFrame>
}

export function SunIcon(props: IconProps) {
  return <IconFrame {...props}><circle cx="12" cy="12" r="3.4" /><path d="M12 2v2.2M12 19.8V22M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M2 12h2.2M19.8 12H22M4.9 19.1l1.5-1.5M17.6 6.4l1.5-1.5" /></IconFrame>
}

export function VolumeIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M4 10v4h3l4 3V7l-4 3H4Z" /><path d="M15 9.1a4.1 4.1 0 0 1 0 5.8M17.7 6.4a7.9 7.9 0 0 1 0 11.2" /></IconFrame>
}

export function VideoIcon(props: IconProps) {
  return <IconFrame {...props}><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3" /></IconFrame>
}

export function VideoOffIcon(props: IconProps) {
  return <IconFrame {...props}><path d="m3 3 18 18" /><path d="M10.6 6H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3.6" /><path d="m16 10 5-3v10l-2.6-1.6" /></IconFrame>
}

export function ExpandIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5" /></IconFrame>
}

export function CollapseIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M8 3v5H3M16 3v5h5M21 16h-5v5M3 16h5v5" /></IconFrame>
}

export function TuneIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></IconFrame>
}

export function ClockIcon(props: IconProps) {
  return <IconFrame {...props}><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></IconFrame>
}

export function CheckIcon(props: IconProps) {
  return <IconFrame {...props}><path d="m5 12 4.1 4.1L19 6.4" strokeWidth="2.4" /></IconFrame>
}

export function PlusIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M12 5v14M5 12h14" /></IconFrame>
}

export function MinusIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M5 12h14" /></IconFrame>
}

export function CloseIcon(props: IconProps) {
  return <IconFrame {...props}><path d="m6 6 12 12M18 6 6 18" /></IconFrame>
}

export function RefreshIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M20 11a8 8 0 0 0-14.8-4L3 10" /><path d="M3 5v5h5" /><path d="M4 13a8 8 0 0 0 14.8 4L21 14" /><path d="M21 19v-5h-5" /></IconFrame>
}

export function SparkIcon(props: IconProps) {
  return <IconFrame {...props}><path d="m12 2 1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6L12 2Z" /><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" /></IconFrame>
}

export function LibraryIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M5 4h14v16H5z" /><path d="M8.5 8h7M8.5 12h7M8.5 16h4" /></IconFrame>
}
