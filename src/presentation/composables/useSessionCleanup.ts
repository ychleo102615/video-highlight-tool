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
   * T008 + T013: beforeunload 事件處理器
   * 設定 isClosing 標記，表示使用者即將離開頁面
   * User Story 1: 顯示確認對話框提醒使用者即將清除資料
   *
   * 邏輯:
   * 1. 設定 sessionStorage.isClosing = 'true'
   * 2. 如果是重整，load 事件會清除此標記
   * 3. 如果是關閉，pagehide 事件會設定 pendingCleanup 標記
   * 4. 顯示瀏覽器原生確認對話框（User Story 1）
   *
   * @param e - BeforeUnloadEvent
   */
  function handleBeforeUnload(e: BeforeUnloadEvent) {
    try {
      // 設定 isClosing 標記（User Story 3）
      sessionStorage.setItem('isClosing', 'true');
    } catch (error) {
      // SessionStorage 不可用時（如隱私模式），僅記錄警告
      console.warn('Failed to set isClosing flag:', error);
    }

    // T013: User Story 1 - 顯示確認對話框
    // 注意：現代瀏覽器會忽略自定義訊息，僅顯示預設訊息
    // 但仍需呼叫 preventDefault() 和設定 returnValue 來觸發對話框
    e.preventDefault();
    e.returnValue = '關閉分頁將刪除此會話的所有資料，確定要繼續嗎？';

    // 返回字串也可以觸發確認對話框（舊版瀏覽器相容）
    return e.returnValue;
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

  /**
   * T012: pagehide 事件處理器
   * 偵測分頁真正關閉並設定 pendingCleanup 標記
   *
   * 邏輯:
   * 1. 檢查 isClosing 標記是否仍存在（未被 load 清除）
   * 2. 檢查 event.persisted 是否為 false（非 bfcache）
   * 3. 如果兩者都符合，表示是真正的關閉，設定 pendingCleanup 標記
   * 4. 下次應用啟動時，App.vue 會檢查此標記並執行延遲清除
   *
   * @param e - PageTransitionEvent
   */
  function handlePageHide(e: PageTransitionEvent) {
    try {
      // 檢查 isClosing 標記是否存在
      const isClosing = sessionStorage.getItem('isClosing') === 'true';

      // 如果 isClosing 為 true 且頁面不進入 bfcache（真正關閉）
      if (isClosing && !e.persisted) {
        // 設定 pendingCleanup 標記，下次啟動時執行延遲清除
        sessionStorage.setItem('pendingCleanup', 'true');

        // 清除 isClosing 標記（已轉換為 pendingCleanup）
        sessionStorage.removeItem('isClosing');
      }
    } catch (error) {
      // SessionStorage 不可用時（如隱私模式），僅記錄警告
      console.warn('Failed to set pendingCleanup flag:', error);
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
    // T012: pagehide - 偵測分頁關閉並設定 pendingCleanup 標記
    window.addEventListener('pagehide', handlePageHide);
  });

  onUnmounted(() => {
    // 清除全域事件監聽器
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('load', handleLoad);
    window.removeEventListener('pagehide', handlePageHide);
  });

  // ========================================
  // Return (暴露給組件使用)
  // ========================================

  return {
    // 目前 User Story 3 僅需要建立框架，無需暴露方法
    // User Story 1 和 2 將在此添加手動清除方法
  };
}
