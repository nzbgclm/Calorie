<script setup lang="ts">
import { ref } from 'vue'
import type { ReminderConfig } from '@/types'
import { getSettings, saveSettings } from '@/utils/storage'
import { clearReminders, scheduleReminders } from '@/utils/reminder'

const config = ref<ReminderConfig>({ ...getSettings().reminder })

function persist() {
  const settings = getSettings()
  settings.reminder = { ...config.value }
  saveSettings(settings)
}

function goBack() {
  uni.navigateBack()
}

function promptPermission() {
  uni.showModal({
    title: '通知权限未开启',
    content: '系统通知被关掉了，需要到设置里手动打开才能收到提醒。',
    confirmText: '去设置',
    success: (res) => {
      if (!res.confirm) return
      // #ifdef APP-PLUS
      try {
        uni.openAppAuthorizeSetting()
      } catch (e) {
        console.error('[reminder] open setting failed', e)
      }
      // #endif
    }
  })
}

function toggle() {
  if (config.value.enabled) {
    config.value.enabled = false
    persist()
    clearReminders()
    return
  }

  // #ifdef APP-PLUS
  try {
    const setting = uni.getAppAuthorizeSetting()
    if (setting.notificationAuthorized === 'denied') {
      promptPermission()
      return
    }
  } catch (e) {
    // 查询失败不阻塞开启，交给系统弹窗
  }
  // #endif

  config.value.enabled = true
  persist()
  scheduleReminders()
}

function onTimeChange(e: { detail: { value: string } }) {
  config.value.time = e.detail.value
  persist()
  if (config.value.enabled) scheduleReminders()
}
</script>

<template>
  <view class="reminder-page">
    <view class="nav">
      <view class="nav-btn" @click="goBack">
        <text class="nav-icon">‹</text>
      </view>
      <text class="nav-title">每日提醒</text>
      <view class="nav-btn"></view>
    </view>

    <view class="scroll">
      <view class="content">
        <text class="intro">
          每天到点提醒你记录饮食。提醒只在本机触发，不联网、不推送服务器。
        </text>

        <view class="card">
          <view class="row">
            <view class="row-main">
              <text class="row-title">每天提醒</text>
              <text class="row-desc">{{ config.enabled ? '已开启' : '关闭中' }}</text>
            </view>
            <view class="switch" :class="{ on: config.enabled }" @click="toggle">
              <view class="knob"></view>
            </view>
          </view>
        </view>

        <view class="card" :class="{ disabled: !config.enabled }">
          <picker mode="time" :value="config.time" @change="onTimeChange">
            <view class="row">
              <text class="row-title">提醒时间</text>
              <view class="row-right">
                <text class="time-text">{{ config.time }}</text>
                <text class="chevron">›</text>
              </view>
            </view>
          </picker>
        </view>

        <view class="note">
          <text class="note-text">
            提醒内容会自动带上当天进度，例如「今天已记录 1280 kcal，还差 480」。如果没收到提醒，请检查
            设置 → 卡路里 → 通知 是否被关闭。
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.reminder-page {
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

.scroll {
  flex: 1;
  height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.content {
  padding: 8rpx 24rpx calc(48rpx + env(safe-area-inset-bottom));
}

.intro {
  display: block;
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--text-3);
  padding: 0 8rpx 24rpx;
}

.card {
  background-color: var(--bg-card);
  border-radius: 28rpx;
  padding: 4rpx 28rpx;
  margin-bottom: 16rpx;

  &.disabled {
    opacity: 0.5;
  }
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26rpx 0;
}

.row-main {
  display: flex;
  flex-direction: column;
}

.row-title {
  font-size: 28rpx;
  color: var(--text-1);
}

.row-desc {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: var(--text-3);
}

.row-right {
  display: flex;
  align-items: center;
}

.time-text {
  font-size: 28rpx;
  color: var(--text-2);
}

.chevron {
  margin-left: 8rpx;
  font-size: 30rpx;
  line-height: 1;
  color: var(--text-3);
}

.switch {
  width: 88rpx;
  height: 52rpx;
  border-radius: 26rpx;
  background-color: var(--bg-sunken);
  padding: 4rpx;
  transition: background-color 0.2s ease;

  &.on {
    background-color: var(--brand);
  }
}

.knob {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background-color: #fff;
  transition: transform 0.2s ease;
}

.switch.on .knob {
  transform: translateX(36rpx);
}

.note {
  padding: 16rpx 8rpx 0;
}

.note-text {
  font-size: 21rpx;
  line-height: 1.6;
  color: var(--text-3);
}
</style>
