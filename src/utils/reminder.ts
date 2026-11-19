import { getEntriesByDate, getProfile, getSettings } from '@/utils/storage'
import { today } from '@/utils/date'

declare const plus: {
  push: { clear: () => void }
}

/** 未来几天用的通用文案，轮换避免重复感 */
const GENERIC_TEXTS = [
  '今天吃了什么？记一笔吧',
  '别忘了记录今天的饮食',
  '睡前花 10 秒，把今天记完',
  '今天的饮食记完了吗？'
]

const SCHEDULE_DAYS = 7

function targetTime(time: string, offsetDays: number): number {
  const [h, m] = time.split(':').map((v) => Number(v))
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  d.setHours(Number.isFinite(h) ? h : 20, Number.isFinite(m) ? m : 0, 0, 0)
  return d.getTime()
}

/** 清空所有已排期的本地通知 */
export function clearReminders(): void {
  // #ifdef APP-PLUS
  try {
    plus.push.clear()
  } catch (e) {
    console.error('[reminder] clear failed', e)
  }
  // #endif
}

function pushOne(content: string, delaySeconds: number): void {
  // #ifdef APP-PLUS
  uni.createPushMessage({
    title: '卡路里',
    content,
    delay: delaySeconds,
    payload: { path: '/pages/index/index' },
    success: () => {},
    fail: (err) => console.error('[reminder] push failed', err)
  })
  // #endif
}

/**
 * 排期策略：iOS 本地通知不支持「每天重复」，只能预排。
 * 每次启动或配置变更时清空重排未来 7 天：
 *   - 今天那条用实时数据（已记录多少 / 还差多少）
 *   - 之后 6 天数据未知，用通用文案轮换
 */
export function scheduleReminders(): void {
  const { reminder } = getSettings()
  if (!reminder.enabled || !/^\d{1,2}:\d{2}$/.test(reminder.time)) return

  clearReminders()

  const now = Date.now()
  const entries = getEntriesByDate(today())
  const intake = entries.reduce((sum, e) => sum + e.kcal, 0)
  const target = getProfile()?.dailyTargetKcal ?? 0

  for (let i = 0; i < SCHEDULE_DAYS; i += 1) {
    const ts = targetTime(reminder.time, i)
    if (ts <= now + 1000) continue

    let content: string
    if (i === 0) {
      if (!entries.length) {
        content = '今天还没记录，来记一笔吧'
      } else if (target > 0) {
        const diff = target - intake
        content =
          diff >= 0
            ? `今天已记录 ${intake} kcal，还差 ${diff}`
            : `今天已记录 ${intake} kcal，超出 ${-diff}`
      } else {
        content = GENERIC_TEXTS[0]
      }
    } else {
      content = GENERIC_TEXTS[i % GENERIC_TEXTS.length]
    }

    pushOne(content, Math.round((ts - now) / 1000))
  }
}

export const REMINDER_GENERIC_TEXTS = GENERIC_TEXTS
