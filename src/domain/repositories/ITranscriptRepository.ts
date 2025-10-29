import { Transcript } from '../aggregates/Transcript/Transcript';

/**
 * ITranscriptRepository Interface
 *
 * 定義 Transcript 聚合的儲存和查詢操作
 *
 * 設計原則:
 * - 只有 Aggregate Root 才有 Repository
 * - 提供按 videoId 查詢(一對一關係)
 * - 所有方法返回 Promise(為 Infrastructure Layer 實作準備)
 */
export interface ITranscriptRepository {
  /**
   * 儲存轉錄
   * @param transcript - Transcript 聚合根
   */
  save(transcript: Transcript): Promise<void>;

  /**
   * 根據 ID 查找轉錄
   * @param id - 轉錄 ID
   * @returns 找到的轉錄,如果不存在則返回 null
   */
  findById(id: string): Promise<Transcript | null>;

  /**
   * 根據視頻 ID 查找轉錄
   * @param videoId - 視頻 ID
   * @returns 找到的轉錄,如果不存在則返回 null
   */
  findByVideoId(videoId: string): Promise<Transcript | null>;
}
