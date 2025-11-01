/**
 * BrowserStorage - IndexedDB + SessionStorage 封裝
 *
 * 職責:
 * - 管理 IndexedDB 資料庫初始化
 * - 提供 Entity Persistence DTO 的 CRUD 操作
 * - 管理 sessionId 生命週期
 * - 清理過期資料 (24小時 + sessionId 比對)
 *
 * 儲存策略:
 * - 小視頻 (≤ 50MB): 完整儲存到 IndexedDB
 * - 大視頻 (> 50MB): 僅儲存元資料到 SessionStorage
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { VideoPersistenceDTO } from './dto/VideoPersistenceDTO';
import type { TranscriptPersistenceDTO } from './dto/TranscriptPersistenceDTO';
import type { HighlightPersistenceDTO } from './dto/HighlightPersistenceDTO';

const DB_NAME = 'video-highlight-tool-db';
const DB_VERSION = 1;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 小時

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
        },
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
    const existing = sessionStorage.getItem('sessionId');
    if (existing) return existing;

    const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    sessionStorage.setItem('sessionId', newId);
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
   * - ≤ 50MB: 儲存到 IndexedDB
   * - > 50MB: 僅儲存元資料到 SessionStorage
   */
  async saveVideo(video: VideoPersistenceDTO): Promise<void> {
    try {
      if (video.metadata.size > MAX_VIDEO_SIZE) {
        // 大視頻:僅儲存元資料到 SessionStorage
        const meta = {
          id: video.id,
          name: video.metadata.name,
          size: video.metadata.size,
          duration: video.metadata.duration,
        };
        sessionStorage.setItem(`video_meta_${video.id}`, JSON.stringify(meta));
        return;
      }

      // 小視頻:完整儲存到 IndexedDB
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
      // 1. 先查 IndexedDB
      const video = await this.db.get('videos', id);
      if (video) return video;

      // 2. 查 SessionStorage (大視頻元資料)
      const metaJson = sessionStorage.getItem(`video_meta_${id}`);
      if (metaJson) {
        const meta = JSON.parse(metaJson);
        // 返回僅含元資料的 DTO,file 為 null
        return {
          id: meta.id,
          file: null,
          metadata: {
            name: meta.name,
            size: meta.size,
            duration: meta.duration,
            width: 0, // 大視頻恢復時無法獲取
            height: 0,
            mimeType: 'video/mp4', // 預設值
          },
          savedAt: 0,
          sessionId: this.sessionId,
        };
      }

      return null;
    } catch (error) {
      console.warn('Failed to restore video:', error);
      return null;
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
   */
  async restoreTranscriptByVideoId(videoId: string): Promise<TranscriptPersistenceDTO | null> {
    try {
      const tx = this.db.transaction('transcripts', 'readonly');
      const index = tx.store.index('videoId');
      const transcripts = await index.getAll(videoId);
      return transcripts.length > 0 ? transcripts[0]! : null;
    } catch (error) {
      console.warn('Failed to restore transcript by videoId:', error);
      return null;
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
   */
  async restoreHighlightsByVideoId(videoId: string): Promise<HighlightPersistenceDTO[]> {
    try {
      const tx = this.db.transaction('highlights', 'readonly');
      const index = tx.store.index('videoId');
      const highlights = await index.getAll(videoId);
      return highlights;
    } catch (error) {
      console.warn('Failed to restore highlights by videoId:', error);
      return [];
    }
  }

  // ==================== Cleanup ====================

  /**
   * 清理過期資料
   * - 刪除 sessionId 不匹配的資料 (屬於已關閉 Tab)
   * - 刪除 savedAt 超過 24 小時的資料
   */
  async cleanupStaleData(): Promise<void> {
    try {
      const currentSessionId = this.sessionId;
      const now = Date.now();

      // 清理 videos
      await this.cleanupStore('videos', currentSessionId, now);

      // 清理 transcripts
      await this.cleanupStore('transcripts', currentSessionId, now);

      // 清理 highlights
      await this.cleanupStore('highlights', currentSessionId, now);
    } catch (error) {
      console.warn('Failed to cleanup stale data:', error);
    }
  }

  /**
   * 清理指定 store 的過期資料
   */
  private async cleanupStore(
    storeName: 'videos' | 'transcripts' | 'highlights',
    currentSessionId: string,
    now: number
  ): Promise<void> {
    try {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.store;
      const items = await store.getAll();

      for (const item of items) {
        // 刪除條件:sessionId 不匹配 或 超過 24 小時
        if (item.sessionId !== currentSessionId || now - item.savedAt > MAX_AGE_MS) {
          await store.delete(item.id);
        }
      }

      await tx.done;
    } catch (error) {
      console.warn(`Failed to cleanup ${storeName}:`, error);
    }
  }
}
