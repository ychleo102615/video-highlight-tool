/**
 * Video Not Found Error
 */

import { ApplicationError } from './ApplicationError';

/**
 * 視頻不存在錯誤
 *
 * 當嘗試訪問不存在的視頻時拋出
 */
export class VideoNotFoundError extends ApplicationError {
  constructor(videoId: string) {
    super(`Video not found: ${videoId}`, 'VIDEO_NOT_FOUND');
    Object.setPrototypeOf(this, VideoNotFoundError.prototype);
  }
}
