/**
 * Upload Video With Mock Transcript Use Case
 *
 * 處理使用者同時上傳視頻和轉錄 JSON 檔案的情況
 */

import type { Video } from '../../domain/aggregates/Video'
import type { TranscriptDTO } from '../dto/TranscriptDTO'
import type { IMockDataProvider } from '../ports/IMockDataProvider'
import type { UploadVideoUseCase } from './UploadVideoUseCase'

/**
 * UploadVideoWithMockTranscriptUseCase
 *
 * 職責：
 * - 重用 UploadVideoUseCase 上傳視頻
 * - 透過 IMockDataProvider 設定 Mock 轉錄資料
 *
 * @example
 * ```typescript
 * const useCase = new UploadVideoWithMockTranscriptUseCase(uploadVideoUseCase, mockDataProvider);
 * const video = await useCase.execute(videoFile, transcriptData, (progress) => {
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
   * @param transcriptData - 轉錄資料（已解析的 TranscriptDTO）
   * @param onProgress - 上傳進度回調（0-100），可選
   * @returns Promise<Video> - 上傳的 Video Entity
   */
  async execute(
    videoFile: File,
    transcriptData: TranscriptDTO,
    onProgress?: (progress: number) => void
  ): Promise<Video> {
    // 1. 上傳視頻（重用現有 Use Case）
    const video = await this.uploadVideoUseCase.execute(videoFile, onProgress)

    // 2. 設定 Mock 轉錄資料
    this.mockDataProvider.setMockTranscript(video.id, transcriptData)

    // 3. 返回視頻
    return video
  }
}
