export type Plan = { acts: string[]; cells: Record<string, string[]>; paused: boolean }

const key = "matcher.plan"

const empty: Plan = { acts: [], cells: {}, paused: false }

// shortcut: план лежит в браузере, а не на сервере — ручек под датированные ячейки
// в API пока нет. Заменить на /api/plan, когда появится таблица слотов.
export const loadPlan = (): Plan => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return empty

    const saved = JSON.parse(raw) as Partial<Plan>

    return {
      acts: Array.isArray(saved.acts) ? saved.acts : [],
      cells: saved.cells && typeof saved.cells === "object" ? saved.cells : {},
      paused: saved.paused === true,
    }
  } catch {
    return empty
  }
}

export const savePlan = (plan: Plan) => {
  try {
    localStorage.setItem(key, JSON.stringify(plan))
  } catch {
    // Приватное окно или запрет на хранилище: план живёт до перезагрузки.
  }
}
