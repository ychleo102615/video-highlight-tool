<script setup lang="ts">
import { computed } from 'vue';
import SentenceItem from './SentenceItem.vue';
import type {
  SectionItemProps,
  SectionItemEmits,
  SentenceItemProps
} from '@/presentation/types/component-contracts';

/**
 * SectionItem 組件
 *
 * 職責：
 * - 顯示段落標題
 * - 渲染段落內的所有句子（使用 SentenceItem）
 * - 轉發句子的事件（toggle-sentence, seek-to-time）
 */

// ========================================
// Props & Emits
// ========================================
const props = defineProps<SectionItemProps>();
const emit = defineEmits<SectionItemEmits>();

// ========================================
// Event Handlers
// ========================================

/**
 * 處理句子切換事件（轉發到父組件）
 * @param sentenceId 句子 ID
 */
function handleToggleSentence(sentenceId: string) {
  emit('toggle-sentence', sentenceId);
}

/**
 * 處理時間跳轉事件（轉發到父組件）
 * @param time 時間（秒數）
 */
function handleSeekToTime(time: number) {
  emit('seek-to-time', time);
}

// ========================================
// Computed Properties
// ========================================

/**
 * 格式化時間為 MM:SS
 * @param seconds 秒數
 * @returns 格式化後的時間字串
 */
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * 將句子資料轉換為 SentenceItem 所需的 props
 */
const sentenceItemsProps = computed((): SentenceItemProps[] => {
  return props.sentences.map((sentence) => ({
    sentenceId: sentence.id,
    text: sentence.text,
    timeRange: formatTime(sentence.startTime),
    startTime: sentence.startTime,
    isSelected: props.selectedSentenceIds.has(sentence.id),
    isPlaying: props.playingSentenceId === sentence.id
  }));
});
</script>

<template>
  <div class="mb-6">
    <!-- 段落標題 -->
    <h3 class="text-lg font-semibold text-gray-900 mb-3 px-2">
      {{ title }}
    </h3>

    <!-- 句子列表 -->
    <div class="space-y-2">
      <SentenceItem
        v-for="sentenceProps in sentenceItemsProps"
        :key="sentenceProps.sentenceId"
        v-bind="sentenceProps"
        @toggle="handleToggleSentence"
        @seek="handleSeekToTime"
      />
    </div>
  </div>
</template>
