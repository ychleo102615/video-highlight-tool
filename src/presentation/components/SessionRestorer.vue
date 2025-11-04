<!--
  SessionRestorer.vue
  會話恢復組件

  職責：
  - 在應用啟動時自動恢復會話
  - 執行延遲清除邏輯（User Story 1）
  - 顯示恢復狀態的通知訊息
  - 處理恢復失敗的錯誤情況
-->
<script setup lang="ts">
import { onMounted } from 'vue';
import { useVideoStore } from '@/presentation/stores/videoStore';
import { useTranscriptStore } from '@/presentation/stores/transcriptStore';
import { useHighlightStore } from '@/presentation/stores/highlightStore';
import { useNotification } from '@/presentation/composables/useNotification';
import { container } from '@/di/container';
import type { CleanupSessionUseCase } from '@/application/use-cases/CleanupSessionUseCase';

// Stores
const videoStore = useVideoStore();
const transcriptStore = useTranscriptStore();
const highlightStore = useHighlightStore();

// Notification (此組件在 n-notification-provider 內部，可以安全使用)
const notification = useNotification();

// 在組件掛載時執行會話恢復或延遲清除
onMounted(async () => {
  try {
    // T011 (User Story 3) + T014 (User Story 1): 檢查 pendingCleanup 標記
    // 修復 v2: 從 localStorage 讀取（分頁關閉後仍保留）
    // 如果標記存在，表示上次關閉時預計要清除資料
    const hasPendingCleanup = localStorage.getItem('pendingCleanup') === 'true';

    if (hasPendingCleanup) {
      // T014: User Story 1 - 執行延遲清除邏輯
      console.log('[SessionRestorer] Pending cleanup detected, executing delayed cleanup');

      try {
        // 1. 執行 CleanupSessionUseCase（清除 IndexedDB 和 SessionStorage）
        const cleanupUseCase = container.resolve<CleanupSessionUseCase>('CleanupSessionUseCase');
        await cleanupUseCase.execute();

        // 2. T018: 清除 Store 狀態（記憶體）
        videoStore.clearSession();
        transcriptStore.clearSession();
        highlightStore.clearSession();

        console.log('[SessionRestorer] Delayed cleanup completed successfully');

        // 3. 清除成功，不顯示通知（使用者已經知道關閉時會清除）
        // 應用將保持在初始上傳畫面
      } catch (cleanupError) {
        // T019: 清除失敗，保留 pendingCleanup 標記以便下次重試
        console.error('[SessionRestorer] Delayed cleanup failed:', cleanupError);
        notification.error('清除會話資料失敗', '下次啟動時將重試');
        // 保留 pendingCleanup 標記（不移除），下次啟動時會再次嘗試
      }

      return; // 清除流程結束，不執行恢復
    }

    // 正常流程：嘗試恢復會話
    const sessionState = await videoStore.restoreSession();

    // 根據返回結果顯示通知
    if (sessionState) {
      notification.info('已恢復先前的編輯狀態');
    }

    // sessionState 為 null 時（首次訪問）不顯示任何訊息
  } catch (err) {
    // 資料不完整或其他錯誤
    notification.error('恢復會話失敗', '請重新上傳視頻');
    console.error('RestoreSession failed:', err);
  }
});
</script>

<template>
  <!-- 此組件無 UI，僅用於執行會話恢復邏輯 -->
  <div style="display: none"></div>
</template>
