/**
 * RestoreSessionUseCase - 會話恢復 Use Case
 *
 * 職責:
 * - 協調 Video、Transcript、Highlight 三個 Repository 的恢復邏輯
 * - 檢查是否存在可恢復的會話資料
 * - 驗證資料完整性 (必須存在 Video、Transcript、Highlight)
 *
 * 使用場景:
 * - 應用啟動時自動執行 (App.vue onMounted)
 * - 檢查 IndexedDB 是否有先前的編輯狀態
 * - 返回完整的會話資料或 null (首次訪問)
 */

import type { IVideoRepository } from '@/domain/repositories/IVideoRepository';
import type { ITranscriptRepository } from '@/domain/repositories/ITranscriptRepository';
import type { IHighlightRepository } from '@/domain/repositories/IHighlightRepository';
import type { Video } from '@/domain/aggregates/Video';
import type { Transcript } from '@/domain/aggregates/Transcript/Transcript';
import type { Highlight } from '@/domain/aggregates/Highlight';

/**
 * RestoreSessionUseCase 返回型別
 */
export interface RestoreSessionResult {
  video: Video;
  transcript: Transcript;
  highlights: Highlight[];
}

/**
 * RestoreSessionUseCase 實作
 */
export class RestoreSessionUseCase {
  constructor(
    private videoRepo: IVideoRepository,
    private transcriptRepo: ITranscriptRepository,
    private highlightRepo: IHighlightRepository
  ) {}

  /**
   * 執行會話恢復
   *
   * @returns Promise<RestoreSessionResult | null>
   *   - 若存在可恢復的會話資料,返回 { video, transcript, highlights }
   *   - 若無會話資料 (首次訪問或已清除),返回 null
   *
   * @throws Error 當資料不完整時
   *   - 'Transcript not found': 缺少轉錄文字
   *   - 'Highlight not found': 缺少高光片段
   *
   * 流程:
   * 1. 查詢所有視頻 (目前假設單視頻專案,取第一個)
   * 2. 若無視頻,返回 null (首次訪問或已清除)
   * 3. 查詢轉錄文字 (按 videoId)
   * 4. 若無轉錄,拋出錯誤 (資料不完整)
   * 5. 查詢高光片段 (按 videoId)
   * 6. 若無高光,拋出錯誤 (資料不完整)
   * 7. 返回完整的會話資料
   *
   * 錯誤處理:
   * - 無會話資料: 返回 null (正常情境,不拋出錯誤)
   * - 資料不完整: 拋出 Error (由 Store 捕獲並顯示錯誤訊息)
   * - Repository 查詢失敗: Repository 內部已優雅降級,返回 null/空陣列
   */
  async execute(): Promise<RestoreSessionResult | null> {
    // 1. 查詢所有視頻 (Repository 會自動從 BrowserStorage 恢復)
    const videos = await this.videoRepo.findAll();

    // 2. 若無視頻,返回 null (首次訪問或已清除)
    if (videos.length === 0) {
      return null;
    }

    // 取第一個視頻 (目前假設單視頻專案)
    const video = videos[0]!;

    // 3. 查詢轉錄文字 (Repository 會自動從 BrowserStorage 恢復)
    const transcript = await this.transcriptRepo.findByVideoId(video.id);
    if (!transcript) {
      throw new Error('Transcript not found');
    }

    // 4. 查詢高光片段 (Repository 會自動從 BrowserStorage 恢復)
    const highlights = await this.highlightRepo.findByVideoId(video.id);
    if (highlights.length === 0) {
      throw new Error('Highlight not found');
    }

    // 5. 返回完整的會話資料
    return {
      video,
      transcript,
      highlights,
    };
  }
}
