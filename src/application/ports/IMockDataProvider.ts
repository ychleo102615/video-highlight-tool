import type { TranscriptDTO } from '../dto/TranscriptDTO'

/**
 * Mock 資料提供者介面（Application Layer Port）
 *
 * 用途：允許 Presentation Layer 上傳自訂的 Mock 轉錄 JSON 資料
 * 實作者：MockAIService (Infrastructure Layer)
 *
 * 注意：此介面僅在開發/展示環境使用，生產環境不需要
 */
export interface IMockDataProvider {
  /**
   * 設定指定視頻的 Mock 轉錄資料
   * @param videoId 視頻 ID
   * @param data 轉錄資料（TranscriptDTO 格式）
   */
  setMockTranscript(videoId: string, data: TranscriptDTO): void

  /**
   * 清除指定視頻的 Mock 資料
   * @param videoId 視頻 ID
   */
  clearMockTranscript(videoId: string): void
}
