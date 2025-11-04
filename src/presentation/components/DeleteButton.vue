<!--
  DeleteButton.vue
  刪除會話按鈕組件

  職責：
  - 提供刪除當前會話的按鈕 UI
  - 整合確認對話框(useDeleteConfirmation)
  - 調用 videoStore.deleteSession() 執行刪除
  - 根據 videoStore.video 判斷 disabled 狀態
  - 顯示刪除結果的通知訊息
-->
<script setup lang="ts">
import { computed } from 'vue';
import { NButton } from 'naive-ui';
import { useVideoStore } from '@/presentation/stores/videoStore';
import { useTranscriptStore } from '@/presentation/stores/transcriptStore';
import { useDeleteConfirmation } from '@/presentation/composables/useDeleteConfirmation';
import { useNotification } from '@/presentation/composables/useNotification';

// Props
interface Props {
  size?: 'tiny' | 'small' | 'medium' | 'large';
}

withDefaults(defineProps<Props>(), {
  size: 'medium'
});

// Store
const videoStore = useVideoStore();
const transcriptStore = useTranscriptStore();

// Composables
const { confirmDelete } = useDeleteConfirmation();
const notification = useNotification();

// Computed
const isDisabled = computed(() => !videoStore.video || transcriptStore.isProcessing);

// Methods
async function handleDelete() {
  confirmDelete(async () => {
    try {
      // 執行刪除
      const result = await videoStore.deleteSession();

      // 根據結果顯示通知
      if (result.success) {
        notification.success('會話已刪除', '所有資料已清除');
      } else {
        notification.error('刪除失敗', result.error || '請重試');
      }
    } catch (err) {
      console.error('Delete session error:', err);
      notification.error('刪除失敗', '發生未預期的錯誤');
    }
  });
}
</script>

<template>
  <NButton
    :size="size"
    :disabled="isDisabled"
    @click="handleDelete"
    type="error"
    secondary
  >
    刪除高光紀錄
  </NButton>
</template>
