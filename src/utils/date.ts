const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

/** 本地时区的 YYYY-MM-DD，禁止用 toISOString（会跳到 UTC） */
export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function today(): string {
  return formatDate(new Date())
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() + days)
  return formatDate(d)
}

/** 存储分片键：YYYY-MM */
export function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7)
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseDate(a).getTime() - parseDate(b).getTime()) / 86400000)
}

export function weekdayLabel(dateStr: string): string {
  return `周${WEEK_LABELS[parseDate(dateStr).getDay()]}`
}

/** 今天 / 昨天 / 明天 / 8月3日 */
export function humanDate(dateStr: string): string {
  const t = today()
  if (dateStr === t) return '今天'
  if (dateStr === addDays(t, -1)) return '昨天'
  if (dateStr === addDays(t, 1)) return '明天'
  const d = parseDate(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

/** 2026-11-18 → 2026年11月 */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-')
  return `${y}年${Number(m)}月`
}

export function nowISO(): string {
  return new Date().toISOString()
}

/** 当前 HH:mm */
export function currentTime(): string {
  const d = new Date()
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
