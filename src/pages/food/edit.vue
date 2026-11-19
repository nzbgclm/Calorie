<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import type { FoodEntry, MealType } from '@/types'
import { MEALS } from '@/types'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { nowISO, today } from '@/utils/date'
import {
  getEntriesByDate,
  pushRecentFood,
  removeEntry,
  upsertEntry
} from '@/utils/storage'

const editId = ref('')
const name = ref('')
const kcalText = ref('')
const amountText = ref('')
const meal = ref<MealType>('lunch')
const date = ref(today())

const isEdit = computed(() => Boolean(editId.value))
const showDelete = ref(false)
const kcal = computed(() => {
  const n = Number(kcalText.value)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0
})
const canSave = computed(() => name.value.trim().length > 0 && kcal.value > 0)

function onKcalInput(e: { detail: { value: string } }) {
  kcalText.value = e.detail.value.replace(/[^\d]/g, '').slice(0, 4)
}

function goBack() {
  uni.navigateBack()
}

function save() {
  if (!canSave.value) {
    uni.showToast({ title: '请填写名称和热量', icon: 'none' })
    return
  }
  const entry: FoodEntry = {
    id: editId.value || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: date.value,
    mealType: meal.value,
    name: name.value.trim(),
    amountText: amountText.value.trim() || undefined,
    kcal: kcal.value,
    source: 'manual',
    createdAt: nowISO()
  }
  upsertEntry(entry)
  pushRecentFood({
    name: entry.name,
    kcal: entry.kcal,
    amountText: entry.amountText
  })
  uni.showToast({ title: '已保存', icon: 'none' })
  setTimeout(() => uni.navigateBack(), 280)
}

function confirmDelete() {
  showDelete.value = true
}

function doDelete() {
  removeEntry(editId.value, date.value)
  uni.navigateBack()
}

onLoad((query) => {
  if (query?.meal) meal.value = query.meal as MealType
  if (query?.date) date.value = query.date
  if (query?.name) name.value = decodeURIComponent(query.name)
  if (query?.id) {
    editId.value = query.id
    const found = getEntriesByDate(date.value).find((e) => e.id === query.id)
    if (found) {
      name.value = found.name
      kcalText.value = String(found.kcal)
      amountText.value = found.amountText ?? ''
      meal.value = found.mealType
    }
  }
})
</script>

<template>
  <view class="edit-page">
    <view class="nav">
      <view class="nav-btn" @click="goBack">
        <text class="nav-icon">‹</text>
      </view>
      <text class="nav-title">{{ isEdit ? '编辑记录' : '记录食物' }}</text>
      <view class="nav-btn" @click="isEdit ? confirmDelete() : goBack()">
        <text class="nav-action">{{ isEdit ? '删除' : '' }}</text>
      </view>
    </view>

    <scroll-view class="body" scroll-y>
      <view class="field-card">
        <text class="field-label">食物名称</text>
        <input
          v-model="name"
          class="field-input"
          type="text"
          placeholder="如 牛肉面"
          placeholder-class="ph"
          :maxlength="30"
        />
      </view>

      <view class="field-card">
        <text class="field-label">热量</text>
        <view class="field-inline">
          <input
            class="field-input field-input--num"
            type="number"
            :value="kcalText"
            placeholder="0"
            placeholder-class="ph"
            @input="onKcalInput"
          />
          <text class="field-unit">kcal</text>
        </view>
      </view>

      <view class="field-card">
        <text class="field-label">份量</text>
        <input
          v-model="amountText"
          class="field-input"
          type="text"
          placeholder="选填，如 1碗 / 200g"
          placeholder-class="ph"
          :maxlength="20"
        />
      </view>

      <view class="field-card">
        <text class="field-label">餐次</text>
        <view class="meal-row">
          <view
            v-for="m in MEALS"
            :key="m.value"
            class="meal-chip"
            :class="{ active: meal === m.value }"
            @click="meal = m.value"
          >
            <text>{{ m.label }}</text>
          </view>
        </view>
      </view>

      <view class="date-line">
        <text class="muted">记录日期</text>
        <text>{{ date }}</text>
      </view>
    </scroll-view>

    <view class="footer">
      <view class="save-btn" :class="{ disabled: !canSave }" @click="save">
        <text>保存</text>
      </view>
    </view>

    <ConfirmDialog
      v-model:visible="showDelete"
      title="删除这条记录？"
      content="删除后无法恢复，卡路里会从当天扣除"
      confirm-text="删除"
      danger
      @confirm="doDelete"
    />
  </view>
</template>

<style scoped lang="scss">
.edit-page {
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
  width: 96rpx;
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

.nav-action {
  width: 100%;
  text-align: right;
  font-size: 26rpx;
  color: var(--warn);
}

.body {
  flex: 1;
  height: 0;
}

.field-card {
  background-color: var(--bg-card);
  border-radius: 24rpx;
  padding: 24rpx 28rpx;
  margin: 0 24rpx 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field-label {
  font-size: 27rpx;
  color: var(--text-2);
  flex-shrink: 0;
  width: 140rpx;
}

.field-input {
  flex: 1;
  text-align: right;
  font-size: 30rpx;
  color: var(--text-1);
}

.field-input--num {
  font-size: 36rpx;
}

.field-inline {
  display: flex;
  align-items: baseline;
  flex: 1;
  justify-content: flex-end;
}

.field-unit {
  margin-left: 8rpx;
  font-size: 22rpx;
  color: var(--text-3);
}

.ph {
  color: var(--text-3);
}

.meal-row {
  display: flex;
  flex: 1;
  justify-content: flex-end;
}

.meal-chip {
  padding: 12rpx 24rpx;
  margin-left: 12rpx;
  border-radius: 999rpx;
  background-color: var(--bg-sunken);
  font-size: 25rpx;
  color: var(--text-2);

  &.active {
    background-color: var(--brand);
    color: #fff;
  }
}

.date-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 32rpx 0;
  font-size: 24rpx;
  color: var(--text-2);
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
