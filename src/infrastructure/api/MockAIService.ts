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
import type { IMockDataProvider } from '@/application/ports/IMockDataProvider';
import type { TranscriptDTO, SectionDTO, SentenceDTO } from '@/application/dto';
import { JSONValidator } from '@/infrastructure/utils/json-validator';

/**
 * Mock AI Service 實作
 *
 * 使用記憶體 Map 暫存使用者上傳的 JSON 資料
 * 實作兩個介面：
 * - ITranscriptGenerator: 生成轉錄資料
 * - IMockDataProvider: 設定/清除 Mock 資料
 */
export class MockAIService implements ITranscriptGenerator, IMockDataProvider {
  /**
   * 記憶體快取 - 儲存 videoId → JSON 字串的映射
   */
  private mockDataMap: Map<string, string> = new Map();

  /**
   * 設定 Mock 資料
   *
   * @param videoId - 視頻 ID
   * @param jsonContent - JSON 字串內容
   * @throws Error 如果 JSON 格式無效
   *
   * 使用場景:
   * - 使用者上傳視頻後,同時上傳對應的 JSON 檔案
   * - Presentation Layer 調用此方法暫存 JSON 到記憶體
   *
   * 流程:
   * 1. 驗證 JSON 格式 (使用 JSONValidator)
   * 2. 補完非必要欄位 (isHighlightSuggestion, fullText)
   * 3. 存儲補完後的 JSON 到記憶體 Map
   */
  setMockData(videoId: string, jsonContent: string): void {
    // 1. 驗證 JSON 格式 (會拋出錯誤如果格式無效)
    const validatedData = JSONValidator.validate(jsonContent);

    // 2. 補完非必要欄位
    const completedData = JSONValidator.fillDefaults(validatedData);

    // 3. 存儲補完後的 JSON 字串
    this.mockDataMap.set(videoId, JSON.stringify(completedData));
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
   * 3. 補完非必要欄位 (isHighlightSuggestion, fullText)
   * 4. 檢查時間戳合理性 (發出警告但不阻斷)
   * 5. 模擬 1.5 秒延遲
   * 6. 轉換為 TranscriptDTO (Application Layer DTO)
   */
  async generate(videoId: string): Promise<TranscriptDTO> {
    // 1. 從記憶體 Map 讀取 JSON（如果沒有則使用預設 Mock 數據）
    const jsonContent = this.mockDataMap.get(videoId) || this.getDefaultMockData();

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
              isHighlightSuggestion: sentence.isHighlightSuggestion ?? false
            })
          )
        })
      )
    };

    // 7. 使用後自動清除（避免內存洩漏，確保一次性使用）
    this.mockDataMap.delete(videoId);

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
   * 檢查是否存在特定視頻的 Mock 資料
   *
   * @param videoId - 視頻 ID
   * @returns boolean - 是否存在
   */
  hasMockData(videoId: string): boolean {
    return this.mockDataMap.has(videoId);
  }

  /**
   * 獲取預設的 Mock 數據
   * 當使用者沒有上傳 JSON 檔案時使用
   *
   * @returns string - JSON 字串
   */
  private getDefaultMockData(): string {
    return JSON.stringify({
      fullText:
        '大家好，歡迎來到今天的分享。今天我們要討論前端架構設計的經驗。我們會討論 Clean Architecture 在前端的應用。Clean Architecture 是由 Robert Martin 提出的軟體架構模式。核心理念是讓業務邏輯獨立於框架和外部依賴。這種架構分為四層：Domain、Application、Infrastructure、Presentation。Domain Layer 包含業務實體和規則，完全不依賴外部。Application Layer 定義應用邏輯和 Use Case。Infrastructure Layer 處理外部系統整合。Presentation Layer 負責使用者介面。',
      sections: [
        {
          id: 'section_1',
          title: '開場介紹',
          sentences: [
            {
              id: 'sentence_1',
              text: '大家好，歡迎來到今天的分享。',
              startTime: 0.0,
              endTime: 3.5,
              isHighlightSuggestion: true
            },
            {
              id: 'sentence_2',
              text: '今天我們要討論前端架構設計的經驗。',
              startTime: 3.5,
              endTime: 7.2,
              isHighlightSuggestion: true
            },
            {
              id: 'sentence_3',
              text: '我們會討論 Clean Architecture 在前端的應用。',
              startTime: 7.2,
              endTime: 11.5,
              isHighlightSuggestion: false
            }
          ]
        },
        {
          id: 'section_2',
          title: 'Clean Architecture 介紹',
          sentences: [
            {
              id: 'sentence_4',
              text: 'Clean Architecture 是由 Robert Martin 提出的軟體架構模式。',
              startTime: 11.5,
              endTime: 17.0,
              isHighlightSuggestion: false
            },
            {
              id: 'sentence_5',
              text: '核心理念是讓業務邏輯獨立於框架和外部依賴。',
              startTime: 17.0,
              endTime: 21.5,
              isHighlightSuggestion: true
            },
            {
              id: 'sentence_6',
              text: '這種架構分為四層：Domain、Application、Infrastructure、Presentation。',
              startTime: 21.5,
              endTime: 27.8,
              isHighlightSuggestion: false
            }
          ]
        },
        {
          id: 'section_3',
          title: '各層職責',
          sentences: [
            {
              id: 'sentence_7',
              text: 'Domain Layer 包含業務實體和規則，完全不依賴外部。',
              startTime: 27.8,
              endTime: 32.5,
              isHighlightSuggestion: true
            },
            {
              id: 'sentence_8',
              text: 'Application Layer 定義應用邏輯和 Use Case。',
              startTime: 32.5,
              endTime: 36.8,
              isHighlightSuggestion: false
            },
            {
              id: 'sentence_9',
              text: 'Infrastructure Layer 處理外部系統整合。',
              startTime: 36.8,
              endTime: 40.5,
              isHighlightSuggestion: true
            },
            {
              id: 'sentence_10',
              text: 'Presentation Layer 負責使用者介面。',
              startTime: 40.5,
              endTime: 44.0,
              isHighlightSuggestion: false
            }
          ]
        }
      ]
    });
  }
}
