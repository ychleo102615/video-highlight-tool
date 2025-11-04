/**
 * Delete Session Use Case Contract
 *
 * 定義刪除會話的 Use Case 介面與 DTO
 *
 * 職責:
 * - 刪除當前 sessionId 的所有持久化資料(IndexedDB)
 * - 清除 sessionStorage 中的 sessionId
 * - 重置所有 Pinia stores 到初始狀態
 *
 * 調用時機:
 * - 使用者點擊「刪除高光紀錄」按鈕並確認
 * - 使用者登出時清理會話(未來擴展)
 *
 * @module application/use-cases
 */

// ==================== DTOs ====================

/**
 * 刪除會話操作的結果 DTO
 *
 * @property success - 刪除是否成功
 * @property error - 若失敗,包含友善的錯誤訊息(供 UI 顯示)
 *
 * @example 成功案例
 * ```typescript
 * { success: true }
 * ```
 *
 * @example 失敗案例
 * ```typescript
 * {
 *   success: false,
 *   error: '刪除資料時發生錯誤,請重試'
 * }
 * ```
 */
export interface DeleteSessionResultDTO {
  success: boolean;
  error?: string;
}

// ==================== Use Case Interface ====================

/**
 * 刪除會話 Use Case 介面
 *
 * 實作類別: DeleteSessionUseCase (application/use-cases/DeleteSessionUseCase.ts)
 *
 * 依賴:
 * - BrowserStorage (Infrastructure Layer)
 *
 * 副作用:
 * - 刪除 IndexedDB 中當前 sessionId 的所有記錄(videos/transcripts/highlights)
 * - 清除 sessionStorage 中的 SESSION_ID_KEY
 * - 重置 Pinia stores (通過 Presentation Layer 調用)
 *
 * 錯誤處理:
 * - 不拋出例外,所有錯誤封裝在 DeleteSessionResultDTO.error 中
 * - 部分 store 刪除失敗不影響其他 stores(允許優雅降級)
 */
export interface IDeleteSessionUseCase {
  /**
   * 執行刪除會話操作
   *
   * 執行流程:
   * 1. 獲取當前 sessionId (從 BrowserStorage)
   * 2. 驗證 sessionId 存在性
   * 3. 刪除 IndexedDB 資料 (調用 BrowserStorage.deleteSession)
   * 4. 清除 sessionStorage
   * 5. 返回結果 (由 Presentation Layer 負責重置 stores)
   *
   * @returns Promise<DeleteSessionResultDTO> - 刪除結果
   *
   * @throws 不拋出例外 - 所有錯誤封裝在返回值中
   *
   * @example 使用範例
   * ```typescript
   * const deleteUseCase = container.resolve<IDeleteSessionUseCase>('DeleteSessionUseCase');
   * const result = await deleteUseCase.execute();
   *
   * if (result.success) {
   *   // 成功: 重置 stores, 顯示成功訊息
   *   message.success('會話已刪除');
   * } else {
   *   // 失敗: 顯示錯誤訊息
   *   message.error(result.error || '刪除失敗');
   * }
   * ```
   */
  execute(): Promise<DeleteSessionResultDTO>;
}

// ==================== Type Guards ====================

/**
 * 型別守衛: 驗證物件是否為有效的 DeleteSessionResultDTO
 *
 * @param obj - 待驗證的物件
 * @returns boolean - 是否符合 DTO 格式
 *
 * @example
 * ```typescript
 * const result = await deleteUseCase.execute();
 * if (isDeleteSessionResultDTO(result)) {
 *   // TypeScript 知道 result 是 DeleteSessionResultDTO
 * }
 * ```
 */
export function isDeleteSessionResultDTO(obj: unknown): obj is DeleteSessionResultDTO {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'success' in obj &&
    typeof (obj as DeleteSessionResultDTO).success === 'boolean' &&
    (!(obj as DeleteSessionResultDTO).error ||
      typeof (obj as DeleteSessionResultDTO).error === 'string')
  );
}

// ==================== Constants ====================

/**
 * 刪除操作的錯誤訊息常數
 *
 * 統一管理錯誤訊息,方便維護與國際化
 */
export const DELETE_SESSION_ERRORS = {
  NO_SESSION: '目前沒有活躍的會話',
  STORAGE_NOT_INITIALIZED: '儲存服務未初始化,請重新整理頁面',
  INDEXEDDB_DELETE_FAILED: '刪除資料時發生錯誤,請重試',
  UNKNOWN_ERROR: '發生未知錯誤,請聯絡技術支援',
} as const;

// ==================== Validation ====================

/**
 * 驗證 sessionId 格式
 *
 * 格式: session_<timestamp>_<random>
 * 例如: session_1699012345678_abc123
 *
 * @param sessionId - 待驗證的 sessionId
 * @returns boolean - 是否為有效格式
 */
export function isValidSessionId(sessionId: string | null | undefined): boolean {
  if (!sessionId) return false;
  return /^session_\d+_[a-z0-9]+$/.test(sessionId);
}
