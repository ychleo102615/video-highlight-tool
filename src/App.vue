<script setup lang="ts">
import { computed, ref } from 'vue';
import { NNotificationProvider, NDialogProvider } from 'naive-ui';
import VideoUpload from '@/presentation/components/upload/VideoUpload.vue';
import EditingArea from '@/presentation/components/editing/EditingArea.vue';
import PreviewArea from '@/presentation/components/preview/PreviewArea.vue';
import SplitLayout from '@/presentation/components/layout/SplitLayout.vue';
import SessionRestorer from '@/presentation/components/SessionRestorer.vue';
import DeleteButton from '@/presentation/components/DeleteButton.vue';
import { useVideoStore } from '@/presentation/stores/videoStore';
import { useTranscriptStore } from '@/presentation/stores/transcriptStore';
import { useHighlightStore } from '@/presentation/stores/highlightStore';

// ========================================
// Stores
// ========================================
const videoStore = useVideoStore();
const transcriptStore = useTranscriptStore();
const highlightStore = useHighlightStore();

// ========================================
// Refs
// ========================================
/** 用於編輯區 → 預覽區同步的 seek 時間 */
const seekTime = ref<number | null>(null);

// ========================================
// Computed
// ========================================
const showUpload = computed(() => !videoStore.hasVideo);
const showProcessing = computed(() => transcriptStore.isProcessing);
const showMainContent = computed(
  () => transcriptStore.hasTranscript && highlightStore.hasHighlight
);

// ========================================
// Event Handlers
// ========================================

/**
 * 處理編輯區的時間跳轉請求
 * User Story 6: 編輯區 → 預覽區同步
 * @param time 時間（秒數）
 */
function handleSeekToTime(time: number) {
  // 更新 seekTime，觸發 PreviewArea 的 watch
  seekTime.value = time;
  // 重置為 null，以便下次相同時間也能觸發（例如連續點擊同一個時間戳）
  setTimeout(() => {
    seekTime.value = null;
  }, 100);
}

</script>

<template>
  <!-- 通知系統容器 -->
  <n-notification-provider>
    <!-- 對話框容器 -->
    <n-dialog-provider>
      <!-- 會話恢復組件（無 UI，僅執行邏輯） -->
      <SessionRestorer />

    <div class="app min-h-screen bg-gray-50">
      <!-- Header -->
      <header class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div class="flex items-center justify-between gap-4">
            <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">視頻高光編輯工具</h1>
            <div class="flex items-center gap-3">
              <DeleteButton size="small" />
              <p class="hidden md:block text-xs text-gray-500 max-w-xs">
                系統會在應用啟動時自動清理超過 24 小時的會話資料
              </p>
            </div>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="h-[calc(100vh-5rem)]">
        <!-- 上傳區（未上傳視頻時顯示） -->
        <div v-if="showUpload" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <VideoUpload />
        </div>

        <!-- 處理中狀態 -->
        <div v-else-if="showProcessing" class="flex items-center justify-center h-full">
          <div class="text-center">
            <div
              class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"
            ></div>
            <p class="mt-4 text-gray-600">正在處理轉錄內容...</p>
          </div>
        </div>

        <!-- 主內容區：編輯區 + 預覽區（使用 SplitLayout） -->
        <SplitLayout v-if="showMainContent">
          <!-- 左側/上方：編輯區 -->
          <template #left>
            <EditingArea @seek-to-time="handleSeekToTime" />
          </template>

          <!-- 右側/下方：預覽區 -->
          <template #right>
            <PreviewArea :seek-time="seekTime" />
          </template>
        </SplitLayout>
      </main>
    </div>
    </n-dialog-provider>
  </n-notification-provider>
</template>

<style scoped>
/* App-specific styles */
</style>
