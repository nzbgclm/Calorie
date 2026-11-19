<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { parseDate, today } from '@/utils/date'

interface Cell {
  day: number
  date: string
  disabled: boolean
}

const props = withDefaults(
  defineProps<{
    visible: boolean
    value: string
    /** 可选的最大日期，默认不允许选未来 */
    maxDate?: string
  }>(),
  { maxDate: '' }
)

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'select', date: string): void
}>()

const WEEK = ['日', '一', '二', '三', '四', '五', '六']

const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth() + 1)

const max = computed(() => props.maxDate || today())

function syncView() {
  const d = props.value ? parseDate(props.value) : new Date()
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth() + 1
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) syncView()
  },
  { immediate: true }
)

const cells = computed<(Cell | null)[]>(() => {
  const first = new Date(viewYear.value, viewMonth.value - 1, 1)
  const offset = first.getDay()
  const total = new Date(viewYear.value, viewMonth.value, 0).getDate()
  const monthStr = String(viewMonth.value).padStart(2, '0')

  const list: (Cell | null)[] = []
  for (let i = 0; i < offset; i += 1) list.push(null)
  for (let day = 1; day <= total; day += 1) {
    const date = `${viewYear.value}-${monthStr}-${String(day).padStart(2, '0')}`
    list.push({ day, date, disabled: date > max.value })
  }
  return list
})

const canNext = computed(() => {
  const current = `${viewYear.value}-${String(viewMonth.value).padStart(2, '0')}`
  return current < max.value.slice(0, 7)
})

function shiftMonth(offset: number) {
  const d = new Date(viewYear.value, viewMonth.value - 1 + offset, 1)
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth() + 1
}

function choose(cell: Cell | null) {
  if (!cell || cell.disabled) return
  emit('select', cell.date)
  emit('update:visible', false)
}

function backToToday() {
  emit('select', today())
  emit('update:visible', false)
}

function close() {
  emit('update:visible', false)
}
</script>

<template>
  <view v-if="props.visible" class="cal-mask" @click="close">
    <view class="cal" @click.stop>
      <view class="cal-head">
        <view class="cal-nav" @click="shiftMonth(-1)">
          <text>‹</text>
        </view>
        <text class="cal-title">{{ viewYear }}年{{ viewMonth }}月</text>
        <view class="cal-nav" :class="{ disabled: !canNext }" @click="canNext && shiftMonth(1)">
          <text>›</text>
        </view>
      </view>

      <view class="cal-week">
        <text v-for="w in WEEK" :key="w" class="cal-week-item">{{ w }}</text>
      </view>

      <view class="cal-grid">
        <view v-for="(cell, index) in cells" :key="index" class="cal-cell">
          <view
            v-if="cell"
            class="cal-day"
            :class="{
              selected: cell.date === props.value,
              disabled: cell.disabled
            }"
            @click="choose(cell)"
          >
            <text>{{ cell.day }}</text>
          </view>
        </view>
      </view>

      <view class="cal-foot">
        <text class="cal-today" @click="backToToday">回到今天</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.cal-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 150;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: mask-in 0.18s ease;
}

.cal {
  width: 620rpx;
  background-color: var(--bg-card);
  border-radius: 44rpx;
  padding: 32rpx 24rpx 20rpx;
  animation: cal-in 0.2s cubic-bezier(0.2, 0.9, 0.3, 1);
}

.cal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8rpx 20rpx;
}

.cal-nav {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34rpx;
  color: var(--text-2);

  &.disabled {
    opacity: 0.28;
  }
}

.cal-title {
  font-size: 30rpx;
  font-weight: 500;
  color: var(--text-1);
}

.cal-week {
  display: flex;
  padding-bottom: 8rpx;
}

.cal-week-item {
  width: 14.285%;
  text-align: center;
  font-size: 21rpx;
  color: var(--text-3);
}

.cal-grid {
  display: flex;
  flex-wrap: wrap;
}

.cal-cell {
  width: 14.285%;
  height: 84rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cal-day {
  width: 68rpx;
  height: 68rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 27rpx;
  color: var(--text-1);

  &.selected {
    background-color: var(--brand);
    color: #ffffff;
    font-weight: 500;
  }

  &.disabled {
    color: var(--text-3);
    opacity: 0.4;
  }
}

.cal-foot {
  display: flex;
  justify-content: center;
  padding-top: 16rpx;
  border-top: 1rpx solid var(--line);
  margin-top: 8rpx;
}

.cal-today {
  padding: 16rpx 40rpx;
  font-size: 26rpx;
  color: var(--brand);
}

@keyframes mask-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes cal-in {
  from {
    opacity: 0;
    transform: scale(0.94);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
