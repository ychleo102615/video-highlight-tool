import { onMounted, onUnmounted } from 'vue';

/**
 * useSessionCleanup - 會話清除 Composable
 *
 * 職責:
 * - 監聽瀏覽器事件以區分「分頁關閉」與「分頁重整」
 * - 透過 sessionStorage 標記管理清除邏輯
 * - 確保重整時不觸發清除（保護 session-restore 功能）
 *
 * 技術方案:
 * - beforeunload: 設定 isClosing 標記
 * - load: 清除 isClosing 標記（表示是重整而非關閉）
 * - pagehide: 檢測真實的分頁關閉並設定 pendingCleanup 標記
 *
 * User Story 3: 分頁重整時保留會話資料
 * - 確保重整時不會誤觸發清除邏輯
 * - 與 005-session-restore 功能協調
 */
export function useSessionCleanup() {
  // ========================================
  // Event Handlers (將在後續任務中實作)
  // ========================================

  /**
   * T008: beforeunload 事件處理器
   * 設定 isClosing 標記，表示使用者即將離開頁面
   *
   * 邏輯:
   * 1. 設定 sessionStorage.isClosing = 'true'
   * 2. 如果是重整，load 事件會清除此標記
   * 3. 如果是關閉，下次啟動時檢查此標記判斷是否需清除
   *
   * @param e - BeforeUnloadEvent (User Story 1 將使用此參數設定 returnValue)
   */
  function handleBeforeUnload(e: BeforeUnloadEvent) {
    try {
      // 設定 isClosing 標記
      sessionStorage.setItem('isClosing', 'true');
    } catch (error) {
      // SessionStorage 不可用時（如隱私模式），僅記錄警告
      console.warn('Failed to set isClosing flag:', error);
    }

    // User Story 3: 不顯示確認對話框（專注於重整保護）
    // User Story 1 將使用 e.preventDefault() 和 e.returnValue 添加確認邏輯
    void e; // 明確標記參數將在 User Story 1 使用
  }

  /**
   * T009: load 事件處理器
   * 清除 isClosing 標記，表示頁面重新載入（重整）
   *
   * 邏輯:
   * 1. 頁面重新載入時，移除 isClosing 標記
   * 2. 這表示使用者是重整而非關閉，不應觸發清除
   * 3. session-restore 功能可正常運作
   */
  function handleLoad() {
    try {
      // 清除 isClosing 標記（如果存在）
      sessionStorage.removeItem('isClosing');
    } catch (error) {
      // SessionStorage 不可用時（如隱私模式），僅記錄警告
      console.warn('Failed to remove isClosing flag:', error);
    }
  }

  // ========================================
  // Lifecycle Hooks
  // ========================================

  onMounted(() => {
    // 註冊全域事件監聽器
    // T008: beforeunload - 設定 isClosing 標記
    window.addEventListener('beforeunload', handleBeforeUnload);
    // T009: load - 清除 isClosing 標記（重整時）
    window.addEventListener('load', handleLoad);
  });

  onUnmounted(() => {
    // 清除全域事件監聽器
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('load', handleLoad);
  });

  // ========================================
  // Return (暴露給組件使用)
  // ========================================

  return {
    // 目前 User Story 3 僅需要建立框架，無需暴露方法
    // User Story 1 和 2 將在此添加手動清除方法
  };
}
