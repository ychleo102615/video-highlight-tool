/**
 * Create Highlight Use Case
 *
 * 建立新的高光版本，驗證視頻存在性
 */

import { Highlight } from '../../domain/aggregates/Highlight';
import type { IHighlightRepository } from '../../domain/repositories/IHighlightRepository';
import type { IVideoRepository } from '../../domain/repositories/IVideoRepository';
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
}

/**
 * CreateHighlightUseCase
 *
 * 職責：
 * - 驗證視頻存在性
 * - 驗證高光名稱不為空
 * - 建立 Highlight Entity（初始狀態：無選中句子）
 * - 透過 IHighlightRepository 持久化
 *
 * @example
 * ```typescript
 * const useCase = new CreateHighlightUseCase(highlightRepository, videoRepository);
 * const highlight = await useCase.execute({
 *   videoId: 'video_001',
 *   name: '精華版'
 * });
 * console.log(`Highlight created: ${highlight.id}`);
 * ```
 */
export class CreateHighlightUseCase {
  /**
   * 建立 CreateHighlightUseCase 實例
   *
   * @param highlightRepository - 高光儲存庫
   * @param videoRepository - 視頻儲存庫
   */
  constructor(
    private readonly highlightRepository: IHighlightRepository,
    private readonly videoRepository: IVideoRepository
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

    // 3. 建立 Highlight Entity（初始無選中句子）
    const highlightId = generateHighlightId();
    const highlight = new Highlight(highlightId, input.videoId, input.name);

    // 4. 持久化
    await this.highlightRepository.save(highlight);

    // 5. 返回結果
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
