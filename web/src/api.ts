import { initData } from "./telegram"
import type { AccessProblem, Profile } from "./types"

export class ApiError extends Error {
  problem: AccessProblem

  constructor(problem: AccessProblem) {
    super(problem.kind)
    this.problem = problem
  }
}

const problemFrom = (status: number, payload: { kind?: string; community?: string } | null) => {
  if (status === 401) return { kind: "unauthorized" } as const
  if (status === 503) return { kind: "unverifiable" } as const

  if (status === 403) {
    if (payload?.kind === "lost") return { kind: "lost", community: payload.community } as const
    if (payload?.kind === "denied") return { kind: "notMember" } as const
    return { kind: "notRegistered" } as const
  }

  return null
}

const request = async (method: string, path: string, payload?: unknown): Promise<Profile> => {
  let response: Response

  try {
    response = await fetch(path, {
      method,
      headers: {
        authorization: `tma ${initData()}`,
        ...(payload === undefined ? {} : { "content-type": "application/json" }),
      },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    })
  } catch {
    throw new ApiError({ kind: "offline" })
  }

  const data = (await response.json().catch(() => null)) as
    | (Profile & { kind?: string; community?: string; error?: string })
    | null

  if (!response.ok) {
    const problem = problemFrom(response.status, data)
    if (problem) throw new ApiError(problem)

    throw new Error(data?.error ?? `request failed with ${response.status}`)
  }

  return data as Profile
}

export const api = {
  profile: () => request("GET", "/api/profile"),
  saveInterests: (keys: string[]) => request("PUT", "/api/interests", { keys }),
  saveAvailability: (slots: string[]) => request("PUT", "/api/availability", { slots }),
  saveArea: (district: string, radius: string) => request("PUT", "/api/area", { district, radius }),
  addSuggestion: (body: string) => request("POST", "/api/suggestions", { body }),
  removeSuggestion: (body: string) => request("DELETE", "/api/suggestions", { body }),
}
