/**
 * Transcript Not Found Error
 */

import { ApplicationError } from './ApplicationError';

/**
 * 轉錄不存在錯誤
 *
 * 當嘗試訪問不存在的轉錄時拋出
 */
export class TranscriptNotFoundError extends ApplicationError {
  constructor(transcriptId: string) {
    super(`Transcript not found: ${transcriptId}`, 'TRANSCRIPT_NOT_FOUND');
    Object.setPrototypeOf(this, TranscriptNotFoundError.prototype);
  }
}
