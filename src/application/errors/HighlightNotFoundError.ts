/**
 * Highlight Not Found Error
 */

import { ApplicationError } from './ApplicationError';

/**
 * 高光不存在錯誤
 *
 * 當嘗試訪問不存在的高光時拋出
 */
export class HighlightNotFoundError extends ApplicationError {
  constructor(highlightId: string) {
    super(`Highlight not found: ${highlightId}`, 'HIGHLIGHT_NOT_FOUND');
    Object.setPrototypeOf(this, HighlightNotFoundError.prototype);
  }
}
