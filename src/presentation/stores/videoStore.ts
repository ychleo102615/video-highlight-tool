import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Video } from '@/domain/aggregates/Video';
import type { UploadVideoUseCase } from '@/application/use-cases/UploadVideoUseCase';
import type { UploadVideoWithMockTranscriptUseCase } from '@/application/use-cases/UploadVideoWithMockTranscriptUseCase';
import type {
  RestoreSessionUseCase,
  RestoreSessionResult
} from '@/application/use-cases/RestoreSessionUseCase';
import { container } from '@/di/container';
// Store contracts 型別已在檔案中直接實作，不需要額外導入
// import type {
//   VideoStoreState,
//   VideoStoreGetters,
//   VideoStoreActions
// } from '@/presentation/types/store-contracts'
import { useTranscriptStore } from './transcriptStore';
import { useHighlightStore } from './highlightStore';

export const useVideoStore = defineStore('video', () => {
  // ========================================
  // State
  // ========================================
  const video = ref<Video | null>(null);
  const isUploading = ref(false);
  const uploadProgress = ref(0);
  const error = ref<string | null>(null);

  // ========================================
  // Getters
  // ========================================
  const hasVideo = computed(() => video.value !== null);
  const isReady = computed(() => video.value?.isReady ?? false);
  const videoUrl = computed(() => video.value?.url);
  const duration = computed(() => video.value?.duration ?? 0);

  // ========================================
  // Use Case 注入
  // ========================================
  const uploadVideoUseCase = container.resolve<UploadVideoUseCase>('UploadVideoUseCase');
  const uploadWithMockUseCase = container.resolve<UploadVideoWithMockTranscriptUseCase>(
    'UploadVideoWithMockTranscriptUseCase'
  );
  const restoreSessionUseCase = container.resolve<RestoreSessionUseCase>('RestoreSessionUseCase');

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
      isUploading.value = true;
      uploadProgress.value = 0;
      error.value = null;

      // 根據是否有轉錄檔案選擇不同的 Use Case
      let uploadedVideo: Video;

      if (transcriptFile) {
        // 使用 UploadVideoWithMockTranscriptUseCase
        // Use Case 內部會讀取 JSON 並調用 setMockData 進行驗證
        uploadedVideo = await uploadWithMockUseCase.execute(
          videoFile,
          transcriptFile,
          (progress: number) => {
            uploadProgress.value = progress;
          }
        );
      } else {
        // 使用標準 UploadVideoUseCase
        uploadedVideo = await uploadVideoUseCase.execute(videoFile, (progress: number) => {
          uploadProgress.value = progress;
        });
      }

      video.value = uploadedVideo;

      // 視頻上傳完成後,觸發轉錄處理
      const transcriptStore = useTranscriptStore();
      await transcriptStore.processTranscript(uploadedVideo.id);

      uploadProgress.value = 100;
    } catch (err) {
      error.value = (err as Error).message;
      throw err;
    } finally {
      isUploading.value = false;
    }
  }

  /**
   * 清除視頻
   */
  function clearVideo(): void {
    video.value = null;
    uploadProgress.value = 0;
    error.value = null;
  }

  /**
   * 恢復會話
   * User Story 1: 小視頻完整恢復
   * - 在應用啟動時自動執行
   * - 檢查 IndexedDB 和 SessionStorage 是否有先前的編輯狀態
   * - 若存在會話資料，恢復 Video、Transcript、Highlight 狀態
   *
   * @returns Promise<RestoreSessionResult | null | Error>
   *   - RestoreSessionResult: 成功恢復會話
   *   - null: 無會話資料（首次訪問）
   *   - Error: 恢復失敗
   */
  async function restoreSession(): Promise<RestoreSessionResult | null> {
    // 執行會話恢復 Use Case
    const sessionState = await restoreSessionUseCase.execute();

    // 若無會話資料（首次訪問或已清除），靜默返回
    if (!sessionState) {
      return null;
    }

    // 更新 videoStore 狀態
    video.value = sessionState.video;

    // 更新 transcriptStore 狀態
    const transcriptStore = useTranscriptStore();
    transcriptStore.setTranscript(sessionState.transcript);

    // 更新 highlightStore 狀態
    const highlightStore = useHighlightStore();
    highlightStore.setHighlights(sessionState.highlights);

    // 返回會話狀態，由調用方決定如何顯示通知
    return sessionState;
  }

  /**
   * T015: 清除會話 (User Story 1)
   * 清除 Store 中的所有會話狀態（記憶體）
   *
   * 職責:
   * - 僅清除記憶體中的狀態
   * - 不直接操作 IndexedDB（由 CleanupSessionUseCase 負責）
   *
   * 呼叫時機:
   * - SessionRestorer 執行延遲清除後
   * - 手動刪除會話後（User Story 2）
   */
  function clearSession(): void {
    video.value = null;
    isUploading.value = false;
    uploadProgress.value = 0;
    error.value = null;
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
    clearVideo,
    restoreSession,
    clearSession
  };
});
