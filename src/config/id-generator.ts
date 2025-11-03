/**
 * ID 生成工具
 *
 * 提供統一的 ID 生成方法，確保所有 ID 格式一致
 */

import {
  SESSION_ID_PREFIX,
  VIDEO_ID_PREFIX,
  TRANSCRIPT_ID_PREFIX,
  HIGHLIGHT_ID_PREFIX,
  SENTENCE_ID_PREFIX,
} from './constants';

/**
 * 生成唯一 ID 的基礎函式
 *
 * @param prefix - ID 前綴
 * @param length - 隨機字串長度，預設為 9
 * @returns 唯一識別碼，格式: `${prefix}${timestamp}_${randomString}`
 */
function generateId(prefix: string, length = 9): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 2 + length);
  return `${prefix}${timestamp}_${randomString}`;
}

/**
 * 生成 Session ID
 *
 * @returns Session ID，格式: `session_${timestamp}_${randomString}`
 */
export function generateSessionId(): string {
  return generateId(SESSION_ID_PREFIX);
}

/**
 * 生成 Video ID
 *
 * @returns Video ID，格式: `video_${timestamp}_${randomString}`
 */
export function generateVideoId(): string {
  return generateId(VIDEO_ID_PREFIX);
}

/**
 * 生成 Transcript ID
 *
 * @returns Transcript ID，格式: `transcript_${timestamp}_${randomString}`
 */
export function generateTranscriptId(): string {
  return generateId(TRANSCRIPT_ID_PREFIX);
}

/**
 * 生成 Highlight ID
 *
 * @returns Highlight ID，格式: `highlight_${timestamp}_${randomString}`
 */
export function generateHighlightId(): string {
  return generateId(HIGHLIGHT_ID_PREFIX);
}

/**
 * 生成 Sentence ID
 *
 * @returns Sentence ID，格式: `sentence_${timestamp}_${randomString}`
 */
export function generateSentenceId(): string {
  return generateId(SENTENCE_ID_PREFIX);
}
