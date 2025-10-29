import { Highlight } from '../aggregates/Highlight';
import { Transcript } from '../aggregates/Transcript/Transcript';
import { Sentence } from '../aggregates/Transcript/Sentence';
import { TimeRange } from '../value-objects/TimeRange';

/**
 * HighlightService Domain Service
 *
 * 協調 Highlight 和 Transcript 聚合之間的互動,處理跨聚合的查詢邏輯
 *
 * 為何需要 Domain Service?
 * - 當兩個 Aggregate 需要協作時,不應該在一個 Aggregate 的方法中傳入另一個 Aggregate 作為參數
 * - Domain Service 是無狀態的,專門處理跨聚合的業務邏輯
 * - 保持 Aggregate 的獨立性和邊界清晰
 *
 * 設計原則:
 * - 無狀態服務,所有方法都是純函數
 * - 不持有任何 Aggregate 的引用,通過參數傳入
 */
export class HighlightService {
  /**
   * 獲取 Highlight 中選中的句子
   * @param highlight - Highlight 聚合
   * @param transcript - Transcript 聚合
   * @param sortBy - 排序方式:'selection'(選擇順序)或 'time'(時間順序)
   * @returns 選中的句子陣列
   * @complexity O(n) 或 O(n log n) - 取決於 sortBy
   */
  getSelectedSentences(
    highlight: Highlight,
    transcript: Transcript,
    sortBy: 'selection' | 'time'
  ): Sentence[] {
    const sentenceIds = highlight.getSelectedSentenceIds();
    const sentences = sentenceIds
      .map((id) => transcript.getSentenceById(id))
      .filter((s): s is Sentence => s !== undefined);

    if (sortBy === 'time') {
      // 按時間順序排序
      return sentences.sort(
        (a, b) => a.timeRange.start.milliseconds - b.timeRange.start.milliseconds
      );
    }

    // 保持選擇順序(sentenceIds 已經是按選擇順序排列)
    return sentences;
  }

  /**
   * 獲取選中句子的時間範圍
   * @param highlight - Highlight 聚合
   * @param transcript - Transcript 聚合
   * @param sortBy - 排序方式
   * @returns TimeRange 陣列
   */
  getTimeRanges(
    highlight: Highlight,
    transcript: Transcript,
    sortBy: 'selection' | 'time'
  ): TimeRange[] {
    return this.getSelectedSentences(highlight, transcript, sortBy).map((s) => s.timeRange);
  }

  /**
   * 計算選中句子的總時長
   * @param highlight - Highlight 聚合
   * @param transcript - Transcript 聚合
   * @returns 總時長(毫秒)
   */
  getTotalDuration(highlight: Highlight, transcript: Transcript): number {
    return this.getSelectedSentences(highlight, transcript, 'time').reduce(
      (total, s) => total + s.timeRange.duration,
      0
    );
  }
}
