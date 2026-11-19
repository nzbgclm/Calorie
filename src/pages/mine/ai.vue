<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AIConfig } from '@/types'
import { getAIConfig, saveAIConfig } from '@/utils/storage'
import { describeAIError, fetchModels } from '@/utils/ai'

const config = ref<AIConfig>(getAIConfig())
const fetching = ref(false)
const modelSheet = ref(false)
const showKey = ref(false)

const isComplete = computed(
  () => Boolean(config.value.baseUrl.trim() && config.value.apiKey.trim() && config.value.model.trim())
)

const modelLabel = computed(() => config.value.model || '未选择')

watch(
  config,
  (value) => {
    saveAIConfig({ ...value })
  },
  { deep: true }
)

function toast(title: string) {
  uni.showToast({ title, icon: 'none' })
}

function goBack() {
  uni.navigateBack()
}

function toggleEnabled() {
  if (!config.value.enabled && !isComplete.value) {
    toast('请先填完地址、密钥并选择模型')
    return
  }
  config.value.enabled = !config.value.enabled
}

async function onFetchModels() {
  if (fetching.value) return
  if (!config.value.baseUrl.trim()) {
    toast('请先填写接口地址')
    return
  }
  if (!config.value.apiKey.trim()) {
    toast('请先填写密钥')
    return
  }

  fetching.value = true
  try {
    const res = await fetchModels(config.value.baseUrl, config.value.apiKey)
    config.value.baseUrl = res.baseUrl
    config.value.models = res.models
    config.value.modelsFetchedAt = new Date().toISOString()
    if (!config.value.model || !res.models.includes(config.value.model)) {
      config.value.model = res.models[0] ?? ''
    }
    modelSheet.value = true
  } catch (e) {
    toast(describeAIError(e))
  } finally {
    fetching.value = false
  }
}

function openModelSheet() {
  if (!config.value.models.length) {
    toast('先点「连接并获取模型」')
    return
  }
  modelSheet.value = true
}

function chooseModel(name: string) {
  config.value.model = name
  modelSheet.value = false
}

function clearModels() {
  config.value.models = []
  config.value.modelsFetchedAt = undefined
}
</script>

<template>
  <view class="ai-page">
    <view class="nav">
      <view class="nav-btn" @click="goBack">
        <text class="nav-icon">‹</text>
      </view>
      <text class="nav-title">AI 设置</text>
      <view class="nav-btn"></view>
    </view>

    <view class="scroll">
      <view class="content">
        <text class="intro">
          接入兼容 OpenAI 协议的大模型服务，用来估算食物热量、解析一句话记录。默认关闭，不开启时应用完全离线。
        </text>

        <view class="card switch-card">
          <view class="row-main">
            <text class="row-title">启用 AI</text>
            <text class="row-desc">{{ isComplete ? '配置完整' : '地址、密钥、模型都填好才能开启' }}</text>
          </view>
          <view class="switch" :class="{ on: config.enabled }" @click="toggleEnabled">
            <view class="knob"></view>
          </view>
        </view>

        <view class="card">
          <view class="field">
            <text class="field-label">接口地址</text>
            <input
              v-model="config.baseUrl"
              class="field-input"
              type="text"
              placeholder="https://api.deepseek.com"
              placeholder-class="ph"
            />
          </view>
          <view class="hint">只填域名即可，会自动尝试补 /v1</view>
        </view>

        <view class="card">
          <view class="field">
            <text class="field-label">API key</text>
            <input
              v-model="config.apiKey"
              class="field-input"
              type="text"
              :password="!showKey"
              placeholder="sk-..."
              placeholder-class="ph"
            />
            <text class="eye" @click="showKey = !showKey">{{ showKey ? '隐藏' : '显示' }}</text>
          </view>
        </view>

        <view class="card">
          <view class="field" @click="openModelSheet">
            <text class="field-label">选择模型</text>
            <text class="field-value" :class="{ empty: !config.model }">{{ modelLabel }}</text>
            <text class="chevron">›</text>
          </view>

          <view class="btn-row">
            <view class="fetch-btn" :class="{ loading: fetching }" @click="onFetchModels">
              <text>{{ fetching ? '连接中…' : config.models.length ? '重新获取模型' : '连接并获取模型' }}</text>
            </view>
            <text v-if="config.models.length" class="clear-models" @click="clearModels">清除</text>
          </view>

          <view v-if="config.modelsFetchedAt && config.models.length" class="hint">
            已获取 {{ config.models.length }} 个模型
          </view>
        </view>

        <view class="card">
          <view class="field">
            <text class="field-label">模型名称</text>
            <input
              v-model="config.model"
              class="field-input"
              type="text"
              placeholder="如 deepseek-chat"
              placeholder-class="ph"
            />
          </view>
          <view class="hint">接口不支持模型列表时，直接在这里填</view>
        </view>

        <view class="note">
          <text class="note-text">
            请求只会发送你输入的食物描述，不会发送身高体重等个人资料。密钥仅保存在本机。
          </text>
        </view>
      </view>
    </view>

    <view v-if="modelSheet" class="mask" @click="modelSheet = false">
      <view class="sheet" @click.stop>
        <view class="sheet-head">
          <text class="sheet-title">选择模型</text>
          <text class="sheet-close" @click="modelSheet = false">关闭</text>
        </view>
        <scroll-view class="model-scroll" scroll-y>
          <view
            v-for="m in config.models"
            :key="m"
            class="model-item"
            :class="{ active: m === config.model }"
            @click="chooseModel(m)"
          >
            <text class="model-name">{{ m }}</text>
            <text v-if="m === config.model" class="check">✓</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.ai-page {
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
  padding: 24rpx 28rpx;
  margin-bottom: 16rpx;
}

.switch-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.field {
  display: flex;
  align-items: center;
  min-height: 56rpx;
}

.field-label {
  width: 170rpx;
  flex-shrink: 0;
  font-size: 27rpx;
  color: var(--text-2);
}

.field-input {
  flex: 1;
  font-size: 27rpx;
  color: var(--text-1);
  text-align: right;
}

.field-value {
  flex: 1;
  text-align: right;
  font-size: 27rpx;
  color: var(--text-1);

  &.empty {
    color: var(--text-3);
  }
}

.ph {
  color: var(--text-3);
}

.eye {
  margin-left: 16rpx;
  font-size: 24rpx;
  color: var(--brand);
}

.chevron {
  margin-left: 8rpx;
  font-size: 30rpx;
  color: var(--text-3);
  line-height: 1;
}

.hint {
  margin-top: 12rpx;
  font-size: 21rpx;
  color: var(--text-3);
}

.btn-row {
  display: flex;
  align-items: center;
  margin-top: 20rpx;
}

.fetch-btn {
  flex: 1;
  height: 76rpx;
  border-radius: 20rpx;
  background-color: var(--brand-weak);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 27rpx;
  color: var(--brand);

  &.loading {
    opacity: 0.6;
  }
}

.clear-models {
  margin-left: 20rpx;
  font-size: 24rpx;
  color: var(--text-3);
}

.manual-box {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid var(--line);
}

.manual-input {
  text-align: left;
  height: 64rpx;
  background-color: var(--bg-sunken);
  border-radius: 16rpx;
  padding: 0 20rpx;
}

.note {
  padding: 16rpx 8rpx 0;
}

.note-text {
  font-size: 21rpx;
  line-height: 1.6;
  color: var(--text-3);
}

.mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 100;
  background-color: rgba(0, 0, 0, 0.42);
  display: flex;
  align-items: flex-end;
}

.sheet {
  width: 100%;
  max-height: 70vh;
  background-color: var(--bg-card);
  border-radius: 40rpx 40rpx 0 0;
  padding: 32rpx 0 calc(24rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx 16rpx;
}

.sheet-title {
  font-size: 32rpx;
  font-weight: 500;
  color: var(--text-1);
}

.sheet-close {
  font-size: 26rpx;
  color: var(--text-3);
}

.model-scroll {
  flex: 1;
  height: 0;
  max-height: 56vh;
}

.model-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid var(--line);

  &.active .model-name {
    color: var(--brand);
  }
}

.model-name {
  font-size: 27rpx;
  color: var(--text-1);
}

.check {
  font-size: 26rpx;
  color: var(--brand);
}
</style>
