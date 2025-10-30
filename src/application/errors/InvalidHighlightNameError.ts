/**
 * Invalid Highlight Name Error
 */

import { ApplicationError } from './ApplicationError';

/**
 * 高光名稱無效錯誤
 *
 * 當高光名稱為空或無效時拋出
 */
export class InvalidHighlightNameError extends ApplicationError {
  constructor() {
    super('Highlight name cannot be empty', 'INVALID_HIGHLIGHT_NAME');
    Object.setPrototypeOf(this, InvalidHighlightNameError.prototype);
  }
}
