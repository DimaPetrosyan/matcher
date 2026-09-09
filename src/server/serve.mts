import { file } from "bun"
import { join, normalize } from "node:path"
import type { Bot } from "grammy"
import { env } from "../env.mts"
import { authorize, notFound, routes } from "./routes.mts"

const indexPath = join(env.webRoot, "index.html")

const staticFile = async (pathname: string) => {
  const relative = normalize(pathname)
    .replace(/^(\.\.[/\\])+/, "")
    .replace(/^\/+/, "")
  const candidate = file(join(env.webRoot, relative))

  if (relative && (await candidate.exists())) return candidate

  const index = file(indexPath)
  return (await index.exists()) ? index : null
}

export const startServer = (bot: Bot) => {
  const server = Bun.serve({
    port: env.port,
    idleTimeout: 30,

    fetch: async request => {
      const { pathname } = new URL(request.url)

      if (!pathname.startsWith("/api/")) {
        const asset = await staticFile(pathname)
        return asset ? new Response(asset) : new Response("not built", { status: 404 })
      }

      const route = routes.find(item => item.method === request.method && item.path === pathname)
      if (!route) return notFound()

      const result = await authorize(bot, request)
      if ("error" in result) return result.error

      try {
        return await route.handle(result.session, request)
      } catch (error) {
        console.error(`request failed: ${request.method} ${pathname}`, error)
        return new Response(JSON.stringify({ error: "internal" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        })
      }
    },
  })

  console.log(`http server listening on port ${server.port}, web root ${env.webRoot}`)

  return server
}
