/**
 * Mock 資料提供者介面（Application Layer Port）
 *
 * 用途：允許 Use Case 設定自訂的 Mock 轉錄 JSON 資料
 * 實作者：MockAIService (Infrastructure Layer)
 *
 * 注意：此介面僅在開發/展示環境使用，生產環境不需要
 *
 * 設計原則：
 * - 只接受 JSON 字串，確保所有資料都經過 JSONValidator 驗證
 * - Infrastructure Layer (MockAIService) 負責驗證、補完非必要欄位（isHighlightSuggestion, fullText）
 * - Mock 資料在 generate() 使用後自動清除（一次性使用）
 */
export interface IMockDataProvider {
  /**
   * 設定指定視頻的 Mock 資料（JSON 字串格式）
   *
   * @param videoId 視頻 ID
   * @param jsonContent JSON 字串內容
   * @throws Error 如果 JSON 格式無效
   *
   * 流程：
   * 1. 驗證 JSON 格式（使用 JSONValidator）
   * 2. 補完非必要欄位（isHighlightSuggestion, fullText）
   * 3. 檢查時間戳合理性
   * 4. 存儲到記憶體 Map
   * 5. 資料在 ITranscriptGenerator.generate() 使用後自動清除
   */
  setMockData(videoId: string, jsonContent: string): void;
}
