import { Video } from '../aggregates/Video';

/**
 * IVideoRepository Interface
 *
 * 定義 Video 聚合的儲存和查詢操作
 *
 * 設計原則:
 * - 只有 Aggregate Root 才有 Repository
 * - 所有方法返回 Promise(為 Infrastructure Layer 實作準備)
 */
export interface IVideoRepository {
  /**
   * 儲存視頻
   * @param video - Video 聚合根
   */
  save(video: Video): Promise<void>;

  /**
   * 根據 ID 查找視頻
   * @param id - 視頻 ID
   * @returns 找到的視頻,如果不存在則返回 null
   */
  findById(id: string): Promise<Video | null>;

  /**
   * 查找所有視頻
   * @returns 所有視頻的陣列
   */
  findAll(): Promise<Video[]>;
}
