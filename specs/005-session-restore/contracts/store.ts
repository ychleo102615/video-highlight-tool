/**
 * Store Contract Extensions
 *
 * 定義會話恢復功能所需的 Store 介面擴充
 */

import type { Video } from '@/domain/aggregates/Video';
import type { Transcript } from '@/domain/aggregates/Transcript/Transcript';
import type { Highlight } from '@/domain/aggregates/Highlight';

/**
 * VideoStore 擴充
 *
 * 新增會話恢復 action
 */
export interface IVideoStore {
  // === 現有 State ===
  video: Video | null;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;

  // === 現有 Getters ===
  hasVideo: boolean;
  isReady: boolean;
  videoUrl: string | undefined;
  duration: number;

  // === 現有 Actions ===
  uploadVideo(videoFile: File, transcriptFile?: File): Promise<void>;
  clearVideo(): void;

  /**
   * [NEW] 恢復會話
   *
   * 流程:
   * 1. 調用 RestoreSessionUseCase.execute()
   * 2. 若返回 null，表示無會話資料，正常啟動（不顯示訊息）
   * 3. 若返回 SessionState，更新 Store 狀態：
   *    - 更新 videoStore.video
   *    - 更新 transcriptStore (調用 setTranscript)
   *    - 更新 highlightStore (調用 setHighlights)
   * 4. 根據 needsReupload 顯示不同提示：
   *    - needsReupload = false: showInfo('已恢復先前的編輯狀態')
   *    - needsReupload = true: showInfo('偵測到先前的編輯內容，請重新上傳視頻以繼續編輯')
   * 5. 若發生錯誤（資料不完整），捕獲並顯示: showError('恢復會話失敗，請重新上傳視頻')
   *
   * 調用時機:
   * - App.vue onMounted() 時自動調用
   *
   * 錯誤處理:
   * - 不拋出例外，所有錯誤內部捕獲並顯示訊息
   * - 錯誤不阻塞應用正常啟動
   *
   * @returns Promise<void>
   */
  restoreSession(): Promise<void>;
}

/**
 * TranscriptStore 擴充（若需要）
 *
 * 需確認是否已存在 setTranscript() 方法
 */
export interface ITranscriptStore {
  // === 現有 State ===
  transcript: Transcript | null;
  isProcessing: boolean;
  error: string | null;

  // === 現有 Actions ===
  processTranscript(videoId: string): Promise<void>;

  /**
   * [NEW or VERIFY] 設定轉錄
   *
   * 用於會話恢復時直接設定轉錄內容，而不經過 AI 處理流程
   *
   * @param transcript - Transcript Entity
   */
  setTranscript(transcript: Transcript): void;
}

/**
 * HighlightStore 擴充（若需要）
 *
 * 需確認是否已存在 setHighlights() 方法
 */
export interface IHighlightStore {
  // === 現有 State ===
  highlights: Highlight[];
  currentHighlight: Highlight | null;

  // === 現有 Actions ===
  createHighlight(videoId: string, name: string): Promise<void>;
  toggleSentence(sentenceId: string): Promise<void>;

  /**
   * [NEW or VERIFY] 設定高光
   *
   * 用於會話恢復時直接設定高光內容
   *
   * @param highlights - Highlight Entity 陣列
   */
  setHighlights(highlights: Highlight[]): void;
}

/**
 * Store 使用範例
 */
export const storeUsageExample = `
// App.vue
<script setup lang="ts">
import { onMounted } from 'vue';
import { useVideoStore } from '@/presentation/stores/videoStore';

const videoStore = useVideoStore();

onMounted(async () => {
  // 應用啟動時自動恢復會話
  await videoStore.restoreSession();
});
</script>
`;
