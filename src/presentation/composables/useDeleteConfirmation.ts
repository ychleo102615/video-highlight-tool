/**
 * useDeleteConfirmation Composable
 *
 * 提供刪除確認對話框的邏輯
 *
 * 使用 Naive UI 的 useDialog API 顯示確認對話框,
 * 防止使用者誤刪資料
 *
 * @module presentation/composables
 */

import { useDialog } from 'naive-ui';

/**
 * 刪除確認對話框 Composable
 *
 * @returns confirmDelete - 顯示確認對話框的函式
 *
 * @example
 * ```vue
 * <script setup>
 * const { confirmDelete } = useDeleteConfirmation();
 *
 * async function handleDelete() {
 *   await confirmDelete(async () => {
 *     // 執行刪除操作
 *     await deleteSession();
 *   });
 * }
 * </script>
 * ```
 */
export function useDeleteConfirmation() {
  const dialog = useDialog();

  /**
   * 顯示刪除確認對話框
   *
   * @param onConfirm - 確認刪除後執行的回調函式
   * @returns Promise<void>
   */
  function confirmDelete(onConfirm: () => Promise<void>): void {
    dialog.warning({
      title: '刪除高光紀錄',
      content: '確定要刪除當前會話的所有資料嗎？此操作無法撤銷。',
      positiveText: '永久刪除',
      negativeText: '取消',
      positiveButtonProps: { type: 'error' },
      negativeButtonProps: { type: 'default' },
      onPositiveClick: async () => {
        await onConfirm();
      },
    });
  }

  return { confirmDelete };
}
