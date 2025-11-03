/**
 * CleanupSessionUseCase Contract Definition
 *
 * 此檔案定義 CleanupSessionUseCase 的完整型別合約和使用規範，
 * 確保 Application Layer 和 Presentation Layer 的介面一致性。
 *
 * Version: 1.0.0
 * Feature: 006-session-cleanup
 */

/**
 * CleanupSessionUseCase - 會話清除 Use Case
 *
 * 職責：
 * - 協調 ISessionRepository 執行會話清除
 * - 清除 SessionStorage 中的標記
 * - 提供統一的錯誤處理
 *
 * 呼叫時機：
 * 1. 使用者手動點擊「刪除此會話」按鈕（立即執行）
 * 2. 應用啟動時檢測到 `pendingCleanup` 標記（延遲執行）
 *
 * 注意事項：
 * - Use Case 不知道 Store 的存在（單向依賴）
 * - Store 在 Use Case 執行後自行清除狀態
 * - Use Case 執行時間 < 1s（規格要求）
 */
export interface ICleanupSessionUseCase {
  /**
   * 執行會話清除
   *
   * 清除內容：
   * 1. IndexedDB：videos, transcripts, highlights Object Store
   * 2. SessionStorage：sessionId, pendingCleanup, isClosing
   *
   * 執行流程：
   * 1. 呼叫 sessionRepo.deleteAllSessionData()（原子性刪除）
   * 2. 清除 SessionStorage（即使失敗也不影響主流程）
   * 3. 返回成功或拋出錯誤
   *
   * 錯誤處理：
   * - IndexedDB 刪除失敗 → 拋出 SessionCleanupError
   * - SessionStorage 清除失敗 → 僅記錄警告（不拋出錯誤）
   *
   * 效能要求：
   * - 執行時間 < 1s（規格 SC-002）
   * - 應並行執行 IndexedDB 和 SessionStorage 清除（實際上 SessionStorage 同步）
   *
   * @throws {SessionCleanupError} 當 IndexedDB 刪除失敗時
   *
   * @example
   * ```typescript
   * // 在 Store 中使用
   * const cleanupUseCase = inject<CleanupSessionUseCase>('cleanupSessionUseCase');
   *
   * async function handleManualDelete() {
   *   try {
   *     await cleanupUseCase.execute();
   *     // 清除 Store 狀態
   *     videoStore.clearSession();
   *     transcriptStore.clearSession();
   *     highlightStore.clearSession();
   *     // 導航至首頁
   *     router.replace('/');
   *   } catch (error) {
   *     if (error instanceof SessionCleanupError) {
   *       showNotification('清除失敗，請稍後重試');
   *     }
   *   }
   * }
   * ```
   */
  execute(): Promise<void>;
}

/**
 * Use Case 實作範例
 *
 * ```typescript
 * // application/use-cases/CleanupSessionUseCase.ts
 * import type { ISessionRepository } from '@/domain/repositories/ISessionRepository';
 * import { SessionCleanupError } from '@/application/errors/SessionCleanupError';
 *
 * export class CleanupSessionUseCase implements ICleanupSessionUseCase {
 *   constructor(private sessionRepo: ISessionRepository) {}
 *
 *   async execute(): Promise<void> {
 *     try {
 *       // 1. 刪除 IndexedDB 資料（原子性操作）
 *       await this.sessionRepo.deleteAllSessionData();
 *
 *       // 2. 清除 SessionStorage（即使失敗也不影響主流程）
 *       try {
 *         sessionStorage.removeItem('sessionId');
 *         sessionStorage.removeItem('pendingCleanup');
 *         sessionStorage.removeItem('isClosing');
 *       } catch (error) {
 *         console.warn('Failed to clear SessionStorage:', error);
 *       }
 *
 *     } catch (error) {
 *       // 如果已是 SessionCleanupError，直接拋出
 *       if (error instanceof SessionCleanupError) {
 *         throw error;
 *       }
 *       // 否則包裝為 SessionCleanupError
 *       throw new SessionCleanupError(
 *         'Failed to cleanup session data',
 *         { cause: error }
 *       );
 *     }
 *   }
 * }
 * ```
 */

/**
 * Store 使用範例
 *
 * ```typescript
 * // presentation/stores/videoStore.ts
 * import { inject } from 'vue';
 * import type { CleanupSessionUseCase } from '@/application/use-cases/CleanupSessionUseCase';
 *
 * export const useVideoStore = defineStore('video', () => {
 *   const video = ref<Video | null>(null);
 *   const cleanupUseCase = inject<CleanupSessionUseCase>('cleanupSessionUseCase');
 *
 *   async function clearSession() {
 *     // 僅清除 Store 狀態（不直接呼叫 Repository）
 *     video.value = null;
 *   }
 *
 *   return { video, clearSession };
 * });
 * ```
 */

/**
 * Composable 使用範例
 *
 * ```typescript
 * // presentation/composables/useSessionCleanup.ts
 * import { inject } from 'vue';
 * import { useRouter } from 'vue-router';
 * import type { CleanupSessionUseCase } from '@/application/use-cases/CleanupSessionUseCase';
 * import { useVideoStore } from '@/presentation/stores/videoStore';
 * import { useTranscriptStore } from '@/presentation/stores/transcriptStore';
 * import { useHighlightStore } from '@/presentation/stores/highlightStore';
 * import { useNotification } from '@/presentation/composables/useNotification';
 *
 * export function useSessionCleanup() {
 *   const cleanupUseCase = inject<CleanupSessionUseCase>('cleanupSessionUseCase')!;
 *   const router = useRouter();
 *   const videoStore = useVideoStore();
 *   const transcriptStore = useTranscriptStore();
 *   const highlightStore = useHighlightStore();
 *   const { showError, showSuccess } = useNotification();
 *
 *   // 手動清除（使用者點擊按鈕）
 *   async function handleManualDelete() {
 *     try {
 *       // 1. 執行 Use Case
 *       await cleanupUseCase.execute();
 *
 *       // 2. 清除 Store 狀態
 *       videoStore.clearSession();
 *       transcriptStore.clearSession();
 *       highlightStore.clearSession();
 *
 *       // 3. 導航至首頁（使用 replace 阻止「上一頁」）
 *       router.replace('/');
 *
 *       // 4. 顯示成功訊息
 *       showSuccess('會話已成功刪除');
 *
 *     } catch (error) {
 *       if (error instanceof SessionCleanupError) {
 *         showError('清除失敗，請稍後重試');
 *       } else {
 *         showError('發生未預期的錯誤');
 *       }
 *     }
 *   }
 *
 *   // beforeunload 處理（分頁關閉時）
 *   const handleBeforeUnload = (e: BeforeUnloadEvent) => {
 *     // 設定標記
 *     sessionStorage.setItem('pendingCleanup', 'true');
 *
 *     // 顯示確認對話框
 *     e.preventDefault();
 *     e.returnValue = '';
 *   };
 *
 *   onMounted(() => {
 *     window.addEventListener('beforeunload', handleBeforeUnload);
 *   });
 *
 *   onUnmounted(() => {
 *     window.removeEventListener('beforeunload', handleBeforeUnload);
 *   });
 *
 *   return {
 *     handleManualDelete
 *   };
 * }
 * ```
 */

/**
 * App.vue 使用範例（延遲清除）
 *
 * ```typescript
 * // App.vue
 * <script setup lang="ts">
 * import { onMounted, inject } from 'vue';
 * import type { CleanupSessionUseCase } from '@/application/use-cases/CleanupSessionUseCase';
 * import type { RestoreSessionUseCase } from '@/application/use-cases/RestoreSessionUseCase';
 * import { useVideoStore } from '@/presentation/stores/videoStore';
 * import { useTranscriptStore } from '@/presentation/stores/transcriptStore';
 * import { useHighlightStore } from '@/presentation/stores/highlightStore';
 *
 * const cleanupUseCase = inject<CleanupSessionUseCase>('cleanupSessionUseCase')!;
 * const restoreUseCase = inject<RestoreSessionUseCase>('restoreSessionUseCase')!;
 * const videoStore = useVideoStore();
 * const transcriptStore = useTranscriptStore();
 * const highlightStore = useHighlightStore();
 *
 * onMounted(async () => {
 *   // 1. 優先檢查是否有待清理的標記（延遲刪除）
 *   const pendingCleanup = sessionStorage.getItem('pendingCleanup');
 *
 *   if (pendingCleanup) {
 *     try {
 *       // 執行延遲清除
 *       await cleanupUseCase.execute();
 *       console.log('Delayed cleanup completed');
 *     } catch (error) {
 *       console.error('Delayed cleanup failed:', error);
 *       // 保留標記，下次再試
 *     }
 *     return; // 清除後停止，不恢復會話
 *   }
 *
 *   // 2. 正常流程：嘗試恢復會話
 *   try {
 *     const session = await restoreUseCase.execute();
 *     if (session) {
 *       // 恢復會話資料到 Store
 *       videoStore.setVideo(session.video);
 *       transcriptStore.setTranscript(session.transcript);
 *       highlightStore.setHighlights(session.highlights);
 *     }
 *   } catch (error) {
 *     console.error('Failed to restore session:', error);
 *   }
 * });
 * </script>
 * ```
 */

/**
 * 測試合約
 *
 * Use Case 必須通過以下測試：
 *
 * 1. 成功清除測試：
 *    - Given: IndexedDB 中存在會話資料
 *    - When: 執行 execute()
 *    - Then: 所有資料被清除，SessionStorage 標記被移除
 *
 * 2. IndexedDB 失敗測試：
 *    - Given: IndexedDB 刪除失敗（mock Repository 拋出錯誤）
 *    - When: 執行 execute()
 *    - Then: 拋出 SessionCleanupError
 *
 * 3. SessionStorage 失敗測試：
 *    - Given: SessionStorage 不可用（如隱私模式）
 *    - When: 執行 execute()
 *    - Then: IndexedDB 仍被清除（不拋出錯誤）
 *
 * 4. 空資料測試：
 *    - Given: IndexedDB 中無會話資料
 *    - When: 執行 execute()
 *    - Then: 正常完成（不拋出錯誤）
 *
 * 5. 效能測試：
 *    - Given: IndexedDB 中存在大量資料（1000 筆 Transcript Entities）
 *    - When: 執行 execute()
 *    - Then: 完成時間 < 1s
 */

/**
 * 錯誤處理指南
 *
 * 1. Presentation Layer（Store/Composable）：
 *    - 捕獲 SessionCleanupError
 *    - 顯示使用者友好的錯誤訊息
 *    - 記錄錯誤日誌
 *    - 保留 `pendingCleanup` 標記（下次重試）
 *
 * 2. Application Layer（Use Case）：
 *    - 捕獲 Repository 錯誤
 *    - 轉換為 SessionCleanupError
 *    - 保留原始錯誤作為 cause
 *    - 不處理 UI 邏輯（不直接顯示訊息）
 *
 * 3. Infrastructure Layer（Repository）：
 *    - 捕獲 IndexedDB 錯誤
 *    - 拋出 SessionCleanupError（帶 cause）
 *    - 確保 Transaction 自動回滾
 */

/**
 * DI Container 註冊範例
 *
 * ```typescript
 * // di/container.ts
 * import { CleanupSessionUseCase } from '@/application/use-cases/CleanupSessionUseCase';
 * import { SessionRepositoryImpl } from '@/infrastructure/repositories/SessionRepositoryImpl';
 * import { BrowserStorage } from '@/infrastructure/storage/BrowserStorage';
 *
 * export class DIContainer {
 *   private static instances = new Map<string, any>();
 *
 *   static register() {
 *     // Storage
 *     const storage = new BrowserStorage();
 *
 *     // Repository
 *     const sessionRepo = new SessionRepositoryImpl(storage);
 *
 *     // Use Case
 *     const cleanupUseCase = new CleanupSessionUseCase(sessionRepo);
 *
 *     // 註冊到 Vue provide
 *     this.instances.set('cleanupSessionUseCase', cleanupUseCase);
 *   }
 *
 *   static provide(app: App) {
 *     this.instances.forEach((instance, key) => {
 *       app.provide(key, instance);
 *     });
 *   }
 * }
 * ```
 */
