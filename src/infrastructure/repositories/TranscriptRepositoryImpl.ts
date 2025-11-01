/**
 * Transcript Repository Implementation
 *
 * 職責:
 * - 在記憶體中持久化 Transcript Entity (Map)
 * - 整合 BrowserStorage 實現基本持久化
 * - 提供 Transcript Entity 的 CRUD 操作
 * - 支援按 videoId 查詢 (一對一關係)
 *
 * 實作 Domain Layer 的 ITranscriptRepository 介面
 */

import type { ITranscriptRepository } from '@/domain/repositories/ITranscriptRepository';
import { Transcript } from '@/domain/aggregates/Transcript/Transcript';
import { BrowserStorage } from '../storage/BrowserStorage';
import { DTOMapper } from '../utils/dto-mapper';

/**
 * Transcript Repository 實作
 *
 * 儲存策略:
 * - 記憶體 Map: 運行時主要資料來源
 * - IndexedDB: 防止誤刷新,完整恢復轉錄資料
 */
export class TranscriptRepositoryImpl implements ITranscriptRepository {
  /**
   * 記憶體快取 - 主要資料來源
   * Key: Transcript ID
   */
  private transcripts: Map<string, Transcript> = new Map();

  /**
   * 建構函式 - 注入 BrowserStorage 依賴
   * @param browserStorage - BrowserStorage 實例 (由 DI Container 注入)
   */
  constructor(private browserStorage: BrowserStorage) {}

  /**
   * 儲存轉錄 (實作 ITranscriptRepository 介面)
   *
   * @param transcript - Transcript Entity
   * @returns Promise<void>
   *
   * 流程:
   * 1. 儲存到記憶體 Map
   * 2. 轉換為 PersistenceDTO (添加 savedAt, sessionId)
   * 3. 調用 BrowserStorage.saveTranscript() 持久化
   *
   * 錯誤處理:
   * - BrowserStorage 錯誤不影響主流程 (已在 BrowserStorage 內部處理)
   * - 記憶體儲存失敗則拋出錯誤
   */
  async save(transcript: Transcript): Promise<void> {
    try {
      // 1. 儲存到記憶體 Map
      this.transcripts.set(transcript.id, transcript);

      // 2. 轉換為 PersistenceDTO
      const sessionId = this.browserStorage.getSessionId();
      const persistenceDto = DTOMapper.transcriptEntityToPersistenceDto(transcript, sessionId);

      // 3. 持久化到 IndexedDB
      await this.browserStorage.saveTranscript(persistenceDto);
    } catch (error) {
      console.warn('TranscriptRepository: 儲存轉錄時發生錯誤', {
        transcriptId: transcript.id,
        videoId: transcript.videoId,
        error: error instanceof Error ? error.message : String(error),
      });
      // 不拋出例外,優雅降級 (記憶體儲存已成功)
    }
  }

  /**
   * 根據 ID 查找轉錄 (實作 ITranscriptRepository 介面)
   *
   * @param id - 轉錄 ID
   * @returns Promise<Transcript | null> - 找到的轉錄,如果不存在則返回 null
   *
   * 流程:
   * 1. 先查記憶體 Map
   * 2. 若找到,直接返回
   * 3. 若未找到,調用 BrowserStorage.restoreTranscript() 從 IndexedDB 恢復
   * 4. 轉換 PersistenceDTO → Entity
   * 5. 存入記憶體 Map (下次直接命中)
   *
   * 錯誤處理:
   * - BrowserStorage 錯誤不影響主流程,返回 null
   * - DTO 轉換錯誤發出 console.warn 並返回 null
   */
  async findById(id: string): Promise<Transcript | null> {
    try {
      // 1. 先查記憶體 Map
      const cachedTranscript = this.transcripts.get(id);
      if (cachedTranscript) {
        return cachedTranscript;
      }

      // 2. 從 IndexedDB 恢復
      const persistenceDto = await this.browserStorage.restoreTranscript(id);
      if (!persistenceDto) {
        return null; // IndexedDB 中也不存在
      }

      // 3. 轉換 PersistenceDTO → Entity
      const transcript = DTOMapper.transcriptPersistenceDtoToEntity(persistenceDto);

      // 4. 存入記憶體 Map (下次直接命中)
      this.transcripts.set(id, transcript);

      return transcript;
    } catch (error) {
      console.warn('TranscriptRepository: 查找轉錄時發生錯誤', {
        transcriptId: id,
        error: error instanceof Error ? error.message : String(error),
      });
      return null; // 優雅降級,返回 null
    }
  }

  /**
   * 根據視頻 ID 查找轉錄 (實作 ITranscriptRepository 介面)
   *
   * @param videoId - 視頻 ID
   * @returns Promise<Transcript | null> - 找到的轉錄,如果不存在則返回 null
   *
   * 流程:
   * 1. 先查記憶體 Map (遍歷比對 videoId)
   * 2. 若找到,直接返回
   * 3. 若未找到,調用 BrowserStorage.restoreTranscriptByVideoId() 從 IndexedDB 恢復
   * 4. 轉換 PersistenceDTO → Entity
   * 5. 存入記憶體 Map (下次直接命中)
   *
   * 錯誤處理:
   * - BrowserStorage 錯誤不影響主流程,返回 null
   * - DTO 轉換錯誤發出 console.warn 並返回 null
   */
  async findByVideoId(videoId: string): Promise<Transcript | null> {
    try {
      // 1. 先查記憶體 Map (遍歷比對 videoId)
      for (const transcript of this.transcripts.values()) {
        if (transcript.videoId === videoId) {
          return transcript;
        }
      }

      // 2. 從 IndexedDB 恢復
      const persistenceDto = await this.browserStorage.restoreTranscriptByVideoId(videoId);
      if (!persistenceDto) {
        return null; // IndexedDB 中也不存在
      }

      // 3. 轉換 PersistenceDTO → Entity
      const transcript = DTOMapper.transcriptPersistenceDtoToEntity(persistenceDto);

      // 4. 存入記憶體 Map (下次直接命中)
      this.transcripts.set(transcript.id, transcript);

      return transcript;
    } catch (error) {
      console.warn('TranscriptRepository: 按視頻 ID 查找轉錄時發生錯誤', {
        videoId: videoId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null; // 優雅降級,返回 null
    }
  }

  /**
   * 刪除轉錄 (擴展方法,非介面要求)
   *
   * @param id - 轉錄 ID
   * @returns Promise<void>
   *
   * 用途:
   * - 清理不需要的轉錄資料
   * - 釋放記憶體空間
   *
   * 注意:
   * - 僅刪除記憶體中的資料
   * - IndexedDB 資料由 BrowserStorage.cleanupStaleData() 在啟動時清理
   */
  async delete(id: string): Promise<void> {
    this.transcripts.delete(id);
  }

  /**
   * 清空所有轉錄 (擴展方法,用於測試或重置)
   *
   * @returns Promise<void>
   */
  async clear(): Promise<void> {
    this.transcripts.clear();
  }

  /**
   * 獲取所有轉錄 (擴展方法,用於列表顯示)
   *
   * @returns Promise<Transcript[]> - 所有轉錄陣列
   */
  async findAll(): Promise<Transcript[]> {
    return Array.from(this.transcripts.values());
  }
}
