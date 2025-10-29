import { TimeRange } from '../../value-objects/TimeRange';
import { Sentence } from './Sentence';

/**
 * Section Entity (屬於 Transcript 聚合)
 *
 * 代表視頻轉錄中的一個段落,包含多個句子
 *
 * 設計原則:
 * - 不可獨立存在,必須屬於 Transcript
 * - 生命週期由 Transcript 管理
 * - sentences 為唯讀陣列,確保不可變性
 */
export class Section {
  /**
   * 建立 Section 實例
   * @param id - 段落唯一識別碼
   * @param title - 段落標題
   * @param sentences - 句子列表(唯讀,至少包含一個句子)
   * @throws Error 如果 sentences 為空陣列
   */
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly sentences: ReadonlyArray<Sentence>
  ) {
    if (sentences.length === 0) {
      throw new Error('Section must contain at least one sentence');
    }
  }

  /**
   * 計算段落的時間範圍
   * @returns 從第一個句子的 start 到最後一個句子的 end
   */
  get timeRange(): TimeRange {
    const first = this.sentences[0]!; // Safe: constructor ensures at least one sentence
    const last = this.sentences[this.sentences.length - 1]!; // Safe: constructor ensures at least one sentence
    return new TimeRange(first.timeRange.start, last.timeRange.end);
  }
}
