import type {
  AIConfig,
  AppSettings,
  FoodEntry,
  RecentFood,
  UserProfile,
  WeightRecord
} from '@/types'
import { monthKey } from './date'

export const KEYS = {
  profile: 'profile',
  entries: (month: string) => `entries:${month}`,
  weights: 'weights',
  settings: 'settings',
  aiConfig: 'aiConfig',
  recentFoods: 'recentFoods'
} as const

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = uni.getStorageSync(key)
    if (raw === '' || raw === null || raw === undefined) return fallback
    return (typeof raw === 'string' ? JSON.parse(raw) : raw) as T
  } catch (e) {
    console.error('[storage] read failed:', key, e)
    return fallback
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    uni.setStorageSync(key, JSON.stringify(value))
  } catch (e) {
    console.error('[storage] write failed:', key, e)
  }
}

// ---------- 个人资料 ----------

export function getProfile(): UserProfile | null {
  return readJSON<UserProfile | null>(KEYS.profile, null)
}

export function saveProfile(profile: UserProfile): void {
  writeJSON(KEYS.profile, profile)
}

// ---------- 饮食记录（按月分片） ----------

export function getEntries(month: string): FoodEntry[] {
  return readJSON<FoodEntry[]>(KEYS.entries(month), [])
}

export function saveEntries(month: string, entries: FoodEntry[]): void {
  writeJSON(KEYS.entries(month), entries)
}

export function upsertEntry(entry: FoodEntry): void {
  const month = monthKey(entry.date)
  const list = getEntries(month)
  const idx = list.findIndex((e) => e.id === entry.id)
  if (idx >= 0) list[idx] = entry
  else list.push(entry)
  saveEntries(month, list)
}

export function removeEntry(id: string, date: string): void {
  const month = monthKey(date)
  saveEntries(
    month,
    getEntries(month).filter((e) => e.id !== id)
  )
}

/** 取某一天的记录，跨月安全 */
export function getEntriesByDate(date: string): FoodEntry[] {
  return getEntries(monthKey(date)).filter((e) => e.date === date)
}

// ---------- 体重 ----------

export function getWeights(): WeightRecord[] {
  const list = readJSON<WeightRecord[]>(KEYS.weights, [])
  return list.sort((a, b) => a.date.localeCompare(b.date))
}

export function saveWeights(list: WeightRecord[]): void {
  writeJSON(KEYS.weights, list)
}

// ---------- 设置 ----------

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  hasOnboarded: false,
  reminder: { enabled: false, time: '20:00' }
}

export function getSettings(): AppSettings {
  const s = readJSON<Partial<AppSettings>>(KEYS.settings, {})
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    reminder: { ...DEFAULT_SETTINGS.reminder, ...(s.reminder || {}) }
  }
}

export function saveSettings(settings: AppSettings): void {
  writeJSON(KEYS.settings, settings)
}

// ---------- AI 配置 ----------

export const DEFAULT_AI_CONFIG: AIConfig = {
  enabled: false,
  baseUrl: '',
  apiKey: '',
  model: '',
  models: []
}

export function getAIConfig(): AIConfig {
  return { ...DEFAULT_AI_CONFIG, ...readJSON<Partial<AIConfig>>(KEYS.aiConfig, {}) }
}

export function saveAIConfig(config: AIConfig): void {
  writeJSON(KEYS.aiConfig, config)
}

/** 配置项齐全且用户已开启，才允许走 AI */
export function isAIReady(config: AIConfig): boolean {
  return Boolean(config.enabled && config.baseUrl && config.apiKey && config.model)
}

// ---------- 最近食物 ----------

export function getRecentFoods(): RecentFood[] {
  return readJSON<RecentFood[]>(KEYS.recentFoods, [])
}

export function pushRecentFood(food: RecentFood): void {
  const list = getRecentFoods().filter((f) => f.name !== food.name)
  list.unshift(food)
  writeJSON(KEYS.recentFoods, list.slice(0, 30))
}

// ---------- 数据管理 ----------

export function clearAllData(): void {
  const info = uni.getStorageInfoSync()
  info.keys
    .filter((k) => k !== KEYS.settings)
    .forEach((k) => {
      try {
        uni.removeStorageSync(k)
      } catch (e) {
        console.error('[storage] remove failed:', k, e)
      }
    })
}
