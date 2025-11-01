<script setup lang="ts">
import { computed } from 'vue'
import VideoUpload from '@/presentation/components/upload/VideoUpload.vue'
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
// Computed
// ========================================
const showUpload = computed(() => !videoStore.hasVideo)
const showProcessing = computed(() => transcriptStore.isProcessing)
const showHighlight = computed(() => highlightStore.hasHighlight)
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
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- 上傳區（未上傳視頻時顯示） -->
      <div v-if="showUpload">
        <VideoUpload />
      </div>

      <!-- 處理中狀態 -->
      <div v-else-if="showProcessing" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p class="mt-4 text-gray-600">正在處理轉錄內容...</p>
      </div>

      <!-- 高光編輯區（轉錄處理完成後顯示） -->
      <div v-else-if="showHighlight" class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4 text-gray-800">高光編輯</h2>
        <p class="text-gray-600">
          視頻已上傳成功！轉錄內容已處理完成，預設高光已建立。
        </p>
        <p class="text-sm text-gray-500 mt-2">
          選中的句子數量：{{ highlightStore.selectedSentenceIds.size }} / {{ transcriptStore.allSentences.length }}
        </p>
      </div>

      <!-- 其他狀態 -->
      <div v-else class="text-center py-12">
        <p class="text-gray-500">載入中...</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* App-specific styles */
</style>
