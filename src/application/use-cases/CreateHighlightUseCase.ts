/**
 * Create Highlight Use Case
 *
 * 建立新的高光版本，驗證視頻存在性
 */

import { Highlight } from '../../domain/aggregates/Highlight';
import type { IHighlightRepository } from '../../domain/repositories/IHighlightRepository';
import type { IVideoRepository } from '../../domain/repositories/IVideoRepository';
import type { ITranscriptRepository } from '../../domain/repositories/ITranscriptRepository';
import { VideoNotFoundError, InvalidHighlightNameError } from '../errors';
import { generateHighlightId } from '../../config/id-generator';

/**
 * CreateHighlightUseCase 輸入
 */
export interface CreateHighlightInput {
  /** 視頻 ID */
  videoId: string;

  /** 高光名稱 */
  name: string;

  /** 是否使用 AI 建議初始化選中的句子（可選，預設為 false） */
  useAISuggestions?: boolean;
}

/**
 * CreateHighlightUseCase
 *
 * 職責：
 * - 驗證視頻存在性
 * - 驗證高光名稱不為空
 * - 建立 Highlight Entity
 * - 如果 useAISuggestions 為 true，從轉錄中收集 AI 建議的句子並初始化
 * - 透過 IHighlightRepository 持久化
 *
 * @example
 * ```typescript
 * const useCase = new CreateHighlightUseCase(
 *   highlightRepository,
 *   videoRepository,
 *   transcriptRepository
 * );
 *
 * // 建立空的高光
 * const highlight1 = await useCase.execute({
 *   videoId: 'video_001',
 *   name: '精華版'
 * });
 *
 * // 建立帶有 AI 建議句子的高光
 * const highlight2 = await useCase.execute({
 *   videoId: 'video_001',
 *   name: '預設高光',
 *   useAISuggestions: true
 * });
 *
 * console.log(`Highlight created: ${highlight1.id}`);
 * ```
 */
export class CreateHighlightUseCase {
  /**
   * 建立 CreateHighlightUseCase 實例
   *
   * @param highlightRepository - 高光儲存庫
   * @param videoRepository - 視頻儲存庫
   * @param transcriptRepository - 轉錄儲存庫（用於收集 AI 建議）
   */
  constructor(
    private readonly highlightRepository: IHighlightRepository,
    private readonly videoRepository: IVideoRepository,
    private readonly transcriptRepository: ITranscriptRepository
  ) {}

  /**
   * 執行建立高光流程
   *
   * @param input - 建立高光輸入
   * @returns Promise<Highlight> - 建立的 Highlight Entity
   * @throws VideoNotFoundError - 當視頻不存在時
   * @throws InvalidHighlightNameError - 當高光名稱為空時
   */
  async execute(input: CreateHighlightInput): Promise<Highlight> {
    // 1. 驗證輸入
    this.validateInput(input);

    // 2. 驗證視頻存在
    const video = await this.videoRepository.findById(input.videoId);
    if (!video) {
      throw new VideoNotFoundError(input.videoId);
    }

    // 3. 建立 Highlight Entity
    const highlightId = generateHighlightId();
    const highlight = new Highlight(highlightId, input.videoId, input.name);

    // 4. 如果需要使用 AI 建議，從轉錄中收集並加入
    if (input.useAISuggestions) {
      const transcript = await this.transcriptRepository.findByVideoId(input.videoId);

      // 如果有轉錄，收集 AI 建議的句子
      if (transcript) {
        const suggestedSentenceIds = transcript.sections
          .flatMap((section) => section.sentences)
          .filter((sentence) => sentence.isHighlightSuggestion)
          .map((sentence) => sentence.id);

        // 批次加入建議的句子
        for (const sentenceId of suggestedSentenceIds) {
          highlight.addSentence(sentenceId);
        }
      }
      // 如果沒有轉錄，靜默失敗，建立空的高光
    }

    // 5. 持久化
    await this.highlightRepository.save(highlight);

    // 6. 返回結果
    return highlight;
  }

  /**
   * 驗證輸入
   *
   * @param input - 建立高光輸入
   * @throws InvalidHighlightNameError - 當高光名稱為空時
   */
  private validateInput(input: CreateHighlightInput): void {
    if (!input.name || input.name.trim() === '') {
      throw new InvalidHighlightNameError();
    }
  }
}
