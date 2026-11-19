<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useProfileStore } from '@/stores/profile'
import { useWeightStore } from '@/stores/weight'
import { addDays, today } from '@/utils/date'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const profileStore = useProfileStore()
const weightStore = useWeightStore()

const rangeDays = ref(30)
const inputText = ref('')
const showDelete = ref(false)
const pendingDeleteId = ref('')

const profile = computed(() => profileStore.profile)
const latest = computed(() => weightStore.latest)
const currentWeight = computed(() => latest.value?.weightKg ?? profile.value?.weightKg ?? null)

const targetWeight = computed(() => profile.value?.targetWeightKg ?? null)

const distance = computed(() => {
  if (currentWeight.value == null || targetWeight.value == null) return null
  const diff = currentWeight.value - targetWeight.value
  return Math.round(diff * 10) / 10
})

const filtered = computed(() => {
  const from = addDays(today(), -(rangeDays.value - 1))
  return weightStore.records.filter((r) => r.date >= from)
})

/** 折线图：viewBox 300×140，等比缩放 */
const chart = computed(() => {
  const list = filtered.value
  const W = 300
  const H = 140
  const PAD_X = 10
  const PAD_Y = 16

  if (!list.length) {
    return { path: '', points: [] as { x: number; y: number }[], targetY: null as number | null, hasData: false }
  }

  const values = list.map((r) => r.weightKg)
  if (targetWeight.value != null) values.push(targetWeight.value)

  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const span = Math.max(maxVal - minVal, 1)
  const min = minVal - span * 0.15
  const max = maxVal + span * 0.15
  const range = max - min || 1

  const stepX = list.length > 1 ? (W - PAD_X * 2) / (list.length - 1) : 0
  const xAt = (i: number) => PAD_X + stepX * i
  const yAt = (v: number) => H - PAD_Y - ((v - min) / range) * (H - PAD_Y * 2)

  const points = list.map((r, i) => ({ x: xAt(i), y: yAt(r.weightKg) }))
  const path =
    points.length > 1
      ? points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('')
      : ''

  return {
    path,
    points,
    targetY: targetWeight.value != null ? yAt(targetWeight.value) : null,
    hasData: true
  }
})

const firstDate = computed(() => filtered.value[0]?.date ?? '')
const lastDate = computed(() => filtered.value[filtered.value.length - 1]?.date ?? '')

const recentRecords = computed(() => [...weightStore.records].reverse().slice(0, 30))

function shortDate(date: string): string {
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`
}

function toast(title: string) {
  uni.showToast({ title, icon: 'none' })
}

function goBack() {
  uni.navigateBack()
}

function onInput(e: { detail: { value: string } }) {
  inputText.value = e.detail.value.replace(/[^\d.]/g, '').slice(0, 5)
}

function save() {
  const value = Number(inputText.value)
  if (!Number.isFinite(value) || value < 30 || value > 300) {
    toast('请输入 30–300 之间的体重')
    return
  }
  weightStore.add(Math.round(value * 10) / 10)
  inputText.value = ''
  toast('已记录，推荐值已更新')
}

function askDelete(id: string) {
  pendingDeleteId.value = id
  showDelete.value = true
}

function doDelete() {
  weightStore.remove(pendingDeleteId.value)
  pendingDeleteId.value = ''
}

onShow(() => {
  profileStore.refresh()
  weightStore.refresh()
})
</script>

<template>
  <view class="weight-page">
    <view class="nav">
      <view class="nav-btn" @click="goBack">
        <text class="nav-icon">‹</text>
      </view>
      <text class="nav-title">体重记录</text>
      <view class="nav-btn"></view>
    </view>

    <view class="scroll">
      <view class="content">
        <view class="hero-card">
          <view class="hero-main">
            <text class="hero-label">当前体重</text>
            <view class="hero-value">
              <text class="hero-num num">{{ currentWeight ?? '—' }}</text>
              <text class="hero-unit">kg</text>
            </view>
          </view>
          <view v-if="distance !== null" class="hero-side">
            <text class="side-label">目标 {{ targetWeight }} kg</text>
            <text class="side-value" :class="distance > 0 ? 'down' : 'up'">
              {{ distance > 0 ? `还差 ${distance}` : distance < 0 ? `已低 ${Math.abs(distance)}` : '已达成' }}
              <text v-if="distance !== 0" class="side-unit">kg</text>
            </text>
          </view>
        </view>

        <view class="chart-card">
          <view class="chart-head">
            <text class="chart-title">趋势</text>
            <view class="range-tabs">
              <text
                v-for="d in [7, 30, 90]"
                :key="d"
                class="range-tab"
                :class="{ active: rangeDays === d }"
                @click="rangeDays = d"
              >
                {{ d }}天
              </text>
            </view>
          </view>

          <view v-if="chart.hasData" class="chart-body">
            <svg class="chart-svg" viewBox="0 0 300 140">
              <path
                v-if="chart.targetY !== null"
                class="target-line"
                :d="`M10 ${chart.targetY.toFixed(1)}L290 ${chart.targetY.toFixed(1)}`"
                fill="none"
                stroke-width="1"
                stroke-dasharray="4 4"
              />
              <path v-if="chart.path" class="line" :d="chart.path" fill="none" stroke-width="2.5" />
              <circle
                v-for="(p, i) in chart.points"
                :key="i"
                class="dot"
                :cx="p.x"
                :cy="p.y"
                r="3"
              />
            </svg>
            <view class="chart-axis">
              <text>{{ shortDate(firstDate) }}</text>
              <text v-if="targetWeight !== null" class="axis-target">虚线为目标</text>
              <text>{{ shortDate(lastDate) }}</text>
            </view>
          </view>
          <view v-else class="chart-empty">
            <text>这段时间还没有记录</text>
          </view>
        </view>

        <view class="input-card">
          <text class="input-label">记一笔</text>
          <view class="input-row">
            <input
              class="weight-input"
              type="digit"
              :value="inputText"
              placeholder="如 68.5"
              placeholder-class="ph"
              @input="onInput"
            />
            <text class="input-unit">kg</text>
            <view class="save-btn" @click="save">
              <text>保存</text>
            </view>
          </view>
          <text class="input-hint">同一天重复记录会覆盖之前的值</text>
        </view>

        <view v-if="recentRecords.length" class="list-card">
          <view v-for="record in recentRecords" :key="record.id" class="record-row">
            <text class="record-date">{{ record.date }}</text>
            <view class="record-right">
              <text class="record-value num">{{ record.weightKg }}</text>
              <text class="record-unit">kg</text>
              <text class="record-del" @click="askDelete(record.id)">×</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <ConfirmDialog
      v-model:visible="showDelete"
      title="删除这条体重记录？"
      content="只删除记录本身，不会改变其他数据"
      confirm-text="删除"
      danger
      @confirm="doDelete"
    />
  </view>
</template>

<style scoped lang="scss">
.weight-page {
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
  padding: 8rpx 24rpx calc(40rpx + env(safe-area-inset-bottom));
}

.hero-card {
  background-color: var(--bg-card);
  border-radius: 32rpx;
  padding: 40rpx 32rpx;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.hero-label {
  font-size: 24rpx;
  color: var(--text-3);
}

.hero-value {
  display: flex;
  align-items: baseline;
  margin-top: 8rpx;
}

.hero-num {
  font-size: 88rpx;
  font-weight: 500;
  line-height: 1;
  color: var(--text-1);
}

.hero-unit {
  margin-left: 8rpx;
  font-size: 26rpx;
  color: var(--text-3);
}

.hero-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding-bottom: 8rpx;
}

.side-label {
  font-size: 22rpx;
  color: var(--text-3);
}

.side-value {
  margin-top: 6rpx;
  font-size: 26rpx;
  color: var(--text-2);

  &.down {
    color: var(--ok);
  }

  &.up {
    color: var(--warn);
  }
}

.side-unit {
  font-size: 22rpx;
}

.chart-card {
  margin-top: 16rpx;
  background-color: var(--bg-card);
  border-radius: 32rpx;
  padding: 28rpx 24rpx 20rpx;
}

.chart-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8rpx 8rpx;
}

.chart-title {
  font-size: 26rpx;
  color: var(--text-2);
}

.range-tabs {
  display: flex;
}

.range-tab {
  padding: 8rpx 20rpx;
  margin-left: 8rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: var(--text-3);

  &.active {
    background-color: var(--brand-weak);
    color: var(--brand);
  }
}

.chart-body {
  padding-top: 8rpx;
}

.chart-svg {
  width: 100%;
  height: 280rpx;
  display: block;
}

.line {
  stroke: var(--brand);
  stroke-linejoin: round;
  stroke-linecap: round;
}

.dot {
  fill: var(--bg-card);
  stroke: var(--brand);
  stroke-width: 2;
}

.target-line {
  stroke: var(--text-3);
}

.chart-axis {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8rpx;
  font-size: 20rpx;
  color: var(--text-3);
}

.axis-target {
  color: var(--text-3);
}

.chart-empty {
  padding: 72rpx 0;
  text-align: center;
  font-size: 24rpx;
  color: var(--text-3);
}

.input-card {
  margin-top: 16rpx;
  background-color: var(--bg-card);
  border-radius: 32rpx;
  padding: 28rpx 32rpx;
}

.input-label {
  font-size: 24rpx;
  color: var(--text-3);
}

.input-row {
  display: flex;
  align-items: center;
  margin-top: 12rpx;
}

.weight-input {
  flex: 1;
  height: 80rpx;
  font-size: 36rpx;
  color: var(--text-1);
}

.ph {
  color: var(--text-3);
  font-size: 28rpx;
}

.input-unit {
  margin-right: 20rpx;
  font-size: 24rpx;
  color: var(--text-3);
}

.save-btn {
  height: 72rpx;
  padding: 0 40rpx;
  border-radius: 999rpx;
  background-color: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 27rpx;
  color: #fff;
}

.input-hint {
  display: block;
  margin-top: 12rpx;
  font-size: 21rpx;
  color: var(--text-3);
}

.list-card {
  margin-top: 16rpx;
  background-color: var(--bg-card);
  border-radius: 32rpx;
  padding: 8rpx 32rpx;
}

.record-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26rpx 0;
  border-bottom: 1rpx solid var(--line);

  &:last-child {
    border-bottom: none;
  }
}

.record-date {
  font-size: 26rpx;
  color: var(--text-2);
}

.record-right {
  display: flex;
  align-items: baseline;
}

.record-value {
  font-size: 28rpx;
  color: var(--text-1);
}

.record-unit {
  margin-left: 4rpx;
  font-size: 20rpx;
  color: var(--text-3);
}

.record-del {
  margin-left: 24rpx;
  font-size: 32rpx;
  line-height: 1;
  color: var(--text-3);
}
</style>
