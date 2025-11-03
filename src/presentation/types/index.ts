/**
 * Presentation Layer Type Definitions
 *
 * 統一匯出所有 Presentation Layer 的型別定義
 */

// Store Contracts (匯出所有 Store 相關型別)
export type {
  // Common Types
  SectionDisplayData,
  SentenceDisplayData,
  TimeSegment,
  // Video Store
  VideoStoreState,
  VideoStoreGetters,
  VideoStoreActions,
  // Transcript Store
  TranscriptStoreState,
  TranscriptStoreGetters,
  TranscriptStoreActions,
  // Highlight Store
  HighlightStoreState,
  HighlightStoreGetters,
  HighlightStoreActions
} from './store-contracts';

// Component Contracts (匯出所有 Component 相關型別)
export type {
  // Layout
  SplitLayoutProps,
  // Upload
  VideoUploadProps,
  VideoUploadEmits,
  // Editing Area
  EditingAreaProps,
  SectionListProps,
  SectionListEmits,
  SectionItemProps,
  SectionItemEmits,
  SentenceItemProps,
  SentenceItemEmits,
  // Preview Area
  PreviewAreaProps,
  VideoPlayerProps,
  VideoPlayerEmits,
  TranscriptOverlayProps,
  TimelineProps,
  TimelineEmits,
  // Common
  EmptyStateProps
} from './component-contracts';
