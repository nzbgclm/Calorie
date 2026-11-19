import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { FoodEntry, MealType } from '@/types'
import { MEALS } from '@/types'
import { getEntriesByDate, removeEntry, upsertEntry } from '@/utils/storage'
import { today } from '@/utils/date'

export const useDiaryStore = defineStore('diary', () => {
  const date = ref(today())
  const entries = ref<FoodEntry[]>([])

  function load(target?: string) {
    if (target) date.value = target
    entries.value = getEntriesByDate(date.value)
  }

  function add(entry: FoodEntry) {
    upsertEntry(entry)
    load()
  }

  function update(entry: FoodEntry) {
    upsertEntry(entry)
    load()
  }

  function remove(id: string) {
    removeEntry(id, date.value)
    load()
  }

  const totalKcal = computed(() => entries.value.reduce((sum, e) => sum + e.kcal, 0))

  const mealGroups = computed(() => {
    return MEALS.map((meal) => {
      const list = entries.value
        .filter((e) => e.mealType === meal.value)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      return {
        meal: meal.value as MealType,
        label: meal.label,
        list,
        kcal: list.reduce((sum, e) => sum + e.kcal, 0)
      }
    })
  })

  const isEmpty = computed(() => entries.value.length === 0)

  return { date, entries, totalKcal, mealGroups, isEmpty, load, add, update, remove }
})
