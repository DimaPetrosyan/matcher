import { createHmac } from "node:crypto"
import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"

const devInitData = (token: string, tgId: string) => {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id: Number(tgId), first_name: "dev", language_code: "ru" }),
  })

  const checkString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")

  const secret = createHmac("sha256", "WebAppData").update(token).digest()
  params.set("hash", createHmac("sha256", secret).update(checkString).digest("hex"))

  return params.toString()
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "..", "")
  const token = env.BOT_TOKEN
  const tgId = env.DEV_TG_ID

  return {
    plugins: [react()],
    build: { outDir: "dist", emptyOutDir: true },
    server: {
      port: 5173,
      allowedHosts: true,
      proxy: {
        "/api": {
          target: `http://localhost:${env.PORT || 3000}`,
          changeOrigin: true,
          configure: proxy => {
            if (!token || !tgId) return

            proxy.on("proxyReq", request => {
              request.setHeader("authorization", `tma ${devInitData(token, tgId)}`)
            })
          },
        },
      },
    },
  }
})
