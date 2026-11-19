<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import type { MealType } from '@/types'
import { MEALS } from '@/types'
import { nowISO, today } from '@/utils/date'
import { pushRecentFood, upsertEntry } from '@/utils/storage'
import { describeAIError, parseMealText } from '@/utils/ai'

interface DraftItem {
  key: string
  name: string
  amount: string
  kcal: number
  meal: MealType
}

const text = ref('')
const items = ref<DraftItem[]>([])
const parsing = ref(false)
const date = ref(today())
const defaultMeal = ref<MealType>('lunch')

const EXAMPLES = [
  '中午一碗牛肉面加个卤蛋',
  '下午喝了杯美式，吃了半个苹果',
  '早餐两个鸡蛋一杯豆浆'
]

const totalKcal = computed(() => items.value.reduce((sum, i) => sum + (Number(i.kcal) || 0), 0))

function toast(title: string) {
  uni.showToast({ title, icon: 'none' })
}

function goBack() {
  uni.navigateBack()
}

function useExample(example: string) {
  text.value = example
}

async function runParse() {
  const content = text.value.trim()
  if (!content) {
    toast('先说说你吃了什么')
    return
  }
  if (parsing.value) return

  parsing.value = true
  try {
    const parsed = await parseMealText(content, defaultMeal.value)
    items.value = parsed.map((item, index) => ({
      key: `${Date.now()}-${index}`,
      name: item.name,
      amount: item.amount,
      kcal: item.kcal,
      meal: item.meal
    }))
  } catch (e) {
    toast(describeAIError(e))
  } finally {
    parsing.value = false
  }
}

function removeItem(index: number) {
  items.value.splice(index, 1)
}

function onKcalInput(index: number, e: { detail: { value: string } }) {
  const raw = e.detail.value.replace(/[^\d]/g, '').slice(0, 4)
  items.value[index].kcal = Number(raw) || 0
}

function save() {
  const valid = items.value.filter((i) => i.name.trim() && Number(i.kcal) > 0)
  if (!valid.length) {
    toast('没有可保存的记录')
    return
  }

  valid.forEach((item, index) => {
    const kcal = Math.round(Number(item.kcal))
    upsertEntry({
      id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      date: date.value,
      mealType: item.meal,
      name: item.name.trim(),
      amountText: item.amount || undefined,
      kcal,
      source: 'ai',
      createdAt: nowISO()
    })
    pushRecentFood({ name: item.name.trim(), kcal, amountText: item.amount || undefined })
  })

  toast(`已记入 ${valid.length} 条`)
  setTimeout(() => {
    // 从首页 → 搜索页 → 这里，一次退回首页
    uni.navigateBack({ delta: 2 })
  }, 400)
}

onLoad((query) => {
  if (query?.date) date.value = query.date
  if (query?.meal) defaultMeal.value = query.meal as MealType
})
</script>

<template>
  <view class="parse-page">
    <view class="nav">
      <view class="nav-btn" @click="goBack">
        <text class="nav-icon">‹</text>
      </view>
      <text class="nav-title">一句话记录</text>
      <view class="nav-btn"></view>
    </view>

    <scroll-view class="body" scroll-y>
      <view class="content">
        <view class="input-card">
          <textarea
            v-model="text"
            class="desc-input"
            placeholder="例如：中午一碗牛肉面加个卤蛋"
            placeholder-class="ph"
            :maxlength="120"
            :auto-height="true"
          />
          <text class="counter">{{ text.length }}/120</text>
        </view>

        <view class="examples">
          <text class="example-label">试试</text>
          <text
            v-for="example in EXAMPLES"
            :key="example"
            class="example"
            @click="useExample(example)"
          >
            {{ example }}
          </text>
        </view>

        <view class="parse-btn" :class="{ loading: parsing }" @click="runParse">
          <text>{{ parsing ? 'AI 解析中…' : items.length ? '重新解析' : '解析' }}</text>
        </view>

        <template v-if="items.length">
          <view class="result-head">
            <text class="result-title">识别到 {{ items.length }} 项</text>
            <text class="result-total num">{{ totalKcal }} kcal</text>
          </view>

          <view v-for="(item, index) in items" :key="item.key" class="item-card">
            <view class="item-top">
              <input v-model="item.name" class="item-name" type="text" :maxlength="30" />
              <text class="item-del" @click="removeItem(index)">×</text>
            </view>

            <view class="item-row">
              <text class="item-amount">{{ item.amount || '未标注份量' }}</text>
              <view class="item-kcal">
                <input
                  class="kcal-input"
                  type="number"
                  :value="String(item.kcal)"
                  @input="onKcalInput(index, $event)"
                />
                <text class="kcal-unit">kcal</text>
              </view>
            </view>

            <view class="meal-row">
              <view
                v-for="m in MEALS"
                :key="m.value"
                class="meal-chip"
                :class="{ active: item.meal === m.value }"
                @click="item.meal = m.value"
              >
                <text>{{ m.label }}</text>
              </view>
            </view>
          </view>
        </template>
      </view>
    </scroll-view>

    <view class="footer">
      <view class="save-btn" :class="{ disabled: !items.length }" @click="save">
        <text>{{ items.length ? `确认记入 ${items.length} 项` : '先解析一次' }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.parse-page {
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
  padding: 8rpx 24rpx 40rpx;
}

.input-card {
  position: relative;
  background-color: var(--bg-card);
  border-radius: 28rpx;
  padding: 28rpx;
}

.desc-input {
  width: 100%;
  min-height: 120rpx;
  font-size: 30rpx;
  line-height: 1.6;
  color: var(--text-1);
}

.ph {
  color: var(--text-3);
}

.counter {
  position: absolute;
  right: 28rpx;
  bottom: 20rpx;
  font-size: 20rpx;
  color: var(--text-3);
}

.examples {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  padding: 20rpx 8rpx 0;
}

.example-label {
  font-size: 22rpx;
  color: var(--text-3);
  margin-right: 12rpx;
}

.example {
  font-size: 22rpx;
  color: var(--text-2);
  padding: 8rpx 16rpx;
  margin: 0 12rpx 12rpx 0;
  border-radius: 999rpx;
  background-color: var(--bg-sunken);
}

.parse-btn {
  margin-top: 24rpx;
  height: 88rpx;
  border-radius: 24rpx;
  background-color: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 29rpx;
  font-weight: 500;
  color: #fff;

  &.loading {
    opacity: 0.65;
  }
}

.result-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 40rpx 8rpx 16rpx;
}

.result-title {
  font-size: 26rpx;
  color: var(--text-2);
}

.result-total {
  font-size: 26rpx;
  color: var(--brand);
}

.item-card {
  background-color: var(--bg-card);
  border-radius: 28rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 16rpx;
}

.item-top {
  display: flex;
  align-items: center;
}

.item-name {
  flex: 1;
  font-size: 30rpx;
  color: var(--text-1);
}

.item-del {
  width: 56rpx;
  text-align: right;
  font-size: 36rpx;
  line-height: 1;
  color: var(--text-3);
}

.item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12rpx;
}

.item-amount {
  font-size: 23rpx;
  color: var(--text-3);
}

.item-kcal {
  display: flex;
  align-items: baseline;
}

.kcal-input {
  width: 120rpx;
  text-align: right;
  font-size: 30rpx;
  color: var(--text-1);
}

.kcal-unit {
  margin-left: 6rpx;
  font-size: 20rpx;
  color: var(--text-3);
}

.meal-row {
  display: flex;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid var(--line);
}

.meal-chip {
  padding: 10rpx 22rpx;
  margin-right: 12rpx;
  border-radius: 999rpx;
  background-color: var(--bg-sunken);
  font-size: 23rpx;
  color: var(--text-2);

  &.active {
    background-color: var(--brand);
    color: #fff;
  }
}

.footer {
  flex-shrink: 0;
  padding: 20rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));
}

.save-btn {
  height: 92rpx;
  border-radius: 24rpx;
  background-color: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 500;
  color: #fff;

  &.disabled {
    opacity: 0.4;
  }
}
</style>
