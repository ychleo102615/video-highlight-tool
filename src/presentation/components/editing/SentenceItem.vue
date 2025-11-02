<script setup lang="ts">
import { computed } from 'vue'
import { ClockIcon } from '@heroicons/vue/24/outline'
import type { SentenceItemProps, SentenceItemEmits } from '@/presentation/types/component-contracts'

/**
 * SentenceItem 組件
 *
 * 職責：
 * - 顯示單個句子的文字、時間戳
 * - 根據選中狀態和播放狀態顯示不同的視覺樣式
 * - 響應使用者點擊（切換選中狀態）
 * - 響應時間戳點擊（跳轉視頻）
 *
 * 狀態組合說明：
 * - isSelected=false, isPlaying=false: 未選中狀態（白色背景）
 * - isSelected=true, isPlaying=false: 選中狀態（藍色左邊框 + 淺藍背景）
 * - isPlaying=true: 播放中狀態（藍色粗邊框 + 深藍背景，優先於 isSelected）
 */

// ========================================
// Props & Emits
// ========================================
const props = defineProps<SentenceItemProps>()
const emit = defineEmits<SentenceItemEmits>()

// ========================================
// Computed Styles
// ========================================

/**
 * 計算容器樣式類別
 * 根據選中狀態和播放狀態動態設定樣式
 */
const containerClasses = computed(() => {
  const baseClasses = 'p-3 rounded-lg cursor-pointer transition-all duration-200'

  // 播放中狀態（最高優先級）
  if (props.isPlaying) {
    return `${baseClasses} border-2 border-blue-600 bg-blue-100 shadow-md`
  }

  // 選中狀態
  if (props.isSelected) {
    return `${baseClasses} border-l-4 border-blue-500 bg-blue-50 hover:bg-blue-100`
  }

  // 未選中狀態
  return `${baseClasses} border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300`
})

/**
 * 計算文字樣式類別
 */
const textClasses = computed(() => {
  if (props.isPlaying) {
    return 'text-gray-900 font-medium'
  }
  if (props.isSelected) {
    return 'text-gray-800'
  }
  return 'text-gray-700'
})

// ========================================
// Event Handlers
// ========================================

/**
 * 處理句子點擊
 * 切換選中狀態
 */
function handleClick() {
  emit('toggle', props.sentenceId)
}

/**
 * 處理時間戳點擊
 * 跳轉到對應時間
 * @param event 點擊事件（阻止冒泡，避免觸發句子點擊）
 */
function handleTimeClick(event: Event) {
  event.stopPropagation() // 阻止冒泡，避免觸發容器的 click 事件
  emit('seek', props.startTime)
}
</script>

<template>
  <div :class="containerClasses" :data-sentence-id="sentenceId" @click="handleClick">
    <!-- 句子文字 -->
    <p :class="textClasses" class="mb-2 text-base lg:text-sm leading-relaxed">
      {{ text }}
    </p>

    <!-- 時間戳按鈕 -->
    <button
      type="button"
      class="inline-flex items-center gap-1.5 px-2 py-1 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors min-h-[32px]"
      @click="handleTimeClick"
    >
      <ClockIcon class="w-4 h-4" />
      <span class="font-mono">{{ timeRange }}</span>
    </button>
  </div>
</template>
