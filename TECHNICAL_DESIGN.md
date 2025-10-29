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
**核心屬性**:
- `id: string` - 唯一識別碼
- `file: File` - 視頻文件
- `metadata: VideoMetadata` - 視頻元數據
- `url?: string` - 視頻 URL（可選）

**核心方法**:
- `get duration(): number` - 獲取視頻時長
- `get isReady(): boolean` - 檢查視頻是否已準備好播放

#### Transcript Entity
**核心屬性**:
- `id: string` - 轉錄 ID
- `videoId: string` - 關聯的視頻 ID
- `sections: Section[]` - 段落列表
- `fullText: string` - 完整轉錄文字

**核心方法**:
- `getSentenceById(sentenceId: string): Sentence | undefined` - 根據 ID 查找句子
- `getAllSentences(): Sentence[]` - 獲取所有句子（扁平化）

#### Section Entity
**核心屬性**:
- `id: string` - 段落 ID
- `title: string` - 段落標題
- `sentences: Sentence[]` - 句子列表

**核心方法**:
- `get timeRange(): TimeRange` - 獲取段落的時間範圍

#### Sentence Entity
**核心屬性**:
- `id: string` - 句子 ID
- `text: string` - 句子文字
- `timeRange: TimeRange` - 時間範圍
- `isSelected: boolean` - 是否被選中
- `isHighlightSuggestion: boolean` - 是否為 AI 建議的高光句子

**核心方法**:
- `select(): void` - 選中句子
- `deselect(): void` - 取消選中
- `toggle(): void` - 切換選中狀態

#### Highlight Entity
**核心屬性**:
- `id: string` - 高光 ID
- `videoId: string` - 關聯的視頻 ID
- `sentences: Sentence[]` - 選中的句子列表

**核心方法**:
- `get duration(): number` - 計算高光總時長
- `get timeRanges(): TimeRange[]` - 獲取所有時間範圍

### Value Objects

#### TimeStamp
**屬性**:
- `seconds: number` - 秒數（必須 >= 0）

**方法**:
- `toString(): string` - 格式化為 "MM:SS"
- `static fromString(timeString: string): TimeStamp` - 從字串解析

**驗證規則**:
- seconds 不可為負數

#### TimeRange
**屬性**:
- `start: TimeStamp` - 起始時間
- `end: TimeStamp` - 結束時間

**方法**:
- `get duration(): number` - 計算時長
- `contains(timestamp: TimeStamp): boolean` - 檢查時間是否在範圍內

**驗證規則**:
- end 不可早於 start

## Application Layer 設計

### Use Cases

#### UploadVideoUseCase
**依賴**:
- `IVideoRepository` - 視頻儲存庫

**輸入**: `File` - 視頻文件

**輸出**: `Promise<Video>` - 建立的視頻實體

**職責**:
1. 驗證視頻文件格式和大小
2. 提取視頻元數據（時長、尺寸等）
3. 建立 Video Entity
4. 儲存至 Repository

**驗證規則**:
- 允許格式: `video/mp4`, `video/mov`, `video/webm`
- 最大大小: 100MB

#### ProcessTranscriptUseCase
**依賴**:
- `ITranscriptGenerator` - 轉錄生成服務（Mock AI）
- `ITranscriptRepository` - 轉錄儲存庫

**輸入**: `videoId: string` - 視頻 ID

**輸出**: `Promise<Transcript>` - 建立的轉錄實體

**職責**:
1. 調用 Mock AI Service 生成轉錄
2. 將 DTO 轉換為 Domain Entity
3. 儲存至 Repository

#### SelectSentenceUseCase
**依賴**:
- `ITranscriptRepository` - 轉錄儲存庫

**輸入**:
- `sentenceId: string` - 句子 ID
- `selected: boolean` - 選中狀態

**輸出**: `Promise<void>`

**職責**:
1. 從 Repository 獲取 Transcript
2. 查找指定 Sentence
3. 更新選中狀態
4. 儲存變更

**錯誤處理**:
- 句子不存在時拋出錯誤

## Adapter Layer 設計

### Mock AI Service

**實作介面**: `ITranscriptGenerator`

**職責**:
- 模擬 AI 轉錄生成過程
- 返回預設的轉錄數據

**實作要點**:
- 模擬 1.5 秒網絡延遲（`setTimeout`）
- 準備 2-3 組不同主題的 Mock 數據
- 數據格式符合 `TranscriptDTO` 規範

**Mock 數據結構**:
```typescript
TranscriptDTO {
  fullText: string
  sections: [
    {
      id: string
      title: string
      sentences: [
        {
          id: string
          text: string
          startTime: number
          endTime: number
          isHighlight: boolean
        }
      ]
    }
  ]
}
```

### Pinia Stores

#### Video Store (videoStore.ts)
**狀態**:
- `video: Video | null` - 當前視頻
- `isUploading: boolean` - 上傳中狀態
- `uploadProgress: number` - 上傳進度（0-100）

**Actions**:
- `uploadVideo(file: File): Promise<void>` - 上傳視頻

**依賴**:
- `UploadVideoUseCase` - 注入自 DI Container

#### Transcript Store (transcriptStore.ts)
**狀態**:
- `transcript: Transcript | null` - 當前轉錄
- `isProcessing: boolean` - 處理中狀態
- `currentSentenceId: string | null` - 當前播放的句子 ID

**Actions**:
- `processVideo(videoId: string): Promise<void>` - 處理視頻轉錄
- `toggleSentence(sentenceId: string): Promise<void>` - 切換句子選中狀態

**依賴**:
- `ProcessTranscriptUseCase`
- `SelectSentenceUseCase`

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
**職責**: 封裝視頻播放器控制邏輯

**返回值**:
- `videoElement: Ref<HTMLVideoElement | null>` - 視頻 DOM 元素
- `currentTime: Ref<number>` - 當前播放時間
- `isPlaying: Ref<boolean>` - 播放狀態
- `duration: Ref<number>` - 視頻總時長
- `seekTo(time: number): void` - 跳轉到指定時間
- `play(): void` - 播放
- `pause(): void` - 暫停

**實作要點**:
- 監聽 `timeupdate` 事件更新 `currentTime`
- 監聽 `loadedmetadata` 事件獲取 `duration`

#### useHighlight
**職責**: 管理高光片段相關邏輯

**返回值**:
- `selectedSentences: ComputedRef<Sentence[]>` - 所有選中的句子
- `highlightRanges: ComputedRef<TimeRange[]>` - 高光時間範圍
- `getCurrentSentence(currentTime: number): Sentence | undefined` - 獲取當前時間對應的句子

**實作要點**:
- 從 `transcriptStore` 獲取數據
- 使用 `computed` 計算選中句子
- 使用 `TimeRange.contains()` 判斷時間範圍

## 視頻片段播放實現

### 方案選擇

由於需要只播放選中的片段，有以下幾種實現方案：

| 方案 | 優點 | 缺點 | 評估 |
|------|------|------|------|
| Media Source Extensions (MSE) | 性能最佳，無卡頓 | 實作複雜，開發成本高 | ❌ 不適合展示專案 |
| timeupdate + seek | 實作簡單，易於理解 | 可能有輕微卡頓 | ⚠️ 需優化體驗 |
| video.js Playlist | 功能完整，兼容性好 | 需學習 API | ✅ **採用此方案** |

**最終選擇**: 使用 video.js 結合 `timeupdate` 事件監聽，在時間超出當前片段時跳轉到下一個片段。

### 核心實現邏輯

**片段切換機制**:
1. 監聽 `timeupdate` 事件
2. 檢查當前時間是否超出當前片段的 `endTime`
3. 如果超出，跳轉到下一個片段的 `startTime`
4. 如果是最後一個片段，暫停播放

**處理用戶手動拖動**:
- 檢測時間是否在任何片段範圍內
- 如果不在，跳轉到最近的片段起始時間

**優化要點**:
- 添加短暫的淡入淡出過渡效果
- 使用 `requestAnimationFrame` 優化 seek 時機
- 考慮添加 loading 狀態提升體驗

## 依賴注入配置

### DI Container Setup

**檔案**: `di-container.ts`

**Injection Tokens**:
```typescript
VideoRepositoryToken: InjectionKey<IVideoRepository>
TranscriptRepositoryToken: InjectionKey<ITranscriptRepository>
TranscriptGeneratorToken: InjectionKey<ITranscriptGenerator>
```

**註冊的實作**:
- `VideoRepositoryImpl` → `VideoRepositoryToken`
- `TranscriptRepositoryImpl` → `TranscriptRepositoryToken`
- `MockAIService` → `TranscriptGeneratorToken`

**使用方式**:
在 `main.ts` 中調用 `setupDependencies(app)` 完成依賴注入配置。

## 測試策略

### 單元測試重點
- **Domain Entities**: 業務邏輯（如 `Sentence.toggle()`, `TimeRange.contains()`）
- **Use Cases**: 執行流程和錯誤處理
- **Value Objects**: 驗證邏輯（如時間範圍檢查）

### 組件測試重點
- **SentenceItem**: 選擇/取消選擇交互
- **VideoPlayer**: 播放、暫停、跳轉控制
- **Timeline**: 視覺呈現和同步行為

### 測試工具
- Vitest（單元測試）
- Vue Test Utils（組件測試）

## 部署方案

### 建議平台
1. **Vercel** - 首選（自動部署、性能優異）
2. **Netlify** - 備選方案
3. **GitHub Pages** - 簡單靜態部署

### 環境配置
- 視頻大小限制: 100MB（透過環境變數配置）
- 構建優化: 分離 video.js 和 UI 框架到不同 chunk

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
