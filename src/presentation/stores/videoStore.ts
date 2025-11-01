import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Video } from '@/domain/aggregates/Video'
import type { UploadVideoUseCase } from '@/application/use-cases/UploadVideoUseCase'
import type { UploadVideoWithMockTranscriptUseCase } from '@/application/use-cases/UploadVideoWithMockTranscriptUseCase'
import type { TranscriptDTO } from '@/application/dto/TranscriptDTO'
import { container } from '@/di/container'
import type {
  VideoStoreState,
  VideoStoreGetters,
  VideoStoreActions
} from '@/presentation/types/store-contracts'
import { useTranscriptStore } from './transcriptStore'

export const useVideoStore = defineStore('video', () => {
  // ========================================
  // State
  // ========================================
  const video = ref<Video | null>(null)
  const isUploading = ref(false)
  const uploadProgress = ref(0)
  const error = ref<string | null>(null)

  // ========================================
  // Getters
  // ========================================
  const hasVideo = computed(() => video.value !== null)
  const isReady = computed(() => video.value?.isReady ?? false)
  const videoUrl = computed(() => video.value?.url)
  const duration = computed(() => video.value?.duration ?? 0)

  // ========================================
  // Use Case 注入
  // ========================================
  const uploadVideoUseCase = container.resolve<UploadVideoUseCase>('UploadVideoUseCase')
  const uploadWithMockUseCase = container.resolve<UploadVideoWithMockTranscriptUseCase>(
    'UploadVideoWithMockTranscriptUseCase'
  )

  // ========================================
  // Actions
  // ========================================

  /**
   * 上傳視頻（可選擇性上傳轉錄 JSON）
   * @param videoFile 視頻檔案
   * @param transcriptFile 可選的轉錄 JSON 檔案
   */
  async function uploadVideo(videoFile: File, transcriptFile?: File): Promise<void> {
    try {
      isUploading.value = true
      uploadProgress.value = 0
      error.value = null

      // 如果有轉錄檔案,解析並使用 UploadVideoWithMockTranscriptUseCase
      if (transcriptFile) {
        const transcriptData = await parseTranscriptFile(transcriptFile)
        const uploadedVideo = await uploadWithMockUseCase.execute(
          videoFile,
          transcriptData,
          (progress: number) => {
            uploadProgress.value = progress
          }
        )
        video.value = uploadedVideo

        // 視頻上傳完成後,觸發轉錄處理
        const transcriptStore = useTranscriptStore()
        await transcriptStore.processTranscript(uploadedVideo.id)
      } else {
        // 否則使用標準 UploadVideoUseCase
        const uploadedVideo = await uploadVideoUseCase.execute(videoFile, (progress: number) => {
          uploadProgress.value = progress
        })
        video.value = uploadedVideo

        // 視頻上傳完成後,觸發轉錄處理
        const transcriptStore = useTranscriptStore()
        await transcriptStore.processTranscript(uploadedVideo.id)
      }

      uploadProgress.value = 100
    } catch (err) {
      error.value = (err as Error).message
      throw err
    } finally {
      isUploading.value = false
    }
  }

  /**
   * 清除視頻
   */
  function clearVideo(): void {
    video.value = null
    uploadProgress.value = 0
    error.value = null
  }

  /**
   * 解析轉錄 JSON 檔案
   * @param file 轉錄 JSON 檔案
   */
  async function parseTranscriptFile(file: File): Promise<TranscriptDTO> {
    const text = await file.text()
    try {
      return JSON.parse(text) as TranscriptDTO
    } catch (err) {
      throw new Error('轉錄 JSON 檔案格式錯誤')
    }
  }

  // ========================================
  // Return
  // ========================================
  return {
    // State
    video,
    isUploading,
    uploadProgress,
    error,
    // Getters
    hasVideo,
    isReady,
    videoUrl,
    duration,
    // Actions
    uploadVideo,
    clearVideo
  }
})
