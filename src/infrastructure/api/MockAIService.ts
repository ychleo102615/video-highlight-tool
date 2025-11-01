/**
 * Mock AI Service - 模擬 AI 轉錄生成服務
 *
 * 職責:
 * - 從記憶體快取讀取使用者上傳的 JSON 檔案
 * - 驗證 JSON 格式並轉換為 TranscriptDTO
 * - 模擬 1.5 秒的 AI 處理延遲
 *
 * 實作 Application Layer 的 ITranscriptGenerator 介面
 */

import type { ITranscriptGenerator } from '@/application/ports/ITranscriptGenerator';
import type { TranscriptDTO, SectionDTO, SentenceDTO } from '@/application/dto';
import { JSONValidator } from '@/infrastructure/utils/json-validator';

/**
 * Mock AI Service 實作
 *
 * 使用記憶體 Map 暫存使用者上傳的 JSON 資料
 */
export class MockAIService implements ITranscriptGenerator {
  /**
   * 記憶體快取 - 儲存 videoId → JSON 字串的映射
   */
  private mockDataMap: Map<string, string> = new Map();

  /**
   * 設定 Mock 資料
   *
   * @param videoId - 視頻 ID
   * @param jsonContent - JSON 字串內容
   *
   * 使用場景:
   * - 使用者上傳視頻後,同時上傳對應的 JSON 檔案
   * - Presentation Layer 調用此方法暫存 JSON 到記憶體
   */
  setMockData(videoId: string, jsonContent: string): void {
    this.mockDataMap.set(videoId, jsonContent);
  }

  /**
   * 生成視頻轉錄 (實作 ITranscriptGenerator 介面)
   *
   * @param videoId - 視頻 ID
   * @returns Promise<TranscriptDTO> - 轉錄數據
   * @throws Error 如果找不到 Mock 資料或 JSON 格式無效
   *
   * 流程:
   * 1. 從記憶體 Map 讀取 JSON 字串
   * 2. 驗證 JSON 格式 (使用 JSONValidator)
   * 3. 補完非必要欄位 (isHighlight, fullText)
   * 4. 檢查時間戳合理性 (發出警告但不阻斷)
   * 5. 模擬 1.5 秒延遲
   * 6. 轉換為 TranscriptDTO (Application Layer DTO)
   */
  async generate(videoId: string): Promise<TranscriptDTO> {
    // 1. 從記憶體 Map 讀取 JSON
    const jsonContent = this.mockDataMap.get(videoId);
    if (!jsonContent) {
      throw new Error(
        `找不到 videoId "${videoId}" 的 Mock 資料,請先使用 setMockData() 上傳 JSON 檔案`
      );
    }

    // 2. 驗證 JSON 格式 (會拋出錯誤如果格式無效)
    const validatedData = JSONValidator.validate(jsonContent);

    // 3. 補完非必要欄位
    const completedData = JSONValidator.fillDefaults(validatedData);

    // 4. 時間戳合理性檢查已在 JSONValidator.validate() 中完成 (console.warn)

    // 5. 模擬 AI 處理延遲 (1.5 秒)
    await this.delay(1500);

    // 6. 轉換為 TranscriptDTO (Application Layer DTO)
    const transcriptDTO: TranscriptDTO = {
      videoId: videoId,
      fullText: completedData.fullText!,
      sections: completedData.sections.map(
        (section): SectionDTO => ({
          id: section.id,
          title: section.title,
          sentences: section.sentences.map(
            (sentence): SentenceDTO => ({
              id: sentence.id,
              text: sentence.text,
              startTime: sentence.startTime,
              endTime: sentence.endTime,
              isHighlight: sentence.isHighlight ?? false,
            })
          ),
        })
      ),
    };

    return transcriptDTO;
  }

  /**
   * 延遲輔助函式
   *
   * @param ms - 延遲毫秒數
   * @returns Promise<void>
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 清除特定視頻的 Mock 資料
   *
   * @param videoId - 視頻 ID
   */
  clearMockData(videoId: string): void {
    this.mockDataMap.delete(videoId);
  }

  /**
   * 清除所有 Mock 資料
   */
  clearAllMockData(): void {
    this.mockDataMap.clear();
  }

  /**
   * 檢查是否存在特定視頻的 Mock 資料
   *
   * @param videoId - 視頻 ID
   * @returns boolean - 是否存在
   */
  hasMockData(videoId: string): boolean {
    return this.mockDataMap.has(videoId);
  }
}
