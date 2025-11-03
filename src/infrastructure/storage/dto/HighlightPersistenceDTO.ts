/**
 * Highlight Persistence DTO
 *
 * 用於 IndexedDB 持久化儲存的高光資料結構
 * 包含持久化元資料 (savedAt, sessionId)
 */

export interface HighlightPersistenceDTO {
  // Domain 屬性
  id: string;
  videoId: string; // 關聯的視頻 ID
  name: string; // 高光名稱
  selectedSentenceIds: string[]; // 選中的句子 ID 陣列 (Set 轉換為 Array)
  selectionOrder: string[]; // 選擇順序記錄

  // Persistence 元資料
  savedAt: number; // 儲存時間戳 (毫秒)
  sessionId: string; // 會話 ID
}
