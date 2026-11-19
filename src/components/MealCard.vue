<script setup lang="ts">
import type { FoodEntry } from '@/types'

defineProps<{
  label: string
  kcal: number
  list: FoodEntry[]
}>()

const emit = defineEmits<{
  (e: 'add'): void
  (e: 'tap-item', entry: FoodEntry): void
}>()
</script>

<template>
  <view class="meal-card">
    <view class="meal-head">
      <view class="meal-title">
        <text class="meal-name">{{ label }}</text>
        <text class="meal-kcal num">{{ kcal }}</text>
        <text class="meal-unit">kcal</text>
      </view>
      <view class="meal-add" @click="emit('add')">
        <text class="plus">+</text>
      </view>
    </view>

    <view v-if="list.length" class="meal-list">
      <view
        v-for="item in list"
        :key="item.id"
        class="meal-item"
        @click="emit('tap-item', item)"
      >
        <text class="item-name">{{ item.name }}</text>
        <text v-if="item.amountText" class="item-amount">{{ item.amountText }}</text>
        <text class="item-kcal num">{{ item.kcal }}</text>
      </view>
    </view>
    <view v-else class="meal-empty">
      <text>还没有记录</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.meal-card {
  background-color: var(--bg-card);
  border-radius: 32rpx;
  padding: 28rpx 32rpx;
}

.meal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.meal-title {
  display: flex;
  align-items: baseline;
}

.meal-name {
  font-size: 30rpx;
  font-weight: 500;
  color: var(--text-1);
}

.meal-kcal {
  margin-left: 16rpx;
  font-size: 30rpx;
  color: var(--text-2);
}

.meal-unit {
  margin-left: 4rpx;
  font-size: 22rpx;
  color: var(--text-3);
}

.meal-add {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background-color: var(--brand-weak);
  display: flex;
  align-items: center;
  justify-content: center;
}

.plus {
  font-size: 36rpx;
  line-height: 1;
  color: var(--brand);
}

.meal-list {
  margin-top: 20rpx;
}

.meal-item {
  display: flex;
  align-items: center;
  padding: 18rpx 0;
  border-top: 1rpx solid var(--line);

  &:first-child {
    border-top: none;
  }
}

.item-name {
  flex: 1;
  font-size: 28rpx;
  color: var(--text-1);
}

.item-amount {
  margin-right: 20rpx;
  font-size: 24rpx;
  color: var(--text-3);
}

.item-kcal {
  font-size: 28rpx;
  color: var(--text-2);
}

.meal-empty {
  margin-top: 16rpx;
  padding: 12rpx 0 4rpx;
  font-size: 26rpx;
  color: var(--text-3);
}
</style>
