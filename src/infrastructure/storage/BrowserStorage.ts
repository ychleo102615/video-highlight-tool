/**
 * BrowserStorage - IndexedDB 封裝
 *
 * 職責:
 * - 管理 IndexedDB 資料庫初始化
 * - 提供 Entity Persistence DTO 的 CRUD 操作
 * - 管理 sessionId 生命週期
 * - 清理過期資料 (24小時)
 *
 * 儲存策略:
 * - 所有視頻統一儲存到 IndexedDB
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { VideoPersistenceDTO } from './dto/VideoPersistenceDTO';
import type { TranscriptPersistenceDTO } from './dto/TranscriptPersistenceDTO';
import type { HighlightPersistenceDTO } from './dto/HighlightPersistenceDTO';
import { DB_NAME, DB_VERSION, MAX_AGE_MS, SESSION_ID_KEY } from '../../config/constants';
import { generateSessionId } from '../../config/id-generator';

export class BrowserStorage {
  private db!: IDBPDatabase;
  private sessionId!: string;

  /**
   * 初始化 IndexedDB 和 sessionId
   */
  async init(): Promise<void> {
    try {
      // 1. 初始化 sessionId
      this.sessionId = this.initSessionId();

      // 2. 開啟 IndexedDB
      this.db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // 建立 videos store
          if (!db.objectStoreNames.contains('videos')) {
            const videoStore = db.createObjectStore('videos', { keyPath: 'id' });
            videoStore.createIndex('sessionId', 'sessionId', { unique: false });
            videoStore.createIndex('savedAt', 'savedAt', { unique: false });
          }

          // 建立 transcripts store
          if (!db.objectStoreNames.contains('transcripts')) {
            const transcriptStore = db.createObjectStore('transcripts', { keyPath: 'id' });
            transcriptStore.createIndex('videoId', 'videoId', { unique: false });
            transcriptStore.createIndex('sessionId', 'sessionId', { unique: false });
            transcriptStore.createIndex('savedAt', 'savedAt', { unique: false });
          }

          // 建立 highlights store
          if (!db.objectStoreNames.contains('highlights')) {
            const highlightStore = db.createObjectStore('highlights', { keyPath: 'id' });
            highlightStore.createIndex('videoId', 'videoId', { unique: false });
            highlightStore.createIndex('sessionId', 'sessionId', { unique: false });
            highlightStore.createIndex('savedAt', 'savedAt', { unique: false });
          }
        }
      });

      // 3. 清理過期資料
      await this.cleanupStaleData();
    } catch (error) {
      console.warn('Failed to initialize BrowserStorage:', error);
      // 優雅降級:繼續執行,但持久化功能將不可用
    }
  }

  /**
   * 獲取或生成 sessionId
   */
  private initSessionId(): string {
    const existing = sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) {
      return existing;
    }

    const newId = generateSessionId();
    sessionStorage.setItem(SESSION_ID_KEY, newId);
    return newId;
  }

  /**
   * 獲取當前 sessionId
   */
  getSessionId(): string {
    return this.sessionId;
  }

  // ==================== Video CRUD ====================

  /**
   * 儲存視頻
   * - 統一儲存到 IndexedDB
   */
  async saveVideo(video: VideoPersistenceDTO): Promise<void> {
    try {
      await this.db.put('videos', video);
    } catch (error) {
      console.warn('Failed to save video:', error);
      // 優雅降級:不拋出例外
    }
  }

  /**
   * 恢復視頻
   */
  async restoreVideo(id: string): Promise<VideoPersistenceDTO | null> {
    try {
      const video = await this.db.get('videos', id);
      return video || null;
    } catch (error) {
      console.warn('Failed to restore video:', error);
      return null;
    }
  }

  /**
   * 恢復所有視頻 (批量查詢)
   * - 從 IndexedDB 查詢所有視頻
   * - 只返回當前 sessionId 的視頻（避免新分頁看到舊資料）
   */
  async restoreAllVideos(): Promise<VideoPersistenceDTO[]> {
    try {
      const allVideos = await this.db.getAll('videos');
      // 過濾：只返回當前 sessionId 的資料
      return allVideos.filter((video) => video.sessionId === this.sessionId);
    } catch (error) {
      console.warn('Failed to restore all videos:', error);
      return [];
    }
  }

  // ==================== Transcript CRUD ====================

  /**
   * 儲存轉錄
   */
  async saveTranscript(transcript: TranscriptPersistenceDTO): Promise<void> {
    try {
      await this.db.put('transcripts', transcript);
    } catch (error) {
      console.warn('Failed to save transcript:', error);
    }
  }

  /**
   * 按 ID 恢復轉錄
   */
  async restoreTranscript(id: string): Promise<TranscriptPersistenceDTO | null> {
    try {
      const transcript = await this.db.get('transcripts', id);
      return transcript || null;
    } catch (error) {
      console.warn('Failed to restore transcript:', error);
      return null;
    }
  }

  /**
   * 按 videoId 恢復轉錄
   * - 只返回當前 sessionId 的轉錄（避免新分頁看到舊資料）
   */
  async restoreTranscriptByVideoId(videoId: string): Promise<TranscriptPersistenceDTO | null> {
    try {
      const tx = this.db.transaction('transcripts', 'readonly');
      const index = tx.store.index('videoId');
      const transcripts = await index.getAll(videoId);
      // 過濾：只返回當前 sessionId 的資料
      const currentSessionTranscripts = transcripts.filter((t) => t.sessionId === this.sessionId);
      return currentSessionTranscripts.length > 0 ? currentSessionTranscripts[0]! : null;
    } catch (error) {
      console.warn('Failed to restore transcript by videoId:', error);
      return null;
    }
  }

  /**
   * 恢復所有轉錄 (批量查詢)
   */
  async restoreAllTranscripts(): Promise<TranscriptPersistenceDTO[]> {
    try {
      return await this.db.getAll('transcripts');
    } catch (error) {
      console.warn('Failed to restore all transcripts:', error);
      return [];
    }
  }

  // ==================== Highlight CRUD ====================

  /**
   * 儲存高光
   */
  async saveHighlight(highlight: HighlightPersistenceDTO): Promise<void> {
    try {
      await this.db.put('highlights', highlight);
    } catch (error) {
      console.warn('Failed to save highlight:', error);
    }
  }

  /**
   * 按 ID 恢復高光
   */
  async restoreHighlight(id: string): Promise<HighlightPersistenceDTO | null> {
    try {
      const highlight = await this.db.get('highlights', id);
      return highlight || null;
    } catch (error) {
      console.warn('Failed to restore highlight:', error);
      return null;
    }
  }

  /**
   * 按 videoId 恢復所有高光
   * - 只返回當前 sessionId 的高光（避免新分頁看到舊資料）
   */
  async restoreHighlightsByVideoId(videoId: string): Promise<HighlightPersistenceDTO[]> {
    try {
      const tx = this.db.transaction('highlights', 'readonly');
      const index = tx.store.index('videoId');
      const highlights = await index.getAll(videoId);
      // 過濾：只返回當前 sessionId 的資料
      return highlights.filter((h) => h.sessionId === this.sessionId);
    } catch (error) {
      console.warn('Failed to restore highlights by videoId:', error);
      return [];
    }
  }

  /**
   * 恢復所有高光 (批量查詢)
   */
  async restoreAllHighlights(): Promise<HighlightPersistenceDTO[]> {
    try {
      return await this.db.getAll('highlights');
    } catch (error) {
      console.warn('Failed to restore all highlights:', error);
      return [];
    }
  }

  // ==================== Cleanup ====================

  /**
   * 清理過期資料
   * - 只刪除 savedAt 超過 24 小時的資料
   * - 不刪除其他 Tab 的資料（避免多分頁互相干擾）
   */
  async cleanupStaleData(): Promise<void> {
    try {
      const now = Date.now();

      // 清理 videos
      await this.cleanupStore('videos', now);

      // 清理 transcripts
      await this.cleanupStore('transcripts', now);

      // 清理 highlights
      await this.cleanupStore('highlights', now);
    } catch (error) {
      console.warn('Failed to cleanup stale data:', error);
    }
  }

  /**
   * 清理指定 store 的過期資料
   * 只刪除超過 24 小時的資料
   */
  private async cleanupStore(
    storeName: 'videos' | 'transcripts' | 'highlights',
    now: number
  ): Promise<void> {
    try {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.store;
      const items = await store.getAll();

      for (const item of items) {
        const isExpired = now - item.savedAt > MAX_AGE_MS;

        // 刪除條件: 超過 24 小時
        if (isExpired) {
          await store.delete(item.id);
        }
      }

      await tx.done;
    } catch (error) {
      console.warn(`Failed to cleanup ${storeName}:`, error);
    }
  }

  // ==================== Session Management ====================

  /**
   * 刪除指定 sessionId 的所有資料
   *
   * 使用 Transaction + Cursor 批次刪除策略:
   * - 利用 sessionId 索引快速定位記錄
   * - 使用 cursor 遍歷刪除,記憶體效率高
   * - 每個 store 獨立 transaction,允許部分失敗
   *
   * @param sessionId - 要刪除的會話 ID
   * @throws 若任何 store 刪除失敗則拋出錯誤
   */
  async deleteSession(sessionId: string): Promise<void> {
    const stores = ['videos', 'transcripts', 'highlights'] as const;

    for (const storeName of stores) {
      try {
        const tx = this.db.transaction(storeName, 'readwrite');
        const index = tx.store.index('sessionId');

        // 使用 cursor 遍歷並刪除所有匹配的記錄
        let cursor = await index.openCursor(sessionId);
        while (cursor) {
          await cursor.delete();
          cursor = await cursor.continue();
        }

        await tx.done;
      } catch (error) {
        console.error(`Failed to delete ${storeName} for session ${sessionId}:`, error);
        throw error;
      }
    }
  }
}
