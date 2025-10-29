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
// Video Processor Port (Optional, 未來可能需要)
// ============================================================================

/**
 * 視頻處理服務介面（可選）
 *
 * 目前 UploadVideoUseCase 內部直接使用 HTMLVideoElement 提取元數據。
 * 若未來需要更複雜的視頻處理（如伺服器端處理、縮圖生成），可引入此 Port。
 */
export interface IVideoProcessor {
  /**
   * 提取視頻元數據
   *
   * @param file - 視頻文件
   * @returns Promise<VideoMetadata> - 視頻元數據（時長、尺寸等）
   * @throws VideoMetadataExtractionError - 當提取失敗時
   */
  extractMetadata(file: File): Promise<VideoMetadata>;

  /**
   * 生成視頻縮圖
   *
   * @param file - 視頻文件
   * @param timeInSeconds - 截取時間（秒）
   * @returns Promise<string> - 縮圖 URL
   * @throws VideoProcessingError - 當生成失敗時
   */
  generateThumbnail(file: File, timeInSeconds: number): Promise<string>;
}
