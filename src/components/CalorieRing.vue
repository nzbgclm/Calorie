<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  intake: number
  target: number
}>()

/** viewBox 200×200，半径 84，描边 21 */
const RADIUS = 84
const CENTER = 100

const ratio = computed(() => (props.target > 0 ? props.intake / props.target : 0))
const isOver = computed(() => ratio.value > 1)
const remaining = computed(() => props.target - props.intake)

/**
 * 环表达「剩余量」：0 摄入时全满，吃越多越少，吃到推荐值变空。
 * 超出时改为满环红色，作为爆表的强提示（中心数字同时显示「超出 xxx」）。
 */
const displayRatio = computed(() => {
  if (isOver.value) return 1
  return Math.min(Math.max(1 - ratio.value, 0), 1)
})

/**
 * 用 path 的 d 属性画弧，不用 stroke-dasharray。
 * 原因：带连字符的 SVG 属性在 uni-app 编译里会丢，而 CSS 里写
 * 无单位的 dasharray 也容易被判无效；d 是单字母属性，最稳。
 * 起点固定在 12 点方向，顺时针画。
 */
const arcPath = computed(() => {
  const p = displayRatio.value
  if (p <= 0.0005) return ''
  const capped = Math.min(p, 0.9999)
  const angle = capped * Math.PI * 2
  const x = CENTER + RADIUS * Math.sin(angle)
  const y = CENTER - RADIUS * Math.cos(angle)
  const largeArc = capped > 0.5 ? 1 : 0
  return `M${CENTER} ${CENTER - RADIUS}A${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${x.toFixed(
    2
  )} ${y.toFixed(2)}`
})
</script>

<template>
  <view class="ring-wrap">
    <view class="ring-box">
      <svg class="ring-svg" :class="{ over: isOver }" viewBox="0 0 200 200">
        <circle
          class="ring-track-circle"
          cx="100"
          cy="100"
          :r="RADIUS"
          fill="none"
          stroke-width="21"
        />
        <path
          v-if="arcPath"
          class="ring-bar"
          :d="arcPath"
          fill="none"
          stroke-width="21"
          stroke-linecap="round"
        />
      </svg>
      <view class="ring-center">
        <text class="ring-value num" :class="{ over: isOver }">
          {{ Math.abs(remaining) }}
        </text>
        <text class="ring-label">{{ isOver ? '超出 kcal' : '剩余 kcal' }}</text>
      </view>
    </view>

    <view class="ring-meta">
      <text class="num">已摄入 {{ intake }}</text>
      <text class="dot">·</text>
      <text class="num">推荐 {{ target }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.ring-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.ring-box {
  position: relative;
  width: 400rpx;
  height: 400rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ring-svg {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
}

.ring-track-circle {
  stroke: var(--ring-track, #e4e4ea);
}

.ring-bar {
  stroke: var(--brand, #ff7a45);
}

.ring-svg.over .ring-bar {
  stroke: var(--warn, #e34d59);
}

.ring-center {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.ring-value {
  font-size: 72rpx;
  font-weight: 500;
  line-height: 1.1;
  color: var(--text-1);

  &.over {
    color: var(--warn);
  }
}

.ring-label {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: var(--text-3);
}

.ring-meta {
  margin-top: 24rpx;
  font-size: 26rpx;
  color: var(--text-2);
  display: flex;
  align-items: center;
}

.dot {
  margin: 0 12rpx;
  color: var(--text-3);
}
</style>
