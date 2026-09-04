import React, { useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

export function WatchRedirectPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const videoId = searchParams.get("v")
    if (videoId) {
      navigate(`/play/${videoId}`, { replace: true })
    } else {
      navigate("/", { replace: true })
    }
  }, [searchParams, navigate])

  return (
    <div className="flex-1 flex items-center justify-center p-8 text-center text-sm text-muted-foreground">
      Redirecting to player…
    </div>
  )
}
