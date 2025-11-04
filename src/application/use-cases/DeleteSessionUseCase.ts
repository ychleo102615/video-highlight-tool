/**
 * Delete Session Use Case
 *
 * 刪除當前會話的所有持久化資料
 *
 * 職責:
 * - 刪除 IndexedDB 中當前 sessionId 的所有記錄
 * - 清除 sessionStorage 中的 sessionId
 * - 協調刪除流程並提供統一的錯誤處理
 *
 * @module application/use-cases
 */

import type { BrowserStorage } from '../../infrastructure/storage/BrowserStorage';
import type { DeleteSessionResultDTO } from '../dto/DeleteSessionResultDTO';
import {
  DELETE_SESSION_ERRORS,
  isValidSessionId,
} from '../dto/DeleteSessionResultDTO';
import { SESSION_ID_KEY } from '../../config/constants';

/**
 * Delete Session Use Case Interface
 */
export interface IDeleteSessionUseCase {
  execute(): Promise<DeleteSessionResultDTO>;
}

/**
 * Delete Session Use Case Implementation
 *
 * 實作會話刪除的業務邏輯
 */
export class DeleteSessionUseCase implements IDeleteSessionUseCase {
  constructor(private readonly browserStorage: BrowserStorage) {}

  /**
   * 執行刪除會話操作
   *
   * 執行流程:
   * 1. 獲取當前 sessionId
   * 2. 驗證 sessionId 存在性與格式
   * 3. 刪除 IndexedDB 資料 (調用 BrowserStorage.deleteSession)
   * 4. 清除 sessionStorage
   * 5. 返回結果
   *
   * 注意: Store 重置由 Presentation Layer 的 videoStore.deleteSession() 負責
   *
   * @returns Promise<DeleteSessionResultDTO> - 刪除結果
   */
  async execute(): Promise<DeleteSessionResultDTO> {
    try {
      // 1. 獲取當前 sessionId
      const sessionId = this.browserStorage.getSessionId();

      // 2. 驗證 sessionId
      if (!isValidSessionId(sessionId)) {
        return {
          success: false,
          error: DELETE_SESSION_ERRORS.NO_SESSION,
        };
      }

      // 3. 刪除 IndexedDB 資料
      try {
        await this.browserStorage.deleteSession(sessionId);
      } catch (error) {
        console.error('Failed to delete IndexedDB data:', error);
        return {
          success: false,
          error: DELETE_SESSION_ERRORS.INDEXEDDB_DELETE_FAILED,
        };
      }

      // 4. 清除 sessionStorage (不生成新 sessionId)
      sessionStorage.removeItem(SESSION_ID_KEY);

      // 5. 返回成功結果
      return { success: true };
    } catch (error) {
      console.error('Unexpected error in DeleteSessionUseCase:', error);
      return {
        success: false,
        error: DELETE_SESSION_ERRORS.UNKNOWN_ERROR,
      };
    }
  }
}
