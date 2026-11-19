<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getEntries } from '@/utils/storage'
import { useProfileStore } from '@/stores/profile'
import PageHeader from '@/components/PageHeader.vue'
import { addDays, monthKey, monthLabel, today, weekdayLabel } from '@/utils/date'

const profileStore = useProfileStore()
const month = ref(monthKey(today()))

const dayRows = computed(() => {
  const map = new Map<string, number>()
  getEntries(month.value).forEach((e) => {
    map.set(e.date, (map.get(e.date) || 0) + e.kcal)
  })
  const target = profileStore.dailyTarget || 1
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, kcal]) => {
      const ratio = kcal / target
      return {
        date,
        kcal,
        label: `${Number(date.slice(5, 7))}月${Number(date.slice(8, 10))}日`,
        weekday: weekdayLabel(date),
        status: ratio < 0.8 ? 'low' : ratio <= 1.1 ? 'ok' : 'over',
        statusText: ratio < 0.8 ? '偏少' : ratio <= 1.1 ? '达标' : '超出'
      }
    })
})

const stats = computed(() => {
  const rows = dayRows.value
  if (!rows.length) return null
  const avg = Math.round(rows.reduce((s, r) => s + r.kcal, 0) / rows.length)
  const okDays = rows.filter((r) => r.status === 'ok').length
  return { avg, okDays, total: rows.length }
})

function shiftMonth(offset: number) {
  const [y, m] = month.value.split('-').map(Number)
  const d = new Date(y, m - 1 + offset, 1)
  month.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const canNext = computed(() => month.value < monthKey(today()))

function goToday() {
  uni.switchTab({ url: '/pages/index/index' })
}

onShow(() => {
  profileStore.refresh()
})
</script>

<template>
  <view class="page-root">
    <PageHeader title="历史" :subtitle="monthLabel(month)">
      <template #extra>
        <view class="nav-btn" @click="shiftMonth(-1)">
          <text class="nav-icon">‹</text>
        </view>
        <view class="nav-btn" :class="{ disabled: !canNext }" @click="canNext && shiftMonth(1)">
          <text class="nav-icon">›</text>
        </view>
      </template>
    </PageHeader>

    <view class="page-scroll">
      <view class="page-content">
        <view v-if="stats" class="card stat-card">
          <view class="stat-item">
            <text class="stat-num num">{{ stats.avg }}</text>
            <text class="stat-label">日均 kcal</text>
          </view>
          <view class="stat-divider"></view>
          <view class="stat-item">
            <text class="stat-num num">{{ stats.okDays }}</text>
            <text class="stat-label">达标天数</text>
          </view>
          <view class="stat-divider"></view>
          <view class="stat-item">
            <text class="stat-num num">{{ stats.total }}</text>
            <text class="stat-label">记录天数</text>
          </view>
        </view>

        <view v-if="dayRows.length" class="card list-card">
          <view v-for="row in dayRows" :key="row.date" class="day-row" @click="goToday">
            <view class="day-left">
              <text class="day-label">{{ row.label }}</text>
              <text class="day-week">{{ row.weekday }}</text>
            </view>
            <view class="day-right">
              <text class="day-kcal num">{{ row.kcal }}</text>
              <text class="day-status" :class="row.status">{{ row.statusText }}</text>
            </view>
          </view>
        </view>

        <view v-else class="card empty-block">
          <text class="empty-title">这个月还没有记录</text>
          <text class="empty-desc">去今日页记下第一餐吧</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.nav-btn {
  width: 64rpx;
  height: 64rpx;
  margin-left: 16rpx;
  border-radius: 50%;
  background-color: var(--bg-card);
  display: flex;
  align-items: center;
  justify-content: center;

  &.disabled {
    opacity: 0.35;
  }
}

.nav-icon {
  font-size: 34rpx;
  line-height: 1;
  color: var(--text-2);
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 36rpx 0;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  font-size: 44rpx;
  font-weight: 500;
  color: var(--text-1);
}

.stat-label {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--text-3);
}

.stat-divider {
  width: 1rpx;
  height: 56rpx;
  background-color: var(--line);
}

.list-card {
  margin-top: 24rpx;
  padding: 8rpx 32rpx;
}

.day-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 0;
  border-bottom: 1rpx solid var(--line);

  &:last-child {
    border-bottom: none;
  }
}

.day-left {
  display: flex;
  align-items: baseline;
}

.day-label {
  font-size: 28rpx;
  color: var(--text-1);
}

.day-week {
  margin-left: 12rpx;
  font-size: 22rpx;
  color: var(--text-3);
}

.day-right {
  display: flex;
  align-items: center;
}

.day-kcal {
  font-size: 28rpx;
  color: var(--text-1);
}

.day-status {
  margin-left: 16rpx;
  font-size: 22rpx;
  color: var(--text-3);

  &.ok {
    color: var(--ok);
  }

  &.over {
    color: var(--warn);
  }
}

.empty-block {
  margin-top: 24rpx;
  padding: 80rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-title {
  font-size: 30rpx;
  color: var(--text-1);
}

.empty-desc {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: var(--text-3);
}
</style>
