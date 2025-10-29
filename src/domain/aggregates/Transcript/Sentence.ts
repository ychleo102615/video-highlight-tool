import { TimeRange } from '../../value-objects/TimeRange';

/**
 * Sentence Entity (屬於 Transcript 聚合)
 *
 * 代表視頻轉錄中的一個句子
 *
 * 設計原則:
 * - 不包含 isSelected 狀態(由 Highlight 聚合管理)
 * - 不提供 select() / deselect() 方法(違反聚合原則)
 * - 生命週期由 Transcript 聚合管理
 */
export class Sentence {
  /**
   * 建立 Sentence 實例
   * @param id - 句子唯一識別碼
   * @param text - 句子文字
   * @param timeRange - 時間範圍
   * @param isHighlightSuggestion - 是否為 AI 建議的高光句子
   */
  constructor(
    public readonly id: string,
    public readonly text: string,
    public readonly timeRange: TimeRange,
    public readonly isHighlightSuggestion: boolean
  ) {}
}
