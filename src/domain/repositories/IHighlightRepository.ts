import { Highlight } from '../aggregates/Highlight';

/**
 * IHighlightRepository Interface
 *
 * 定義 Highlight 聚合的儲存和查詢操作
 *
 * 設計原則:
 * - 只有 Aggregate Root 才有 Repository
 * - 一個 Video 可能有多個 Highlight(不同版本)
 * - 所有方法返回 Promise(為 Infrastructure Layer 實作準備)
 */
export interface IHighlightRepository {
  /**
   * 儲存高光
   * @param highlight - Highlight 聚合根
   */
  save(highlight: Highlight): Promise<void>;

  /**
   * 根據 ID 查找高光
   * @param id - 高光 ID
   * @returns 找到的高光,如果不存在則返回 null
   */
  findById(id: string): Promise<Highlight | null>;

  /**
   * 根據視頻 ID 查找所有高光版本
   * @param videoId - 視頻 ID
   * @returns 找到的高光陣列(可能為空陣列)
   */
  findByVideoId(videoId: string): Promise<Highlight[]>;
}
