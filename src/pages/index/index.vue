<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import CalorieRing from '@/components/CalorieRing.vue'
import MealCard from '@/components/MealCard.vue'
import PageHeader from '@/components/PageHeader.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import CalendarSheet from '@/components/CalendarSheet.vue'
import { useProfileStore } from '@/stores/profile'
import { useDiaryStore } from '@/stores/diary'
import { getAIConfig, isAIReady } from '@/utils/storage'
import { addDays, humanDate, weekdayLabel } from '@/utils/date'
import type { FoodEntry, MealType } from '@/types'

const profileStore = useProfileStore()
const diary = useDiaryStore()

const showAIGuide = ref(false)
const showCalendar = ref(false)

const target = computed(() => profileStore.dailyTarget)
const total = computed(() => diary.totalKcal)

const dateTitle = computed(() => humanDate(diary.date))

const dateSub = computed(() => {
  const d = diary.date
  const md = `${Number(d.slice(5, 7))}月${Number(d.slice(8, 10))}日`
  return `${weekdayLabel(d)} · ${md}`
})

const statusText = computed(() => {
  if (!target.value) return ''
  const ratio = total.value / target.value
  const diff = target.value - total.value
  if (total.value === 0) return `今天还没记录，建议摄入 ${target.value} kcal`
  if (ratio < 0.8) return `今天还差 ${diff} kcal`
  if (ratio < 0.95) return '接近目标，还不错'
  if (ratio <= 1) return '刚好达标'
  return `超出 ${total.value - target.value} kcal`
})

const statusType = computed(() => {
  if (!target.value || total.value === 0) return 'idle'
  const ratio = total.value / target.value
  if (ratio < 0.8) return 'low'
  if (ratio <= 1) return 'ok'
  return 'over'
})

function shiftDay(offset: number) {
  diary.load(addDays(diary.date, offset))
}

function openCalendar() {
  showCalendar.value = true
}

function onPickDate(date: string) {
  diary.load(date)
}

function goOnboarding() {
  uni.navigateTo({ url: '/pages/onboarding/index' })
}

/** 未配置 AI 时先提示，引导去设置页 */
function onAIEntry() {
  if (!isAIReady(getAIConfig())) {
    showAIGuide.value = true
    return
  }
  uni.navigateTo({ url: `/pages/ai/parse?date=${diary.date}` })
}

function goAIConfig() {
  uni.navigateTo({ url: '/pages/mine/ai' })
}

function onAdd(meal: MealType) {
  uni.navigateTo({
    url: `/pages/food/search?meal=${meal}&date=${diary.date}`
  })
}

function onTapItem(entry: FoodEntry) {
  uni.navigateTo({
    url: `/pages/food/edit?id=${entry.id}&date=${entry.date}&meal=${entry.mealType}`
  })
}

onShow(() => {
  profileStore.refresh()
  diary.load()
})
</script>

<template>
  <view class="page-root">
    <PageHeader
      :title="profileStore.hasProfile ? dateTitle : '今天'"
      :subtitle="dateSub"
      @click="openCalendar"
    >
      <template #extra>
        <template v-if="profileStore.hasProfile">
          <view class="nav-btn" @click.stop="shiftDay(-1)">
            <text class="nav-icon">‹</text>
          </view>
          <view class="nav-btn" @click.stop="shiftDay(1)">
            <text class="nav-icon">›</text>
          </view>
        </template>
      </template>
    </PageHeader>

    <view class="page-scroll">
      <view class="page-content">
        <view v-if="!profileStore.hasProfile" class="card empty-card">
          <text class="empty-title">还没有设置目标</text>
          <text class="empty-desc">填写身高体重和诉求，算出每天该吃多少</text>
          <view class="empty-action">
            <t-button theme="primary" size="large" block @click="goOnboarding">开始设置</t-button>
          </view>
        </view>

        <template v-else>
          <view class="card ring-card">
            <CalorieRing :intake="total" :target="target" />
            <view class="status-line" :class="statusType">
              <text>{{ statusText }}</text>
            </view>
          </view>

          <view class="ai-entry" @click="onAIEntry">
            <view class="ai-badge">
              <text>AI</text>
            </view>
            <view class="ai-text">
              <text class="ai-title">一句话记一餐</text>
              <text class="ai-desc">中午一碗牛肉面加个卤蛋</text>
            </view>
            <text class="ai-arrow">›</text>
          </view>

          <MealCard
            v-for="group in diary.mealGroups"
            :key="group.meal"
            :label="group.label"
            :kcal="group.kcal"
            :list="group.list"
            class="meal-block"
            @add="onAdd(group.meal)"
            @tap-item="onTapItem"
          />
        </template>
      </view>
    </view>

    <CalendarSheet v-model:visible="showCalendar" :value="diary.date" @select="onPickDate" />

    <ConfirmDialog
      v-model:visible="showAIGuide"
      title="还没有配置 AI"
      content="填写接口地址和 API key 后，就能用一句话记录饮食"
      confirm-text="去配置"
      cancel-text="以后再说"
      @confirm="goAIConfig"
    />
  </view>
</template>

<style scoped lang="scss">
.empty-card {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 40rpx;
}

.empty-title {
  font-size: 34rpx;
  font-weight: 500;
  color: var(--text-1);
}

.empty-desc {
  margin: 16rpx 0 48rpx;
  font-size: 26rpx;
  color: var(--text-2);
  text-align: center;
}

.empty-action {
  width: 100%;
}

.nav-btn {
  width: 64rpx;
  height: 64rpx;
  margin-left: 16rpx;
  border-radius: 50%;
  background-color: var(--bg-card);
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon {
  font-size: 34rpx;
  line-height: 1;
  color: var(--text-2);
}

.ring-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 32rpx 32rpx;
}

.status-line {
  margin-top: 24rpx;
  font-size: 26rpx;
  color: var(--text-2);

  &.ok {
    color: var(--ok);
  }

  &.over {
    color: var(--warn);
  }
}

.meal-block {
  margin-top: 24rpx;
}

.ai-entry {
  margin-top: 24rpx;
  background-color: var(--bg-card);
  border-radius: 28rpx;
  padding: 24rpx 28rpx;
  display: flex;
  align-items: center;
}

.ai-badge {
  width: 52rpx;
  height: 52rpx;
  border-radius: 14rpx;
  background-color: var(--brand-weak);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ai-badge text {
  font-size: 20rpx;
  font-weight: 500;
  color: var(--brand);
}

.ai-text {
  flex: 1;
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
}

.ai-title {
  font-size: 28rpx;
  color: var(--text-1);
}

.ai-desc {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: var(--text-3);
}

.ai-arrow {
  font-size: 32rpx;
  line-height: 1;
  color: var(--text-3);
}
</style>
