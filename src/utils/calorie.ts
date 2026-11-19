import type { ActivityLevel, Gender, GoalType, UserProfile } from '@/types'

export const ACTIVITY_OPTIONS: {
  value: ActivityLevel
  label: string
  desc: string
  factor: number
}[] = [
  { value: 'sedentary', label: '久坐', desc: '几乎不运动', factor: 1.2 },
  { value: 'light', label: '轻度', desc: '每周 1–3 次', factor: 1.375 },
  { value: 'moderate', label: '中度', desc: '每周 3–5 次', factor: 1.55 },
  { value: 'active', label: '高度', desc: '每周 6–7 次', factor: 1.725 },
  { value: 'veryActive', label: '极高', desc: '体力劳动 / 每天两练', factor: 1.9 }
]

export const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9
}

export const GOAL_OPTIONS: { value: GoalType; label: string; desc: string }[] = [
  { value: 'lose', label: '减重', desc: '制造热量缺口' },
  { value: 'maintain', label: '保持', desc: '维持当前体重' },
  { value: 'gain', label: '增重', desc: '制造热量盈余' }
]

export const DEFICIT_OPTIONS = [
  { value: 300, label: '稳健', desc: '每周约 -0.27 kg' },
  { value: 500, label: '标准', desc: '每周约 -0.45 kg' },
  { value: 750, label: '激进', desc: '每周约 -0.68 kg' }
]

export const SURPLUS_OPTIONS = [
  { value: 300, label: '稳健', desc: '每周约 +0.27 kg' },
  { value: 500, label: '快速', desc: '每周约 +0.45 kg' }
]

/** 安全下限，低于此值会强制抬升 */
export const MIN_INTAKE: Record<Gender, number> = {
  female: 1200,
  male: 1500
}

/** 1 kg 脂肪约等于 7700 kcal */
const KCAL_PER_KG = 7700

export function round10(n: number): number {
  return Math.round(n / 10) * 10
}

export interface ProfileInput {
  gender: Gender
  age: number
  heightCm: number
  weightKg: number
  activityLevel: ActivityLevel
  goalType: GoalType
  targetWeightKg?: number
  deficitKcal?: number
}

/** Mifflin-St Jeor */
export function calcBMR(input: Pick<ProfileInput, 'gender' | 'age' | 'heightCm' | 'weightKg'>): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age
  return input.gender === 'male' ? base + 5 : base - 161
}

export function calcTDEE(bmr: number, level: ActivityLevel): number {
  return bmr * ACTIVITY_FACTOR[level]
}

export function defaultAmount(goal: GoalType): number {
  if (goal === 'lose') return 500
  if (goal === 'gain') return 300
  return 0
}

/** 每日推荐摄入，含下限保护 */
export function calcTargetKcal(
  tdee: number,
  goal: GoalType,
  amount: number,
  gender: Gender
): number {
  if (goal === 'maintain') return round10(tdee)
  if (goal === 'gain') return round10(tdee + amount)
  const floor = MIN_INTAKE[gender]
  return round10(Math.max(floor, tdee - amount))
}

/** 实际每日热量差（负数为缺口），受下限保护影响 */
export function actualDelta(target: number, tdee: number, goal: GoalType): number {
  if (goal === 'maintain') return 0
  const raw = target - tdee
  return raw
}

/** 预计每周体重变化（kg，负数为下降） */
export function weeklyChangeKg(delta: number): number {
  return (delta * 7) / KCAL_PER_KG
}

export function buildProfile(input: ProfileInput): UserProfile {
  const amount = input.deficitKcal ?? defaultAmount(input.goalType)
  const bmr = calcBMR(input)
  const tdee = calcTDEE(bmr, input.activityLevel)
  const target = calcTargetKcal(tdee, input.goalType, amount, input.gender)

  return {
    gender: input.gender,
    age: input.age,
    heightCm: input.heightCm,
    weightKg: input.weightKg,
    activityLevel: input.activityLevel,
    goalType: input.goalType,
    targetWeightKg: input.targetWeightKg,
    deficitKcal: amount,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    dailyTargetKcal: target,
    updatedAt: new Date().toISOString()
  }
}

/** 体重变化后重算，保留原有目标设置 */
export function recalcWithWeight(profile: UserProfile, weightKg: number): UserProfile {
  return buildProfile({
    gender: profile.gender,
    age: profile.age,
    heightCm: profile.heightCm,
    weightKg,
    activityLevel: profile.activityLevel,
    goalType: profile.goalType,
    targetWeightKg: profile.targetWeightKg,
    deficitKcal: profile.deficitKcal
  })
}

export function formatSigned(n: number, digits = 1): string {
  const fixed = n.toFixed(digits)
  return n > 0 ? `+${fixed}` : fixed
}
