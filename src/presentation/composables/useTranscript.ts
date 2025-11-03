import { computed, readonly } from 'vue';
import { useTranscriptStore } from '@/presentation/stores/transcriptStore';
import type { Transcript } from '@/domain/aggregates/Transcript/Transcript';
import type { Sentence } from '@/domain/aggregates/Transcript/Sentence';
import type { SectionDisplayData } from '@/presentation/types/store-contracts';

/**
 * useTranscript Composable
 *
 * 職責:
 * - 封裝轉錄相關的查詢邏輯
 * - 提供計算屬性（如 sections），避免組件重複計算
 * - 內部使用 transcriptStore
 */
export function useTranscript() {
  const transcriptStore = useTranscriptStore();

  // ========================================
  // Reactive State (從 Store 取得)
  // ========================================
  const transcript = computed<Transcript | null>(() => transcriptStore.transcript);
  const sections = computed<SectionDisplayData[]>(() => transcriptStore.sections);
  const isProcessing = computed(() => transcriptStore.isProcessing);
  const playingSentence = computed<Sentence | null>(() => transcriptStore.playingSentence);

  // ========================================
  // Actions
  // ========================================

  /**
   * 處理視頻轉錄
   * @param videoId 視頻 ID
   */
  async function processTranscript(videoId: string): Promise<void> {
    await transcriptStore.processTranscript(videoId);
  }

  /**
   * 根據時間獲取句子
   * @param time 時間（秒數）
   */
  function getSentenceAtTime(time: number): Sentence | undefined {
    return transcriptStore.getSentenceAtTime(time);
  }

  // ========================================
  // Return
  // ========================================
  return {
    transcript,
    sections,
    isProcessing: readonly(isProcessing),
    playingSentence,
    processTranscript,
    getSentenceAtTime
  };
}
