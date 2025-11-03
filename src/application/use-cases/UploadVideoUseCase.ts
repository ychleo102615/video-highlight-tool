/**
 * Upload Video Use Case
 *
 * 處理視頻上傳，驗證文件，提取元數據，儲存視頻
 */

import { Video } from '../../domain/aggregates/Video';
import type { IVideoRepository } from '../../domain/repositories/IVideoRepository';
import type { IFileStorage } from '../ports/IFileStorage';
import type { IVideoProcessor } from '../ports/IVideoProcessor';
import { InvalidVideoFormatError, VideoFileTooLargeError } from '../errors';
import { ALLOWED_VIDEO_FORMATS, MAX_FILE_SIZE, type AllowedVideoFormat } from '../../config/constants';
import { generateVideoId } from '../../config/id-generator';

/**
 * UploadVideoUseCase
 *
 * 職責：
 * - 驗證視頻格式（僅允許 mp4, mov, webm）
 * - 驗證視頻大小（最大 100MB）
 * - 透過 IFileStorage 儲存文件
 * - 透過 IVideoProcessor 提取視頻元數據
 * - 建立 Video Entity
 * - 透過 IVideoRepository 持久化
 *
 * @example
 * ```typescript
 * const useCase = new UploadVideoUseCase(videoRepository, fileStorage, videoProcessor);
 * const video = await useCase.execute(file);
 * console.log(`Video uploaded: ${video.id}`);
 * ```
 */
export class UploadVideoUseCase {
  /**
   * 建立 UploadVideoUseCase 實例
   *
   * @param videoRepository - 視頻儲存庫
   * @param fileStorage - 文件儲存服務
   * @param videoProcessor - 視頻處理服務
   */
  constructor(
    private readonly videoRepository: IVideoRepository,
    private readonly fileStorage: IFileStorage,
    private readonly videoProcessor: IVideoProcessor
  ) {}

  /**
   * 執行視頻上傳流程
   *
   * @param file - 視頻文件
   * @param onProgress - 上傳進度回調（0-100），可選
   * @returns Promise<Video> - 建立的 Video Entity
   * @throws InvalidVideoFormatError - 當視頻格式不支援時
   * @throws VideoFileTooLargeError - 當視頻文件過大時
   * @throws VideoMetadataExtractionError - 當元數據提取失敗時
   * @throws FileStorageError - 當文件儲存失敗時
   */
  async execute(file: File, onProgress?: (progress: number) => void): Promise<Video> {
    // 1. 驗證輸入
    this.validateInput(file);

    // 2. 儲存文件並獲取 URL（傳遞進度回調）
    const url = await this.fileStorage.save(file, onProgress);

    // 3. 提取視頻元數據
    const metadata = await this.videoProcessor.extractMetadata(file);

    // 4. 建立 Video Entity
    const videoId = generateVideoId();
    const video = new Video(videoId, file, metadata, url);

    // 5. 持久化
    await this.videoRepository.save(video);

    // 6. 返回結果
    return video;
  }

  /**
   * 驗證視頻文件
   *
   * @param file - 視頻文件
   * @throws InvalidVideoFormatError - 當視頻格式不支援時
   * @throws VideoFileTooLargeError - 當視頻文件過大時
   */
  private validateInput(file: File): void {
    // 驗證格式
    if (!ALLOWED_VIDEO_FORMATS.includes(file.type as AllowedVideoFormat)) {
      throw new InvalidVideoFormatError(file.type);
    }

    // 驗證大小
    if (file.size > MAX_FILE_SIZE) {
      throw new VideoFileTooLargeError(file.size, MAX_FILE_SIZE);
    }
  }
}
