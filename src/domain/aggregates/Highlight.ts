/**
 * Highlight Aggregate Root
 *
 * 管理「哪些 Sentence 被選中」的關係,記錄選擇順序
 *
 * 職責:
 * - 管理句子選擇關係(使用 sentenceIds)
 * - 記錄選擇順序(selectionOrder)
 * - 提供選中句子 ID 的查詢介面
 *
 * 設計原則:
 * - 不包含需要傳入 Transcript 的方法(使用 HighlightService 處理跨聚合查詢)
 * - 使用 Set + Array 組合確保去重和記錄順序
 * - addSentence 自動去重且不重複記錄在 selectionOrder
 */
export class Highlight {
  private selectedSentenceIds = new Set<string>();
  private selectionOrder: string[] = [];

  /**
   * 建立 Highlight 實例
   * @param id - 高光唯一識別碼
   * @param videoId - 關聯的視頻 ID
   * @param name - 高光名稱(例如:「精華版」、「完整版」)
   */
  constructor(
    public readonly id: string,
    public readonly videoId: string,
    public readonly name: string
  ) {}

  /**
   * 添加句子到選擇
   * @param sentenceId - 句子 ID
   * @complexity O(1)
   */
  addSentence(sentenceId: string): void {
    if (!this.selectedSentenceIds.has(sentenceId)) {
      this.selectedSentenceIds.add(sentenceId);
      this.selectionOrder.push(sentenceId);
    }
  }

  /**
   * 從選擇中移除句子
   * @param sentenceId - 句子 ID
   * @complexity O(n) - n 為選中的句子數
   */
  removeSentence(sentenceId: string): void {
    if (this.selectedSentenceIds.has(sentenceId)) {
      this.selectedSentenceIds.delete(sentenceId);
      this.selectionOrder = this.selectionOrder.filter((id) => id !== sentenceId);
    }
  }

  /**
   * 切換句子選中狀態
   * @param sentenceId - 句子 ID
   */
  toggleSentence(sentenceId: string): void {
    if (this.isSelected(sentenceId)) {
      this.removeSentence(sentenceId);
    } else {
      this.addSentence(sentenceId);
    }
  }

  /**
   * 檢查句子是否被選中
   * @param sentenceId - 句子 ID
   * @returns true 如果句子被選中
   * @complexity O(1)
   */
  isSelected(sentenceId: string): boolean {
    return this.selectedSentenceIds.has(sentenceId);
  }

  /**
   * 獲取所有選中的句子 ID(按選擇順序)
   * @returns 選中的句子 ID 陣列(唯讀)
   */
  getSelectedSentenceIds(): ReadonlyArray<string> {
    return [...this.selectionOrder];
  }

  /**
   * 獲取選中句子的數量
   * @returns 選中的句子數
   */
  getSelectedSentenceCount(): number {
    return this.selectedSentenceIds.size;
  }
}
