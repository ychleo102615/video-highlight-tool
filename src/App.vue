<script setup lang="ts">
import { computed, ref } from 'vue'
import VideoUpload from '@/presentation/components/upload/VideoUpload.vue'
import EditingArea from '@/presentation/components/editing/EditingArea.vue'
import PreviewArea from '@/presentation/components/preview/PreviewArea.vue'
import { useVideoStore } from '@/presentation/stores/videoStore'
import { useTranscriptStore } from '@/presentation/stores/transcriptStore'
import { useHighlightStore } from '@/presentation/stores/highlightStore'

// ========================================
// Stores
// ========================================
const videoStore = useVideoStore()
const transcriptStore = useTranscriptStore()
const highlightStore = useHighlightStore()

// ========================================
// Refs
// ========================================
/** 用於編輯區 → 預覽區同步的 seek 時間 */
const seekTime = ref<number | null>(null)

// ========================================
// Computed
// ========================================
const showUpload = computed(() => !videoStore.hasVideo)
const showProcessing = computed(() => transcriptStore.isProcessing)
const showMainContent = computed(() => transcriptStore.hasTranscript && highlightStore.hasHighlight)

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
  seekTime.value = time
  // 重置為 null，以便下次相同時間也能觸發（例如連續點擊同一個時間戳）
  setTimeout(() => {
    seekTime.value = null
  }, 100)
}
</script>

<template>
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

      <!-- 主內容區：編輯區 + 預覽區（左右分屏） -->
      <div v-else-if="showMainContent" class="flex flex-col lg:flex-row h-full">
        <!-- 編輯區：移動端 50vh，桌面端 50% 寬度 -->
        <div class="h-1/2 lg:h-full lg:w-1/2 overflow-hidden border-b lg:border-b-0 lg:border-r border-gray-200">
          <EditingArea @seek-to-time="handleSeekToTime" />
        </div>

        <!-- 預覽區：移動端 50vh，桌面端 50% 寬度 -->
        <div class="h-1/2 lg:h-full lg:w-1/2 overflow-hidden">
          <PreviewArea :seek-time="seekTime" />
        </div>
      </div>

      <!-- 其他狀態 -->
      <div v-else class="flex items-center justify-center h-full">
        <p class="text-gray-500">載入中...</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* App-specific styles */
</style>
