/**
 * File Storage Error
 */

import { ApplicationError } from './ApplicationError';

/**
 * 文件儲存錯誤
 *
 * 當文件儲存操作失敗時拋出
 */
export class FileStorageError extends ApplicationError {
  constructor(reason: string) {
    super(`File storage operation failed: ${reason}`, 'FILE_STORAGE_FAILED');
    Object.setPrototypeOf(this, FileStorageError.prototype);
  }
}
