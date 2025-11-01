/**
 * Pinia Store Contracts
 *
 * 定義所有 Store 的 State、Getters、Actions 型別介面
 * 這些介面作為 Store 實作的合約，確保型別安全
 */

import type { Video } from '@/domain/aggregates/Video'
import type { Transcript } from '@/domain/aggregates/Transcript/Transcript'
import type { Section } from '@/domain/aggregates/Transcript/Section'
import type { Sentence } from '@/domain/aggregates/Transcript/Sentence'
import type { Highlight } from '@/domain/aggregates/Highlight'
import type { TimeRange } from '@/domain/value-objects/TimeRange'

// ============================================================================
// Common Types
// ============================================================================

/**
 * 段落顯示資料（UI 層）
 */
export interface SectionDisplayData {
  id: string
  title: string
  sentences: SentenceDisplayData[]
}

/**
 * 句子顯示資料（UI 層）
 */
export interface SentenceDisplayData {
  id: string
  text: string
  startTime: number  // 秒數
  endTime: number    // 秒數
}

/**
 * 時間片段（播放器專用）
 */
export interface TimeSegment {
  startTime: number  // 秒數
  endTime: number    // 秒數
}

// ============================================================================
// Video Store
// ============================================================================

export interface VideoStoreState {
  /** 當前視頻實體（Domain Entity） */
  video: Video | null
  /** 是否正在上傳 */
  isUploading: boolean
  /** 上傳進度（0-100） */
  uploadProgress: number
  /** 錯誤訊息 */
  error: string | null
}

export interface VideoStoreGetters {
  /** 是否有視頻 */
  hasVideo: boolean
  /** 視頻是否準備好播放 */
  isReady: boolean
  /** 視頻 URL */
  videoUrl: string | undefined
  /** 視頻時長（秒數） */
  duration: number
}

export interface VideoStoreActions {
  /**
   * 上傳視頻（可選擇性上傳轉錄 JSON）
   * @param videoFile 視頻檔案
   * @param transcriptFile 可選的轉錄 JSON 檔案
   */
  uploadVideo(videoFile: File, transcriptFile?: File): Promise<void>

  /** 清除視頻 */
  clearVideo(): void
}

// ============================================================================
// Transcript Store
// ============================================================================

export interface TranscriptStoreState {
  /** 當前轉錄實體（Domain Entity） */
  transcript: Transcript | null
  /** 是否正在處理（AI 生成中） */
  isProcessing: boolean
  /** 當前播放的句子 ID（用於同步高亮） */
  playingSentenceId: string | null
  /** 錯誤訊息 */
  error: string | null
}

export interface TranscriptStoreGetters {
  /** 是否有轉錄內容 */
  hasTranscript: boolean
  /** 所有段落（用於 UI 顯示） */
  sections: SectionDisplayData[]
  /** 所有句子（扁平化） */
  allSentences: Sentence[]
  /** 當前播放的句子 */
  playingSentence: Sentence | null
}

export interface TranscriptStoreActions {
  /**
   * 處理視頻轉錄
   * @param videoId 視頻 ID
   */
  processTranscript(videoId: string): Promise<void>

  /** 設定當前播放的句子 ID */
  setPlayingSentenceId(sentenceId: string | null): void

  /** 根據時間獲取對應的句子 */
  getSentenceAtTime(time: number): Sentence | undefined
}

// ============================================================================
// Highlight Store
// ============================================================================

export interface HighlightStoreState {
  /** 當前高光實體（Domain Entity） */
  currentHighlight: Highlight | null
  /** 是否正在載入 */
  isLoading: boolean
  /** 錯誤訊息 */
  error: string | null
}

export interface HighlightStoreGetters {
  /** 是否有高光 */
  hasHighlight: boolean
  /** 選中的句子 ID 集合（用於 UI 渲染） */
  selectedSentenceIds: Set<string>
  /** 選中的句子列表（需配合 transcriptStore） */
  selectedSentences: Sentence[]
  /** 高光片段時間範圍（Domain 型別） */
  timeRanges: TimeRange[]
  /** 高光片段時間範圍（簡化版，用於播放器） */
  timeSegments: TimeSegment[]
  /** 總時長（秒數） */
  totalDuration: number
}

export interface HighlightStoreActions {
  /**
   * 建立高光（使用 AI 建議的句子作為預設選擇）
   * @param videoId 視頻 ID
   * @param name 高光名稱
   */
  createHighlight(videoId: string, name: string): Promise<void>

  /**
   * 切換句子選中狀態
   * @param sentenceId 句子 ID
   */
  toggleSentence(sentenceId: string): Promise<void>

  /**
   * 檢查句子是否被選中
   * @param sentenceId 句子 ID
   */
  isSentenceSelected(sentenceId: string): boolean
}
