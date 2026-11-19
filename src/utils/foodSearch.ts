import type { FoodCategory, FoodItem } from '@/types'
import { FOODS, FOOD_MAP } from '@/data/foods'
import { getRecentFoods } from '@/utils/storage'

/** 归一化：去掉空格与常见标点，统一小写 */
function norm(input: string): string {
  return input.toLowerCase().replace(/[\s·・、，,。.!！?？()（）\-_/]/g, '')
}

interface Indexed {
  food: FoodItem
  name: string
  aliases: string[]
  pinyin: string
}

let cache: Indexed[] | null = null

function index(): Indexed[] {
  if (cache) return cache
  cache = FOODS.map((food) => ({
    food,
    name: norm(food.name),
    aliases: food.aliases.map(norm),
    pinyin: food.pinyin.toLowerCase()
  }))
  return cache
}

/**
 * 匹配等级，数字越小越靠前：
 * 1 名称完全相同 / 2 名称前缀 / 3 名称包含 / 4 别名包含 / 5 全拼前缀 / 6 全拼包含
 */
function matchLevel(item: Indexed, kw: string): number {
  if (item.name === kw) return 1
  if (item.name.startsWith(kw)) return 2
  if (item.name.includes(kw)) return 3
  if (item.aliases.some((a) => a.includes(kw))) return 4
  if (item.pinyin.startsWith(kw)) return 5
  if (item.pinyin.includes(kw)) return 6
  return 0
}

export interface SearchResult {
  food: FoodItem
  level: number
  recent: boolean
}

export function searchFoods(keyword: string, category?: FoodCategory | 'all'): SearchResult[] {
  const kw = norm(keyword)
  const recentIds = new Set(
    getRecentFoods()
      .map((r) => r.foodId)
      .filter((id): id is string => Boolean(id))
  )

  const pool = index().filter((item) => {
    if (!category || category === 'all') return true
    return item.food.category === category
  })

  if (!kw) {
    return pool
      .map((item) => ({
        food: item.food,
        level: 9,
        recent: recentIds.has(item.food.id)
      }))
      .sort((a, b) => Number(b.recent) - Number(a.recent))
  }

  const hits: SearchResult[] = []
  for (const item of pool) {
    const level = matchLevel(item, kw)
    if (!level) continue
    hits.push({ food: item.food, level, recent: recentIds.has(item.food.id) })
  }

  hits.sort((a, b) => {
    // 最近吃过的同等级优先
    if (a.level !== b.level) {
      if (a.recent !== b.recent) return a.recent ? -1 : 1
      return a.level - b.level
    }
    if (a.recent !== b.recent) return a.recent ? -1 : 1
    return a.food.name.length - b.food.name.length
  })

  return hits
}

/** 空输入时的推荐：最近吃过的实物（带库数据） */
export function recentFoodItems(limit = 12): SearchResult[] {
  const recent = getRecentFoods()
  const result: SearchResult[] = []
  for (const r of recent) {
    const food = r.foodId ? FOOD_MAP.get(r.foodId) : undefined
    if (food) result.push({ food, level: 9, recent: true })
    if (result.length >= limit) break
  }
  return result
}

export function foodsByCategory(category: FoodCategory): FoodItem[] {
  return FOODS.filter((f) => f.category === category)
}

/** 按份量克数换算热量，四舍五入到整数 */
export function kcalFor(food: FoodItem, grams: number): number {
  return Math.round((food.kcalPer100g * grams) / 100)
}
