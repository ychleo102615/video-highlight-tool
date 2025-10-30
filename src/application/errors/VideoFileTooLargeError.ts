/**
 * Video File Too Large Error
 */

import { ApplicationError } from './ApplicationError';

/**
 * 視頻文件過大錯誤
 *
 * 當視頻文件超過大小限制時拋出
 */
export class VideoFileTooLargeError extends ApplicationError {
  constructor(size: number, maxSize: number) {
    super(
      `Video file too large: ${size} bytes. Maximum allowed: ${maxSize} bytes`,
      'VIDEO_FILE_TOO_LARGE'
    );
    Object.setPrototypeOf(this, VideoFileTooLargeError.prototype);
  }
}
