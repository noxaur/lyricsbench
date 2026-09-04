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
    id: "google",
    name: "Google DeepMind",
    shortName: "Google",
    models: [
      { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", slug: "gemini-3.8-flash", status: "live" },
      { id: "gemini-3.8-pro", name: "Gemini 3.8 Pro", status: "coming_soon" },
    ],
  },
  {
    id: "xai",
    name: "xAI",
    shortName: "xAI",
    models: [
      { id: "grok-4.6", name: "Grok 4.6", slug: "grok-4.6", status: "live" },
      { id: "grok-5", name: "Grok 5", status: "coming_soon" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    shortName: "OpenAI",
    models: [
      { id: "gpt-5", name: "GPT-5", status: "coming_soon" },
      { id: "o3", name: "o3", status: "coming_soon" },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    shortName: "Anthropic",
    models: [
      { id: "claude-3.7-sonnet", name: "Claude 3.7 Sonnet", status: "coming_soon" },
      { id: "claude-4-opus", name: "Claude 4 Opus", status: "coming_soon" },
    ],
  },
  {
    id: "xiaomi",
    name: "Xiaomi",
    shortName: "Xiaomi",
    models: [
      { id: "mimo-v2.5", name: "Mimo v2.5", slug: "mimo-v2.5", status: "live" },
      { id: "mimo-v3", name: "Mimo v3.0", status: "coming_soon" },
    ],
  },
  {
    id: "muse",
    name: "Muse",
    shortName: "Muse",
    models: [
      { id: "muse-spark-1.3", name: "Muse Spark 1.3", slug: "muse-spark-1.3", status: "live" },
      { id: "muse-spark-1.2", name: "Muse Spark 1.2", slug: "muse-spark-1.2", status: "live" },
      { id: "muse-spark-2", name: "Muse Spark 2.0", status: "coming_soon" },
    ],
  },
]

export function getLabForSlug(slug: string): FrontierLab | undefined {
  return frontierLabs.find((lab) => lab.models.some((m) => m.slug === slug))
}

export function getLabById(id: string): FrontierLab | undefined {
  return frontierLabs.find((lab) => lab.id === id)
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
    case "google":
      return (
        <svg
          className={className}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
          />
        </svg>
      )
    case "xai":
      return (
        <svg
          className={className}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      )
    case "openai":
      return (
        <svg
          className={className}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.5973 8.3829l2.0201-1.1639a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4022-.6859zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.0069 9.2299V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813l-.0048 6.7227zm1.145-1.9728l3.4116-1.9681 3.4115 1.9681v3.9363l-3.4115 1.9681-3.4116-1.9681z" />
        </svg>
      )
    case "anthropic":
      return (
        <svg
          className={className}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M13.827 3.524a.8.8 0 0 0-.707-.449h-2.24a.8.8 0 0 0-.707.449L3.109 19.82a.8.8 0 0 0 .707 1.105h2.404a.8.8 0 0 0 .729-.472l1.948-4.577h6.206l1.948 4.577a.8.8 0 0 0 .729.472h2.404a.8.8 0 0 0 .707-1.105L13.827 3.524zm-4.225 10.45 2.398-5.632 2.398 5.632H9.602z" />
        </svg>
      )
    case "xiaomi":
      return (
        <svg
          className={className}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <rect width="24" height="24" rx="5" fill="#FF6700" />
          <path
            fill="#FFFFFF"
            d="M6 7.5h3.6v4.5a1.2 1.2 0 0 0 2.4 0V7.5h3.6v9H12v-3.3a.6.6 0 0 1-1.2 0v3.3H6v-9zm10.8 0H18v9h-1.2v-9z"
          />
        </svg>
      )
    case "muse":
      return (
        <svg
          className={className}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 2a1 1 0 0 1 1 1v18a1 1 0 0 1-2 0V3a1 1 0 0 1 1-1zm-5 4a1 1 0 0 1 1 1v10a1 1 0 0 1-2 0V7a1 1 0 0 1 1-1zm10 0a1 1 0 0 1 1 1v10a1 1 0 0 1-2 0V7a1 1 0 0 1 1-1zM2 10a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0v-2a1 1 0 0 1 1-1zm20 0a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0v-2a1 1 0 0 1 1-1z" />
        </svg>
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
