<script setup lang="ts">
import { computed } from 'vue';
import { ClockIcon } from '@heroicons/vue/24/outline';
import { useHighlightStore } from '@/presentation/stores/highlightStore';
import type {
  SentenceItemProps,
  SentenceItemEmits
} from '@/presentation/types/component-contracts';

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
const props = defineProps<SentenceItemProps>();
const emit = defineEmits<SentenceItemEmits>();

// ========================================
// Stores
// ========================================
const highlightStore = useHighlightStore();

// ========================================
// Computed Styles
// ========================================

/**
 * 計算容器樣式類別
 * 根據選中狀態和播放狀態動態設定樣式
 */
const containerClasses = computed(() => {
  // 移動端使用較大的 padding (p-4) 確保觸控目標足夠大
  const baseClasses =
    'p-4 lg:p-3 rounded-lg cursor-pointer transition-all duration-200 min-h-[44px]';

  // 播放中狀態（最高優先級）
  if (props.isPlaying) {
    return `${baseClasses} border-2 border-yellow-600 bg-yellow-100 shadow-md`;
  }

  // 選中狀態
  if (props.isSelected) {
    return `${baseClasses} border border-l-4 border-blue-500 bg-blue-50 hover:bg-blue-100 hover:border-blue-600`;
  }

  // 未選中狀態
  return `${baseClasses} border border-gray-200 bg-white hover:bg-gray-100 hover:border-gray-400`;
});

/**
 * 計算文字樣式類別
 */
const textClasses = computed(() => {
  if (props.isPlaying) {
    return 'text-gray-900 font-medium';
  }
  if (props.isSelected) {
    return 'text-gray-800';
  }
  return 'text-gray-700';
});

// ========================================
// Event Handlers
// ========================================

/**
 * 處理句子點擊
 * 切換選中狀態
 */
function handleClick() {
  emit('toggle', props.sentenceId);
}

/**
 * 處理時間戳點擊
 * 如果句子未選中，先選中句子（await 完成），然後跳轉到對應時間
 * @param event 點擊事件（阻止冒泡，避免觸發句子點擊）
 */
async function handleTimeClick(event: Event) {
  event.stopPropagation(); // 阻止冒泡，避免觸發容器的 click 事件

  try {
    // 如果句子未選中，先選中它，等待操作完成後再 seek
    if (!props.isSelected) {
      await highlightStore.toggleSentence(props.sentenceId);
    }

    // toggle 完成後（或句子已選中），跳轉到對應時間
    emit('seek', props.startTime);
  } catch (error) {
    console.error('處理時間戳點擊失敗:', error);
  }
}
</script>

<template>
  <div :class="containerClasses" :data-sentence-id="sentenceId" @click="handleClick">
    <!-- 句子文字 -->
    <p :class="textClasses" class="mb-2 text-base lg:text-sm leading-relaxed">
      {{ text }}
    </p>

    <!-- 時間戳按鈕（移動端增大觸控目標） -->
    <button
      type="button"
      class="inline-flex items-center gap-1.5 px-3 py-2 lg:px-2 lg:py-1 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors min-h-[44px] lg:min-h-[32px] min-w-[44px] lg:min-w-0 cursor-pointer"
      :class="{ 'hover:bg-yellow-50 hover:text-yellow-600': isPlaying }"
      @click="handleTimeClick"
    >
      <ClockIcon class="w-4 h-4" />
      <span class="font-mono">{{ timeRange }}</span>
    </button>
  </div>
</template>
