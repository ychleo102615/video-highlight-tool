<!--
  SessionRestorer.vue
  會話恢復組件

  職責：
  - 在應用啟動時自動恢復會話
  - 顯示恢復狀態的通知訊息
  - 處理恢復失敗的錯誤情況
-->
<script setup lang="ts">
import { onMounted } from 'vue'
import { useVideoStore } from '@/presentation/stores/videoStore'
import { useNotification } from '@/presentation/composables/useNotification'

// Store
const videoStore = useVideoStore()

// Notification (此組件在 n-notification-provider 內部，可以安全使用)
const notification = useNotification()

// 在組件掛載時執行會話恢復
onMounted(async () => {
  try {
    const sessionState = await videoStore.restoreSession()

    // 根據返回結果顯示通知
    if (sessionState) {
      notification.info('已恢復先前的編輯狀態')
    }

    // sessionState 為 null 時（首次訪問）不顯示任何訊息
  } catch (err) {
    // 資料不完整或其他錯誤
    notification.error('恢復會話失敗', '請重新上傳視頻')
    console.error('RestoreSession failed:', err)
  }
})
</script>

<template>
  <!-- 此組件無 UI，僅用於執行會話恢復邏輯 -->
  <div style="display: none"></div>
</template>
