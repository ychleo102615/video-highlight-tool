/**
 * Repository Interface Contracts
 *
 * 本文件定義會話恢復功能所需的 Repository 介面擴充
 */

import type { Video } from '@/domain/aggregates/Video';
import type { Transcript } from '@/domain/aggregates/Transcript/Transcript';
import type { Highlight } from '@/domain/aggregates/Highlight';

/**
 * IVideoRepository 擴充
 *
 * 新增批量查詢方法以支援會話恢復
 */
export interface IVideoRepository {
  /**
   * 儲存視頻
   * @param video - Video Entity
   */
  save(video: Video): Promise<void>;

  /**
   * 根據 ID 查找視頻
   * @param id - 視頻 ID
   * @returns 找到的視頻，若不存在返回 null
   */
  findById(id: string): Promise<Video | null>;

  /**
   * [NEW] 查詢所有視頻
   *
   * 行為:
   * - 若記憶體 Map 不為空，直接返回記憶體中的視頻
   * - 若記憶體 Map 為空，從 BrowserStorage 恢復所有視頻（包含小視頻和大視頻元資料）
   * - 恢復後自動填充記憶體 Map
   *
   * @returns 所有視頻的陣列（小視頻 + 大視頻元資料）
   */
  findAll(): Promise<Video[]>;
}

/**
 * ITranscriptRepository 擴充
 *
 * 新增根據 videoId 查詢方法以支援會話恢復
 */
export interface ITranscriptRepository {
  /**
   * 儲存轉錄
   * @param transcript - Transcript Entity
   */
  save(transcript: Transcript): Promise<void>;

  /**
   * 根據 ID 查找轉錄
   * @param id - 轉錄 ID
   * @returns 找到的轉錄，若不存在返回 null
   */
  findById(id: string): Promise<Transcript | null>;

  /**
   * [NEW] 根據 videoId 查找轉錄
   *
   * 行為:
   * - 先從記憶體 Map 查找（遍歷查找 videoId 匹配）
   * - 若記憶體中找不到，從 BrowserStorage 恢復
   * - 恢復後填充記憶體 Map
   *
   * @param videoId - 視頻 ID
   * @returns 找到的轉錄，若不存在返回 null
   */
  findByVideoId(videoId: string): Promise<Transcript | null>;
}

/**
 * IHighlightRepository 擴充
 *
 * 新增根據 videoId 查詢方法以支援會話恢復
 */
export interface IHighlightRepository {
  /**
   * 儲存高光
   * @param highlight - Highlight Entity
   */
  save(highlight: Highlight): Promise<void>;

  /**
   * 根據 ID 查找高光
   * @param id - 高光 ID
   * @returns 找到的高光，若不存在返回 null
   */
  findById(id: string): Promise<Highlight | null>;

  /**
   * [NEW] 根據 videoId 查找所有高光
   *
   * 行為:
   * - 先從記憶體 Map 查找（遍歷查找 videoId 匹配）
   * - 若記憶體中找不到，從 BrowserStorage 恢復
   * - 恢復後填充記憶體 Map
   *
   * @param videoId - 視頻 ID
   * @returns 找到的高光陣列（目前單視頻單高光，但保持陣列格式）
   */
  findByVideoId(videoId: string): Promise<Highlight[]>;
}
