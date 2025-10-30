/**
 * Process Transcript Use Case
 *
 * 處理視頻轉錄，調用 AI 服務，轉換 DTO 為 Domain Entity
 */

import { Transcript } from '../../domain/aggregates/Transcript/Transcript';
import { Section } from '../../domain/aggregates/Transcript/Section';
import { Sentence } from '../../domain/aggregates/Transcript/Sentence';
import { TimeRange } from '../../domain/value-objects/TimeRange';
import { TimeStamp } from '../../domain/value-objects/TimeStamp';
import type { ITranscriptRepository } from '../../domain/repositories/ITranscriptRepository';
import type { IVideoRepository } from '../../domain/repositories/IVideoRepository';
import type { ITranscriptGenerator } from '../ports/ITranscriptGenerator';
import type { TranscriptDTO, SectionDTO, SentenceDTO } from '../dto';
import { VideoNotFoundError, TranscriptGenerationError } from '../errors';

/**
 * ProcessTranscriptUseCase
 *
 * 職責：
 * - 驗證視頻存在性
 * - 透過 ITranscriptGenerator 生成轉錄 DTO
 * - 將 TranscriptDTO 轉換為 Transcript Entity
 * - 透過 ITranscriptRepository 持久化
 *
 * @example
 * ```typescript
 * const useCase = new ProcessTranscriptUseCase(
 *   transcriptGenerator,
 *   transcriptRepository,
 *   videoRepository
 * );
 * const transcript = await useCase.execute('video_001');
 * console.log(`Transcript created: ${transcript.id}`);
 * ```
 */
export class ProcessTranscriptUseCase {
  /**
   * 建立 ProcessTranscriptUseCase 實例
   *
   * @param transcriptGenerator - 轉錄生成服務
   * @param transcriptRepository - 轉錄儲存庫
   * @param videoRepository - 視頻儲存庫
   */
  constructor(
    private readonly transcriptGenerator: ITranscriptGenerator,
    private readonly transcriptRepository: ITranscriptRepository,
    private readonly videoRepository: IVideoRepository
  ) {}

  /**
   * 執行轉錄處理流程
   *
   * @param videoId - 視頻 ID
   * @returns Promise<Transcript> - 建立的 Transcript Entity
   * @throws VideoNotFoundError - 當視頻不存在時
   * @throws TranscriptGenerationError - 當轉錄生成失敗時
   */
  async execute(videoId: string): Promise<Transcript> {
    // 1. 驗證視頻存在
    const video = await this.videoRepository.findById(videoId);
    if (!video) {
      throw new VideoNotFoundError(videoId);
    }

    // 2. 生成轉錄 DTO
    let transcriptDTO: TranscriptDTO;
    try {
      transcriptDTO = await this.transcriptGenerator.generate(videoId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new TranscriptGenerationError(message);
    }

    // 3. 轉換為 Domain Entity
    const transcript = this.convertToEntity(transcriptDTO);

    // 4. 持久化
    await this.transcriptRepository.save(transcript);

    // 5. 返回結果
    return transcript;
  }

  /**
   * 將 TranscriptDTO 轉換為 Transcript Entity
   *
   * @param dto - TranscriptDTO
   * @returns Transcript Entity
   */
  private convertToEntity(dto: TranscriptDTO): Transcript {
    const sections = dto.sections.map((sectionDTO) =>
      this.convertSectionToEntity(sectionDTO)
    );

    const transcriptId = this.generateId();
    return new Transcript(transcriptId, dto.videoId, sections, dto.fullText);
  }

  /**
   * 將 SectionDTO 轉換為 Section Entity
   *
   * @param dto - SectionDTO
   * @returns Section Entity
   */
  private convertSectionToEntity(dto: SectionDTO): Section {
    const sentences = dto.sentences.map((sentenceDTO) =>
      this.convertSentenceToEntity(sentenceDTO)
    );

    return new Section(dto.id, dto.title, sentences);
  }

  /**
   * 將 SentenceDTO 轉換為 Sentence Entity
   *
   * @param dto - SentenceDTO
   * @returns Sentence Entity
   */
  private convertSentenceToEntity(dto: SentenceDTO): Sentence {
    const timeRange = new TimeRange(
      TimeStamp.fromSeconds(dto.startTime),
      TimeStamp.fromSeconds(dto.endTime)
    );

    return new Sentence(dto.id, dto.text, timeRange, dto.isHighlight);
  }

  /**
   * 生成唯一 ID（簡化版 UUID）
   *
   * @returns 唯一識別碼
   */
  private generateId(): string {
    return `transcript_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
