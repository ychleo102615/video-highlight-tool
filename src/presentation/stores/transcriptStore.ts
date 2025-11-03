import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Transcript } from '@/domain/aggregates/Transcript/Transcript';
import type { Sentence } from '@/domain/aggregates/Transcript/Sentence';
import type { ProcessTranscriptUseCase } from '@/application/use-cases/ProcessTranscriptUseCase';
import { container } from '@/di/container';
import type { SectionDisplayData } from '@/presentation/types/store-contracts';
import { useHighlightStore } from './highlightStore';

export const useTranscriptStore = defineStore('transcript', () => {
  // ========================================
  // State
  // ========================================
  const transcript = ref<Transcript | null>(null);
  const isProcessing = ref(false);
  const playingSentenceId = ref<string | null>(null);
  const error = ref<string | null>(null);

  // ========================================
  // Getters
  // ========================================
  const hasTranscript = computed(() => transcript.value !== null);

  /**
   * 所有段落（用於 UI 顯示）
   */
  const sections = computed((): SectionDisplayData[] => {
    if (!transcript.value) return [];

    return transcript.value.sections.map((section) => ({
      id: section.id,
      title: section.title,
      sentences: section.sentences.map((sentence) => ({
        id: sentence.id,
        text: sentence.text,
        startTime: sentence.timeRange.start.seconds,
        endTime: sentence.timeRange.end.seconds
      }))
    }));
  });

  /**
   * 所有句子（扁平化）
   */
  const allSentences = computed((): Sentence[] => {
    if (!transcript.value) return [];
    return transcript.value.sections.flatMap((section) => section.sentences);
  });

  /**
   * 當前播放的句子
   */
  const playingSentence = computed((): Sentence | null => {
    if (!playingSentenceId.value || !transcript.value) return null;
    return allSentences.value.find((sentence) => sentence.id === playingSentenceId.value) ?? null;
  });

  // ========================================
  // Use Case 注入
  // ========================================
  const processTranscriptUseCase = container.resolve<ProcessTranscriptUseCase>(
    'ProcessTranscriptUseCase'
  );

  // ========================================
  // Actions
  // ========================================

  /**
   * 處理視頻轉錄
   * @param videoId 視頻 ID
   */
  async function processTranscript(videoId: string): Promise<void> {
    try {
      isProcessing.value = true;
      error.value = null;

      // 呼叫 Use Case 處理轉錄
      const processedTranscript = await processTranscriptUseCase.execute(videoId);
      transcript.value = processedTranscript;

      // 轉錄處理完成後,建立預設高光（使用 AI 建議的句子）
      const highlightStore = useHighlightStore();
      await highlightStore.createHighlight(videoId, '預設高光');

      // 將所有 AI 建議的句子加入高光
      const suggestedSentences = allSentences.value.filter(
        (sentence) => sentence.isHighlightSuggestion
      );

      // 批次加入建議的句子
      for (const sentence of suggestedSentences) {
        await highlightStore.toggleSentence(sentence.id);
      }
    } catch (err) {
      error.value = (err as Error).message;
      throw err;
    } finally {
      isProcessing.value = false;
    }
  }

  /**
   * 設定當前播放的句子 ID
   * @param sentenceId 句子 ID
   */
  function setPlayingSentenceId(sentenceId: string | null): void {
    playingSentenceId.value = sentenceId;
  }

  /**
   * 根據時間獲取對應的句子
   * @param time 時間（秒數）
   */
  function getSentenceAtTime(time: number): Sentence | undefined {
    return allSentences.value.find((sentence) => {
      const startTime = sentence.timeRange.start.seconds;
      const endTime = sentence.timeRange.end.seconds;
      return time >= startTime && time < endTime;
    });
  }

  /**
   * 設定轉錄內容（用於會話恢復）
   * @param newTranscript 轉錄 Entity
   */
  function setTranscript(newTranscript: Transcript): void {
    transcript.value = newTranscript;
  }

  // ========================================
  // Return
  // ========================================
  return {
    // State
    transcript,
    isProcessing,
    playingSentenceId,
    error,
    // Getters
    hasTranscript,
    sections,
    allSentences,
    playingSentence,
    // Actions
    processTranscript,
    setPlayingSentenceId,
    getSentenceAtTime,
    setTranscript
  };
});
