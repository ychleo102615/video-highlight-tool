<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { NNotificationProvider } from 'naive-ui';
import VideoUpload from '@/presentation/components/upload/VideoUpload.vue';
import EditingArea from '@/presentation/components/editing/EditingArea.vue';
import PreviewArea from '@/presentation/components/preview/PreviewArea.vue';
import SplitLayout from '@/presentation/components/layout/SplitLayout.vue';
import SessionRestorer from '@/presentation/components/SessionRestorer.vue';
import { useVideoStore } from '@/presentation/stores/videoStore';
import { useTranscriptStore } from '@/presentation/stores/transcriptStore';
import { useHighlightStore } from '@/presentation/stores/highlightStore';
import { useSessionCleanup } from '@/presentation/composables/useSessionCleanup';

// ========================================
// Stores
// ========================================
const videoStore = useVideoStore();
const transcriptStore = useTranscriptStore();
const highlightStore = useHighlightStore();

// ========================================
// Session Cleanup (User Story 3)
// ========================================
// T010: 整合 useSessionCleanup 以監聽瀏覽器事件
// 確保重整時不觸發清除邏輯（保護 session-restore 功能）
useSessionCleanup();

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

/**
 * 處理瀏覽器關閉/重新整理提示
 * 當有視頻上傳時提示使用者
 */
function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (videoStore.hasVideo) {
    e.preventDefault();
    // 現代瀏覽器會忽略自訂訊息，顯示預設提示
    // e.returnValue = ''
  }
}

// ========================================
// Lifecycle
// ========================================

onMounted(() => {
  // 註冊瀏覽器關閉/重新整理提示
  window.addEventListener('beforeunload', handleBeforeUnload);
});

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
});
</script>

<template>
  <!-- 通知系統容器 -->
  <n-notification-provider>
    <!-- 會話恢復組件（無 UI，僅執行邏輯） -->
    <SessionRestorer />

    <div class="app min-h-screen bg-gray-50">
      <!-- Header -->
      <header class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 class="text-3xl font-bold text-gray-900">視頻高光編輯工具</h1>
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
  </n-notification-provider>
</template>

<style scoped>
/* App-specific styles */
</style>
