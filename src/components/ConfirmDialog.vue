<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    visible: boolean
    title: string
    content?: string
    confirmText?: string
    cancelText?: string
    danger?: boolean
  }>(),
  {
    content: '',
    confirmText: '确定',
    cancelText: '取消',
    danger: false
  }
)

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

function close() {
  emit('update:visible', false)
  emit('cancel')
}

function confirm() {
  emit('update:visible', false)
  emit('confirm')
}
</script>

<template>
  <view v-if="props.visible" class="dlg-mask" @click="close">
    <view class="dlg" @click.stop>
      <view class="dlg-body">
        <text class="dlg-title">{{ props.title }}</text>
        <text v-if="props.content" class="dlg-desc">{{ props.content }}</text>
      </view>
      <view class="dlg-actions">
        <view class="dlg-btn dlg-btn--cancel" @click="close">
          <text>{{ props.cancelText }}</text>
        </view>
        <view class="dlg-btn" :class="props.danger ? 'dlg-btn--danger' : 'dlg-btn--primary'" @click="confirm">
          <text>{{ props.confirmText }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.dlg-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 200;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: mask-in 0.18s ease;
}

.dlg {
  width: 560rpx;
  background-color: var(--bg-card);
  border-radius: 44rpx;
  padding: 52rpx 40rpx 36rpx;
  animation: dlg-in 0.2s cubic-bezier(0.2, 0.9, 0.3, 1);
}

.dlg-body {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.dlg-title {
  font-size: 36rpx;
  font-weight: 500;
  line-height: 1.4;
  text-align: center;
  color: var(--text-1);
}

.dlg-desc {
  margin-top: 16rpx;
  font-size: 26rpx;
  line-height: 1.5;
  text-align: center;
  color: var(--text-3);
}

.dlg-actions {
  display: flex;
  margin-top: 48rpx;
}

.dlg-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 29rpx;
}

.dlg-btn--cancel {
  margin-right: 20rpx;
  background-color: var(--bg-sunken);
  color: var(--text-2);
}

.dlg-btn--primary {
  background-color: var(--brand);
  color: #ffffff;
  font-weight: 500;
}

.dlg-btn--danger {
  background-color: rgba(227, 77, 89, 0.12);
  color: var(--warn);
  font-weight: 500;
}

@keyframes mask-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes dlg-in {
  from {
    opacity: 0;
    transform: scale(0.92);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
