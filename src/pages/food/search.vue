<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import type { FoodCategory, FoodItem, MealType } from '@/types'
import { MEAL_LABEL } from '@/types'
import { CATEGORY_LABEL, CATEGORY_ORDER } from '@/data/foods'
import { kcalFor, recentFoodItems, searchFoods, type SearchResult } from '@/utils/foodSearch'
import { nowISO, today } from '@/utils/date'
import { getAIConfig, isAIReady, pushRecentFood, upsertEntry } from '@/utils/storage'
import { describeAIError, estimateFood, type AIEstimate } from '@/utils/ai'

const keyword = ref('')
const category = ref<FoodCategory | 'all'>('all')
const meal = ref<MealType>('lunch')
const date = ref(today())

const picked = ref<FoodItem | null>(null)
const grams = ref(100)
const gramsText = ref('100')

const aiReady = ref(false)
const aiLoading = ref(false)
const aiResult = ref<AIEstimate | null>(null)
const aiKcalText = ref('')

const confidenceText = computed(() => {
  const c = aiResult.value?.confidence
  if (c === 'high') return '把握较大'
  if (c === 'low') return '不太确定，建议核对'
  return '估算值，可修改'
})

const results = computed<SearchResult[]>(() => {
  if (!keyword.value.trim()) {
    if (category.value !== 'all') return searchFoods('', category.value)
    return recentFoodItems()
  }
  return searchFoods(keyword.value, category.value)
})

const emptyHint = computed(() => {
  if (results.value.length) return ''
  if (!keyword.value.trim()) return '还没有最近记录，搜一下想吃的吧'
  return '没有找到，换个说法或手动添加'
})

const pickedKcal = computed(() => (picked.value ? kcalFor(picked.value, grams.value) : 0))

const portionOptions = computed(() => picked.value?.portions ?? [])

function defaultGrams(food: FoodItem): number {
  return food.portions[0]?.grams ?? 100
}

function defaultKcal(food: FoodItem): number {
  return kcalFor(food, defaultGrams(food))
}

function setCategory(cat: FoodCategory | 'all') {
  category.value = cat
}

function pick(food: FoodItem) {
  picked.value = food
  const g = defaultGrams(food)
  grams.value = g
  gramsText.value = String(g)
}

function choosePortion(label: string, g: number) {
  grams.value = g
  gramsText.value = String(g)
}

function onGramsInput(e: { detail: { value: string } }) {
  const raw = e.detail.value.replace(/[^\d]/g, '')
  gramsText.value = raw
  const n = Number(raw)
  grams.value = Number.isFinite(n) && n > 0 ? Math.min(n, 5000) : 0
}

function closeSheet() {
  picked.value = null
}

function save() {
  const food = picked.value
  if (!food || grams.value <= 0) {
    uni.showToast({ title: '请填写份量', icon: 'none' })
    return
  }
  const portion = portionOptions.value.find((p) => p.grams === grams.value)
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: date.value,
    mealType: meal.value,
    name: food.name,
    amountText: portion ? portion.label : `${grams.value}g`,
    grams: grams.value,
    kcal: kcalFor(food, grams.value),
    foodId: food.id,
    source: 'library' as const,
    createdAt: nowISO()
  }
  upsertEntry(entry)
  pushRecentFood({
    foodId: food.id,
    name: food.name,
    kcal: entry.kcal,
    amountText: entry.amountText
  })
  uni.showToast({ title: `已记入${MEAL_LABEL[meal.value]}`, icon: 'none' })
  setTimeout(() => {
    uni.navigateBack()
  }, 320)
}

function goManual() {
  const q = keyword.value.trim()
  const url = `/pages/food/edit?meal=${meal.value}&date=${date.value}${
    q ? `&name=${encodeURIComponent(q)}` : ''
  }`
  uni.navigateTo({ url })
}

async function runAI() {
  const q = keyword.value.trim()
  if (!q || aiLoading.value) return
  aiLoading.value = true
  try {
    const res = await estimateFood(q)
    aiResult.value = res
    aiKcalText.value = String(res.kcal)
  } catch (e) {
    uni.showToast({ title: describeAIError(e), icon: 'none' })
  } finally {
    aiLoading.value = false
  }
}

function onAiKcalInput(e: { detail: { value: string } }) {
  aiKcalText.value = e.detail.value.replace(/[^\d]/g, '').slice(0, 4)
}

function saveAI() {
  const result = aiResult.value
  if (!result) return
  const kcal = Number(aiKcalText.value)
  if (!Number.isFinite(kcal) || kcal <= 0) {
    uni.showToast({ title: '请填写热量', icon: 'none' })
    return
  }
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: date.value,
    mealType: meal.value,
    name: result.name,
    amountText: result.portion || undefined,
    kcal: Math.round(kcal),
    source: 'ai' as const,
    createdAt: nowISO()
  }
  upsertEntry(entry)
  pushRecentFood({ name: entry.name, kcal: entry.kcal, amountText: entry.amountText })
  aiResult.value = null
  uni.showToast({ title: `已记入${MEAL_LABEL[meal.value]}`, icon: 'none' })
  setTimeout(() => uni.navigateBack(), 320)
}

function goParse() {
  uni.navigateTo({ url: `/pages/ai/parse?date=${date.value}&meal=${meal.value}` })
}

function goBack() {
  uni.navigateBack()
}

onLoad((query) => {
  if (query?.meal) meal.value = query.meal as MealType
  if (query?.date) date.value = query.date
  aiReady.value = isAIReady(getAIConfig())
})
</script>

<template>
  <view class="search-page">
    <view class="search-bar">
      <view class="back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <view class="input-wrap">
        <input
          v-model="keyword"
          class="search-input"
          type="text"
          placeholder="搜索食物，如 米饭"
          placeholder-class="search-placeholder"
          confirm-type="search"
        />
        <text v-if="keyword" class="clear" @click="keyword = ''">×</text>
      </view>
    </view>

    <view v-if="aiReady" class="quick-bar" @click="goParse">
      <text class="quick-text">试试一句话记录：中午一碗牛肉面加个卤蛋</text>
      <text class="quick-arrow">›</text>
    </view>

    <scroll-view class="cat-bar" scroll-x :show-scrollbar="false">
      <view class="cat-row">
        <view
          class="cat"
          :class="{ active: category === 'all' }"
          @click="setCategory('all')"
        >
          全部
        </view>
        <view
          v-for="cat in CATEGORY_ORDER"
          :key="cat"
          class="cat"
          :class="{ active: category === cat }"
          @click="setCategory(cat)"
        >
          {{ CATEGORY_LABEL[cat] }}
        </view>
      </view>
    </scroll-view>

    <scroll-view class="result-scroll" scroll-y>
      <view class="result-list">
        <view v-if="emptyHint" class="empty">
          <text class="empty-text">{{ emptyHint }}</text>

          <view
            v-if="keyword && aiReady"
            class="ai-btn"
            :class="{ loading: aiLoading }"
            @click="runAI"
          >
            <text>{{ aiLoading ? 'AI 估算中…' : `用 AI 估算「${keyword}」` }}</text>
          </view>

          <view v-if="keyword" class="manual-btn" @click="goManual">
            <text>手动添加「{{ keyword }}」</text>
          </view>
        </view>

        <view
          v-for="hit in results"
          :key="hit.food.id"
          class="result-item"
          @click="pick(hit.food)"
        >
          <view class="r-left">
            <text class="r-name">{{ hit.food.name }}</text>
            <text class="r-sub">
              {{ hit.food.portions[0]?.label }} · 每100g {{ hit.food.kcalPer100g }} kcal
            </text>
          </view>
          <view class="r-right">
            <text class="r-kcal num">{{ defaultKcal(hit.food) }}</text>
            <text class="r-unit">kcal</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <view v-if="picked" class="mask" @click="closeSheet">
      <view class="sheet" @click.stop>
        <view class="sheet-head">
          <text class="sheet-title">{{ picked.name }}</text>
          <text class="sheet-sub">
            {{ MEAL_LABEL[meal] }} · 每100g {{ picked.kcalPer100g }} kcal
          </text>
        </view>

        <view class="portion-row">
          <view
            v-for="p in portionOptions"
            :key="p.label"
            class="portion"
            :class="{ active: grams === p.grams }"
            @click="choosePortion(p.label, p.grams)"
          >
            <text class="portion-label">{{ p.label }}</text>
            <text class="portion-gram">{{ p.grams }}g</text>
          </view>
        </view>

        <view class="gram-row">
          <text class="gram-label">份量</text>
          <view class="gram-input-wrap">
            <input
              class="gram-input"
              type="number"
              :value="gramsText"
              @input="onGramsInput"
            />
            <text class="gram-unit">g</text>
          </view>
        </view>

        <view class="sheet-summary">
          <text class="sum-label">本次摄入</text>
          <view class="sum-value">
            <text class="sum-num num">{{ pickedKcal }}</text>
            <text class="sum-unit">kcal</text>
          </view>
        </view>

        <view class="sheet-actions">
          <view class="btn-cancel" @click="closeSheet">
            <text>取消</text>
          </view>
          <view class="btn-confirm" @click="save">
            <text>记入{{ MEAL_LABEL[meal] }}</text>
          </view>
        </view>
      </view>
    </view>
    <view v-if="aiResult" class="mask" @click="aiResult = null">
      <view class="sheet" @click.stop>
        <view class="sheet-head">
          <text class="sheet-title">{{ aiResult.name }}</text>
          <text class="sheet-sub">{{ aiResult.portion }} · {{ confidenceText }}</text>
        </view>

        <text v-if="aiResult.note" class="ai-note">{{ aiResult.note }}</text>

        <view class="gram-row">
          <text class="gram-label">热量</text>
          <view class="gram-input-wrap">
            <input class="gram-input" type="number" :value="aiKcalText" @input="onAiKcalInput" />
            <text class="gram-unit">kcal</text>
          </view>
        </view>

        <view class="sheet-actions">
          <view class="btn-cancel" @click="aiResult = null">
            <text>取消</text>
          </view>
          <view class="btn-confirm" @click="saveAI">
            <text>记入{{ MEAL_LABEL[meal] }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.search-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-page);
  overflow: hidden;
}

.search-bar {
  display: flex;
  align-items: center;
  padding: calc(var(--status-bar-height) + 16rpx) 24rpx 16rpx;
  flex-shrink: 0;
}

.back {
  width: 56rpx;
  height: 56rpx;
  margin-right: 8rpx;
  margin-left: -8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 40rpx;
  line-height: 1;
  color: var(--text-2);
}

.input-wrap {
  flex: 1;
  height: 72rpx;
  background-color: var(--bg-card);
  border-radius: 36rpx;
  padding: 0 28rpx;
  display: flex;
  align-items: center;
}

.search-input {
  flex: 1;
  height: 72rpx;
  font-size: 28rpx;
  color: var(--text-1);
}

.search-placeholder {
  color: var(--text-3);
}

.clear {
  width: 40rpx;
  text-align: right;
  font-size: 32rpx;
  color: var(--text-3);
}

.cat-bar {
  flex-shrink: 0;
  white-space: nowrap;
  padding-bottom: 8rpx;
}

.quick-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 24rpx 16rpx;
  padding: 18rpx 24rpx;
  border-radius: 20rpx;
  background-color: var(--brand-weak);
}

.quick-text {
  flex: 1;
  font-size: 22rpx;
  color: var(--brand);
}

.quick-arrow {
  margin-left: 12rpx;
  font-size: 28rpx;
  line-height: 1;
  color: var(--brand);
}

.cat-row {
  display: inline-flex;
  padding: 0 24rpx 8rpx;
}

.cat {
  flex-shrink: 0;
  padding: 12rpx 26rpx;
  margin-right: 16rpx;
  border-radius: 999rpx;
  background-color: var(--bg-card);
  font-size: 25rpx;
  color: var(--text-2);

  &.active {
    background-color: var(--brand);
    color: #fff;
  }
}

.result-scroll {
  flex: 1;
  height: 0;
}

.result-list {
  padding: 8rpx 24rpx calc(40rpx + env(safe-area-inset-bottom));
}

.result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--bg-card);
  border-radius: 24rpx;
  padding: 26rpx 28rpx;
  margin-bottom: 16rpx;
}

.r-left {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.r-name {
  font-size: 30rpx;
  color: var(--text-1);
}

.r-sub {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: var(--text-3);
}

.r-right {
  display: flex;
  align-items: baseline;
  margin-left: 20rpx;
}

.r-kcal {
  font-size: 32rpx;
  color: var(--text-1);
}

.r-unit {
  margin-left: 4rpx;
  font-size: 20rpx;
  color: var(--text-3);
}

.empty {
  padding: 80rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-text {
  font-size: 26rpx;
  color: var(--text-3);
}

.manual-btn {
  margin-top: 20rpx;
  padding: 18rpx 36rpx;
  border-radius: 999rpx;
  background-color: var(--brand-weak);
  font-size: 26rpx;
  color: var(--brand);
}

.ai-btn {
  margin-top: 32rpx;
  padding: 20rpx 40rpx;
  border-radius: 999rpx;
  background-color: var(--brand);
  font-size: 26rpx;
  font-weight: 500;
  color: #ffffff;

  &.loading {
    opacity: 0.65;
  }
}

.ai-note {
  display: block;
  margin-top: 20rpx;
  padding: 18rpx 22rpx;
  border-radius: 16rpx;
  background-color: var(--bg-sunken);
  font-size: 22rpx;
  line-height: 1.5;
  color: var(--text-2);
}

.mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.42);
  display: flex;
  align-items: flex-end;
  z-index: 100;
}

.sheet {
  width: 100%;
  background-color: var(--bg-card);
  border-radius: 40rpx 40rpx 0 0;
  padding: 40rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
}

.sheet-head {
  display: flex;
  flex-direction: column;
}

.sheet-title {
  font-size: 38rpx;
  font-weight: 500;
  color: var(--text-1);
}

.sheet-sub {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: var(--text-3);
}

.portion-row {
  display: flex;
  flex-wrap: wrap;
  margin-top: 32rpx;
}

.portion {
  padding: 16rpx 28rpx;
  margin: 0 16rpx 16rpx 0;
  border-radius: 20rpx;
  background-color: var(--bg-sunken);
  border: 2rpx solid transparent;
  display: flex;
  flex-direction: column;
  align-items: center;

  &.active {
    border-color: var(--brand);
    background-color: var(--brand-weak);
  }
}

.portion-label {
  font-size: 26rpx;
  color: var(--text-1);
}

.portion-gram {
  margin-top: 4rpx;
  font-size: 20rpx;
  color: var(--text-3);
}

.gram-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
  padding: 22rpx 28rpx;
  background-color: var(--bg-sunken);
  border-radius: 20rpx;
}

.gram-label {
  font-size: 27rpx;
  color: var(--text-2);
}

.gram-input-wrap {
  display: flex;
  align-items: center;
}

.gram-input {
  width: 140rpx;
  text-align: right;
  font-size: 30rpx;
  color: var(--text-1);
}

.gram-unit {
  margin-left: 8rpx;
  font-size: 24rpx;
  color: var(--text-3);
}

.sheet-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 28rpx;
  padding: 0 4rpx;
}

.sum-label {
  font-size: 26rpx;
  color: var(--text-2);
}

.sum-value {
  display: flex;
  align-items: baseline;
}

.sum-num {
  font-size: 52rpx;
  font-weight: 500;
  color: var(--brand);
}

.sum-unit {
  margin-left: 6rpx;
  font-size: 22rpx;
  color: var(--text-3);
}

.sheet-actions {
  display: flex;
  margin-top: 32rpx;
}

.btn-cancel {
  width: 200rpx;
  height: 92rpx;
  margin-right: 20rpx;
  border-radius: 24rpx;
  background-color: var(--bg-sunken);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  color: var(--text-2);
}

.btn-confirm {
  flex: 1;
  height: 92rpx;
  border-radius: 24rpx;
  background-color: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 500;
  color: #fff;
}
</style>
