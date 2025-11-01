/**
 * DTO Mapper - 負責 Domain Entity 與 Persistence DTO 之間的轉換
 *
 * 職責:
 * - Entity → PersistenceDTO (儲存時使用)
 * - PersistenceDTO → Entity (恢復時使用)
 * - 處理特殊轉換邏輯 (Set ↔ Array, ValueObject 創建等)
 */

import { Video } from '@/domain/aggregates/Video';
import { Transcript } from '@/domain/aggregates/Transcript/Transcript';
import { Section } from '@/domain/aggregates/Transcript/Section';
import { Sentence } from '@/domain/aggregates/Transcript/Sentence';
import { Highlight } from '@/domain/aggregates/Highlight';
import { VideoMetadata } from '@/domain/value-objects/VideoMetadata';
import { TimeStamp } from '@/domain/value-objects/TimeStamp';
import { TimeRange } from '@/domain/value-objects/TimeRange';

import type { VideoPersistenceDTO } from '../storage/dto/VideoPersistenceDTO';
import type {
  TranscriptPersistenceDTO,
  SectionDTO,
  SentenceDTO,
} from '../storage/dto/TranscriptPersistenceDTO';
import type { HighlightPersistenceDTO } from '../storage/dto/HighlightPersistenceDTO';

export class DTOMapper {
  // ==================== Video Mapping ====================

  /**
   * 將 Video Entity 轉換為 Persistence DTO
   * @param video - Video Entity
   * @param sessionId - 當前會話 ID
   * @returns VideoPersistenceDTO
   */
  static videoEntityToPersistenceDto(video: Video, sessionId: string): VideoPersistenceDTO {
    return {
      id: video.id,
      file: video.file,
      metadata: {
        duration: video.metadata.duration,
        width: video.metadata.width,
        height: video.metadata.height,
        size: video.file.size,
        mimeType: video.metadata.format,
        name: video.file.name,
      },
      url: video.url,
      savedAt: Date.now(),
      sessionId: sessionId,
    };
  }

  /**
   * 將 VideoPersistenceDTO 轉換為 Video Entity
   * @param dto - VideoPersistenceDTO
   * @returns Video Entity
   */
  static videoPersistenceDtoToEntity(dto: VideoPersistenceDTO): Video {
    // 處理大視頻 (file 為 null) 的情況
    // 在這種情況下,我們需要創建一個假的 File 物件或者拋出錯誤
    // 根據設計,file 為 null 時代表需要重新上傳,因此這裡創建一個空的 File
    const file = dto.file || new File([], dto.metadata.name, { type: dto.metadata.mimeType });

    const metadata = new VideoMetadata(
      dto.metadata.duration,
      dto.metadata.width,
      dto.metadata.height,
      dto.metadata.mimeType
    );

    return new Video(dto.id, file, metadata, dto.url);
  }

  // ==================== Transcript Mapping ====================

  /**
   * 將 Transcript Entity 轉換為 Persistence DTO
   * @param transcript - Transcript Entity
   * @param sessionId - 當前會話 ID
   * @returns TranscriptPersistenceDTO
   */
  static transcriptEntityToPersistenceDto(
    transcript: Transcript,
    sessionId: string
  ): TranscriptPersistenceDTO {
    return {
      id: transcript.id,
      videoId: transcript.videoId,
      fullText: transcript.fullText,
      sections: transcript.sections.map((section) => ({
        id: section.id,
        title: section.title,
        sentences: section.sentences.map((sentence) => ({
          id: sentence.id,
          text: sentence.text,
          startTime: sentence.timeRange.start.seconds,
          endTime: sentence.timeRange.end.seconds,
          isHighlightSuggestion: sentence.isHighlightSuggestion,
        })),
      })),
      savedAt: Date.now(),
      sessionId: sessionId,
    };
  }

  /**
   * 將 TranscriptPersistenceDTO 轉換為 Transcript Entity
   * @param dto - TranscriptPersistenceDTO
   * @returns Transcript Entity
   */
  static transcriptPersistenceDtoToEntity(dto: TranscriptPersistenceDTO): Transcript {
    const sections = dto.sections.map((sectionDto) => {
      const sentences = sectionDto.sentences.map((sentenceDto) => {
        const timeRange = new TimeRange(
          TimeStamp.fromSeconds(sentenceDto.startTime),
          TimeStamp.fromSeconds(sentenceDto.endTime)
        );
        return new Sentence(
          sentenceDto.id,
          sentenceDto.text,
          timeRange,
          sentenceDto.isHighlightSuggestion
        );
      });
      return new Section(sectionDto.id, sectionDto.title, sentences);
    });

    return new Transcript(dto.id, dto.videoId, sections, dto.fullText);
  }

  // ==================== Highlight Mapping ====================

  /**
   * 將 Highlight Entity 轉換為 Persistence DTO
   * @param highlight - Highlight Entity
   * @param sessionId - 當前會話 ID
   * @returns HighlightPersistenceDTO
   */
  static highlightEntityToPersistenceDto(
    highlight: Highlight,
    sessionId: string
  ): HighlightPersistenceDTO {
    const selectedIds = highlight.getSelectedSentenceIds();
    return {
      id: highlight.id,
      videoId: highlight.videoId,
      name: highlight.name,
      selectedSentenceIds: Array.from(selectedIds), // ReadonlyArray → Array
      selectionOrder: Array.from(selectedIds), // 保持選擇順序
      savedAt: Date.now(),
      sessionId: sessionId,
    };
  }

  /**
   * 將 HighlightPersistenceDTO 轉換為 Highlight Entity
   * @param dto - HighlightPersistenceDTO
   * @returns Highlight Entity
   */
  static highlightPersistenceDtoToEntity(dto: HighlightPersistenceDTO): Highlight {
    const highlight = new Highlight(dto.id, dto.videoId, dto.name);

    // 恢復選擇狀態:逐一調用 addSentence() 重建內部狀態
    // 按照 selectionOrder 的順序添加,確保順序一致
    for (const sentenceId of dto.selectionOrder) {
      highlight.addSentence(sentenceId);
    }

    return highlight;
  }
}
