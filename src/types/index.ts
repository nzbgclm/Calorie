export type Gender = 'male' | 'female'
export type GoalType = 'maintain' | 'lose' | 'gain'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'extra'
export type FoodCategory =
  | 'staple'
  | 'protein'
  | 'seafood'
  | 'vegetable'
  | 'fruit'
  | 'dairy'
  | 'snack'
  | 'fastfood'
  | 'soup'
  | 'condiment'
export type EntrySource = 'manual' | 'library' | 'ai'

export interface UserProfile {
  gender: Gender
  age: number
  heightCm: number
  weightKg: number
  activityLevel: ActivityLevel
  goalType: GoalType
  targetWeightKg?: number
  deficitKcal: number
  bmr: number
  tdee: number
  dailyTargetKcal: number
  updatedAt: string
}

export interface FoodPortion {
  label: string
  grams: number
}

export interface FoodItem {
  id: string
  name: string
  aliases: string[]
  pinyin: string
  category: FoodCategory
  kcalPer100g: number
  portions: FoodPortion[]
  proteinPer100g?: number
  carbsPer100g?: number
  fatPer100g?: number
}

export interface FoodEntry {
  id: string
  date: string
  mealType: MealType
  name: string
  amountText?: string
  grams?: number
  kcal: number
  foodId?: string
  source: EntrySource
  createdAt: string
}

export interface WeightRecord {
  id: string
  date: string
  weightKg: number
  createdAt: string
}

export interface AIConfig {
  enabled: boolean
  baseUrl: string
  apiKey: string
  model: string
  models: string[]
  modelsFetchedAt?: string
}

export interface ReminderConfig {
  enabled: boolean
  time: string
}

export interface AppSettings {
  theme: 'system' | 'light' | 'dark'
  hasOnboarded: boolean
  reminder: ReminderConfig
}

export interface RecentFood {
  foodId?: string
  name: string
  kcal: number
  amountText?: string
}

export const MEALS: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: '早餐' },
  { value: 'lunch', label: '午餐' },
  { value: 'dinner', label: '晚餐' },
  { value: 'extra', label: '加餐' }
]

export const MEAL_LABEL: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  extra: '加餐'
}
