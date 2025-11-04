import { onMounted, onUnmounted } from 'vue';

/**
 * useSessionCleanup - 會話清除 Composable
 *
 * 職責:
 * - 監聽瀏覽器事件以區分「分頁關閉」與「分頁重整」
 * - 透過 sessionStorage (暫存) 和 localStorage (持久化) 管理清除邏輯
 * - 確保重整時不觸發清除（保護 session-restore 功能）
 *
 * 技術方案:
 * - beforeunload: 設定 isClosing 標記 (sessionStorage)
 * - load: 清除所有清除標記（表示是重整而非關閉）
 * - pagehide: 檢測真實的分頁關閉並設定 pendingCleanup 標記 (localStorage，持久化)
 *
 * 儲存策略:
 * - isClosing: sessionStorage (僅當前會話，重整保留，關閉清除)
 * - pendingCleanup: localStorage (持久化，關閉後依然存在，用於延遲清除)
 * - sessionId: sessionStorage (session-restore 使用)
 *
 * User Story 3: 分頁重整時保留會話資料
 * - 確保重整時不會誤觸發清除邏輯
 * - 與 005-session-restore 功能協調
 */
export function useSessionCleanup() {
  // ========================================
  // 移除錯誤的「立即執行」邏輯（修復 v4）
  // ========================================
  // 原因：
  // 1. sessionStorage.sessionId 可能在分頁關閉後仍然存在（瀏覽器行為不一致）
  // 2. 導致誤判為「刷新」而清除 pendingCleanup
  // 3. SessionRestorer 已經負責檢查和處理 pendingCleanup
  // 4. 重整時不應該有 pendingCleanup（因為 load 事件會清除 isClosing，pagehide 不會設定）
  //
  // 新策略：
  // - useSessionCleanup 只負責事件處理（beforeunload, load, pagehide）
  // - SessionRestorer 負責啟動時的檢查和清除
  // - 如果重整時出現 pendingCleanup，也應該執行清除（防禦性程式設計）

  // ========================================
  // Event Handlers
  // ========================================

  /**
   * T008 + T013: beforeunload 事件處理器
   * 設定 isClosing 標記，表示使用者即將離開頁面
   *
   * 邏輯:
   * 1. 設定 sessionStorage.isClosing = 'true'
   * 2. 如果是重整，composable 初始化時會清除 pendingCleanup
   * 3. 如果是關閉，pagehide 事件會設定 pendingCleanup 標記
   *
   * 注意: 確認對話框由 App.vue 的 beforeunload handler 負責
   *       (檢查 videoStore.hasVideo，避免無資料時也顯示確認)
   *
   * @param _e - BeforeUnloadEvent (未使用，僅用於型別)
   */
  function handleBeforeUnload(_e: BeforeUnloadEvent) {
    try {
      // 設定 isClosing 標記
      sessionStorage.setItem('isClosing', 'true');
    } catch (error) {
      // SessionStorage 不可用時（如隱私模式），僅記錄警告
      console.warn('Failed to set isClosing flag:', error);
    }
  }

  /**
   * T009: load 事件處理器（重新添加 - 修復 v4）
   * 清除 isClosing 標記，表示頁面重新載入（重整）
   *
   * 邏輯:
   * 1. 頁面重新載入時，移除 isClosing 標記
   * 2. 這表示使用者是重整而非關閉，不應觸發清除
   * 3. pagehide 檢查時不會設定 pendingCleanup
   * 4. session-restore 功能可正常運作
   */
  function handleLoad() {
    try {
      // 清除 isClosing 標記（如果存在）
      sessionStorage.removeItem('isClosing');
      console.log('[useSessionCleanup] Page loaded, isClosing cleared (refresh detected)');
    } catch (error) {
      // SessionStorage 不可用時（如隱私模式），僅記錄警告
      console.warn('Failed to remove isClosing flag:', error);
    }
  }

  /**
   * T012: pagehide 事件處理器（修復版 v2）
   * 偵測分頁真正關閉並設定 pendingCleanup 標記
   *
   * 邏輯:
   * 1. 檢查 isClosing 標記是否仍存在（sessionStorage，未被 load 清除）
   * 2. 檢查 event.persisted 是否為 false（非 bfcache）
   * 3. 如果兩者都符合，表示是真正的關閉，設定 pendingCleanup 標記到 **localStorage**
   * 4. 下次應用啟動時，SessionRestorer 會檢查此標記並執行延遲清除
   *
   * 儲存策略修復:
   * - pendingCleanup 改用 **localStorage** 而非 sessionStorage
   * - 原因: sessionStorage 在分頁關閉後會被清除，無法實現延遲清除
   * - localStorage 持久化，分頁關閉後依然存在
   *
   * @param e - PageTransitionEvent
   */
  function handlePageHide(e: PageTransitionEvent) {
    try {
      // 檢查 isClosing 標記是否存在 (sessionStorage)
      const isClosing = sessionStorage.getItem('isClosing') === 'true';

      // 如果 isClosing 為 true 且頁面不進入 bfcache（真正關閉）
      if (isClosing && !e.persisted) {
        // **修復 v2**: 設定 pendingCleanup 標記到 localStorage（持久化）
        // 分頁關閉後這個標記會保留，下次啟動時執行延遲清除
        localStorage.setItem('pendingCleanup', 'true');

        // 清除 isClosing 標記（已轉換為 pendingCleanup）
        sessionStorage.removeItem('isClosing');

        console.log('[useSessionCleanup] Tab closing detected, pendingCleanup set to localStorage');
      }
    } catch (error) {
      // Storage 不可用時（如隱私模式），僅記錄警告
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
