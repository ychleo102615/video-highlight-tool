import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Video } from '@/domain/aggregates/Video';
import type { UploadVideoUseCase } from '@/application/use-cases/UploadVideoUseCase';
import type { UploadVideoWithMockTranscriptUseCase } from '@/application/use-cases/UploadVideoWithMockTranscriptUseCase';
import type {
  RestoreSessionUseCase,
  RestoreSessionResult
} from '@/application/use-cases/RestoreSessionUseCase';
import type { IDeleteSessionUseCase } from '@/application/use-cases/DeleteSessionUseCase';
import type { DeleteSessionResultDTO } from '@/application/dto/DeleteSessionResultDTO';
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
  const deleteSessionUseCase = container.resolve<IDeleteSessionUseCase>('DeleteSessionUseCase');

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
   * 重置 store 到初始狀態（用於會話刪除）
   */
  function reset(): void {
    video.value = null;
    isUploading.value = false;
    uploadProgress.value = 0;
    error.value = null;
  }

  /**
   * 刪除當前會話的所有資料
   * User Story 1: 手動刪除當前會話資料
   * - 調用 DeleteSessionUseCase 刪除 IndexedDB 和 sessionStorage
   * - 依序重置所有 stores (highlight → transcript → video)
   * - 返回刪除結果供 UI 顯示通知
   *
   * @returns Promise<DeleteSessionResultDTO> - 刪除結果
   */
  async function deleteSession(): Promise<DeleteSessionResultDTO> {
    try {
      // 1. 執行刪除 Use Case (刪除 IndexedDB 和 sessionStorage)
      const result = await deleteSessionUseCase.execute();

      // 2. 若刪除失敗,直接返回錯誤結果
      if (!result.success) {
        return result;
      }

      // 3. 刪除成功後,依序重置所有 stores (依賴方到獨立方)
      const highlightStore = useHighlightStore();
      highlightStore.reset();

      const transcriptStore = useTranscriptStore();
      transcriptStore.reset();

      reset();

      // 4. 返回成功結果
      return { success: true };
    } catch (err) {
      // 5. 捕獲意外錯誤
      console.error('Unexpected error in videoStore.deleteSession:', err);
      return {
        success: false,
        error: '刪除會話時發生未預期的錯誤'
      };
    }
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
    reset,
    deleteSession
  };
});
