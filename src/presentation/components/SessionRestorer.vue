<!--
  SessionRestorer.vue
  會話恢復組件

  職責：
  - 在應用啟動時自動恢復會話
  - 顯示恢復狀態的通知訊息
  - 處理恢復失敗的錯誤情況
-->
<script setup lang="ts">
import { onMounted } from 'vue';
import { useVideoStore } from '@/presentation/stores/videoStore';
import { useNotification } from '@/presentation/composables/useNotification';

// Store
const videoStore = useVideoStore();

// Notification (此組件在 n-notification-provider 內部，可以安全使用)
const notification = useNotification();

// 在組件掛載時執行會話恢復
onMounted(async () => {
  try {
    // T011 (User Story 3): 檢查 pendingCleanup 標記
    // 如果標記存在，表示上次關閉時預計要清除資料
    // User Story 1 將實作完整的延遲清除邏輯
    // User Story 3 僅確保有此標記時不嘗試恢復會話
    const hasPendingCleanup = sessionStorage.getItem('pendingCleanup') === 'true';

    if (hasPendingCleanup) {
      // 有待清除標記，不執行恢復
      // User Story 1 將在這裡實作實際的清除邏輯
      console.log('[SessionRestorer] Pending cleanup detected, skipping session restore');
      return;
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
