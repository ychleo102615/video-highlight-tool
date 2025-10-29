/**
 * Type Definitions Contract
 *
 * 本文件定義 Domain Layer 對外暴露的型別定義契約。
 * 這些型別將被 Application Layer 和其他外層使用。
 *
 * 注意：Domain Layer 不暴露 HTTP API，此文件僅定義 TypeScript 型別契約。
 */

// ============================================================================
// Value Objects
// ============================================================================

/**
 * TimeStamp - 時間點值物件
 */
export interface ITimeStamp {
  readonly seconds: number;
  toString(): string;
}

export interface ITimeStampStatic {
  new (seconds: number): ITimeStamp;
  fromString(timeString: string): ITimeStamp;
}

/**
 * TimeRange - 時間範圍值物件
 */
export interface ITimeRange {
  readonly start: ITimeStamp;
  readonly end: ITimeStamp;
  readonly duration: number;
  contains(timestamp: ITimeStamp): boolean;
}

export interface ITimeRangeStatic {
  new (start: ITimeStamp, end: ITimeStamp): ITimeRange;
}

/**
 * VideoMetadata - 視頻元數據值物件
 */
export interface IVideoMetadata {
  readonly duration: number;
  readonly width: number;
  readonly height: number;
  readonly format: string;
  readonly aspectRatio: number;
}

export interface IVideoMetadataStatic {
  new (duration: number, width: number, height: number, format: string): IVideoMetadata;
}

// ============================================================================
// Entities
// ============================================================================

/**
 * Video - 視頻聚合根
 */
export interface IVideo {
  readonly id: string;
  readonly file: File;
  readonly metadata: IVideoMetadata;
  url?: string;
  readonly duration: number;
  readonly isReady: boolean;
}

export interface IVideoStatic {
  new (id: string, file: File, metadata: IVideoMetadata, url?: string): IVideo;
}

/**
 * Sentence - 句子實體（屬於 Transcript 聚合）
 */
export interface ISentence {
  readonly id: string;
  readonly text: string;
  readonly timeRange: ITimeRange;
  readonly isHighlightSuggestion: boolean;
}

export interface ISentenceStatic {
  new (
    id: string,
    text: string,
    timeRange: ITimeRange,
    isHighlightSuggestion: boolean
  ): ISentence;
}

/**
 * Section - 段落實體（屬於 Transcript 聚合）
 */
export interface ISection {
  readonly id: string;
  readonly title: string;
  readonly sentences: ReadonlyArray<ISentence>;
  readonly timeRange: ITimeRange;
}

export interface ISectionStatic {
  new (id: string, title: string, sentences: ReadonlyArray<ISentence>): ISection;
}

/**
 * Transcript - 轉錄聚合根
 */
export interface ITranscript {
  readonly id: string;
  readonly videoId: string;
  readonly sections: ReadonlyArray<ISection>;
  readonly fullText: string;

  getSentenceById(sentenceId: string): ISentence | undefined;
  getAllSentences(): ISentence[];
  getSectionById(sectionId: string): ISection | undefined;
}

export interface ITranscriptStatic {
  new (
    id: string,
    videoId: string,
    sections: ReadonlyArray<ISection>,
    fullText: string
  ): ITranscript;
}

/**
 * Highlight - 高光聚合根
 */
export interface IHighlight {
  readonly id: string;
  readonly videoId: string;
  readonly name: string;

  addSentence(sentenceId: string): void;
  removeSentence(sentenceId: string): void;
  toggleSentence(sentenceId: string): void;
  isSelected(sentenceId: string): boolean;

  getSelectedSentences(
    transcript: ITranscript,
    sortBy: 'selection' | 'time'
  ): ISentence[];

  getTimeRanges(
    transcript: ITranscript,
    sortBy: 'selection' | 'time'
  ): ITimeRange[];

  getTotalDuration(transcript: ITranscript): number;
}

export interface IHighlightStatic {
  new (id: string, videoId: string, name: string): IHighlight;
}

// ============================================================================
// Repository Interfaces
// ============================================================================

/**
 * IVideoRepository - 視頻儲存庫介面
 */
export interface IVideoRepository {
  save(video: IVideo): Promise<void>;
  findById(id: string): Promise<IVideo | null>;
}

/**
 * ITranscriptRepository - 轉錄儲存庫介面
 */
export interface ITranscriptRepository {
  save(transcript: ITranscript): Promise<void>;
  findById(id: string): Promise<ITranscript | null>;
  findByVideoId(videoId: string): Promise<ITranscript | null>;
}

/**
 * IHighlightRepository - 高光儲存庫介面
 */
export interface IHighlightRepository {
  save(highlight: IHighlight): Promise<void>;
  findById(id: string): Promise<IHighlight | null>;
  findByVideoId(videoId: string): Promise<IHighlight[]>;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Domain Layer 可能拋出的錯誤類型
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class EntityNotFoundError extends Error {
  constructor(entityType: string, id: string) {
    super(`${entityType} with id ${id} not found`);
    this.name = 'EntityNotFoundError';
  }
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * 型別守衛函數，用於運行時型別檢查
 */
export function isTimeStamp(obj: any): obj is ITimeStamp {
  return obj && typeof obj.seconds === 'number' && typeof obj.toString === 'function';
}

export function isTimeRange(obj: any): obj is ITimeRange {
  return (
    obj &&
    isTimeStamp(obj.start) &&
    isTimeStamp(obj.end) &&
    typeof obj.duration === 'number' &&
    typeof obj.contains === 'function'
  );
}

export function isVideo(obj: any): obj is IVideo {
  return (
    obj &&
    typeof obj.id === 'string' &&
    obj.file instanceof File &&
    typeof obj.duration === 'number' &&
    typeof obj.isReady === 'boolean'
  );
}

export function isSentence(obj: any): obj is ISentence {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.text === 'string' &&
    isTimeRange(obj.timeRange) &&
    typeof obj.isHighlightSuggestion === 'boolean'
  );
}

export function isSection(obj: any): obj is ISection {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    Array.isArray(obj.sentences) &&
    isTimeRange(obj.timeRange)
  );
}

export function isTranscript(obj: any): obj is ITranscript {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.videoId === 'string' &&
    Array.isArray(obj.sections) &&
    typeof obj.fullText === 'string' &&
    typeof obj.getSentenceById === 'function' &&
    typeof obj.getAllSentences === 'function' &&
    typeof obj.getSectionById === 'function'
  );
}

export function isHighlight(obj: any): obj is IHighlight {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.videoId === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.addSentence === 'function' &&
    typeof obj.removeSentence === 'function' &&
    typeof obj.toggleSentence === 'function' &&
    typeof obj.isSelected === 'function' &&
    typeof obj.getSelectedSentences === 'function'
  );
}
