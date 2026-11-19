<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { ActivityLevel, Gender, GoalType, UserProfile } from '@/types'
import {
  ACTIVITY_OPTIONS,
  DEFICIT_OPTIONS,
  GOAL_OPTIONS,
  SURPLUS_OPTIONS,
  buildProfile,
  weeklyChangeKg
} from '@/utils/calorie'
import { useProfileStore } from '@/stores/profile'
import { getSettings, saveSettings } from '@/utils/storage'

const profileStore = useProfileStore()

const step = ref(0)
const result = ref<UserProfile | null>(null)

const form = reactive({
  gender: 'male' as Gender,
  age: '',
  heightCm: '',
  weightKg: '',
  activityLevel: 'sedentary' as ActivityLevel,
  goalType: 'lose' as GoalType,
  targetWeightKg: '',
  amount: 500
})

const amountOptions = computed(() =>
  form.goalType === 'gain' ? SURPLUS_OPTIONS : DEFICIT_OPTIONS
)

const progress = computed(() => {
  if (step.value >= 3) return '100%'
  return `${((step.value + 1) / 3) * 100}%`
})

const weekly = computed(() => {
  if (!result.value) return ''
  const delta = result.value.dailyTargetKcal - result.value.tdee
  if (result.value.goalType === 'maintain') return '维持当前体重'
  const kg = weeklyChangeKg(delta)
  return `预计每周 ${kg > 0 ? '+' : ''}${kg.toFixed(2)} kg`
})

function toast(title: string) {
  uni.showToast({ title, icon: 'none' })
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.switchTab({ url: '/pages/index/index' })
}

function validateBasic(): boolean {
  const age = Number(form.age)
  if (!Number.isInteger(age) || age < 10 || age > 100) {
    toast('年龄请填 10–100 的整数')
    return false
  }
  const h = Number(form.heightCm)
  if (!(h >= 100 && h <= 250)) {
    toast('身高请填 100–250 cm')
    return false
  }
  const w = Number(form.weightKg)
  if (!(w >= 30 && w <= 300)) {
    toast('体重请填 30–300 kg')
    return false
  }
  return true
}

function pickGoal(goal: GoalType) {
  form.goalType = goal
  form.amount = goal === 'gain' ? 300 : 500
}

function next() {
  if (step.value === 0 && !validateBasic()) return
  if (step.value === 2) {
    calc()
    return
  }
  step.value += 1
}

function prev() {
  if (step.value === 0 || step.value === 3) return
  step.value -= 1
}

function calc() {
  const target = Number(form.targetWeightKg)
  result.value = buildProfile({
    gender: form.gender,
    age: Number(form.age),
    heightCm: Number(form.heightCm),
    weightKg: Number(form.weightKg),
    activityLevel: form.activityLevel,
    goalType: form.goalType,
    targetWeightKg: Number.isFinite(target) && target > 0 ? target : undefined,
    deficitKcal: form.goalType === 'maintain' ? 0 : form.amount
  })
  step.value = 3
}

function finish() {
  profileStore.setProfile({
    gender: form.gender,
    age: Number(form.age),
    heightCm: Number(form.heightCm),
    weightKg: Number(form.weightKg),
    activityLevel: form.activityLevel,
    goalType: form.goalType,
    targetWeightKg:
      form.targetWeightKg && Number(form.targetWeightKg) > 0
        ? Number(form.targetWeightKg)
        : undefined,
    deficitKcal: form.goalType === 'maintain' ? 0 : form.amount
  })
  const settings = getSettings()
  settings.hasOnboarded = true
  saveSettings(settings)
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

<template>
  <view class="ob-wrap">
    <view class="ob-top">
      <view class="ob-head">
        <view class="ob-left">
          <view class="ob-back" @click="goBack">
            <text class="ob-back-icon">‹</text>
          </view>
          <text class="ob-step">
            {{ step >= 3 ? '计算完成' : `第 ${step + 1} 步 / 共 3 步` }}
          </text>
        </view>
        <text v-if="step < 3" class="ob-skip" @click="next">跳过</text>
      </view>
      <view class="ob-track">
        <view class="ob-bar" :style="{ width: progress }"></view>
      </view>
    </view>

    <view class="ob-body">
      <template v-if="step === 0">
        <text class="ob-title">先认识一下你</text>
        <text class="ob-sub">这些数据只用来算基础代谢，不会离开这台手机</text>

        <view class="field-block">
          <text class="field-label">性别</text>
          <view class="gender-row">
            <view
              class="gender-item"
              :class="{ active: form.gender === 'male' }"
              @click="form.gender = 'male'"
            >
              <text>男</text>
            </view>
            <view
              class="gender-item"
              :class="{ active: form.gender === 'female' }"
              @click="form.gender = 'female'"
            >
              <text>女</text>
            </view>
          </view>
        </view>

        <view class="field-row">
          <text class="field-label">年龄</text>
          <view class="field-input">
            <t-input v-model:value="form.age" type="digit" placeholder="28" borderless />
            <text class="unit">岁</text>
          </view>
        </view>

        <view class="field-row">
          <text class="field-label">身高</text>
          <view class="field-input">
            <t-input v-model:value="form.heightCm" type="digit" placeholder="175" borderless />
            <text class="unit">cm</text>
          </view>
        </view>

        <view class="field-row">
          <text class="field-label">体重</text>
          <view class="field-input">
            <t-input v-model:value="form.weightKg" type="digit" placeholder="70.0" borderless />
            <text class="unit">kg</text>
          </view>
        </view>
      </template>

      <template v-else-if="step === 1">
        <text class="ob-title">平时动得多吗</text>
        <text class="ob-sub">选最接近日常状态的一档，宁低勿高</text>

        <view class="opt-list">
          <view
            v-for="opt in ACTIVITY_OPTIONS"
            :key="opt.value"
            class="opt-item"
            :class="{ active: form.activityLevel === opt.value }"
            @click="form.activityLevel = opt.value"
          >
            <view class="opt-main">
              <text class="opt-label">{{ opt.label }}</text>
              <text class="opt-desc">{{ opt.desc }}</text>
            </view>
            <text class="opt-extra">×{{ opt.factor }}</text>
          </view>
        </view>
      </template>

      <template v-else-if="step === 2">
        <text class="ob-title">你的目标</text>
        <text class="ob-sub">减重和增重会按档位调整每日推荐摄入</text>

        <view class="opt-list">
          <view
            v-for="opt in GOAL_OPTIONS"
            :key="opt.value"
            class="opt-item"
            :class="{ active: form.goalType === opt.value }"
            @click="pickGoal(opt.value)"
          >
            <view class="opt-main">
              <text class="opt-label">{{ opt.label }}</text>
              <text class="opt-desc">{{ opt.desc }}</text>
            </view>
          </view>
        </view>

        <template v-if="form.goalType !== 'maintain'">
          <text class="sub-title">
            {{ form.goalType === 'lose' ? '减重节奏' : '增重节奏' }}
          </text>
          <view class="chip-row">
            <view
              v-for="opt in amountOptions"
              :key="opt.value"
              class="chip"
              :class="{ active: form.amount === opt.value }"
              @click="form.amount = opt.value"
            >
              <text class="chip-label">{{ opt.label }}</text>
              <text class="chip-desc">{{ opt.desc }}</text>
            </view>
          </view>

          <view class="field-row">
            <text class="field-label">目标体重</text>
            <view class="field-input">
              <t-input
                v-model:value="form.targetWeightKg"
                type="digit"
                placeholder="选填"
                borderless
              />
              <text class="unit">kg</text>
            </view>
          </view>
        </template>
      </template>

      <template v-else>
        <text class="ob-title">你的每日推荐摄入</text>
        <text class="ob-sub">{{ weekly }}</text>

        <view class="result-card">
          <text class="result-num num">{{ result?.dailyTargetKcal }}</text>
          <text class="result-unit">kcal / 天</text>
        </view>

        <view class="result-rows">
          <view class="result-row">
            <text class="muted">基础代谢 BMR</text>
            <text class="num">{{ result?.bmr }} kcal</text>
          </view>
          <view class="result-row">
            <text class="muted">每日总消耗 TDEE</text>
            <text class="num">{{ result?.tdee }} kcal</text>
          </view>
          <view class="result-row">
            <text class="muted">目标</text>
            <text>
              {{
                form.goalType === 'lose' ? '减重' : form.goalType === 'gain' ? '增重' : '保持'
              }}
              <template v-if="form.goalType !== 'maintain'">
                （{{ form.amount > 0 ? '缺口' : '' }}{{ Math.abs(form.amount) }} kcal）
              </template>
            </text>
          </view>
        </view>

        <text class="hint">计算结果仅供参考，不构成医学建议</text>
      </template>
    </view>

    <view class="ob-footer">
      <view v-if="step > 0 && step < 3" class="btn-back">
        <t-button theme="default" variant="outline" size="large" block @click="prev">
          上一步
        </t-button>
      </view>
      <view class="btn-main">
        <t-button v-if="step < 3" theme="primary" size="large" block @click="next">
          {{ step === 2 ? '计算推荐摄入' : '下一步' }}
        </t-button>
        <t-button v-else theme="primary" size="large" block @click="finish">开始记录</t-button>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.ob-wrap {
  min-height: 100vh;
  background-color: var(--bg-page);
  padding: calc(var(--status-bar-height) + 24rpx) 32rpx calc(32rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
}

.ob-top {
  margin-bottom: 32rpx;
}

.ob-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.ob-step {
  font-size: 24rpx;
  color: var(--text-3);
}

.ob-left {
  display: flex;
  align-items: center;
}

.ob-back {
  width: 56rpx;
  height: 56rpx;
  margin-right: 8rpx;
  margin-left: -12rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ob-back-icon {
  font-size: 40rpx;
  line-height: 1;
  color: var(--text-2);
}

.ob-skip {
  font-size: 24rpx;
  color: var(--text-3);
}

.ob-track {
  height: 6rpx;
  border-radius: 6rpx;
  background-color: var(--line);
  overflow: hidden;
}

.ob-bar {
  height: 100%;
  border-radius: 6rpx;
  background-color: var(--brand);
  transition: width 0.25s ease;
}

.ob-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.ob-title {
  font-size: 44rpx;
  font-weight: 500;
  color: var(--text-1);
}

.ob-sub {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: var(--text-2);
  line-height: 1.6;
}

.field-block {
  margin-top: 48rpx;
}

.field-label {
  font-size: 26rpx;
  color: var(--text-2);
}

.gender-row {
  display: flex;
  margin-top: 16rpx;
}

.gender-item {
  flex: 1;
  height: 112rpx;
  margin-right: 24rpx;
  border-radius: 24rpx;
  background-color: var(--bg-card);
  border: 2rpx solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: var(--text-1);

  &:last-child {
    margin-right: 0;
  }

  &.active {
    border-color: var(--brand);
    background-color: var(--brand-weak);
    color: var(--brand);
    font-weight: 500;
  }
}

.field-row {
  margin-top: 24rpx;
  background-color: var(--bg-card);
  border-radius: 24rpx;
  padding: 20rpx 28rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field-input {
  display: flex;
  align-items: center;
  width: 320rpx;
  justify-content: flex-end;
}

.unit {
  margin-left: 8rpx;
  font-size: 26rpx;
  color: var(--text-3);
}

.sub-title {
  margin: 40rpx 0 16rpx;
  font-size: 26rpx;
  color: var(--text-2);
}

.opt-list {
  margin-top: 40rpx;
}

.opt-item {
  background-color: var(--bg-card);
  border-radius: 24rpx;
  border: 2rpx solid transparent;
  padding: 26rpx 28rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;

  &.active {
    border-color: var(--brand);
    background-color: var(--brand-weak);
  }
}

.opt-main {
  display: flex;
  flex-direction: column;
}

.opt-label {
  font-size: 30rpx;
  color: var(--text-1);
}

.opt-desc {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: var(--text-3);
}

.opt-extra {
  font-size: 26rpx;
  color: var(--text-3);
}

.chip-row {
  display: flex;
  justify-content: space-between;
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
  font-size: 28rpx;
  color: var(--text-1);
}

.chip-desc {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: var(--text-3);
}

.result-card {
  margin-top: 48rpx;
  background-color: var(--bg-card);
  border-radius: 32rpx;
  padding: 56rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.result-num {
  font-size: 96rpx;
  font-weight: 500;
  line-height: 1;
  color: var(--brand);
}

.result-unit {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: var(--text-3);
}

.result-rows {
  margin-top: 24rpx;
  background-color: var(--bg-card);
  border-radius: 32rpx;
  padding: 8rpx 32rpx;
}

.result-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26rpx 0;
  border-bottom: 1rpx solid var(--line);
  font-size: 28rpx;

  &:last-child {
    border-bottom: none;
  }
}

.hint {
  margin-top: 32rpx;
  font-size: 22rpx;
  color: var(--text-3);
  text-align: center;
}

.ob-footer {
  display: flex;
  align-items: center;
  padding-top: 32rpx;
}

.btn-back {
  width: 200rpx;
  margin-right: 20rpx;
}

.btn-main {
  flex: 1;
}
</style>
