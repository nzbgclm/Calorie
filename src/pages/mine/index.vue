<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useProfileStore } from '@/stores/profile'
import { useWeightStore } from '@/stores/weight'
import PageHeader from '@/components/PageHeader.vue'
import { getAIConfig, getSettings, isAIReady } from '@/utils/storage'
import { exportAllData } from '@/utils/export'
import { ACTIVITY_OPTIONS } from '@/utils/calorie'
import type { GoalType } from '@/types'

const profileStore = useProfileStore()
const weightStore = useWeightStore()

const profile = computed(() => profileStore.profile)

const GOAL_TEXT: Record<GoalType, string> = { lose: '减重', maintain: '保持', gain: '增重' }

const summary = computed(() => {
  const p = profile.value
  if (!p) return '未设置'
  const activity = ACTIVITY_OPTIONS.find((a) => a.value === p.activityLevel)?.label ?? ''
  return `${p.heightCm}cm · ${p.weightKg}kg · ${activity}`
})

const goalSummary = computed(() => {
  const p = profile.value
  if (!p) return '未设置'
  const base = GOAL_TEXT[p.goalType]
  if (p.goalType === 'maintain') return `${base} · ${p.dailyTargetKcal} kcal`
  return `${base}${p.deficitKcal ? ` ${p.deficitKcal}` : ''} · ${p.dailyTargetKcal} kcal`
})

const weightSummary = computed(() =>
  weightStore.latest ? `${weightStore.latest.weightKg} kg` : '未记录'
)

/**
 * AI 与提醒的状态存在 storage 里，不是响应式数据。
 * 用 computed 会在首次求值后缓存，从设置页返回时不会刷新，
 * 所以这里用 ref + onShow 主动重算。
 */
const aiSummary = ref('未配置')
const reminderSummary = ref('已关闭')

function refreshExternalSummaries() {
  const config = getAIConfig()
  aiSummary.value = isAIReady(config)
    ? config.model
    : config.baseUrl
      ? '未完成配置'
      : '未配置'

  const reminder = getSettings().reminder
  reminderSummary.value = reminder.enabled ? `每天 ${reminder.time}` : '已关闭'
}

function notReady(feature: string) {
  uni.showToast({ title: `${feature}将在后续版本接入`, icon: 'none' })
}

function goProfile() {
  uni.navigateTo({ url: '/pages/onboarding/index' })
}

function goAI() {
  uni.navigateTo({ url: '/pages/mine/ai' })
}

function goWeight() {
  uni.navigateTo({ url: '/pages/weight/index' })
}

function goReminder() {
  uni.navigateTo({ url: '/pages/mine/reminder' })
}

function goGoal() {
  uni.navigateTo({ url: '/pages/mine/goal' })
}

function goAbout() {
  uni.navigateTo({ url: '/pages/mine/about' })
}

function onExport() {
  exportAllData()
}

onShow(() => {
  profileStore.refresh()
  weightStore.refresh()
  refreshExternalSummaries()
})
</script>

<template>
  <view class="page-root">
    <PageHeader title="我的" />

    <view class="page-scroll">
      <view class="page-content">
        <view class="profile-card">
      <view class="profile-top">
        <text class="profile-title">
          {{ profile ? `${profile.age} 岁 · ${GOAL_TEXT[profile.goalType]}` : '还没有资料' }}
        </text>
        <text class="profile-target num">
          {{ profile ? `${profile.dailyTargetKcal} kcal/天` : '—' }}
        </text>
      </view>
      <text class="profile-sub">{{ summary }}</text>
    </view>

    <view class="group">
      <text class="group-title">身体与目标</text>
      <view class="cell-list">
        <view class="cell" @click="goProfile">
          <text class="cell-title">个人资料</text>
          <text class="cell-note">{{ summary }}</text>
          <text class="cell-arrow">›</text>
        </view>
        <view class="cell" @click="goGoal">
          <text class="cell-title">目标设置</text>
          <text class="cell-note">{{ goalSummary }}</text>
          <text class="cell-arrow">›</text>
        </view>
        <view class="cell" @click="goWeight">
          <text class="cell-title">体重记录</text>
          <text class="cell-note">{{ weightSummary }}</text>
          <text class="cell-arrow">›</text>
        </view>
      </view>
    </view>

    <view class="group">
      <text class="group-title">记录与提醒</text>
      <view class="cell-list">
        <view class="cell" @click="goReminder">
          <text class="cell-title">每日提醒</text>
          <text class="cell-note">{{ reminderSummary }}</text>
          <text class="cell-arrow">›</text>
        </view>
        <view class="cell" @click="goAI">
          <text class="cell-title">AI 设置</text>
          <text class="cell-note">{{ aiSummary }}</text>
          <text class="cell-arrow">›</text>
        </view>
      </view>
    </view>

    <view class="group">
      <text class="group-title">数据</text>
      <view class="cell-list">
        <!-- 导出数据：App 端文件写入待验证，先隐藏，恢复时去掉注释即可 -->
        <!--
        <view class="cell" @click="onExport">
          <text class="cell-title">导出数据</text>
          <text class="cell-note">JSON</text>
          <text class="cell-arrow">›</text>
        </view>
        -->
        <view class="cell" @click="goAbout">
          <text class="cell-title">关于</text>
          <text class="cell-note">v1.0.0</text>
          <text class="cell-arrow">›</text>
        </view>
      </view>
    </view>

        <text class="footer-tip">所有数据保存在本机，不上传服务器</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.profile-card {
  background-color: var(--bg-card);
  border-radius: 32rpx;
  padding: 40rpx 32rpx;
}

.profile-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.profile-title {
  font-size: 36rpx;
  font-weight: 500;
  color: var(--text-1);
}

.profile-target {
  font-size: 26rpx;
  color: var(--brand);
}

.profile-sub {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: var(--text-3);
}

.group {
  margin-top: 40rpx;
}

.group-title {
  display: block;
  margin: 0 8rpx 16rpx;
  font-size: 24rpx;
  color: var(--text-3);
}

.cell-list {
  background-color: var(--bg-card);
  border-radius: 32rpx;
  padding: 0 32rpx;
}

.cell {
  display: flex;
  align-items: center;
  padding: 30rpx 0;
  border-bottom: 1rpx solid var(--line);

  &:last-child {
    border-bottom: none;
  }
}

.cell-title {
  font-size: 28rpx;
  color: var(--text-1);
}

.cell-note {
  flex: 1;
  text-align: right;
  margin-right: 12rpx;
  font-size: 24rpx;
  color: var(--text-3);
}

.cell-arrow {
  font-size: 32rpx;
  color: var(--text-3);
  line-height: 1;
}

.footer-tip {
  display: block;
  margin-top: 48rpx;
  text-align: center;
  font-size: 22rpx;
  color: var(--text-3);
}
</style>
