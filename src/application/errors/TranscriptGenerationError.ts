/**
 * Transcript Generation Error
 */

import { ApplicationError } from './ApplicationError';

/**
 * 轉錄生成失敗錯誤
 *
 * 當 AI 服務無法生成轉錄時拋出
 */
export class TranscriptGenerationError extends ApplicationError {
  constructor(reason: string) {
    super(`Transcript generation failed: ${reason}`, 'TRANSCRIPT_GENERATION_FAILED');
    Object.setPrototypeOf(this, TranscriptGenerationError.prototype);
  }
}
