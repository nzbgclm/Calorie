import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { UserProfile } from '@/types'
import { getProfile, saveProfile } from '@/utils/storage'
import { buildProfile, recalcWithWeight, type ProfileInput } from '@/utils/calorie'

export const useProfileStore = defineStore('profile', () => {
  const profile = ref<UserProfile | null>(getProfile())

  const hasProfile = computed(() => !!profile.value)
  const dailyTarget = computed(() => profile.value?.dailyTargetKcal ?? 0)
  const tdee = computed(() => profile.value?.tdee ?? 0)
  const bmr = computed(() => profile.value?.bmr ?? 0)

  function setProfile(input: ProfileInput) {
    const next = buildProfile(input)
    profile.value = next
    saveProfile(next)
    return next
  }

  /** 体重变化后重算推荐值，其余设置保留 */
  function updateWeight(weightKg: number) {
    if (!profile.value) return null
    const next = recalcWithWeight(profile.value, weightKg)
    profile.value = next
    saveProfile(next)
    return next
  }

  function refresh() {
    profile.value = getProfile()
  }

  return {
    profile,
    hasProfile,
    dailyTarget,
    tdee,
    bmr,
    setProfile,
    updateWeight,
    refresh
  }
})
