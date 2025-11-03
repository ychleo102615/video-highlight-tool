import { defineStore } from 'pinia';
import { ref, computed, triggerRef } from 'vue';
import type { Highlight } from '@/domain/aggregates/Highlight';
import type { Sentence } from '@/domain/aggregates/Transcript/Sentence';
import type { TimeRange } from '@/domain/value-objects/TimeRange';
import type { CreateHighlightUseCase } from '@/application/use-cases/CreateHighlightUseCase';
import type { ToggleSentenceInHighlightUseCase } from '@/application/use-cases/ToggleSentenceInHighlightUseCase';
import type { IHighlightRepository } from '@/domain/repositories/IHighlightRepository';
import { container } from '@/di/container';
import type { TimeSegment, TimeSegmentWithSelection } from '@/presentation/types/store-contracts';
import { useTranscriptStore } from './transcriptStore';

export const useHighlightStore = defineStore('highlight', () => {
  // ========================================
  // State
  // ========================================
  const currentHighlight = ref<Highlight | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // ========================================
  // Getters
  // ========================================
  const hasHighlight = computed(() => currentHighlight.value !== null);

  /**
   * 選中的句子 ID 集合（用於 UI 渲染）
   */
  const selectedSentenceIds = computed((): Set<string> => {
    if (!currentHighlight.value) return new Set();
    return new Set(currentHighlight.value.getSelectedSentenceIds());
  });

  /**
   * 選中的句子列表（需配合 transcriptStore）
   */
  const selectedSentences = computed((): Sentence[] => {
    if (!currentHighlight.value) return [];

    const transcriptStore = useTranscriptStore();
    const allSentences = transcriptStore.allSentences;
    const selectedIds = selectedSentenceIds.value;

    return allSentences.filter((sentence) => selectedIds.has(sentence.id));
  });

  /**
   * 高光片段時間範圍（Domain 型別）
   */
  const timeRanges = computed((): TimeRange[] => {
    return selectedSentences.value.map((sentence) => sentence.timeRange);
  });

  /**
   * 高光片段時間範圍（簡化版，用於播放器）
   * 只包含選中的句子
   */
  const timeSegments = computed((): TimeSegment[] => {
    return selectedSentences.value.map((sentence) => ({
      sentenceId: sentence.id,
      startTime: sentence.timeRange.start.seconds,
      endTime: sentence.timeRange.end.seconds
    }));
  });

  /**
   * 所有句子的時間片段（含選中狀態，用於時間軸）
   * 包含所有句子，每個句子帶有 isSelected 屬性
   */
  const allTimeSegmentsWithSelection = computed((): TimeSegmentWithSelection[] => {
    const transcriptStore = useTranscriptStore();
    const allSentences = transcriptStore.allSentences;
    const selectedIds = selectedSentenceIds.value;

    return allSentences.map((sentence) => ({
      sentenceId: sentence.id,
      startTime: sentence.timeRange.start.seconds,
      endTime: sentence.timeRange.end.seconds,
      isSelected: selectedIds.has(sentence.id)
    }));
  });

  /**
   * 總時長（秒數）
   */
  const totalDuration = computed((): number => {
    if (timeSegments.value.length === 0) return 0;
    return timeSegments.value.reduce((total, segment) => {
      return total + (segment.endTime - segment.startTime);
    }, 0);
  });

  // ========================================
  // Use Case 注入
  // ========================================
  const createHighlightUseCase =
    container.resolve<CreateHighlightUseCase>('CreateHighlightUseCase');
  const toggleSentenceUseCase = container.resolve<ToggleSentenceInHighlightUseCase>(
    'ToggleSentenceInHighlightUseCase'
  );

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
      isLoading.value = true;
      error.value = null;

      // 呼叫 Use Case 建立高光
      const highlight = await createHighlightUseCase.execute({ videoId, name });
      currentHighlight.value = highlight;
    } catch (err) {
      error.value = (err as Error).message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  // 追蹤正在處理中的句子切換，用於防抖（50ms）
  const pendingToggles = new Set<string>();

  /**
   * 切換句子選中狀態
   * @param sentenceId 句子 ID
   */
  async function toggleSentence(sentenceId: string): Promise<void> {
    if (!currentHighlight.value) {
      throw new Error('沒有高光可以切換句子');
    }

    // Debounce: 如果這個句子正在處理中，忽略重複點擊
    if (pendingToggles.has(sentenceId)) {
      return;
    }

    // 標記為處理中
    pendingToggles.add(sentenceId);

    try {
      error.value = null;

      // 檢查這個句子切換前是否被選中
      const wasSelected = selectedSentenceIds.value.has(sentenceId);

      // 呼叫 Use Case 切換句子 (它會直接修改 entity 並儲存)
      await toggleSentenceUseCase.execute({
        highlightId: currentHighlight.value.id,
        sentenceId
      });

      // 重新從 repository 載入更新後的 highlight
      const highlightRepository = container.resolve<IHighlightRepository>('IHighlightRepository');
      const updatedHighlight = await highlightRepository.findById(currentHighlight.value.id);
      currentHighlight.value = updatedHighlight;

      // 強制觸發響應式更新，確保 computed 重新計算
      triggerRef(currentHighlight);

      // Edge case: 如果取消選擇的句子正好是正在播放的句子，清除播放狀態
      if (wasSelected) {
        const transcriptStore = useTranscriptStore();
        if (transcriptStore.playingSentenceId === sentenceId) {
          transcriptStore.setPlayingSentenceId(null);
        }
      }
    } catch (err) {
      error.value = (err as Error).message;
      throw err;
    } finally {
      // 延遲 50ms 後移除 pending 標記，實現 debounce 效果
      setTimeout(() => {
        pendingToggles.delete(sentenceId);
      }, 50);
    }
  }

  /**
   * 檢查句子是否被選中
   * @param sentenceId 句子 ID
   */
  function isSentenceSelected(sentenceId: string): boolean {
    return selectedSentenceIds.value.has(sentenceId);
  }

  /**
   * 設定高光列表（用於會話恢復）
   * 注意：目前單視頻專案，只使用第一個高光
   * @param highlights 高光 Entity 陣列
   */
  function setHighlights(highlights: Highlight[]): void {
    if (highlights.length > 0) {
      currentHighlight.value = highlights[0]!;
    }
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
    allTimeSegmentsWithSelection,
    totalDuration,
    // Actions
    createHighlight,
    toggleSentence,
    isSentenceSelected,
    setHighlights
  };
});
