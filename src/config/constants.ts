/**
 * 應用程式常數定義
 *
 * 此檔案集中管理所有應用程式的常數，避免魔術數字和重複定義
 */

// ==================== Database 相關 ====================

/**
 * IndexedDB 資料庫名稱
 */
export const DB_NAME = 'video-highlight-tool-db';

/**
 * IndexedDB 資料庫版本
 */
export const DB_VERSION = 1;

// ==================== Storage 相關 ====================

/**
 * 資料最大保存時間 (24小時)
 * 超過此時間的資料將被自動清理
 */
export const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24小時

// ==================== File Validation 相關 ====================

/**
 * 允許上傳的視頻格式
 */
export const ALLOWED_VIDEO_FORMATS = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
] as const;

/**
 * 最大上傳檔案大小 (MB)
 * 用於顯示給用戶
 */
export const MAX_FILE_SIZE_MB = 50;

/**
 * 最大上傳檔案大小 (bytes)
 * 用於實際檔案大小比較
 */
export const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

// ==================== SessionStorage Keys ====================

/**
 * SessionStorage 中儲存 sessionId 的 key
 */
export const SESSION_ID_KEY = 'sessionId';

// ==================== ID Prefixes ====================

/**
 * Session ID 前綴
 */
export const SESSION_ID_PREFIX = 'session_';

/**
 * Video ID 前綴
 */
export const VIDEO_ID_PREFIX = 'video_';

/**
 * Transcript ID 前綴
 */
export const TRANSCRIPT_ID_PREFIX = 'transcript_';

/**
 * Highlight ID 前綴
 */
export const HIGHLIGHT_ID_PREFIX = 'highlight_';

/**
 * Sentence ID 前綴
 */
export const SENTENCE_ID_PREFIX = 'sentence_';

// ==================== 型別定義 ====================

/**
 * 允許的視頻格式型別
 */
export type AllowedVideoFormat = (typeof ALLOWED_VIDEO_FORMATS)[number];
