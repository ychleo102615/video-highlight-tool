/**
 * Upload Video With Mock Transcript Use Case
 *
 * 處理使用者同時上傳視頻和轉錄 JSON 檔案的情況
 */

import type { Video } from '../../domain/aggregates/Video';
import type { IMockDataProvider } from '../ports/IMockDataProvider';
import type { UploadVideoUseCase } from './UploadVideoUseCase';

/**
 * UploadVideoWithMockTranscriptUseCase
 *
 * 職責：
 * - 重用 UploadVideoUseCase 上傳視頻
 * - 讀取轉錄 JSON 檔案內容
 * - 透過 IMockDataProvider.setMockData 設定 Mock 資料（會進行驗證）
 *
 * @example
 * ```typescript
 * const useCase = new UploadVideoWithMockTranscriptUseCase(uploadVideoUseCase, mockDataProvider);
 * const video = await useCase.execute(videoFile, transcriptFile, (progress) => {
 *   console.log(`Upload progress: ${progress}%`);
 * });
 * ```
 */
export class UploadVideoWithMockTranscriptUseCase {
  /**
   * 建立 UploadVideoWithMockTranscriptUseCase 實例
   *
   * @param uploadVideoUseCase - 視頻上傳 Use Case
   * @param mockDataProvider - Mock 資料提供者
   */
  constructor(
    private readonly uploadVideoUseCase: UploadVideoUseCase,
    private readonly mockDataProvider: IMockDataProvider
  ) {}

  /**
   * 執行上傳視頻並設定 Mock 轉錄資料
   *
   * @param videoFile - 視頻檔案
   * @param transcriptFile - 轉錄 JSON 檔案
   * @param onProgress - 上傳進度回調（0-100），可選
   * @returns Promise<Video> - 上傳的 Video Entity
   * @throws Error 如果 JSON 格式無效
   */
  async execute(
    videoFile: File,
    transcriptFile: File,
    onProgress?: (progress: number) => void
  ): Promise<Video> {
    // 1. 上傳視頻（重用現有 Use Case）
    const video = await this.uploadVideoUseCase.execute(videoFile, onProgress);

    // 2. 讀取轉錄 JSON 檔案內容
    const jsonContent = await transcriptFile.text();

    // 3. 設定 Mock 資料（setMockData 會進行驗證、補完非必要欄位、檢查時間戳）
    this.mockDataProvider.setMockData(video.id, jsonContent);

    // 4. 返回視頻
    return video;
  }
}
