/**
 * Transcript Persistence DTO
 *
 * 用於 IndexedDB 持久化儲存的轉錄資料結構
 * 包含持久化元資料 (savedAt, sessionId)
 */

export interface TranscriptPersistenceDTO {
  // Domain 屬性
  id: string;
  videoId: string; // 關聯的視頻 ID
  fullText: string; // 完整轉錄文字
  sections: SectionDTO[]; // 段落陣列

  // Persistence 元資料
  savedAt: number; // 儲存時間戳 (毫秒)
  sessionId: string; // 會話 ID
}

export interface SectionDTO {
  id: string;
  title: string;
  sentences: SentenceDTO[];
}

export interface SentenceDTO {
  id: string;
  text: string;
  startTime: number; // 起始時間 (秒)
  endTime: number; // 結束時間 (秒)
  isHighlightSuggestion: boolean; // AI 建議的高光標記
}
