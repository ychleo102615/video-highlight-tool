import { computed, readonly } from 'vue';
import { useVideoStore } from '@/presentation/stores/videoStore';

/**
 * useVideoUpload Composable
 *
 * 職責:
 * - 封裝視頻上傳的狀態和邏輯
 * - 內部呼叫 videoStore.uploadVideo()
 * - 提供響應式的上傳狀態供組件使用
 */
export function useVideoUpload() {
  const videoStore = useVideoStore();

  // ========================================
  // Reactive State (從 Store 取得)
  // ========================================
  const isUploading = computed(() => videoStore.isUploading);
  const uploadProgress = computed(() => videoStore.uploadProgress);
  const error = computed(() => videoStore.error);

  // ========================================
  // Actions
  // ========================================

  /**
   * 上傳視頻（可選擇性上傳轉錄 JSON）
   * @param videoFile 視頻檔案
   * @param transcriptFile 可選的轉錄 JSON 檔案
   */
  async function uploadVideo(videoFile: File, transcriptFile?: File): Promise<void> {
    await videoStore.uploadVideo(videoFile, transcriptFile);
  }

  // ========================================
  // Return
  // ========================================
  return {
    isUploading: readonly(isUploading),
    uploadProgress: readonly(uploadProgress),
    error: readonly(error),
    uploadVideo
  };
}
