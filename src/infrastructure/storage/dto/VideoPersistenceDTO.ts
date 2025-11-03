/**
 * Video Persistence DTO
 *
 * 用於 IndexedDB 持久化儲存的視頻資料結構
 * 包含持久化元資料 (savedAt, sessionId)
 */

export interface VideoPersistenceDTO {
  // Domain 屬性
  id: string;
  file: File; // IndexedDB 原生支援 File 物件
  metadata: {
    duration: number; // 視頻時長 (秒)
    width: number; // 視頻寬度
    height: number; // 視頻高度
    size: number; // 檔案大小 (bytes)
    mimeType: string; // MIME 類型
    name: string; // 檔案名稱
  };
  url?: string; // blob URL (不持久化,運行時生成)

  // Persistence 元資料
  savedAt: number; // 儲存時間戳 (毫秒)
  sessionId: string; // 會話 ID (用於識別和清理)
}
