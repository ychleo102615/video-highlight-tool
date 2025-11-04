/**
 * Delete Session Result DTO
 *
 * 刪除會話操作的結果資料傳輸物件
 *
 * @module application/dto
 */

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
