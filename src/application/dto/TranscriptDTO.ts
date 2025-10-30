/**
 * Transcript Data Transfer Object
 *
 * 用於在 Application Layer 和 Infrastructure/Presentation Layer 之間傳輸轉錄數據
 */

/**
 * 句子 DTO
 */
export interface SentenceDTO {
  /** 句子 ID */
  id: string;

  /** 句子文字 */
  text: string;

  /** 起始時間（秒） */
  startTime: number;

  /** 結束時間（秒） */
  endTime: number;

  /** 是否為 AI 建議的高光句子 */
  isHighlight: boolean;
}

/**
 * 段落 DTO
 */
export interface SectionDTO {
  /** 段落 ID */
  id: string;

  /** 段落標題 */
  title: string;

  /** 句子列表 */
  sentences: SentenceDTO[];
}

/**
 * 轉錄 DTO
 */
export interface TranscriptDTO {
  /** 關聯的視頻 ID */
  videoId: string;

  /** 完整轉錄文字 */
  fullText: string;

  /** 段落列表 */
  sections: SectionDTO[];
}
