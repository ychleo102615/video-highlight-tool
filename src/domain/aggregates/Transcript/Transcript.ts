import { Section } from './Section';
import { Sentence } from './Sentence';

/**
 * Transcript Aggregate Root
 *
 * 提供視頻轉錄內容的查詢,管理 Section 和 Sentence 的組織結構
 *
 * 職責:
 * - 提供轉錄內容查詢
 * - 管理 Section 和 Sentence 的組織結構
 * - 確保轉錄數據的完整性和唯讀性
 *
 * 設計原則:
 * - 轉錄生成後內容不可變(唯讀)
 * - sections 和 sentences 以 readonly 形式對外暴露
 * - 對外提供唯讀訪問,不提供修改方法
 */
export class Transcript {
  /**
   * 建立 Transcript 實例
   * @param id - 轉錄唯一識別碼
   * @param videoId - 關聯的視頻 ID
   * @param sections - 段落列表(唯讀)
   * @param fullText - 完整轉錄文字
   */
  constructor(
    public readonly id: string,
    public readonly videoId: string,
    public readonly sections: ReadonlyArray<Section>,
    public readonly fullText: string
  ) {}

  /**
   * 根據 ID 查找句子
   * @param sentenceId - 句子 ID
   * @returns 找到的句子,如果不存在則返回 undefined
   * @complexity O(n) - n 為句子總數
   */
  getSentenceById(sentenceId: string): Sentence | undefined {
    for (const section of this.sections) {
      const sentence = section.sentences.find((s) => s.id === sentenceId);
      if (sentence) return sentence;
    }
    return undefined;
  }

  /**
   * 獲取所有句子(扁平化)
   * @returns 所有句子的陣列
   * @complexity O(n) - n 為句子總數
   */
  getAllSentences(): Sentence[] {
    return this.sections.flatMap((section) => [...section.sentences]);
  }

  /**
   * 根據 ID 查找段落
   * @param sectionId - 段落 ID
   * @returns 找到的段落,如果不存在則返回 undefined
   * @complexity O(m) - m 為段落總數
   */
  getSectionById(sectionId: string): Section | undefined {
    return this.sections.find((s) => s.id === sectionId);
  }
}
