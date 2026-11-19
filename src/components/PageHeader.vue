<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <view class="page-header">
    <view class="header-main">
      <text class="header-title">{{ title }}</text>
      <text v-if="subtitle" class="header-sub">{{ subtitle }}</text>
    </view>
    <view class="header-extra">
      <slot name="extra" />
    </view>
  </view>
</template>

<style scoped lang="scss">
.page-header {
  padding: calc(var(--status-bar-height) + 24rpx) 8rpx 20rpx;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.header-main {
  display: flex;
  flex-direction: column;
}

.header-title {
  font-size: 52rpx;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: -0.5rpx;
  color: var(--text-1);
}

.header-sub {
  margin-top: 6rpx;
  font-size: 25rpx;
  color: var(--text-3);
}

.header-extra {
  display: flex;
  align-items: center;
  padding-bottom: 4rpx;
}
</style>
