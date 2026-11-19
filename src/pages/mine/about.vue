<template>
  <view class="about-page">
    <view class="nav">
      <view class="nav-btn" @click="goBack">
        <text class="nav-icon">‹</text>
      </view>
      <text class="nav-title">关于</text>
      <view class="nav-btn"></view>
    </view>

    <scroll-view class="body" scroll-y>
      <view class="content">
        <view class="hero">
          <view class="logo">卡</view>
          <text class="app-name">卡路里</text>
          <text class="app-version">版本 1.0.0</text>
        </view>

        <view class="card">
          <text class="card-title">热量是怎么算的</text>
          <text class="card-text">
            基础代谢用 Mifflin-St Jeor 公式，按性别、年龄、身高、体重计算；再乘以活动系数得到每日总消耗（TDEE）。减重在总消耗上减去缺口，增重加上盈余，并设有安全下限（女性 1200、男性 1500 kcal）。
          </text>
        </view>

        <view class="card">
          <text class="card-title">数据存在哪</text>
          <text class="card-text">
            全部数据保存在本机，不上传服务器、不做埋点。卸载 App 会清空数据，重要记录请自行导出备份。
          </text>
        </view>

        <view class="card">
          <text class="card-title">免责说明</text>
          <text class="card-text">
            本工具的计算结果与食物热量均为估算值，仅供参考，不构成医学或营养学建议。如有特殊健康状况，请咨询医生或营养师。
          </text>
        </view>

        <text class="footer">Made for personal use</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
function goBack() {
  uni.navigateBack()
}
</script>

<style scoped lang="scss">
.about-page {
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

.body {
  flex: 1;
  height: 0;
}

.content {
  padding: 8rpx 24rpx calc(48rpx + env(safe-area-inset-bottom));
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 0 48rpx;
}

.logo {
  width: 120rpx;
  height: 120rpx;
  border-radius: 32rpx;
  background-color: var(--brand);
  color: #fff;
  font-size: 56rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-name {
  margin-top: 20rpx;
  font-size: 32rpx;
  font-weight: 500;
  color: var(--text-1);
}

.app-version {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: var(--text-3);
}

.card {
  background-color: var(--bg-card);
  border-radius: 28rpx;
  padding: 28rpx;
  margin-bottom: 16rpx;
}

.card-title {
  font-size: 27rpx;
  font-weight: 500;
  color: var(--text-1);
}

.card-text {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: var(--text-2);
}

.footer {
  display: block;
  margin-top: 40rpx;
  text-align: center;
  font-size: 20rpx;
  color: var(--text-3);
}
</style>
