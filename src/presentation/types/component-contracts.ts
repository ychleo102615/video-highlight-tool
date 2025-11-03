/**
 * Component Props & Emits Contracts
 *
 * 定義所有組件的 Props 和 Emits 型別
 * 確保組件介面的型別安全和一致性
 */

import type { TimeSegment, SectionDisplayData, SentenceDisplayData } from './store-contracts';

// ============================================================================
// Layout Components
// ============================================================================

/**
 * SplitLayout 組件 Props
 * 響應式分屏佈局容器
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SplitLayoutProps {
  // 無 props，純佈局組件
}

// ============================================================================
// Upload Components
// ============================================================================

/**
 * VideoUpload 組件 Props
 */
export interface VideoUploadProps {
  /** 是否正在上傳 */
  isUploading?: boolean;
  /** 上傳進度（0-100） */
  uploadProgress?: number;
}

/**
 * VideoUpload 組件 Emits
 */
export interface VideoUploadEmits {
  /**
   * 使用者選擇視頻檔案後觸發
   * @param videoFile 視頻檔案
   * @param transcriptFile 可選的轉錄 JSON 檔案
   */
  (e: 'upload', videoFile: File, transcriptFile?: File): void;
}

// ============================================================================
// Editing Area Components
// ============================================================================

/**
 * EditingArea 組件 Props
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface EditingAreaProps {
  // 從 Store 獲取資料，無需 props
}

/**
 * EditingArea 組件 Emits
 */
export interface EditingAreaEmits {
  /**
   * 使用者點擊時間戳跳轉時觸發
   * @param time 時間（秒數）
   */
  (e: 'seek-to-time', time: number): void;
}

/**
 * SectionList 組件 Props
 */
export interface SectionListProps {
  /** 段落列表 */
  sections: SectionDisplayData[];
  /** 當前播放的句子 ID */
  playingSentenceId: string | null;
  /** 選中的句子 ID 集合 */
  selectedSentenceIds: Set<string>;
}

/**
 * SectionList 組件 Emits
 */
export interface SectionListEmits {
  /**
   * 使用者點擊句子時觸發
   * @param sentenceId 句子 ID
   */
  (e: 'toggle-sentence', sentenceId: string): void;

  /**
   * 使用者點擊時間戳時觸發
   * @param time 時間（秒數）
   */
  (e: 'seek-to-time', time: number): void;
}

/**
 * SectionItem 組件 Props
 */
export interface SectionItemProps {
  /** 段落 ID */
  id: string;
  /** 段落標題 */
  title: string;
  /** 句子列表 */
  sentences: SentenceDisplayData[];
  /** 當前播放的句子 ID */
  playingSentenceId: string | null;
  /** 選中的句子 ID 集合 */
  selectedSentenceIds: Set<string>;
}

/**
 * SectionItem 組件 Emits
 */
export interface SectionItemEmits {
  /** 轉發 toggle-sentence 事件 */
  (e: 'toggle-sentence', sentenceId: string): void;
  /** 轉發 seek-to-time 事件 */
  (e: 'seek-to-time', time: number): void;
}

/**
 * SentenceItem 組件 Props
 */
export interface SentenceItemProps {
  /** 句子 ID */
  sentenceId: string;
  /** 句子文字 */
  text: string;
  /** 起始時間（格式化為 MM:SS） */
  timeRange: string;
  /** 起始時間（秒數，用於 seek） */
  startTime: number;
  /** 是否被選中 */
  isSelected: boolean;
  /** 是否為當前播放的句子 */
  isPlaying: boolean;
}

/**
 * SentenceItem 組件 Emits
 */
export interface SentenceItemEmits {
  /** 使用者點擊句子時觸發 */
  (e: 'toggle', sentenceId: string): void;
  /** 使用者點擊時間戳時觸發 */
  (e: 'seek', time: number): void;
}

// ============================================================================
// Preview Area Components
// ============================================================================

/**
 * PreviewArea 組件 Props
 */
export interface PreviewAreaProps {
  /** 外部的 seek 請求（用於編輯區 → 預覽區同步） */
  seekTime?: number | null;
}

/**
 * VideoPlayer 組件 Props
 */
export interface VideoPlayerProps {
  /** 視頻 URL */
  videoUrl: string;
  /** 要播放的片段時間範圍列表 */
  segments: TimeSegment[];
}

/**
 * VideoPlayer 組件 Emits
 */
export interface VideoPlayerEmits {
  /**
   * 播放時間更新時觸發
   * @param time 當前時間（秒數）
   */
  (e: 'timeupdate', time: number): void;

  /**
   * 播放狀態改變時觸發
   * @param isPlaying 是否正在播放
   */
  (e: 'play-state-change', isPlaying: boolean): void;
}

/**
 * TranscriptOverlay 組件 Props
 */
export interface TranscriptOverlayProps {
  /** 當前顯示的文字 */
  currentText: string;
  /** 是否顯示文字（用於淡入淡出過渡） */
  visible: boolean;
}

/**
 * Timeline 組件 Props
 */
export interface TimelineProps {
  /** 視頻總時長（秒數） */
  totalDuration: number;
  /** 高光片段時間範圍列表 */
  segments: TimeSegment[];
  /** 當前播放時間（秒數） */
  currentTime: number;
}

/**
 * Timeline 組件 Emits
 */
export interface TimelineEmits {
  /**
   * 使用者點擊時間軸時觸發
   * @param time 目標時間（秒數）
   */
  (e: 'seek', time: number): void;
}

// ============================================================================
// Common Empty State Component
// ============================================================================

/**
 * EmptyState 組件 Props
 * 用於顯示空狀態提示（如：無視頻、無選中句子等）
 */
export interface EmptyStateProps {
  /** 提示訊息 */
  message: string;
  /** 圖示名稱（Heroicons） */
  icon?: string;
}
