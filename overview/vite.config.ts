import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { benchesPlugin } from "./plugin-benches"

export default defineConfig({
  plugins: [react(), benchesPlugin()],
  server: {
    host: "127.0.0.1",
    port: 5180,
    strictPort: true,
  },
})
