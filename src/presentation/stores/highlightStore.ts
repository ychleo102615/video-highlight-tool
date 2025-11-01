import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Highlight } from '@/domain/aggregates/Highlight'
import type { Sentence } from '@/domain/aggregates/Transcript/Sentence'
import type { TimeRange } from '@/domain/value-objects/TimeRange'
import type { CreateHighlightUseCase } from '@/application/use-cases/CreateHighlightUseCase'
import type { ToggleSentenceInHighlightUseCase } from '@/application/use-cases/ToggleSentenceInHighlightUseCase'
import type { IHighlightRepository } from '@/domain/repositories/IHighlightRepository'
import { container } from '@/di/container'
import type {
  HighlightStoreState,
  HighlightStoreGetters,
  HighlightStoreActions,
  TimeSegment
} from '@/presentation/types/store-contracts'
import { useTranscriptStore } from './transcriptStore'

export const useHighlightStore = defineStore('highlight', () => {
  // ========================================
  // State
  // ========================================
  const currentHighlight = ref<Highlight | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // ========================================
  // Getters
  // ========================================
  const hasHighlight = computed(() => currentHighlight.value !== null)

  /**
   * 選中的句子 ID 集合（用於 UI 渲染）
   */
  const selectedSentenceIds = computed((): Set<string> => {
    if (!currentHighlight.value) return new Set()
    return new Set(currentHighlight.value.getSelectedSentenceIds())
  })

  /**
   * 選中的句子列表（需配合 transcriptStore）
   */
  const selectedSentences = computed((): Sentence[] => {
    if (!currentHighlight.value) return []

    const transcriptStore = useTranscriptStore()
    const allSentences = transcriptStore.allSentences
    const selectedIds = selectedSentenceIds.value

    return allSentences.filter((sentence) => selectedIds.has(sentence.id))
  })

  /**
   * 高光片段時間範圍（Domain 型別）
   */
  const timeRanges = computed((): TimeRange[] => {
    return selectedSentences.value.map((sentence) => sentence.timeRange)
  })

  /**
   * 高光片段時間範圍（簡化版，用於播放器）
   */
  const timeSegments = computed((): TimeSegment[] => {
    return timeRanges.value.map((range) => ({
      startTime: range.start.seconds,
      endTime: range.end.seconds
    }))
  })

  /**
   * 總時長（秒數）
   */
  const totalDuration = computed((): number => {
    if (timeSegments.value.length === 0) return 0
    return timeSegments.value.reduce((total, segment) => {
      return total + (segment.endTime - segment.startTime)
    }, 0)
  })

  // ========================================
  // Use Case 注入
  // ========================================
  const createHighlightUseCase = container.resolve<CreateHighlightUseCase>('CreateHighlightUseCase')
  const toggleSentenceUseCase = container.resolve<ToggleSentenceInHighlightUseCase>(
    'ToggleSentenceInHighlightUseCase'
  )

  // ========================================
  // Actions
  // ========================================

  /**
   * 建立高光（使用 AI 建議的句子作為預設選擇）
   * @param videoId 視頻 ID
   * @param name 高光名稱
   */
  async function createHighlight(videoId: string, name: string): Promise<void> {
    try {
      isLoading.value = true
      error.value = null

      // 呼叫 Use Case 建立高光
      const highlight = await createHighlightUseCase.execute({ videoId, name })
      currentHighlight.value = highlight
    } catch (err) {
      error.value = (err as Error).message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 切換句子選中狀態
   * @param sentenceId 句子 ID
   */
  async function toggleSentence(sentenceId: string): Promise<void> {
    if (!currentHighlight.value) {
      throw new Error('沒有高光可以切換句子')
    }

    try {
      error.value = null

      // 呼叫 Use Case 切換句子 (它會直接修改 entity 並儲存)
      await toggleSentenceUseCase.execute({
        highlightId: currentHighlight.value.id,
        sentenceId
      })

      // 重新從 repository 載入更新後的 highlight
      const highlightRepository = container.resolve<IHighlightRepository>('IHighlightRepository')
      const updatedHighlight = await highlightRepository.findById(currentHighlight.value.id)
      currentHighlight.value = updatedHighlight
    } catch (err) {
      error.value = (err as Error).message
      throw err
    }
  }

  /**
   * 檢查句子是否被選中
   * @param sentenceId 句子 ID
   */
  function isSentenceSelected(sentenceId: string): boolean {
    return selectedSentenceIds.value.has(sentenceId)
  }

  // ========================================
  // Return
  // ========================================
  return {
    // State
    currentHighlight,
    isLoading,
    error,
    // Getters
    hasHighlight,
    selectedSentenceIds,
    selectedSentences,
    timeRanges,
    timeSegments,
    totalDuration,
    // Actions
    createHighlight,
    toggleSentence,
    isSentenceSelected
  }
})
