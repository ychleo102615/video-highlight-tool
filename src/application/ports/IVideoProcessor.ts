/**
 * Video Processor Port Interface
 *
 * 定義視頻處理服務的契約，由 Infrastructure Layer 實作
 */

import type { VideoMetadata } from '../../domain/value-objects';

/**
 * 視頻處理器介面
 *
 * 負責視頻元數據提取和處理操作
 */
export interface IVideoProcessor {
  /**
   * 提取視頻元數據
   *
   * @param file - 視頻文件
   * @returns Promise<VideoMetadata> - 視頻元數據
   * @throws VideoMetadataExtractionError - 當提取失敗時
   */
  extractMetadata(file: File): Promise<VideoMetadata>;
}
