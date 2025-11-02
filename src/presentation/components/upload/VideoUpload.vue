<script setup lang="ts">
import { ref } from 'vue'
import { useVideoUpload } from '@/presentation/composables/useVideoUpload'
import { useNotification } from '@/presentation/composables/useNotification'
import { CloudArrowUpIcon } from '@heroicons/vue/24/solid'
import { NButton, NProgress } from 'naive-ui'

// ========================================
// Composable
// ========================================
const { isUploading, uploadProgress, error, uploadVideo } = useVideoUpload()
const notification = useNotification()

// ========================================
// Local State
// ========================================
const videoFileInput = ref<HTMLInputElement | null>(null)
const transcriptFileInput = ref<HTMLInputElement | null>(null)
const selectedVideoFile = ref<File | null>(null)
const selectedTranscriptFile = ref<File | null>(null)

// ========================================
// Constants
// ========================================
const SUPPORTED_VIDEO_FORMATS = ['video/mp4', 'video/quicktime', 'video/webm']
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

// ========================================
// Methods
// ========================================

/**
 * 觸發視頻文件選擇
 */
function triggerVideoFileSelect() {
  videoFileInput.value?.click()
}

/**
 * 觸發轉錄文件選擇
 */
function triggerTranscriptFileSelect() {
  transcriptFileInput.value?.click()
}

/**
 * 處理視頻文件選擇
 */
function handleVideoFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

  // 驗證文件格式
  if (!SUPPORTED_VIDEO_FORMATS.includes(file.type)) {
    notification.error('不支援的視頻格式', '請選擇 MP4、MOV 或 WEBM 格式')
    return
  }

  // 驗證文件大小
  if (file.size > MAX_FILE_SIZE) {
    notification.error('文件大小超過限制', '文件大小不可超過 100MB')
    return
  }

  selectedVideoFile.value = file
}

/**
 * 處理轉錄文件選擇
 */
function handleTranscriptFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

  // 驗證文件格式
  if (!file.name.endsWith('.json')) {
    notification.error('格式錯誤', '請選擇 JSON 格式的轉錄檔案')
    return
  }

  selectedTranscriptFile.value = file
}

/**
 * 開始上傳
 */
async function handleUpload() {
  if (!selectedVideoFile.value) {
    notification.warning('缺少視頻檔案', '請選擇視頻檔案')
    return
  }

  if (!selectedTranscriptFile.value) {
    notification.warning('缺少轉錄檔案', '請選擇轉錄檔案')
    return
  }

  try {
    await uploadVideo(selectedVideoFile.value, selectedTranscriptFile.value)
    notification.success('上傳成功', '視頻已成功上傳並開始處理')

    // 上傳成功，清除選擇
    selectedVideoFile.value = null
    selectedTranscriptFile.value = null

    if (videoFileInput.value) videoFileInput.value.value = ''
    if (transcriptFileInput.value) transcriptFileInput.value.value = ''
  } catch (err) {
    notification.error('上傳失敗', (err as Error).message || '視頻上傳過程中發生錯誤')
  }
}

/**
 * 清除選擇的轉錄文件
 */
function clearTranscriptFile() {
  selectedTranscriptFile.value = null
  if (transcriptFileInput.value) transcriptFileInput.value.value = ''
}
</script>

<template>
  <div class="video-upload p-6 bg-white rounded-lg shadow-md">
    <h2 class="text-2xl font-bold mb-4 text-gray-800">上傳視頻</h2>

    <!-- 錯誤訊息 -->
    <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
      {{ error }}
    </div>

    <!-- 視頻文件選擇 -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">視頻檔案 *</label>
      <input
        ref="videoFileInput"
        type="file"
        :accept="SUPPORTED_VIDEO_FORMATS.join(',')"
        class="hidden"
        @change="handleVideoFileChange"
      />
      <div class="flex items-center gap-3">
        <NButton type="primary" @click="triggerVideoFileSelect" :disabled="isUploading">
          <template #icon>
            <CloudArrowUpIcon class="w-5 h-5" />
          </template>
          選擇視頻
        </NButton>
        <span v-if="selectedVideoFile" class="text-sm text-gray-600">
          {{ selectedVideoFile.name }} ({{ (selectedVideoFile.size / 1024 / 1024).toFixed(2) }} MB)
        </span>
      </div>
      <p class="mt-1 text-xs text-gray-500">支援格式：MP4, MOV, WEBM（最大 100MB）</p>
    </div>

    <!-- 轉錄文件選擇 -->
    <div class="mb-6">
      <label class="block text-sm font-medium text-gray-700 mb-2">轉錄檔案 *</label>
      <input
        ref="transcriptFileInput"
        type="file"
        accept=".json,application/json"
        class="hidden"
        @change="handleTranscriptFileChange"
      />
      <div class="flex items-center gap-3">
        <NButton @click="triggerTranscriptFileSelect" :disabled="isUploading">
          選擇 JSON
        </NButton>
        <span v-if="selectedTranscriptFile" class="text-sm text-gray-600 flex items-center gap-2">
          {{ selectedTranscriptFile.name }}
          <button
            @click="clearTranscriptFile"
            class="text-red-500 hover:text-red-700"
            :disabled="isUploading"
          >
            ✕
          </button>
        </span>
      </div>
    </div>

    <!-- 上傳按鈕 -->
    <div class="mb-4">
      <NButton
        type="primary"
        size="large"
        :loading="isUploading"
        :disabled="!selectedVideoFile || !selectedTranscriptFile || isUploading"
        @click="handleUpload"
        class="w-full lg:w-auto"
      >
        {{ isUploading ? '上傳中...' : '開始上傳' }}
      </NButton>
    </div>

    <!-- 上傳進度 -->
    <div v-if="isUploading" class="mb-4">
      <NProgress
        type="line"
        :percentage="uploadProgress"
        :show-indicator="true"
        :status="uploadProgress === 100 ? 'success' : 'default'"
      />
      <p class="text-sm text-gray-600 mt-2">上傳進度：{{ uploadProgress }}%</p>
    </div>
  </div>
</template>

<style scoped>
/* 組件特定樣式（如需要） */
</style>
