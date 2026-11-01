import { initData } from "./telegram"
import type { AccessProblem, Profile, UserEvent } from "./types"

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
    if (payload?.kind === "noUsername") return { kind: "noUsername" } as const
    return { kind: "notRegistered" } as const
  }

  return null
}

const request = async <T>(method: string, path: string, payload?: unknown): Promise<T> => {
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
    | (T & { kind?: string; community?: string; error?: string })
    | null

  if (!response.ok) {
    const problem = problemFrom(response.status, data)
    if (problem) throw new ApiError(problem)

    throw new Error(data?.error ?? `request failed with ${response.status}`)
  }

  return data as T
}

export const api = {
  profile: () => request<Profile>("GET", "/api/profile"),
  saveInterests: (keys: string[], suggestions: string[]) =>
    request<Profile>("PUT", "/api/interests", { keys, suggestions }),
  saveAvailability: (slots: string[]) => request<Profile>("PUT", "/api/availability", { slots }),
  saveArea: (district: string, radius: string) =>
    request<Profile>("PUT", "/api/area", { district, radius }),
  events: () => request<{ events: UserEvent[] }>("GET", "/api/events"),
  answerEvent: (eventId: string, going: boolean) =>
    request<{ result: string }>("PUT", "/api/events", { eventId, going }),
}
