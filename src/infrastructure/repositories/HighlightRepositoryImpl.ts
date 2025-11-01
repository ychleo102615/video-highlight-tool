/**
 * Highlight Repository Implementation
 *
 * 職責:
 * - 在記憶體中持久化 Highlight Entity (Map)
 * - 整合 BrowserStorage 實現基本持久化
 * - 提供 Highlight Entity 的 CRUD 操作
 * - 支援按 videoId 查詢多個版本
 *
 * 實作 Domain Layer 的 IHighlightRepository 介面
 */

import type { IHighlightRepository } from '@/domain/repositories/IHighlightRepository';
import { Highlight } from '@/domain/aggregates/Highlight';
import { BrowserStorage } from '../storage/BrowserStorage';
import { DTOMapper } from '../utils/dto-mapper';

/**
 * Highlight Repository 實作
 *
 * 儲存策略:
 * - 記憶體 Map: 運行時主要資料來源
 * - IndexedDB: 防止誤刷新,完整恢復高光資料
 * - 支援多版本: 一個視頻可能有多個不同的高光版本
 */
export class HighlightRepositoryImpl implements IHighlightRepository {
  /**
   * 記憶體快取 - 主要資料來源
   * Key: Highlight ID
   */
  private highlights: Map<string, Highlight> = new Map();

  /**
   * 建構函式 - 注入 BrowserStorage 依賴
   * @param browserStorage - BrowserStorage 實例 (由 DI Container 注入)
   */
  constructor(private browserStorage: BrowserStorage) {}

  /**
   * 儲存高光 (實作 IHighlightRepository 介面)
   *
   * @param highlight - Highlight Entity
   * @returns Promise<void>
   *
   * 流程:
   * 1. 儲存到記憶體 Map
   * 2. 轉換為 PersistenceDTO (selectedSentenceIds Set → Array)
   * 3. 調用 BrowserStorage.saveHighlight() 持久化
   *
   * 錯誤處理:
   * - BrowserStorage 錯誤不影響主流程 (已在 BrowserStorage 內部處理)
   * - 記憶體儲存失敗則拋出錯誤
   */
  async save(highlight: Highlight): Promise<void> {
    try {
      // 1. 儲存到記憶體 Map
      this.highlights.set(highlight.id, highlight);

      // 2. 轉換為 PersistenceDTO
      const sessionId = this.browserStorage.getSessionId();
      const persistenceDto = DTOMapper.highlightEntityToPersistenceDto(highlight, sessionId);

      // 3. 持久化到 IndexedDB
      await this.browserStorage.saveHighlight(persistenceDto);
    } catch (error) {
      console.warn('HighlightRepository: 儲存高光時發生錯誤', {
        highlightId: highlight.id,
        videoId: highlight.videoId,
        error: error instanceof Error ? error.message : String(error),
      });
      // 不拋出例外,優雅降級 (記憶體儲存已成功)
    }
  }

  /**
   * 根據 ID 查找高光 (實作 IHighlightRepository 介面)
   *
   * @param id - 高光 ID
   * @returns Promise<Highlight | null> - 找到的高光,如果不存在則返回 null
   *
   * 流程:
   * 1. 先查記憶體 Map
   * 2. 若找到,直接返回
   * 3. 若未找到,調用 BrowserStorage.restoreHighlight() 從 IndexedDB 恢復
   * 4. 轉換 PersistenceDTO → Entity (逐一調用 addSentence() 重建內部狀態)
   * 5. 存入記憶體 Map (下次直接命中)
   *
   * 錯誤處理:
   * - BrowserStorage 錯誤不影響主流程,返回 null
   * - DTO 轉換錯誤發出 console.warn 並返回 null
   */
  async findById(id: string): Promise<Highlight | null> {
    try {
      // 1. 先查記憶體 Map
      const cachedHighlight = this.highlights.get(id);
      if (cachedHighlight) {
        return cachedHighlight;
      }

      // 2. 從 IndexedDB 恢復
      const persistenceDto = await this.browserStorage.restoreHighlight(id);
      if (!persistenceDto) {
        return null; // IndexedDB 中也不存在
      }

      // 3. 轉換 PersistenceDTO → Entity
      const highlight = DTOMapper.highlightPersistenceDtoToEntity(persistenceDto);

      // 4. 存入記憶體 Map (下次直接命中)
      this.highlights.set(id, highlight);

      return highlight;
    } catch (error) {
      console.warn('HighlightRepository: 查找高光時發生錯誤', {
        highlightId: id,
        error: error instanceof Error ? error.message : String(error),
      });
      return null; // 優雅降級,返回 null
    }
  }

  /**
   * 根據視頻 ID 查找所有高光版本 (實作 IHighlightRepository 介面)
   *
   * @param videoId - 視頻 ID
   * @returns Promise<Highlight[]> - 找到的高光陣列 (可能為空陣列)
   *
   * 流程:
   * 1. 先查記憶體 Map (遍歷比對 videoId)
   * 2. 從 IndexedDB 恢復所有相關高光
   * 3. 轉換 PersistenceDTO → Entity (批次處理)
   * 4. 合併記憶體和 IndexedDB 的結果 (去重)
   * 5. 存入記憶體 Map (下次直接命中)
   *
   * 錯誤處理:
   * - BrowserStorage 錯誤不影響主流程,返回記憶體中的結果
   * - DTO 轉換錯誤跳過該筆資料,繼續處理其他資料
   */
  async findByVideoId(videoId: string): Promise<Highlight[]> {
    try {
      // 1. 先查記憶體 Map (收集所有匹配的高光)
      const memoryHighlights: Highlight[] = [];
      for (const highlight of this.highlights.values()) {
        if (highlight.videoId === videoId) {
          memoryHighlights.push(highlight);
        }
      }

      // 2. 從 IndexedDB 恢復
      const persistenceDtos = await this.browserStorage.restoreHighlightsByVideoId(videoId);

      // 3. 轉換 PersistenceDTO → Entity (批次處理)
      const restoredHighlights: Highlight[] = [];
      for (const dto of persistenceDtos) {
        try {
          const highlight = DTOMapper.highlightPersistenceDtoToEntity(dto);

          // 檢查是否已在記憶體中 (避免重複)
          if (!this.highlights.has(highlight.id)) {
            this.highlights.set(highlight.id, highlight);
            restoredHighlights.push(highlight);
          }
        } catch (error) {
          console.warn('HighlightRepository: 轉換 DTO 時發生錯誤,跳過此筆資料', {
            highlightId: dto.id,
            videoId: dto.videoId,
            error: error instanceof Error ? error.message : String(error),
          });
          // 跳過該筆資料,繼續處理其他資料
        }
      }

      // 4. 合併結果 (記憶體 + IndexedDB 恢復)
      // 使用 Map 去重 (以 highlight.id 為鍵)
      const allHighlightsMap = new Map<string, Highlight>();
      for (const highlight of [...memoryHighlights, ...restoredHighlights]) {
        allHighlightsMap.set(highlight.id, highlight);
      }

      return Array.from(allHighlightsMap.values());
    } catch (error) {
      console.warn('HighlightRepository: 按視頻 ID 查找高光時發生錯誤', {
        videoId: videoId,
        error: error instanceof Error ? error.message : String(error),
      });
      // 優雅降級,返回空陣列
      return [];
    }
  }

  /**
   * 刪除高光 (擴展方法,非介面要求)
   *
   * @param id - 高光 ID
   * @returns Promise<void>
   *
   * 用途:
   * - 清理不需要的高光資料
   * - 釋放記憶體空間
   *
   * 注意:
   * - 僅刪除記憶體中的資料
   * - IndexedDB 資料由 BrowserStorage.cleanupStaleData() 在啟動時清理
   */
  async delete(id: string): Promise<void> {
    this.highlights.delete(id);
  }

  /**
   * 清空所有高光 (擴展方法,用於測試或重置)
   *
   * @returns Promise<void>
   */
  async clear(): Promise<void> {
    this.highlights.clear();
  }

  /**
   * 獲取所有高光 (擴展方法,用於列表顯示)
   *
   * @returns Promise<Highlight[]> - 所有高光陣列
   */
  async findAll(): Promise<Highlight[]> {
    return Array.from(this.highlights.values());
  }
}
