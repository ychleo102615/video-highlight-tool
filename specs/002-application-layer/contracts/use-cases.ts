/**
 * Application Layer Use Cases - 介面定義
 *
 * 定義所有 Use Cases 的公開介面，明確輸入和輸出契約。
 */

import { Video } from '@/domain/aggregates/Video';
import { Transcript } from '@/domain/aggregates/Transcript/Transcript';
import { Highlight } from '@/domain/aggregates/Highlight';
import { Sentence } from '@/domain/aggregates/Transcript/Sentence';
import { TimeRange } from '@/domain/value-objects/TimeRange';

// ============================================================================
// Input/Output Types
// ============================================================================

/**
 * CreateHighlightUseCase 輸入
 */
export interface CreateHighlightInput {
  /** 關聯的視頻 ID */
  videoId: string;

  /** 高光名稱（如 "精華版"、"完整版"） */
  name: string;
}

/**
 * ToggleSentenceInHighlightUseCase 輸入
 */
export interface ToggleSentenceInput {
  /** 高光 ID */
  highlightId: string;

  /** 句子 ID */
  sentenceId: string;
}

/**
 * GenerateHighlightUseCase 輸入
 */
export interface GenerateHighlightInput {
  /** 高光 ID */
  highlightId: string;

  /** 排序方式 */
  sortBy: 'selection' | 'time';
}

/**
 * GenerateHighlightUseCase 輸出
 */
export interface GenerateHighlightOutput {
  /** 選中的句子列表（已排序） */
  sentences: Sentence[];

  /** 時間範圍列表 */
  timeRanges: TimeRange[];

  /** 總時長（秒） */
  totalDuration: number;
}

// ============================================================================
// Use Case Interfaces
// ============================================================================

/**
 * 上傳視頻 Use Case
 *
 * 職責：
 * 1. 驗證視頻格式和大小
 * 2. 儲存視頻文件
 * 3. 提取元數據
 * 4. 建立 Video Entity
 */
export interface IUploadVideoUseCase {
  /**
   * 執行視頻上傳
   *
   * @param file - 視頻文件
   * @returns Promise<Video> - 建立的視頻實體
   * @throws InvalidVideoFormatError - 格式不支援
   * @throws VideoFileTooLargeError - 文件過大
   * @throws VideoMetadataExtractionError - 元數據提取失敗
   * @throws FileStorageError - 儲存失敗
   */
  execute(file: File): Promise<Video>;
}

/**
 * 處理視頻轉錄 Use Case
 *
 * 職責：
 * 1. 驗證視頻存在性
 * 2. 調用 AI 服務生成轉錄
 * 3. 將 DTO 轉換為 Domain Entity
 * 4. 持久化轉錄
 */
export interface IProcessTranscriptUseCase {
  /**
   * 執行轉錄處理
   *
   * @param videoId - 視頻 ID
   * @returns Promise<Transcript> - 建立的轉錄實體
   * @throws VideoNotFoundError - 視頻不存在
   * @throws TranscriptGenerationError - AI 服務失敗
   */
  execute(videoId: string): Promise<Transcript>;
}

/**
 * 建立高光版本 Use Case
 *
 * 職責：
 * 1. 驗證視頻存在性
 * 2. 驗證高光名稱
 * 3. 建立 Highlight Entity（初始狀態：無選中句子）
 */
export interface ICreateHighlightUseCase {
  /**
   * 執行高光建立
   *
   * @param input - 建立高光的輸入參數
   * @returns Promise<Highlight> - 建立的高光實體
   * @throws VideoNotFoundError - 視頻不存在
   * @throws InvalidHighlightNameError - 名稱為空
   */
  execute(input: CreateHighlightInput): Promise<Highlight>;
}

/**
 * 切換句子選中狀態 Use Case
 *
 * 職責：
 * 1. 獲取 Highlight 實體
 * 2. 切換句子選中狀態
 * 3. 持久化變更
 */
export interface IToggleSentenceInHighlightUseCase {
  /**
   * 執行句子選中狀態切換
   *
   * @param input - 切換操作的輸入參數
   * @returns Promise<void>
   * @throws HighlightNotFoundError - 高光不存在
   */
  execute(input: ToggleSentenceInput): Promise<void>;
}

/**
 * 生成高光預覽 Use Case
 *
 * 職責：
 * 1. 協調 Highlight 和 Transcript 兩個聚合
 * 2. 獲取選中的句子
 * 3. 計算時間範圍和總時長
 */
export interface IGenerateHighlightUseCase {
  /**
   * 執行高光預覽生成
   *
   * @param input - 生成操作的輸入參數
   * @returns Promise<GenerateHighlightOutput> - 預覽數據
   * @throws HighlightNotFoundError - 高光不存在
   * @throws TranscriptNotFoundError - 轉錄不存在
   */
  execute(input: GenerateHighlightInput): Promise<GenerateHighlightOutput>;
}
