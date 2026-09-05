import { liveSlug } from "./lab-live.mjs"
import { benches } from "./benches"

export type LabModel = {
  id: string
  name: string
  slug?: string
  status: "live" | "coming_soon"
}

export type FrontierLab = {
  id: string
  name: string
  shortName: string
  models: LabModel[]
}

export const frontierLabs: FrontierLab[] = [
  {
    id: "xai",
    name: "xAI",
    shortName: "xAI",
    models: [
      { id: "grok-4.5", name: "Grok 4.5", slug: "grok-4.5", status: "live" },
      { id: "grok-4.6", name: "Grok 4.6", slug: "grok-4.6", status: "live" },
      { id: "grok-5", name: "Grok 5", status: "coming_soon" },
    ],
  },
  {
    id: "cursor",
    name: "Cursor",
    shortName: "Cursor",
    models: [
      { id: "composer-2.5", name: "Composer 2.5", slug: "composer-2.5", status: "live" },
      { id: "composer-2.5-fast", name: "Composer 2.5 Fast", status: "coming_soon" },
    ],
  },
  {
    id: "google",
    name: "Google DeepMind",
    shortName: "Google",
    models: [
      { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro", slug: "gemini-3.1-pro", status: "live" },
      { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", slug: "gemini-3.8-flash", status: "live" },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    shortName: "Anthropic",
    models: [
      { id: "soul", name: "Soul", status: "coming_soon" },
      { id: "opus", name: "Opus", status: "coming_soon" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    shortName: "OpenAI",
    models: [
      { id: "gpt-5.6-terra", name: "GPT-5.6 Terra", slug: "gpt-5.6-terra", status: "live" },
      { id: "gpt-5.6-luna", name: "GPT-5.6 Luna", slug: "gpt-5.6-luna", status: "coming_soon" },
    ],
  },
  {
    id: "xiaomi",
    name: "Xiaomi",
    shortName: "Xiaomi",
    models: [
      { id: "mimo-v2.5", name: "Mimo v2.5", slug: "mimo-v2.5", status: "live" },
    ],
  },
  {
    id: "muse",
    name: "Muse",
    shortName: "Muse",
    models: [
      { id: "muse-spark-1.3", name: "Muse Spark 1.3", slug: "muse-spark-1.3", status: "live" },
      { id: "muse-spark-1.2", name: "Muse Spark 1.2", slug: "muse-spark-1.2", status: "live" },
    ],
  },
]

export function liveSlugFor(model: LabModel) {
  return liveSlug(model, benches)
}

export function getLabForSlug(slug: string): FrontierLab | undefined {
  return frontierLabs.find((lab) =>
    lab.models.some((model) => model.slug === slug || model.id === slug || liveSlugFor(model) === slug),
  )
}

export function getLabById(id: string): FrontierLab | undefined {
  return frontierLabs.find((lab) => lab.id === id)
}

export function groupBenchesByLab<T extends { slug: string }>(
  items: T[],
): { lab: FrontierLab; items: T[] }[] {
  const bySlug = new Map(items.map((item) => [item.slug, item]))
  const groups: { lab: FrontierLab; items: T[] }[] = []
  const used = new Set<string>()

  for (const lab of frontierLabs) {
    const labItems: T[] = []
    for (const model of lab.models) {
      const slug = liveSlug(model, items)
      if (!slug) continue
      const item = bySlug.get(slug)
      if (item) {
        labItems.push(item)
        used.add(item.slug)
      }
    }
    if (labItems.length) groups.push({ lab, items: labItems })
  }

  const leftovers = items.filter((item) => !used.has(item.slug))
  if (leftovers.length) {
    groups.push({
      lab: { id: "other", name: "Other", shortName: "Other", models: [] },
      items: leftovers,
    })
  }
  return groups
}

function BrandMark({
  d,
  size,
  className,
  fill = "currentColor",
}: {
  d: string
  size: number
  className: string
  fill?: string
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}

export function ProviderLogo({
  labId,
  size = 14,
  className = "",
}: {
  labId: string
  size?: number
  className?: string
}) {
  switch (labId) {
    case "xai":
      return (
        <BrandMark
          className={className}
          size={size}
          d="M6.469 8.776 16.512 23h-4.464L2.005 8.776H6.47zm-.004 7.9 2.233 3.164L6.467 23H2l4.465-6.324zM22 2.582V23h-3.659V7.764L22 2.582zM22 1l-9.952 14.095-2.233-3.163L17.533 1H22z"
        />
      )
    case "cursor":
      return (
        <BrandMark
          className={className}
          size={size}
          d="M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23"
        />
      )
    case "google":
      return (
        <BrandMark
          className={className}
          size={size}
          fill="#4285F4"
          d="m5.99 1.62a8.54 8.54 0 0 0-2.54 6.83c.35 4.4 4.51 7.99 8.28 7.99 3.5 0 4.88-3.06 4.54-5.14a4.32 4.32 0 0 0-.95-2.07c.63.34 1.24.77 1.81 1.3 1.52 1.41 2.44 3.23 2.58 5.1.33 4.13-2.73 8.37-7.85 8.37-1.69 0-3.48-.43-4.98-1.14C2.82 20.94 0 16.8 0 12c0-4.43 2.41-8.3 5.99-10.38zm6.15-1.62c1.69 0 3.48.43 4.98 1.14A12 12 0 0 1 24 12c0 4.43-2.41 8.3-5.99 10.38a8.54 8.54 0 0 0 2.54-6.83c-.35-4.4-4.51-7.99-8.28-7.99-3.5 0-4.88 3.06-4.54 5.14a4.3 4.3 0 0 0 .96 2.07 8.72 8.72 0 0 1-1.81-1.3c-1.52-1.41-2.44-3.23-2.59-5.1C3.96 4.24 7.02 0 12.14 0z"
        />
      )
    case "anthropic":
      return (
        <BrandMark
          className={className}
          size={size}
          d="M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z"
        />
      )
    case "openai":
      return (
        <BrandMark
          className={className}
          size={size}
          d="M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z"
        />
      )
    case "xiaomi":
      return (
        <BrandMark
          className={className}
          size={size}
          fill="#FF6900"
          d="M12 0C8.016 0 4.756.255 2.493 2.516.23 4.776 0 8.033 0 12.012c0 3.98.23 7.235 2.494 9.497C4.757 23.77 8.017 24 12 24c3.983 0 7.243-.23 9.506-2.491C23.77 19.247 24 15.99 24 12.012c0-3.984-.233-7.243-2.502-9.504C19.234.252 15.978 0 12 0zM4.906 7.405h5.624c1.47 0 3.007.068 3.764.827.746.746.827 2.233.83 3.676v4.54a.15.15 0 0 1-.152.147h-1.947a.15.15 0 0 1-.152-.148V11.83c-.002-.806-.048-1.634-.464-2.051-.358-.36-1.026-.441-1.72-.458H7.158a.15.15 0 0 0-.151.147v6.98a.15.15 0 0 1-.152.148H4.906a.15.15 0 0 1-.15-.148V7.554a.15.15 0 0 1 .15-.149zm12.131 0h1.949a.15.15 0 0 1 .15.15v8.892a.15.15 0 0 1-.15.148h-1.949a.15.15 0 0 1-.151-.148V7.554a.15.15 0 0 1 .151-.149zM8.92 10.948h2.046c.083 0 .15.066.15.147v5.352a.15.15 0 0 1-.15.148H8.92a.15.15 0 0 1-.152-.148v-5.352a.15.15 0 0 1 .152-.147Z"
        />
      )
    case "muse":
      return (
        <BrandMark
          className={className}
          size={size}
          d="M12 2a1 1 0 0 1 1 1v18a1 1 0 0 1-2 0V3a1 1 0 0 1 1-1zm-5 4a1 1 0 0 1 1 1v10a1 1 0 0 1-2 0V7a1 1 0 0 1 1-1zm10 0a1 1 0 0 1 1 1v10a1 1 0 0 1-2 0V7a1 1 0 0 1 1-1zM2 10a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0v-2a1 1 0 0 1 1-1zm20 0a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0v-2a1 1 0 0 1 1-1z"
        />
      )
    default:
      return (
        <svg
          className={className}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
        </svg>
      )
  }
}
