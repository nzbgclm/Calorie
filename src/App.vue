<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { scheduleReminders } from '@/utils/reminder'

onLaunch(() => {
  // iOS 本地通知不支持每天重复，每次启动重排未来 7 天
  scheduleReminders()
})

onShow(() => {
  // 预留：回到前台时校验日期是否已跨天（M4 实现）
})
</script>

<style lang="scss">
page {
  --bg-page: #f5f5f7;
  --bg-card: #ffffff;
  --bg-sunken: #f0f0f3;
  --text-1: #1c1c1e;
  --text-2: #6e6e73;
  --text-3: #a1a1a6;
  --line: #ededf0;
  --ring-track: #e4e4ea;

  background-color: var(--bg-page);
  color: var(--text-1);
  font-family: -apple-system, 'PingFang SC', 'Helvetica Neue', Helvetica, sans-serif;
  font-size: 28rpx;
  -webkit-font-smoothing: antialiased;
}

@media (prefers-color-scheme: dark) {
  page {
    --bg-page: #101012;
    --bg-card: #1c1c1f;
    --bg-sunken: #232326;
    --text-1: #f2f2f7;
    --text-2: #9a9aa0;
    --text-3: #6e6e73;
    --line: #2a2a2e;
    --ring-track: #34343a;
  }
}

view,
text,
scroll-view {
  box-sizing: border-box;
}

/* 页面骨架：顶部标题固定 + 中间内容独立滚动 + 底部 tab 固定 */
.page-root {
  height: calc(100vh - var(--window-bottom, 0px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-scroll {
  flex: 1;
  height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

.page-content {
  padding: 0 24rpx calc(32rpx + env(safe-area-inset-bottom));
}

.card {
  background-color: var(--bg-card);
  border-radius: 32rpx;
  padding: 32rpx;
}

.card + .card {
  margin-top: 24rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 500;
  color: var(--text-1);
}

.muted {
  color: var(--text-2);
  font-size: 26rpx;
}

.num {
  font-variant-numeric: tabular-nums;
}

/* 页面级不出现滚动条，只有中间内容区超出时才显示细滚动条 */
::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.page-scroll::-webkit-scrollbar {
  display: block;
  width: 4rpx;
  height: 0;
}

.page-scroll::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.14);
  border-radius: 4rpx;
}

.page-scroll::-webkit-scrollbar-track {
  background-color: transparent;
}

@media (prefers-color-scheme: dark) {
  .page-scroll::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.16);
  }
}
</style>
