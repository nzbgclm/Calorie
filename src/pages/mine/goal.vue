<script setup lang="ts">
import { computed, ref } from 'vue'
import type { GoalType } from '@/types'
import {
  GOAL_OPTIONS,
  DEFICIT_OPTIONS,
  SURPLUS_OPTIONS,
  buildProfile,
  weeklyChangeKg
} from '@/utils/calorie'
import { useProfileStore } from '@/stores/profile'

const profileStore = useProfileStore()
const profile = computed(() => profileStore.profile)

const goalType = ref<GoalType>(profile.value?.goalType ?? 'lose')
const amount = ref<number>(profile.value?.deficitKcal ?? 500)
const targetWeightText = ref<string>(
  profile.value?.targetWeightKg ? String(profile.value.targetWeightKg) : ''
)

const amountOptions = computed(() =>
  goalType.value === 'gain' ? SURPLUS_OPTIONS : DEFICIT_OPTIONS
)

const preview = computed(() => {
  const base = profile.value
  if (!base) return null
  const target = Number(targetWeightText.value)
  const built = buildProfile({
    gender: base.gender,
    age: base.age,
    heightCm: base.heightCm,
    weightKg: base.weightKg,
    activityLevel: base.activityLevel,
    goalType: goalType.value,
    targetWeightKg: Number.isFinite(target) && target > 0 ? target : undefined,
    deficitKcal: goalType.value === 'maintain' ? 0 : amount.value
  })
  return built
})

const weekly = computed(() => {
  const built = preview.value
  if (!built) return ''
  if (built.goalType === 'maintain') return '维持当前体重'
  const kg = weeklyChangeKg(built.dailyTargetKcal - built.tdee)
  return `预计每周 ${kg > 0 ? '+' : ''}${kg.toFixed(2)} kg`
})

function pickGoal(goal: GoalType) {
  goalType.value = goal
  amount.value = goal === 'gain' ? 300 : 500
}

function onTargetInput(e: { detail: { value: string } }) {
  targetWeightText.value = e.detail.value.replace(/[^\d.]/g, '').slice(0, 5)
}

function goBack() {
  uni.navigateBack()
}

function save() {
  const base = profile.value
  if (!base) {
    uni.showToast({ title: '请先完善个人资料', icon: 'none' })
    return
  }
  const target = Number(targetWeightText.value)
  profileStore.setProfile({
    gender: base.gender,
    age: base.age,
    heightCm: base.heightCm,
    weightKg: base.weightKg,
    activityLevel: base.activityLevel,
    goalType: goalType.value,
    targetWeightKg: Number.isFinite(target) && target > 0 ? target : undefined,
    deficitKcal: goalType.value === 'maintain' ? 0 : amount.value
  })
  uni.showToast({ title: '已更新目标', icon: 'none' })
  setTimeout(() => uni.navigateBack(), 300)
}
</script>

<template>
  <view class="goal-page">
    <view class="nav">
      <view class="nav-btn" @click="goBack">
        <text class="nav-icon">‹</text>
      </view>
      <text class="nav-title">目标设置</text>
      <view class="nav-btn"></view>
    </view>

    <scroll-view class="body" scroll-y>
      <view class="content">
        <view class="section">
          <text class="section-title">诉求</text>
          <view class="opt-list">
            <view
              v-for="opt in GOAL_OPTIONS"
              :key="opt.value"
              class="opt-item"
              :class="{ active: goalType === opt.value }"
              @click="pickGoal(opt.value)"
            >
              <text class="opt-label">{{ opt.label }}</text>
              <text class="opt-desc">{{ opt.desc }}</text>
            </view>
          </view>
        </view>

        <view v-if="goalType !== 'maintain'" class="section">
          <text class="section-title">
            {{ goalType === 'lose' ? '减重节奏' : '增重节奏' }}
          </text>
          <view class="chip-row">
            <view
              v-for="opt in amountOptions"
              :key="opt.value"
              class="chip"
              :class="{ active: amount === opt.value }"
              @click="amount = opt.value"
            >
              <text class="chip-label">{{ opt.label }}</text>
              <text class="chip-desc">{{ opt.desc }}</text>
            </view>
          </view>
        </view>

        <view class="section">
          <text class="section-title">目标体重</text>
          <view class="input-card">
            <input
              class="goal-input"
              type="digit"
              :value="targetWeightText"
              placeholder="选填"
              placeholder-class="ph"
              @input="onTargetInput"
            />
            <text class="unit">kg</text>
          </view>
        </view>

        <view v-if="preview" class="preview-card">
          <view class="preview-row">
            <text class="preview-label">每日推荐摄入</text>
            <text class="preview-value num">{{ preview.dailyTargetKcal }} kcal</text>
          </view>
          <view class="preview-row">
            <text class="preview-label">每周变化</text>
            <text class="preview-value">{{ weekly }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <view class="footer">
      <view class="save-btn" @click="save">
        <text>保存</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.goal-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-page);
  overflow: hidden;
}

.nav {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(var(--status-bar-height) + 16rpx) 24rpx 16rpx;
}

.nav-btn {
  width: 90rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
}

.nav-icon {
  font-size: 40rpx;
  line-height: 1;
  color: var(--text-2);
}

.nav-title {
  font-size: 30rpx;
  font-weight: 500;
  color: var(--text-1);
}

.body {
  flex: 1;
  height: 0;
}

.content {
  padding: 8rpx 24rpx 40rpx;
}

.section {
  margin-bottom: 32rpx;
}

.section-title {
  display: block;
  margin: 0 8rpx 16rpx;
  font-size: 24rpx;
  color: var(--text-3);
}

.opt-list {
  display: flex;
}

.opt-item {
  flex: 1;
  margin-right: 16rpx;
  padding: 24rpx 12rpx;
  border-radius: 24rpx;
  background-color: var(--bg-card);
  border: 2rpx solid transparent;
  display: flex;
  flex-direction: column;
  align-items: center;

  &:last-child {
    margin-right: 0;
  }

  &.active {
    border-color: var(--brand);
    background-color: var(--brand-weak);
  }
}

.opt-label {
  font-size: 28rpx;
  color: var(--text-1);
}

.opt-desc {
  margin-top: 6rpx;
  font-size: 20rpx;
  color: var(--text-3);
}

.chip-row {
  display: flex;
}

.chip {
  flex: 1;
  margin-right: 16rpx;
  padding: 20rpx 8rpx;
  border-radius: 20rpx;
  background-color: var(--bg-card);
  border: 2rpx solid transparent;
  display: flex;
  flex-direction: column;
  align-items: center;

  &:last-child {
    margin-right: 0;
  }

  &.active {
    border-color: var(--brand);
    background-color: var(--brand-weak);
  }
}

.chip-label {
  font-size: 26rpx;
  color: var(--text-1);
}

.chip-desc {
  margin-top: 6rpx;
  font-size: 20rpx;
  color: var(--text-3);
}

.input-card {
  background-color: var(--bg-card);
  border-radius: 24rpx;
  padding: 24rpx 28rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.goal-input {
  flex: 1;
  font-size: 32rpx;
  color: var(--text-1);
  text-align: right;
}

.ph {
  color: var(--text-3);
  font-size: 28rpx;
}

.unit {
  margin-left: 10rpx;
  font-size: 24rpx;
  color: var(--text-3);
}

.preview-card {
  background-color: var(--bg-card);
  border-radius: 24rpx;
  padding: 8rpx 28rpx;
}

.preview-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
  border-bottom: 1rpx solid var(--line);

  &:last-child {
    border-bottom: none;
  }
}

.preview-label {
  font-size: 26rpx;
  color: var(--text-2);
}

.preview-value {
  font-size: 27rpx;
  color: var(--text-1);
}

.footer {
  flex-shrink: 0;
  padding: 20rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));
}

.save-btn {
  height: 92rpx;
  border-radius: 24rpx;
  background-color: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 500;
  color: #fff;
}
</style>
