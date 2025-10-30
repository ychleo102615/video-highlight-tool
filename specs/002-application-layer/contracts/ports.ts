/**
 * Application Layer Ports - 輸入/輸出埠介面定義
 *
 * Ports 定義 Application Layer 與 Infrastructure Layer 之間的契約。
 * Infrastructure Layer 負責實作這些介面。
 */

import { TranscriptDTO } from '../dto/TranscriptDTO';
import { VideoMetadata } from '@/domain/value-objects/VideoMetadata';

// ============================================================================
// Transcript Generation Port
// ============================================================================

/**
 * 轉錄生成服務介面
 *
 * 由 Infrastructure Layer 實作（如 MockAIService 或真實 AI API）
 */
export interface ITranscriptGenerator {
  /**
   * 生成視頻轉錄
   *
   * @param videoId - 視頻 ID
   * @returns Promise<TranscriptDTO> - 轉錄數據
   * @throws TranscriptGenerationError - 當生成失敗時
   *
   * @example
   * const transcript = await transcriptGenerator.generate('video_001');
   */
  generate(videoId: string): Promise<TranscriptDTO>;
}

// ============================================================================
// File Storage Port
// ============================================================================

/**
 * 文件儲存服務介面
 *
 * 由 Infrastructure Layer 實作（如本地 ObjectURL 或雲端儲存服務）
 */
export interface IFileStorage {
  /**
   * 儲存文件並返回可訪問的 URL
   *
   * @param file - 要儲存的文件
   * @returns Promise<string> - 文件 URL（可用於播放或下載）
   * @throws FileStorageError - 當儲存失敗時
   *
   * @example
   * const url = await fileStorage.save(videoFile);
   * // url: 'blob:http://localhost:5173/abc123' 或 'https://cdn.example.com/videos/abc123.mp4'
   */
  save(file: File): Promise<string>;

  /**
   * 刪除文件
   *
   * @param url - 文件 URL
   * @returns Promise<void>
   * @throws FileStorageError - 當刪除失敗時
   *
   * @example
   * await fileStorage.delete('blob:http://localhost:5173/abc123');
   */
  delete(url: string): Promise<void>;
}

// ============================================================================
// Video Processor Port
// ============================================================================

/**
 * 視頻處理服務介面
 *
 * 由 Infrastructure Layer 實作（如 VideoProcessorService 使用 HTMLVideoElement）
 * 用於 UploadVideoUseCase 提取視頻元數據
 */
export interface IVideoProcessor {
  /**
   * 提取視頻元數據
   *
   * @param file - 視頻文件
   * @returns Promise<VideoMetadata> - 視頻元數據（時長、尺寸等）
   * @throws VideoMetadataExtractionError - 當提取失敗時
   *
   * @example
   * const metadata = await videoProcessor.extractMetadata(videoFile);
   * // metadata: { duration: 180, width: 1920, height: 1080, format: 'video/mp4' }
   */
  extractMetadata(file: File): Promise<VideoMetadata>;
}
