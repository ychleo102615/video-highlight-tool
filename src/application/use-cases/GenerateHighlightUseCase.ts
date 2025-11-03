/**
 * Generate Highlight Use Case
 *
 * 生成高光預覽數據，協調 Highlight 和 Transcript 兩個聚合
 */

import type { Sentence } from '../../domain/aggregates/Transcript/Sentence';
import type { TimeRange } from '../../domain/value-objects/TimeRange';
import type { IHighlightRepository } from '../../domain/repositories/IHighlightRepository';
import type { ITranscriptRepository } from '../../domain/repositories/ITranscriptRepository';
import { HighlightNotFoundError, TranscriptNotFoundError } from '../errors';

/**
 * GenerateHighlightUseCase 輸入
 */
export interface GenerateHighlightInput {
  /** 高光 ID */
  highlightId: string;

  /** 排序方式 */
  sortBy: 'selection' | 'time';
}

/**
 * GenerateHighlightUseCase 輸出
 */
export interface GenerateHighlightOutput {
  /** 選中的句子列表（已排序） */
  sentences: Sentence[];

  /** 時間範圍列表 */
  timeRanges: TimeRange[];

  /** 總時長（秒） */
  totalDuration: number;
}

/**
 * GenerateHighlightUseCase
 *
 * 職責：
 * - 獲取 Highlight 和對應的 Transcript
 * - 協調兩個聚合，獲取選中的句子
 * - 根據 sortBy 排序句子（selection: 選擇順序, time: 時間順序）
 * - 計算時間範圍和總時長
 *
 * @example
 * ```typescript
 * const useCase = new GenerateHighlightUseCase(
 *   highlightRepository,
 *   transcriptRepository
 * );
 * const result = await useCase.execute({
 *   highlightId: 'highlight_001',
 *   sortBy: 'time'
 * });
 * console.log(`Total duration: ${result.totalDuration}s`);
 * console.log(`Selected ${result.sentences.length} sentences`);
 * ```
 */
export class GenerateHighlightUseCase {
  /**
   * 建立 GenerateHighlightUseCase 實例
   *
   * @param highlightRepository - 高光儲存庫
   * @param transcriptRepository - 轉錄儲存庫
   */
  constructor(
    private readonly highlightRepository: IHighlightRepository,
    private readonly transcriptRepository: ITranscriptRepository
  ) {}

  /**
   * 執行生成高光預覽流程
   *
   * @param input - 生成高光輸入
   * @returns Promise<GenerateHighlightOutput> - 高光預覽數據
   * @throws HighlightNotFoundError - 當高光不存在時
   * @throws TranscriptNotFoundError - 當轉錄不存在時
   */
  async execute(input: GenerateHighlightInput): Promise<GenerateHighlightOutput> {
    // 1. 獲取 Highlight Entity
    const highlight = await this.highlightRepository.findById(input.highlightId);
    if (!highlight) {
      throw new HighlightNotFoundError(input.highlightId);
    }

    // 2. 獲取對應的 Transcript Entity
    const transcript = await this.transcriptRepository.findByVideoId(highlight.videoId);
    if (!transcript) {
      throw new TranscriptNotFoundError(`No transcript found for video: ${highlight.videoId}`);
    }

    // 3. 獲取選中的句子 ID
    const selectedIds = highlight.getSelectedSentenceIds();

    // 4. 從 Transcript 中獲取對應的 Sentence entities
    const sentences = selectedIds
      .map((id) => transcript.getSentenceById(id))
      .filter((sentence): sentence is Sentence => sentence !== undefined);

    // 5. 根據 sortBy 排序
    const sortedSentences = this.sortSentences(sentences, selectedIds, input.sortBy);

    // 6. 提取時間範圍
    const timeRanges = sortedSentences.map((sentence) => sentence.timeRange);

    // 7. 計算總時長
    const totalDuration = timeRanges.reduce((total, range) => total + range.durationInSeconds, 0);

    // 8. 返回結果
    return {
      sentences: sortedSentences,
      timeRanges,
      totalDuration
    };
  }

  /**
   * 根據排序方式排序句子
   *
   * @param sentences - 句子列表
   * @param selectedIds - 選中的句子 ID（按選擇順序）
   * @param sortBy - 排序方式
   * @returns 排序後的句子列表
   */
  private sortSentences(
    sentences: Sentence[],
    selectedIds: ReadonlyArray<string>,
    sortBy: 'selection' | 'time'
  ): Sentence[] {
    if (sortBy === 'selection') {
      // 按選擇順序排序
      const orderMap = new Map(selectedIds.map((id, index) => [id, index]));
      return [...sentences].sort((a, b) => {
        const orderA = orderMap.get(a.id) ?? Infinity;
        const orderB = orderMap.get(b.id) ?? Infinity;
        return orderA - orderB;
      });
    } else {
      // 按時間順序排序
      return [...sentences].sort(
        (a, b) => a.timeRange.start.milliseconds - b.timeRange.start.milliseconds
      );
    }
  }
}
