/**
 * Video Metadata Extraction Error
 */

import { ApplicationError } from './ApplicationError';

/**
 * 視頻元數據提取失敗錯誤
 *
 * 當無法提取視頻元數據時拋出
 */
export class VideoMetadataExtractionError extends ApplicationError {
  constructor() {
    super('Failed to extract video metadata', 'VIDEO_METADATA_EXTRACTION_FAILED');
    Object.setPrototypeOf(this, VideoMetadataExtractionError.prototype);
  }
}
