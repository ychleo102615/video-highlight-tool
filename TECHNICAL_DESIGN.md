# 技術規劃文檔

## 技術選型

### 核心框架與工具

| 技術 | 選擇 | 版本 | 理由 |
|------|------|------|------|
| 前端框架 | Vue 3 | ^3.5.0 | Composition API 更適合複雜狀態管理，與 Clean Architecture 理念契合 |
| 開發語言 | TypeScript | ^5.0.0 | 強型別確保代碼質量，降低 bug 率 |
| 構建工具 | Vite | ^6.0.0 | 快速開發體驗，優秀的 HMR |
| 狀態管理 | Pinia | ^2.2.0 | Vue 3 官方推薦，簡潔的 API |
| UI 框架 | Naive UI | ^2.40.0 | TypeScript 友好，組件豐富，設計現代 |
| 視頻處理 | video.js | ^8.0.0 | 功能完整，跨瀏覽器兼容性好 |
| 樣式方案 | Tailwind | v4 |  |

### 開發工具

| 工具 | 用途 |
|------|------|
| ESLint | 代碼規範檢查 |
| Prettier | 代碼格式化 |
| Vitest | 單元測試 |
| Vue Test Utils | 組件測試 |

## 架構設計

### Clean Architecture 四層結構

```
src/
├── domain/                    # Domain Layer - 核心業務邏輯
│   ├── entities/             # 實體
│   │   ├── Video.ts
│   │   ├── Transcript.ts
│   │   ├── Section.ts
│   │   ├── Sentence.ts
│   │   └── Highlight.ts
│   ├── value-objects/        # 值物件
│   │   ├── TimeStamp.ts
│   │   ├── TimeRange.ts
│   │   └── VideoMetadata.ts
│   └── repositories/         # 儲存庫介面
│       ├── IVideoRepository.ts
│       └── ITranscriptRepository.ts
│
├── application/              # Application Layer - 應用服務
│   ├── use-cases/           # 用例
│   │   ├── UploadVideoUseCase.ts
│   │   ├── ProcessTranscriptUseCase.ts
│   │   ├── SelectSentenceUseCase.ts
│   │   ├── GenerateHighlightUseCase.ts
│   │   └── SyncPlaybackUseCase.ts
│   ├── dto/                 # 數據傳輸物件
│   │   ├── VideoDTO.ts
│   │   └── TranscriptDTO.ts
│   └── ports/               # 輸入/輸出埠
│       ├── IVideoProcessor.ts
│       └── ITranscriptGenerator.ts
│
├── adapter/                  # Adapter Layer - 適配器
│   ├── api/                 # API 適配器
│   │   └── MockAIService.ts
│   ├── repositories/        # 儲存庫實作
│   │   ├── VideoRepositoryImpl.ts
│   │   └── TranscriptRepositoryImpl.ts
│   ├── state/               # 狀態管理
│   │   ├── videoStore.ts
│   │   ├── transcriptStore.ts
│   │   └── highlightStore.ts
│   └── video-player/        # 視頻播放器適配器
│       └── VideoPlayerAdapter.ts
│
└── framework/                # Framework Layer - UI 框架
    ├── components/          # Vue 組件
    │   ├── layout/
    │   │   └── SplitLayout.vue
    │   ├── upload/
    │   │   └── VideoUpload.vue
    │   ├── editing/
    │   │   ├── EditingArea.vue
    │   │   ├── SectionList.vue
    │   │   └── SentenceItem.vue
    │   └── preview/
    │       ├── PreviewArea.vue
    │       ├── VideoPlayer.vue
    │       ├── TranscriptOverlay.vue
    │       └── Timeline.vue
    ├── composables/         # 組合式函數
    │   ├── useVideoUpload.ts
    │   ├── useTranscript.ts
    │   ├── useHighlight.ts
    │   └── useVideoPlayer.ts
    ├── router/              # 路由配置
    │   └── index.ts
    ├── App.vue              # 根組件
    └── main.ts              # 應用入口
```

### 依賴方向規則

```
Framework Layer (UI, Web API, File System)
       ↓
  Adapter Layer
       ↓
Application Layer
       ↓
  Domain Layer
```

**核心原則**：
- 內層不依賴外層
- 外層可以依賴內層
- 通過介面（Interface）解耦

## Domain Layer 設計

### Entities

#### Video Entity
```typescript
export class Video {
  constructor(
    public readonly id: string,
    public readonly file: File,
    public readonly metadata: VideoMetadata,
    public url?: string
  ) {}

  get duration(): number {
    return this.metadata.duration;
  }

  get isReady(): boolean {
    return !!this.url;
  }
}
```

#### Transcript Entity
```typescript
export class Transcript {
  constructor(
    public readonly id: string,
    public readonly videoId: string,
    public readonly sections: Section[],
    public readonly fullText: string
  ) {}

  getSentenceById(sentenceId: string): Sentence | undefined {
    for (const section of this.sections) {
      const sentence = section.sentences.find(s => s.id === sentenceId);
      if (sentence) return sentence;
    }
    return undefined;
  }

  getAllSentences(): Sentence[] {
    return this.sections.flatMap(section => section.sentences);
  }
}
```

#### Section Entity
```typescript
export class Section {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly sentences: Sentence[]
  ) {}

  get timeRange(): TimeRange {
    const startTime = this.sentences[0]?.timeRange.start || new TimeStamp(0);
    const endTime = this.sentences[this.sentences.length - 1]?.timeRange.end || new TimeStamp(0);
    return new TimeRange(startTime, endTime);
  }
}
```

#### Sentence Entity
```typescript
export class Sentence {
  constructor(
    public readonly id: string,
    public readonly text: string,
    public readonly timeRange: TimeRange,
    public isSelected: boolean = false,
    public readonly isHighlightSuggestion: boolean = false
  ) {}

  select(): void {
    this.isSelected = true;
  }

  deselect(): void {
    this.isSelected = false;
  }

  toggle(): void {
    this.isSelected = !this.isSelected;
  }
}
```

#### Highlight Entity
```typescript
export class Highlight {
  constructor(
    public readonly id: string,
    public readonly videoId: string,
    public readonly sentences: Sentence[]
  ) {}

  get duration(): number {
    return this.sentences.reduce(
      (total, s) => total + s.timeRange.duration,
      0
    );
  }

  get timeRanges(): TimeRange[] {
    return this.sentences.map(s => s.timeRange);
  }
}
```

### Value Objects

#### TimeStamp
```typescript
export class TimeStamp {
  constructor(public readonly seconds: number) {
    if (seconds < 0) {
      throw new Error('TimeStamp cannot be negative');
    }
  }

  toString(): string {
    const minutes = Math.floor(this.seconds / 60);
    const secs = Math.floor(this.seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  static fromString(timeString: string): TimeStamp {
    const [minutes, seconds] = timeString.split(':').map(Number);
    return new TimeStamp(minutes * 60 + seconds);
  }
}
```

#### TimeRange
```typescript
export class TimeRange {
  constructor(
    public readonly start: TimeStamp,
    public readonly end: TimeStamp
  ) {
    if (end.seconds < start.seconds) {
      throw new Error('End time cannot be before start time');
    }
  }

  get duration(): number {
    return this.end.seconds - this.start.seconds;
  }

  contains(timestamp: TimeStamp): boolean {
    return timestamp.seconds >= this.start.seconds &&
           timestamp.seconds <= this.end.seconds;
  }
}
```

## Application Layer 設計

### Use Cases

#### UploadVideoUseCase
```typescript
export class UploadVideoUseCase {
  constructor(private videoRepository: IVideoRepository) {}

  async execute(file: File): Promise<Video> {
    // 驗證文件
    this.validateFile(file);

    // 建立 Video Entity
    const video = new Video(
      generateId(),
      file,
      await this.extractMetadata(file)
    );

    // 保存到 Repository
    await this.videoRepository.save(video);

    return video;
  }

  private validateFile(file: File): void {
    const allowedTypes = ['video/mp4', 'video/mov', 'video/webm'];
    const maxSize = 100 * 1024 * 1024; // 100MB

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Unsupported video format');
    }

    if (file.size > maxSize) {
      throw new Error('File size exceeds 100MB limit');
    }
  }
}
```

#### ProcessTranscriptUseCase
```typescript
export class ProcessTranscriptUseCase {
  constructor(
    private transcriptGenerator: ITranscriptGenerator,
    private transcriptRepository: ITranscriptRepository
  ) {}

  async execute(videoId: string): Promise<Transcript> {
    // 調用 Mock AI Service
    const transcriptData = await this.transcriptGenerator.generate(videoId);

    // 建立 Transcript Entity
    const transcript = this.buildTranscript(videoId, transcriptData);

    // 保存
    await this.transcriptRepository.save(transcript);

    return transcript;
  }
}
```

#### SelectSentenceUseCase
```typescript
export class SelectSentenceUseCase {
  constructor(private transcriptRepository: ITranscriptRepository) {}

  async execute(sentenceId: string, selected: boolean): Promise<void> {
    const transcript = await this.transcriptRepository.getByCurrentVideo();
    const sentence = transcript.getSentenceById(sentenceId);

    if (!sentence) {
      throw new Error('Sentence not found');
    }

    if (selected) {
      sentence.select();
    } else {
      sentence.deselect();
    }

    await this.transcriptRepository.update(transcript);
  }
}
```

## Adapter Layer 設計

### Mock AI Service

```typescript
export class MockAIService implements ITranscriptGenerator {
  async generate(videoId: string): Promise<TranscriptDTO> {
    // 模擬網絡延遲
    await this.delay(1500);

    // 返回 Mock 數據
    return this.getMockTranscript();
  }

  private getMockTranscript(): TranscriptDTO {
    return {
      fullText: "...",
      sections: [
        {
          id: "section_1",
          title: "開場介紹",
          sentences: [
            {
              id: "sent_1",
              text: "大家好，歡迎來到今天的分享。",
              startTime: 0.0,
              endTime: 3.2,
              isHighlight: true
            },
            // ... more sentences
          ]
        },
        // ... more sections
      ]
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Pinia Stores

#### Video Store
```typescript
export const useVideoStore = defineStore('video', () => {
  const video = ref<Video | null>(null);
  const isUploading = ref(false);
  const uploadProgress = ref(0);

  const uploadVideoUseCase = new UploadVideoUseCase(
    inject<IVideoRepository>(VideoRepositoryToken)!
  );

  async function uploadVideo(file: File) {
    isUploading.value = true;
    try {
      video.value = await uploadVideoUseCase.execute(file);
    } finally {
      isUploading.value = false;
      uploadProgress.value = 0;
    }
  }

  return {
    video,
    isUploading,
    uploadProgress,
    uploadVideo
  };
});
```

#### Transcript Store
```typescript
export const useTranscriptStore = defineStore('transcript', () => {
  const transcript = ref<Transcript | null>(null);
  const isProcessing = ref(false);
  const currentSentenceId = ref<string | null>(null);

  const processTranscriptUseCase = new ProcessTranscriptUseCase(
    inject<ITranscriptGenerator>(TranscriptGeneratorToken)!,
    inject<ITranscriptRepository>(TranscriptRepositoryToken)!
  );

  const selectSentenceUseCase = new SelectSentenceUseCase(
    inject<ITranscriptRepository>(TranscriptRepositoryToken)!
  );

  async function processVideo(videoId: string) {
    isProcessing.value = true;
    try {
      transcript.value = await processTranscriptUseCase.execute(videoId);
    } finally {
      isProcessing.value = false;
    }
  }

  async function toggleSentence(sentenceId: string) {
    const sentence = transcript.value?.getSentenceById(sentenceId);
    if (sentence) {
      await selectSentenceUseCase.execute(sentenceId, !sentence.isSelected);
    }
  }

  return {
    transcript,
    isProcessing,
    currentSentenceId,
    processVideo,
    toggleSentence
  };
});
```

## Framework Layer 設計

### 組件結構

#### 主要組件職責

| 組件 | 職責 |
|------|------|
| `SplitLayout.vue` | 響應式分屏佈局管理 |
| `VideoUpload.vue` | 視頻上傳 UI 和進度顯示 |
| `EditingArea.vue` | 編輯區容器，管理滾動和同步 |
| `SectionList.vue` | 渲染所有段落 |
| `SentenceItem.vue` | 單個句子的渲染和交互 |
| `PreviewArea.vue` | 預覽區容器 |
| `VideoPlayer.vue` | 視頻播放控制 |
| `TranscriptOverlay.vue` | 文字疊加層 |
| `Timeline.vue` | 高光時間軸 |

### 關鍵 Composables

#### useVideoPlayer
```typescript
export function useVideoPlayer() {
  const videoElement = ref<HTMLVideoElement | null>(null);
  const currentTime = ref(0);
  const isPlaying = ref(false);
  const duration = ref(0);

  function seekTo(time: number) {
    if (videoElement.value) {
      videoElement.value.currentTime = time;
    }
  }

  function play() {
    videoElement.value?.play();
    isPlaying.value = true;
  }

  function pause() {
    videoElement.value?.pause();
    isPlaying.value = false;
  }

  // 監聽 timeupdate 事件
  onMounted(() => {
    if (videoElement.value) {
      videoElement.value.addEventListener('timeupdate', () => {
        currentTime.value = videoElement.value!.currentTime;
      });
    }
  });

  return {
    videoElement,
    currentTime,
    isPlaying,
    duration,
    seekTo,
    play,
    pause
  };
}
```

#### useHighlight
```typescript
export function useHighlight() {
  const transcriptStore = useTranscriptStore();

  const selectedSentences = computed(() => {
    return transcriptStore.transcript
      ?.getAllSentences()
      .filter(s => s.isSelected) || [];
  });

  const highlightRanges = computed(() => {
    return selectedSentences.value.map(s => s.timeRange);
  });

  function getCurrentSentence(currentTime: number): Sentence | undefined {
    return selectedSentences.value.find(sentence =>
      sentence.timeRange.contains(new TimeStamp(currentTime))
    );
  }

  return {
    selectedSentences,
    highlightRanges,
    getCurrentSentence
  };
}
```

## 視頻片段播放實現

### 方案選擇

由於需要只播放選中的片段，有以下幾種實現方案：

1. **使用 Media Source Extensions (MSE)** - 複雜但性能好
2. **使用 timeupdate 事件 + seek** - 簡單但可能有卡頓
3. **使用 video.js 的 Playlist 功能** - 平衡方案

**選擇方案 3**：使用 video.js，在 timeupdate 中檢測並跳轉到下一個片段。

### 實現邏輯

```typescript
function setupHighlightPlayback() {
  const { highlightRanges } = useHighlight();
  let currentRangeIndex = 0;

  function onTimeUpdate() {
    const currentRange = highlightRanges.value[currentRangeIndex];

    if (!currentRange) return;

    // 如果超過當前片段結束時間
    if (currentTime.value >= currentRange.end.seconds) {
      currentRangeIndex++;

      // 跳轉到下一個片段
      if (currentRangeIndex < highlightRanges.value.length) {
        const nextRange = highlightRanges.value[currentRangeIndex];
        seekTo(nextRange.start.seconds);
      } else {
        // 播放完畢
        pause();
        currentRangeIndex = 0;
      }
    }

    // 如果當前時間不在任何片段範圍內（用戶手動拖動）
    const inAnyRange = highlightRanges.value.some(range =>
      range.contains(new TimeStamp(currentTime.value))
    );

    if (!inAnyRange && highlightRanges.value.length > 0) {
      // 跳轉到最近的片段
      const nearestRange = findNearestRange(currentTime.value);
      seekTo(nearestRange.start.seconds);
    }
  }
}
```

## 依賴注入配置

### DI Container Setup

```typescript
// di-container.ts
import { InjectionKey } from 'vue';

// Tokens
export const VideoRepositoryToken = Symbol('VideoRepository') as InjectionKey<IVideoRepository>;
export const TranscriptRepositoryToken = Symbol('TranscriptRepository') as InjectionKey<ITranscriptRepository>;
export const TranscriptGeneratorToken = Symbol('TranscriptGenerator') as InjectionKey<ITranscriptGenerator>;

// Setup
export function setupDependencies(app: App) {
  // Repositories
  app.provide(VideoRepositoryToken, new VideoRepositoryImpl());
  app.provide(TranscriptRepositoryToken, new TranscriptRepositoryImpl());

  // Services
  app.provide(TranscriptGeneratorToken, new MockAIService());
}
```

### 在 main.ts 中使用

```typescript
// main.ts
import { createApp } from 'vue';
import App from './App.vue';
import { setupDependencies } from './di-container';

const app = createApp(App);

setupDependencies(app);

app.mount('#app');
```

## 性能優化策略

### 1. 虛擬滾動
- 當句子數量超過 100 時，使用虛擬滾動減少 DOM 節點

### 2. 防抖與節流
- 視頻 timeupdate 事件節流（100ms）
- 滾動事件節流（50ms）
- 搜索輸入防抖（300ms）

### 3. 懶加載
- 視頻文件按需加載
- 組件動態導入

### 4. 記憶化計算
```typescript
const highlightDuration = computed(() => {
  return selectedSentences.value.reduce(
    (total, s) => total + s.timeRange.duration,
    0
  );
});
```

## 錯誤處理策略

### 錯誤類型

```typescript
export class VideoUploadError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'VideoUploadError';
  }
}

export class TranscriptProcessError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'TranscriptProcessError';
  }
}
```

### 全局錯誤處理

```typescript
export function setupErrorHandling(app: App) {
  app.config.errorHandler = (err, instance, info) => {
    console.error('Global error:', err);

    // 顯示用戶友好的錯誤訊息
    if (err instanceof VideoUploadError) {
      showNotification('視頻上傳失敗', err.message);
    } else if (err instanceof TranscriptProcessError) {
      showNotification('轉錄處理失敗', err.message);
    } else {
      showNotification('系統錯誤', '請稍後再試');
    }
  };
}
```

## 測試策略

### 單元測試重點
- Domain Entities 的業務邏輯
- Use Cases 的執行流程
- Value Objects 的驗證邏輯

### 組件測試重點
- SentenceItem 的選擇交互
- VideoPlayer 的播放控制
- Timeline 的視覺呈現

### 測試範例

```typescript
// Sentence.spec.ts
describe('Sentence', () => {
  it('should toggle selection state', () => {
    const sentence = new Sentence(
      '1',
      'Test sentence',
      new TimeRange(new TimeStamp(0), new TimeStamp(5)),
      false
    );

    expect(sentence.isSelected).toBe(false);
    sentence.toggle();
    expect(sentence.isSelected).toBe(true);
    sentence.toggle();
    expect(sentence.isSelected).toBe(false);
  });
});
```

## 部署方案

### 建議平台
1. **Vercel** - 首選，自動部署，性能好
2. **Netlify** - 備選方案
3. **GitHub Pages** - 簡單但功能有限

### 環境變數
```env
VITE_API_BASE_URL=https://api.example.com
VITE_MAX_VIDEO_SIZE=104857600  # 100MB
```

### 構建優化
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'video-vendor': ['video.js'],
          'ui-vendor': ['naive-ui']
        }
      }
    }
  }
});
```

## 技術風險與應對

| 風險 | 影響 | 應對策略 |
|------|------|----------|
| 視頻片段播放卡頓 | 高 | 優化跳轉邏輯，添加過渡動畫 |
| 大視頻文件性能問題 | 中 | 限制文件大小，優化加載策略 |
| 移動端播放器兼容性 | 中 | 使用 video.js 統一體驗 |
| 文字疊加同步延遲 | 低 | 使用 RAF 優化渲染時機 |

## 開發時程估算

| 階段 | 預估時間 |
|------|----------|
| Phase 1: 專案設置 | 0.5 天 |
| Phase 2: Domain Layer | 1 天 |
| Phase 3: Application Layer | 1.5 天 |
| Phase 4: Adapter Layer | 1.5 天 |
| Phase 5: UI Components | 3 天 |
| Phase 6: 整合與優化 | 2 天 |
| Phase 7: 測試與部署 | 1.5 天 |
| **總計** | **11 天** |

## 後續擴展可能性

1. **真實 AI 整合** - 替換 Mock Service 為真實 AI API
2. **多語言支援** - i18n 整合
3. **視頻編輯功能** - 裁切、濾鏡等
4. **導出功能** - 導出編輯後的視頻
5. **協作功能** - 多用戶同時編輯
6. **歷史記錄** - 編輯歷史和撤銷/重做
