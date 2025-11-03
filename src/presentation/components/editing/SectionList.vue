<script setup lang="ts">
import SectionItem from './SectionItem.vue';
import type { SectionListProps, SectionListEmits } from '@/presentation/types/component-contracts';

/**
 * SectionList 組件
 *
 * 職責：
 * - 渲染所有段落（使用 SectionItem）
 * - 轉發句子的事件到父組件
 */

// ========================================
// Props & Emits
// ========================================
defineProps<SectionListProps>();
const emit = defineEmits<SectionListEmits>();

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
</script>

<template>
  <div class="space-y-6">
    <!-- 渲染所有段落 -->
    <SectionItem
      v-for="section in sections"
      :key="section.id"
      :id="section.id"
      :title="section.title"
      :sentences="section.sentences"
      :playing-sentence-id="playingSentenceId"
      :selected-sentence-ids="selectedSentenceIds"
      @toggle-sentence="handleToggleSentence"
      @seek-to-time="handleSeekToTime"
    />

    <!-- 空狀態提示（無段落時） -->
    <div
      v-if="sections.length === 0"
      class="flex flex-col items-center justify-center py-12 text-center text-gray-500"
    >
      <p class="text-lg">沒有轉錄內容</p>
      <p class="text-sm mt-2">請先上傳視頻以生成轉錄</p>
    </div>
  </div>
</template>
