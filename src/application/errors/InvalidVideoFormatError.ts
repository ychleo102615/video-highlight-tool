/**
 * Invalid Video Format Error
 */

import { ApplicationError } from './ApplicationError';

/**
 * 視頻格式無效錯誤
 *
 * 當視頻格式不被支援時拋出
 */
export class InvalidVideoFormatError extends ApplicationError {
  constructor(format: string) {
    super(
      `Invalid video format: ${format}. Allowed formats: mp4, mov, webm`,
      'INVALID_VIDEO_FORMAT'
    );
    Object.setPrototypeOf(this, InvalidVideoFormatError.prototype);
  }
}
