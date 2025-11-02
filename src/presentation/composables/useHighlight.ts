import { computed } from 'vue'
import type { Sentence } from '@/domain/aggregates/Transcript/Sentence'
import { useHighlightStore } from '@/presentation/stores/highlightStore'
import { useTranscriptStore } from '@/presentation/stores/transcriptStore'

/**
 * useHighlight Composable
 *
 * 職責：
 * - 封裝高光選擇和查詢邏輯
 * - 協調 highlightStore 和 transcriptStore 的資料
 * - 提供 UI 層常用的計算屬性和方法
 */
export function useHighlight() {
  const highlightStore = useHighlightStore()
  const transcriptStore = useTranscriptStore()

  // ========================================
  // Computed Properties
  // ========================================

  /**
   * 當前高光（來自 store）
   */
  const currentHighlight = computed(() => highlightStore.currentHighlight)

  /**
   * 選中的句子 ID 集合（來自 store）
   */
  const selectedSentenceIds = computed(() => highlightStore.selectedSentenceIds)

  /**
   * 選中的句子列表（來自 store）
   */
  const selectedSentences = computed(() => highlightStore.selectedSentences)

  /**
   * 高光時間範圍（Domain 型別，來自 store）
   */
  const highlightRanges = computed(() => highlightStore.timeRanges)

  /**
   * 高光時間範圍（簡化版，用於播放器，來自 store）
   */
  const timeSegments = computed(() => highlightStore.timeSegments)

  /**
   * 總時長（秒數，來自 store）
   */
  const totalDuration = computed(() => highlightStore.totalDuration)

  /**
   * 是否載入中（來自 store）
   */
  const isLoading = computed(() => highlightStore.isLoading)

  // ========================================
  // Methods
  // ========================================

  /**
   * 檢查句子是否被選中
   * @param sentenceId 句子 ID
   * @returns 是否被選中
   */
  function isSentenceSelected(sentenceId: string): boolean {
    return highlightStore.isSentenceSelected(sentenceId)
  }

  /**
   * 切換句子選中狀態
   * @param sentenceId 句子 ID
   */
  async function toggleSentence(sentenceId: string): Promise<void> {
    await highlightStore.toggleSentence(sentenceId)
  }

  /**
   * 獲取當前時間對應的句子
   * @param currentTime 當前播放時間（秒數）
   * @returns 對應的句子，若無則返回 undefined
   */
  function getCurrentSentence(currentTime: number): Sentence | undefined {
    return transcriptStore.getSentenceAtTime(currentTime)
  }

  // ========================================
  // Return
  // ========================================
  return {
    currentHighlight,
    selectedSentenceIds,
    selectedSentences,
    highlightRanges,
    timeSegments,
    totalDuration,
    isLoading,
    isSentenceSelected,
    toggleSentence,
    getCurrentSentence
  }
}
