/**
 * Toggle Sentence In Highlight Use Case
 *
 * 切換句子在高光中的選中狀態
 */

import type { IHighlightRepository } from '../../domain/repositories/IHighlightRepository';
import { HighlightNotFoundError } from '../errors';

/**
 * ToggleSentenceInHighlightUseCase 輸入
 */
export interface ToggleSentenceInput {
  /** 高光 ID */
  highlightId: string;

  /** 句子 ID */
  sentenceId: string;
}

/**
 * ToggleSentenceInHighlightUseCase
 *
 * 職責：
 * - 獲取 Highlight Entity
 * - 調用 toggleSentence 方法切換句子選中狀態
 * - 透過 IHighlightRepository 持久化變更
 *
 * @example
 * ```typescript
 * const useCase = new ToggleSentenceInHighlightUseCase(highlightRepository);
 * await useCase.execute({
 *   highlightId: 'highlight_001',
 *   sentenceId: 'sent_1'
 * });
 * console.log('Sentence toggled successfully');
 * ```
 */
export class ToggleSentenceInHighlightUseCase {
  /**
   * 建立 ToggleSentenceInHighlightUseCase 實例
   *
   * @param highlightRepository - 高光儲存庫
   */
  constructor(private readonly highlightRepository: IHighlightRepository) {}

  /**
   * 執行切換句子狀態流程
   *
   * @param input - 切換句子輸入
   * @returns Promise<void> - 狀態已更新並持久化
   * @throws HighlightNotFoundError - 當高光不存在時
   */
  async execute(input: ToggleSentenceInput): Promise<void> {
    // 1. 獲取 Highlight Entity
    const highlight = await this.highlightRepository.findById(input.highlightId);
    if (!highlight) {
      throw new HighlightNotFoundError(input.highlightId);
    }

    // 2. 切換句子選中狀態
    highlight.toggleSentence(input.sentenceId);

    // 3. 持久化變更
    await this.highlightRepository.save(highlight);
  }
}
