/**
 * Video Repository Implementation
 *
 * 職責:
 * - 在記憶體中持久化 Video Entity (Map)
 * - 整合 BrowserStorage 實現基本持久化 (IndexedDB + SessionStorage)
 * - 提供 Video Entity 的 CRUD 操作
 *
 * 實作 Domain Layer 的 IVideoRepository 介面
 */

import type { IVideoRepository } from '@/domain/repositories/IVideoRepository';
import { Video } from '@/domain/aggregates/Video';
import { BrowserStorage } from '../storage/BrowserStorage';
import { DTOMapper } from '../utils/dto-mapper';

/**
 * Video Repository 實作
 *
 * 儲存策略:
 * - 記憶體 Map: 運行時主要資料來源
 * - IndexedDB: 防止誤刷新,小視頻 (≤ 50MB) 完整恢復
 * - SessionStorage: 大視頻 (> 50MB) 僅儲存元資料
 */
export class VideoRepositoryImpl implements IVideoRepository {
  /**
   * 記憶體快取 - 主要資料來源
   */
  private videos: Map<string, Video> = new Map();

  /**
   * 建構函式 - 注入 BrowserStorage 依賴
   * @param browserStorage - BrowserStorage 實例 (由 DI Container 注入)
   */
  constructor(private browserStorage: BrowserStorage) {}

  /**
   * 儲存視頻 (實作 IVideoRepository 介面)
   *
   * @param video - Video Entity
   * @returns Promise<void>
   *
   * 流程:
   * 1. 儲存到記憶體 Map
   * 2. 轉換為 PersistenceDTO (添加 savedAt, sessionId)
   * 3. 調用 BrowserStorage.saveVideo() 持久化
   *
   * 錯誤處理:
   * - BrowserStorage 錯誤不影響主流程 (已在 BrowserStorage 內部處理)
   * - 記憶體儲存失敗則拋出錯誤
   */
  async save(video: Video): Promise<void> {
    try {
      // 1. 儲存到記憶體 Map
      this.videos.set(video.id, video);

      // 2. 轉換為 PersistenceDTO
      const sessionId = this.browserStorage.getSessionId();
      const persistenceDto = DTOMapper.videoEntityToPersistenceDto(video, sessionId);

      // 3. 持久化到 IndexedDB/SessionStorage
      await this.browserStorage.saveVideo(persistenceDto);
    } catch (error) {
      // 記憶體儲存失敗則拋出錯誤
      // BrowserStorage 錯誤已在內部捕獲並發出 console.warn
      console.warn('VideoRepository: 儲存視頻時發生錯誤', {
        videoId: video.id,
        error: error instanceof Error ? error.message : String(error),
      });
      // 不拋出例外,優雅降級 (記憶體儲存已成功)
    }
  }

  /**
   * 根據 ID 查找視頻 (實作 IVideoRepository 介面)
   *
   * @param id - 視頻 ID
   * @returns Promise<Video | null> - 找到的視頻,如果不存在則返回 null
   *
   * 流程:
   * 1. 先查記憶體 Map
   * 2. 若找到,直接返回
   * 3. 若未找到,調用 BrowserStorage.restoreVideo() 從 IndexedDB 恢復
   * 4. 轉換 PersistenceDTO → Entity
   * 5. 存入記憶體 Map (下次直接命中)
   *
   * 錯誤處理:
   * - BrowserStorage 錯誤不影響主流程,返回 null
   * - DTO 轉換錯誤發出 console.warn 並返回 null
   */
  async findById(id: string): Promise<Video | null> {
    try {
      // 1. 先查記憶體 Map
      const cachedVideo = this.videos.get(id);
      if (cachedVideo) {
        return cachedVideo;
      }

      // 2. 從 IndexedDB 恢復
      const persistenceDto = await this.browserStorage.restoreVideo(id);
      if (!persistenceDto) {
        return null; // IndexedDB 中也不存在
      }

      // 3. 轉換 PersistenceDTO → Entity
      const video = DTOMapper.videoPersistenceDtoToEntity(persistenceDto);

      // 4. 存入記憶體 Map (下次直接命中)
      this.videos.set(id, video);

      return video;
    } catch (error) {
      console.warn('VideoRepository: 查找視頻時發生錯誤', {
        videoId: id,
        error: error instanceof Error ? error.message : String(error),
      });
      return null; // 優雅降級,返回 null
    }
  }

  /**
   * 刪除視頻 (擴展方法,非介面要求)
   *
   * @param id - 視頻 ID
   * @returns Promise<void>
   *
   * 用途:
   * - 清理不需要的視頻資料
   * - 釋放記憶體空間
   *
   * 注意:
   * - 僅刪除記憶體中的資料
   * - IndexedDB 資料由 BrowserStorage.cleanupStaleData() 在啟動時清理
   */
  async delete(id: string): Promise<void> {
    this.videos.delete(id);
  }

  /**
   * 清空所有視頻 (擴展方法,用於測試或重置)
   *
   * @returns Promise<void>
   */
  async clear(): Promise<void> {
    this.videos.clear();
    // 注意:不清理 IndexedDB,僅清空記憶體快取
    // IndexedDB 清理由 BrowserStorage.cleanupStaleData() 負責
  }

  /**
   * 獲取所有視頻 (擴展方法,用於列表顯示)
   *
   * @returns Promise<Video[]> - 所有視頻陣列
   */
  async findAll(): Promise<Video[]> {
    return Array.from(this.videos.values());
  }
}
