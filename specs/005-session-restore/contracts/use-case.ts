/**
 * RestoreSessionUseCase Contract
 *
 * 定義會話恢復 Use Case 的公開介面
 */

import type { Video } from '@/domain/aggregates/Video';
import type { Transcript } from '@/domain/aggregates/Transcript/Transcript';
import type { Highlight } from '@/domain/aggregates/Highlight';

/**
 * 會話狀態返回型別
 *
 * 包含恢復的視頻、轉錄、高光和是否需要重新上傳的旗標
 */
export interface SessionState {
  /** 恢復的視頻 Entity（可能沒有 file） */
  video: Video;

  /** 恢復的轉錄 Entity */
  transcript: Transcript;

  /** 恢復的高光 Entity 陣列 */
  highlights: Highlight[];

  /**
   * 是否需要重新上傳視頻
   * - true: 大視頻（> 50MB），file 為 null，需提示使用者重新上傳
   * - false: 小視頻（≤ 50MB），file 存在，可直接使用
   */
  needsReupload: boolean;
}

/**
 * RestoreSessionUseCase 介面
 *
 * 負責協調 Video、Transcript、Highlight 三個 Repository，
 * 恢復應用的編輯狀態
 */
export interface IRestoreSessionUseCase {
  /**
   * 執行會話恢復
   *
   * 流程:
   * 1. 查詢所有視頻（目前取第一個視頻）
   * 2. 根據 videoId 查詢轉錄
   * 3. 根據 videoId 查詢高光
   * 4. 判斷是否需要重新上傳（video.file === null）
   * 5. 返回會話狀態
   *
   * 錯誤處理:
   * - 無會話資料 (videos.length === 0): 返回 null
   * - 資料不完整 (無 transcript): 拋出 Error('Transcript not found')
   * - 資料不完整 (無 highlights): 拋出 Error('Highlight not found')
   *
   * @returns 會話狀態物件，若無會話資料返回 null
   * @throws Error 當資料不完整時拋出錯誤
   */
  execute(): Promise<SessionState | null>;
}

/**
 * RestoreSessionUseCase 實作類別（範例）
 *
 * 實際實作位於 @src/application/use-cases/RestoreSessionUseCase.ts
 */
export class RestoreSessionUseCase implements IRestoreSessionUseCase {
  constructor(
    private videoRepo: IVideoRepository,
    private transcriptRepo: ITranscriptRepository,
    private highlightRepo: IHighlightRepository
  ) {}

  async execute(): Promise<SessionState | null> {
    // 1. 查詢所有視頻
    const videos = await this.videoRepo.findAll();
    if (videos.length === 0) {
      return null; // 無會話資料
    }

    const video = videos[0]; // 目前假設單視頻專案

    // 2. 查詢轉錄
    const transcript = await this.transcriptRepo.findByVideoId(video.id);
    if (!transcript) {
      throw new Error('Transcript not found');
    }

    // 3. 查詢高光
    const highlights = await this.highlightRepo.findByVideoId(video.id);
    if (highlights.length === 0) {
      throw new Error('Highlight not found');
    }

    // 4. 判斷是否需要重新上傳
    const needsReupload = video.file === null;

    // 5. 返回會話狀態
    return {
      video,
      transcript,
      highlights,
      needsReupload
    };
  }
}
