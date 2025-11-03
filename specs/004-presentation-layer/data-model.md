# Data Model: Presentation Layer

**Feature**: 004-presentation-layer
**Date**: 2025-11-01
**Status**: Complete

## Overview

本文件定義 Presentation Layer 的資料模型，包含：

1. **Vue 組件的 Props 型別**
2. **Pinia Store 的 State 型別**
3. **Composable 的返回型別**
4. **資料轉換關係**

本層的資料模型主要是 **UI 狀態和組件介面**，而非業務實體（業務實體已在 Domain Layer 定義）。

---

## 資料型別層次與轉換關係

### 層次說明

```
┌─────────────────────────────────────────────────────────┐
│ Domain Layer (業務實體)                                   │
│ - Sentence (id, text, timeRange, isHighlightSuggestion) │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Store Layer (資料傳遞)                                    │
│ - SentenceDisplayData (id, text, startTime, endTime)    │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Component Props (UI 資料 + 狀態)                          │
│ - SentenceItemProps (sentenceId, text, timeRange,       │
│   isSelected, isPlaying)                                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 播放器專用 (純時間資料)                                   │
│ - TimeSegment (startTime, endTime)                      │
└─────────────────────────────────────────────────────────┘
```

### 各型別用途

| 型別                       | 層次      | 用途       | 資料來源                    |
| -------------------------- | --------- | ---------- | --------------------------- |
| `Sentence` (Domain Entity) | Domain    | 業務邏輯   | Repository                  |
| `SentenceDisplayData`      | Store     | 資料傳遞   | 從 Domain Entity 轉換       |
| `SentenceItemProps`        | Component | UI 渲染    | 從 Store 資料 + UI 狀態計算 |
| `TimeSegment`              | Util      | 播放器邏輯 | 從 TimeRange 提取           |

### 為何需要三層？

1. **Domain Entity (Sentence)**: 包含業務邏輯（如 `isHighlightSuggestion`），在 Application Layer 使用
2. **SentenceDisplayData**: 去除業務邏輯欄位，只保留 UI 需要的資料，減少耦合
3. **SentenceItemProps**: 加上 UI 狀態（`isSelected`, `isPlaying`），由組件根據 Store 狀態動態計算
4. **TimeSegment**: 播放器只需要時間範圍，不需要文字內容，簡化資料結構

---

## 1. Vue 組件 Props 型別

### 1.1 SentenceItem Props

**用途**: 單個句子的顯示和互動組件

```typescript
interface SentenceItemProps {
  /** 句子 ID */
  sentenceId: string;
  /** 句子文字 */
  text: string;
  /** 起始時間（格式化為 MM:SS） */
  timeRange: string;
  /** 是否被選中 */
  isSelected: boolean;
  /** 是否為當前播放的句子 */
  isPlaying: boolean;
}
```

**驗證規則**:

- `sentenceId`: 必填，非空字串
- `text`: 必填，非空字串
- `timeRange`: 必填，格式為 "MM:SS"（起始時間）
- `isSelected`: 布林值
- `isPlaying`: 布林值

**狀態組合說明**:

- `isSelected=false, isPlaying=false`: 未選中狀態（白色背景）
- `isSelected=true, isPlaying=false`: 選中狀態（藍色左邊框 + 淺藍背景）
- `isPlaying=true`: 播放中狀態（藍色粗邊框 + 深藍背景，優先於 isSelected）

**資料來源計算**:

```typescript
// 在父組件中計算
const props = computed(() => ({
  sentenceId: sentence.id,
  text: sentence.text,
  timeRange: sentence.startTime.toString(), // TimeStamp.toString() → "MM:SS"
  isSelected: highlightStore.isSentenceSelected(sentence.id),
  isPlaying: transcriptStore.playingSentenceId === sentence.id
}));
```

---

### 1.2 SectionList Props

**用途**: 段落列表容器組件

```typescript
interface SectionListProps {
  /** 段落列表 */
  sections: SectionDisplayData[];
}

interface SectionDisplayData {
  /** 段落 ID */
  id: string;
  /** 段落標題 */
  title: string;
  /** 句子列表 */
  sentences: SentenceDisplayData[];
}

interface SentenceDisplayData {
  /** 句子 ID */
  id: string;
  /** 句子文字 */
  text: string;
  /** 起始時間（秒數） */
  startTime: number;
  /** 結束時間（秒數） */
  endTime: number;
}
```

**移除欄位說明**:

- ~~`isHighlightSuggestion`~~ 已移除：AI 建議的句子在轉錄處理完成後會自動建立為預設高光（設為選中狀態），UI 層不需要區分「AI 建議」和「使用者選擇」，只需要知道「選中」或「未選中」

**資料轉換**:

```typescript
// transcriptStore getter
const sections = computed((): SectionDisplayData[] => {
  if (!transcript.value) return [];

  return transcript.value.sections.map((section) => ({
    id: section.id,
    title: section.title,
    sentences: section.sentences.map((sentence) => ({
      id: sentence.id,
      text: sentence.text,
      startTime: sentence.timeRange.start.seconds,
      endTime: sentence.timeRange.end.seconds
    }))
  }));
});
```

---

### 1.3 VideoPlayer Props

**用途**: 視頻播放器組件

```typescript
interface VideoPlayerProps {
  /** 視頻 URL */
  videoUrl: string;
  /** 要播放的片段時間範圍列表 */
  segments: TimeSegment[];
  /** 當前播放時間（用於外部控制） */
  currentTime?: number;
}

interface TimeSegment {
  /** 片段起始時間（秒數） */
  startTime: number;
  /** 片段結束時間（秒數） */
  endTime: number;
}
```

**驗證規則**:

- `videoUrl`: 必填，有效的 URL 或 Blob URL
- `segments`: 必填，非空陣列，每個片段的 `endTime` 必須大於 `startTime`
- `segments` 應按時間順序排序（由 Store 保證）

**TimeSegment 資料來源**:

```typescript
// highlightStore getter
const timeSegments = computed((): TimeSegment[] => {
  const ranges = highlightStore.timeRanges; // TimeRange[]
  return ranges.map((range) => ({
    startTime: range.start.seconds,
    endTime: range.end.seconds
  }));
});
```

---

### 1.4 TranscriptOverlay Props

**用途**: 視頻上的文字疊加層

```typescript
interface TranscriptOverlayProps {
  /** 當前顯示的文字 */
  currentText: string;
  /** 是否顯示文字（用於淡入淡出過渡） */
  visible: boolean;
}
```

**樣式說明**:

- 位置：視頻底部居中，距離底部約 5-10% 視頻高度
- 背景：`bg-black/80`（半透明黑色）
- 文字：`text-white text-lg`
- 過渡：`transition-opacity duration-300`

---

### 1.5 Timeline Props

**用途**: 高光時間軸視覺化

```typescript
interface TimelineProps {
  /** 視頻總時長（秒數） */
  totalDuration: number;
  /** 高光片段時間範圍列表 */
  segments: TimeSegment[];
  /** 當前播放時間（秒數） */
  currentTime: number;
}
```

**視覺化要求**:

- 時間軸以百分比寬度顯示（0% 到 100%）
- 每個片段顯示為藍色區塊，位置 = `(startTime / totalDuration) * 100%`
- 播放進度指示器位置 = `(currentTime / totalDuration) * 100%`

---

## 2. Pinia Store State 型別

### 2.1 Video Store State

**檔案**: `src/presentation/stores/videoStore.ts`

```typescript
interface VideoStoreState {
  /** 當前視頻實體（Domain Entity） */
  video: Video | null;
  /** 是否正在上傳 */
  isUploading: boolean;
  /** 上傳進度（0-100） */
  uploadProgress: number;
  /** 錯誤訊息 */
  error: string | null;
}
```

**Getters**:

```typescript
interface VideoStoreGetters {
  /** 是否有視頻 */
  hasVideo: boolean;
  /** 視頻是否準備好播放 */
  isReady: boolean;
  /** 視頻 URL */
  videoUrl: string | undefined;
  /** 視頻時長（秒數） */
  duration: number;
}
```

**Actions**:

```typescript
interface VideoStoreActions {
  /** 上傳視頻（可選擇性上傳轉錄 JSON 檔案） */
  uploadVideo(videoFile: File, transcriptFile?: File): Promise<void>;
  /** 清除視頻 */
  clearVideo(): void;
}
```

---

### 2.2 Transcript Store State

**檔案**: `src/presentation/stores/transcriptStore.ts`

```typescript
interface TranscriptStoreState {
  /** 當前轉錄實體（Domain Entity） */
  transcript: Transcript | null;
  /** 是否正在處理（AI 生成中） */
  isProcessing: boolean;
  /** 當前播放的句子 ID（用於同步高亮） */
  playingSentenceId: string | null;
  /** 錯誤訊息 */
  error: string | null;
}
```

**Getters**:

```typescript
interface TranscriptStoreGetters {
  /** 是否有轉錄內容 */
  hasTranscript: boolean;
  /** 所有段落（用於 UI 顯示） */
  sections: SectionDisplayData[];
  /** 所有句子（扁平化） */
  allSentences: Sentence[];
  /** 當前播放的句子 */
  playingSentence: Sentence | null;
}
```

**Actions**:

```typescript
interface TranscriptStoreActions {
  /** 處理視頻轉錄（videoFile 用於 MockAIService，transcriptFile 為可選的預先準備 JSON） */
  processTranscript(videoId: string, videoFile: File, transcriptFile?: File): Promise<void>;
  /** 設定當前播放的句子 ID */
  setPlayingSentenceId(sentenceId: string | null): void;
  /** 根據時間獲取對應的句子 */
  getSentenceAtTime(time: number): Sentence | undefined;
}
```

---

### 2.3 Highlight Store State

**檔案**: `src/presentation/stores/highlightStore.ts`

```typescript
interface HighlightStoreState {
  /** 當前高光實體（Domain Entity） */
  currentHighlight: Highlight | null;
  /** 是否正在載入 */
  isLoading: boolean;
  /** 錯誤訊息 */
  error: string | null;
}
```

**Getters**:

```typescript
interface HighlightStoreGetters {
  /** 是否有高光 */
  hasHighlight: boolean;
  /** 選中的句子 ID 集合（用於 UI 渲染） */
  selectedSentenceIds: Set<string>;
  /** 選中的句子列表（需配合 transcriptStore） */
  selectedSentences: Sentence[];
  /** 高光片段時間範圍（需配合 transcriptStore） */
  timeRanges: TimeRange[];
  /** 高光片段時間範圍（簡化版，用於播放器） */
  timeSegments: TimeSegment[];
  /** 總時長（秒數） */
  totalDuration: number;
}
```

**Actions**:

```typescript
interface HighlightStoreActions {
  /** 建立高光（使用 AI 建議的句子作為預設選擇） */
  createHighlight(videoId: string, name: string): Promise<void>;
  /** 切換句子選中狀態 */
  toggleSentence(sentenceId: string): Promise<void>;
  /** 檢查句子是否被選中 */
  isSentenceSelected(sentenceId: string): boolean;
}
```

**移除的 Action**:

- ~~`generatePreview()`~~ 已移除：預覽所需的資料（selectedSentences, timeRanges, totalDuration）可直接從 getters 取得，無需額外的 action

**getters 使用範例**:

```typescript
// 組件中直接使用 getters
const highlightStore = useHighlightStore();

const previewSegments = computed(() => highlightStore.timeSegments);
const totalDuration = computed(() => highlightStore.totalDuration);
```

---

## 3. Composable 返回型別

### 3.1 useVideoUpload

**檔案**: `src/presentation/composables/useVideoUpload.ts`

```typescript
interface UseVideoUploadReturn {
  /** 是否正在上傳 */
  isUploading: Readonly<Ref<boolean>>;
  /** 上傳進度（0-100） */
  uploadProgress: Readonly<Ref<number>>;
  /** 錯誤訊息 */
  error: Readonly<Ref<string | null>>;
  /** 上傳視頻（可選擇性上傳轉錄 JSON） */
  uploadVideo: (videoFile: File, transcriptFile?: File) => Promise<void>;
}
```

**職責**:

- 封裝視頻上傳的狀態和邏輯
- 內部呼叫 `videoStore.uploadVideo(videoFile, transcriptFile)`
- 提供響應式的上傳狀態供組件使用

---

### 3.2 useTranscript

**檔案**: `src/presentation/composables/useTranscript.ts`

```typescript
interface UseTranscriptReturn {
  /** 轉錄內容 */
  transcript: ComputedRef<Transcript | null>;
  /** 所有段落 */
  sections: ComputedRef<SectionDisplayData[]>;
  /** 是否正在處理 */
  isProcessing: Readonly<Ref<boolean>>;
  /** 當前播放的句子 */
  playingSentence: ComputedRef<Sentence | null>;
  /** 處理視頻轉錄 */
  processTranscript: (videoId: string, videoFile: File, transcriptFile?: File) => Promise<void>;
  /** 根據時間獲取句子 */
  getSentenceAtTime: (time: number) => Sentence | undefined;
}
```

**職責**:

- 封裝轉錄相關的查詢邏輯
- 提供計算屬性（如 sections），避免組件重複計算
- 內部使用 `transcriptStore`

---

### 3.3 useHighlight

**檔案**: `src/presentation/composables/useHighlight.ts`

```typescript
interface UseHighlightReturn {
  /** 當前高光 */
  currentHighlight: ComputedRef<Highlight | null>;
  /** 選中的句子 ID 集合 */
  selectedSentenceIds: ComputedRef<Set<string>>;
  /** 選中的句子列表 */
  selectedSentences: ComputedRef<Sentence[]>;
  /** 高光時間範圍（Domain 型別） */
  highlightRanges: ComputedRef<TimeRange[]>;
  /** 高光時間範圍（簡化版，用於播放器） */
  timeSegments: ComputedRef<TimeSegment[]>;
  /** 總時長（秒數） */
  totalDuration: ComputedRef<number>;
  /** 是否載入中 */
  isLoading: Readonly<Ref<boolean>>;
  /** 檢查句子是否被選中 */
  isSentenceSelected: (sentenceId: string) => boolean;
  /** 切換句子選中狀態 */
  toggleSentence: (sentenceId: string) => Promise<void>;
  /** 獲取當前時間對應的句子 */
  getCurrentSentence: (currentTime: number) => Sentence | undefined;
}
```

**職責**:

- 封裝高光選擇和查詢邏輯
- 協調 `highlightStore` 和 `transcriptStore` 的資料
- 提供 UI 層常用的計算屬性和方法

---

### 3.4 useVideoPlayer

**檔案**: `src/presentation/composables/useVideoPlayer.ts`

```typescript
interface UseVideoPlayerReturn {
  /** 視頻 DOM 元素 ref */
  videoElement: Ref<HTMLVideoElement | null>;
  /** 當前播放時間（秒數） */
  currentTime: Readonly<Ref<number>>;
  /** 是否正在播放 */
  isPlaying: Readonly<Ref<boolean>>;
  /** 視頻總時長（秒數） */
  duration: Readonly<Ref<number>>;
  /** 跳轉到指定時間 */
  seekTo: (time: number) => void;
  /** 播放 */
  play: () => void;
  /** 暫停 */
  pause: () => void;
  /** 切換播放/暫停 */
  togglePlay: () => void;
  /** 初始化視頻播放器（用於片段播放） */
  initializePlayer: (segments: TimeSegment[]) => void;
}
```

**職責**:

- 封裝 video.js 播放器的控制邏輯
- 實作片段播放機制（基於 `timeupdate` 事件）
- 提供播放狀態的響應式更新
- 處理使用者手動拖動進度條的情況

**片段播放邏輯**（核心實作）:

```typescript
function initializePlayer(segments: TimeSegment[]) {
  let currentSegmentIndex = 0;

  player.on('timeupdate', () => {
    const currentTime = player.currentTime();
    const currentSegment = segments[currentSegmentIndex];

    if (!currentSegment) return;

    // 檢查是否超出當前片段
    if (currentTime >= currentSegment.endTime) {
      currentSegmentIndex++;
      if (currentSegmentIndex < segments.length) {
        player.currentTime(segments[currentSegmentIndex].startTime);
      } else {
        player.pause();
        currentSegmentIndex = 0;
      }
    }

    // 檢查使用者是否手動拖動到非片段區域
    const isInSegment = segments.some(
      (seg) => currentTime >= seg.startTime && currentTime < seg.endTime
    );

    if (!isInSegment && !player.paused()) {
      const nearestSegment = findNearestSegment(currentTime, segments);
      if (nearestSegment) {
        player.currentTime(nearestSegment.startTime);
      }
    }
  });
}
```

---

## 4. 資料流圖

### 4.1 視頻上傳流程（含可選轉錄檔案）

```
使用者選擇視頻檔案 + 可選的轉錄 JSON 檔案
   ↓
VideoUpload.vue (組件)
   ↓
useVideoUpload.uploadVideo(videoFile, transcriptFile?) (composable)
   ↓
videoStore.uploadVideo(videoFile, transcriptFile?) (action)
   ↓
UploadVideoUseCase.execute(videoFile) (Application Layer)
   ↓
VideoRepositoryImpl.save() (Infrastructure Layer)
   ↓
videoStore.video (state 更新)
   ↓
[如果有 transcriptFile]
   → 直接解析 JSON 並建立 Transcript
   → transcriptStore.transcript (state 更新)
[如果無 transcriptFile]
   → 呼叫 ProcessTranscriptUseCase
   → MockAIService.generate() (Infrastructure Layer)
   → transcriptStore.transcript (state 更新)
   ↓
根據 transcript 中的 isHighlightSuggestion，建立預設高光
   → CreateHighlightUseCase.execute()
   → 將所有 isHighlightSuggestion=true 的句子加入 Highlight
   → highlightStore.currentHighlight (state 更新)
   ↓
組件響應式更新 UI
```

### 4.2 句子選擇流程

```
使用者點擊句子
   ↓
SentenceItem.vue 發送 @click 事件
   ↓
EditingArea.vue 處理事件
   ↓
useHighlight.toggleSentence(sentenceId) (composable)
   ↓
highlightStore.toggleSentence(sentenceId) (action)
   ↓
ToggleSentenceInHighlightUseCase.execute() (Application Layer)
   ↓
HighlightRepositoryImpl.save() (Infrastructure Layer)
   ↓
highlightStore.selectedSentenceIds (state 更新)
   ↓
SentenceItem.vue 的 isSelected prop 更新
   ↓
組件響應式更新樣式
```

### 4.3 視頻播放同步流程

```
VideoPlayer.vue 播放視頻
   ↓
useVideoPlayer.currentTime 更新 (timeupdate 事件)
   ↓
transcriptStore.getSentenceAtTime(currentTime) (getter)
   ↓
transcriptStore.setPlayingSentenceId(sentenceId) (action)
   ↓
EditingArea.vue 監聽 playingSentenceId 變化
   ↓
自動滾動到當前句子 (scrollIntoView)
   ↓
SentenceItem.vue 的 isPlaying prop 更新
   ↓
組件響應式更新樣式（高亮當前播放的句子）
```

---

## 5. 型別定義檔案結構

**建議的型別定義檔案組織**:

```
src/presentation/
├── types/
│   ├── components.ts       # 組件 Props 型別
│   ├── stores.ts           # Store State/Getters/Actions 型別
│   ├── composables.ts      # Composable 返回型別
│   └── index.ts            # 統一匯出
```

**範例：`components.ts`**:

```typescript
export interface SentenceItemProps {
  sentenceId: string;
  text: string;
  timeRange: string;
  isSelected: boolean;
  isPlaying: boolean;
}

export interface TimelineProps {
  totalDuration: number;
  segments: TimeSegment[];
  currentTime: number;
}

export interface TimeSegment {
  startTime: number;
  endTime: number;
}

// ... 其他組件 Props
```

---

## 6. 驗證規則總結

| 資料型別         | 驗證規則                      | 錯誤處理                             |
| ---------------- | ----------------------------- | ------------------------------------ |
| `videoUrl`       | 必填，有效的 URL 或 Blob URL  | 顯示錯誤訊息「視頻 URL 無效」        |
| `segments`       | 非空陣列，endTime > startTime | 顯示錯誤訊息「高光片段時間範圍無效」 |
| `sentenceId`     | 必填，非空字串                | 拋出 `InvalidArgumentError`          |
| `uploadProgress` | 0-100 數字                    | 自動限制在範圍內                     |
| `currentTime`    | ≥ 0 數字                      | 自動設為 0                           |
| `transcriptFile` | 可選，JSON 格式               | JSON 解析失敗時顯示錯誤訊息          |

---

## 7. 效能考量

### 7.1 計算屬性快取

**問題**: `selectedSentences` 需要從 `highlightStore` 獲取 ID，再從 `transcriptStore` 查詢 Sentence，可能重複計算

**解決方案**: 使用 Vue 的 `computed()` 自動快取

```typescript
const selectedSentences = computed(() => {
  const ids = highlightStore.selectedSentenceIds;
  const transcript = transcriptStore.transcript;
  if (!transcript) return [];

  return Array.from(ids)
    .map((id) => transcript.getSentenceById(id))
    .filter(Boolean);
});
```

### 7.2 長列表渲染優化

**問題**: 轉錄內容可能包含 50-100 個句子，全部渲染可能影響效能

**解決方案**（可選）:

- 階段 1: 不使用虛擬滾動，先確保功能正確
- 階段 2（如有需要）: 使用 `vue-virtual-scroller` 優化長列表渲染

### 7.3 timeupdate 事件防抖

**問題**: `timeupdate` 事件每秒觸發多次，可能影響效能

**解決方案**: 使用 `requestAnimationFrame` 優化

```typescript
let rafId: number | null = null;

player.on('timeupdate', () => {
  if (rafId) return;

  rafId = requestAnimationFrame(() => {
    currentTime.value = player.currentTime();
    rafId = null;
  });
});
```

---

## Next Steps

- ✅ Phase 0: Research - 已完成
- ✅ Phase 1: Data Model - 本文件
- ⏳ Phase 1: Contracts - 待建立（定義 Store API 和組件事件型別）
- ⏳ Phase 1: Quickstart - 待建立（開發環境設定指南）
- ⏳ Phase 1: Update Agent Context - 待執行
