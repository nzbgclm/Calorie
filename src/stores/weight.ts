import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { WeightRecord } from '@/types'
import { getWeights, saveWeights } from '@/utils/storage'
import { nowISO, today } from '@/utils/date'
import { useProfileStore } from './profile'

export const useWeightStore = defineStore('weight', () => {
  const records = ref<WeightRecord[]>(getWeights())

  const latest = computed(() =>
    records.value.length ? records.value[records.value.length - 1] : null
  )

  /** 同日只保留一条，重复记录视为覆盖 */
  function add(weightKg: number, date = today()) {
    const idx = records.value.findIndex((r) => r.date === date)
    if (idx >= 0) {
      records.value[idx] = { ...records.value[idx], weightKg }
    } else {
      records.value.push({
        id: `${date}-${Date.now()}`,
        date,
        weightKg,
        createdAt: nowISO()
      })
    }
    records.value.sort((a, b) => a.date.localeCompare(b.date))
    saveWeights(records.value)
    useProfileStore().updateWeight(weightKg)
  }

  /** 删除记录，若删的是最新一条则回退到头一条 */
  function remove(id: string) {
    const rest = records.value.filter((r) => r.id !== id)
    records.value = rest
    saveWeights(rest)
    const last = rest[rest.length - 1]
    if (last) useProfileStore().updateWeight(last.weightKg)
  }

  function range(days: number): WeightRecord[] {
    if (!records.value.length) return []
    const last = records.value[records.value.length - 1].date
    const end = new Date(last)
    const from = new Date(end)
    from.setDate(from.getDate() - days + 1)
    const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(
      from.getDate()
    ).padStart(2, '0')}`
    return records.value.filter((r) => r.date >= fromStr)
  }

  function refresh() {
    records.value = getWeights()
  }

  return { records, latest, add, remove, range, refresh }
})
