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
│   ├── aggregates/           # 聚合
│   │   ├── Video.ts         # Video Aggregate Root
│   │   ├── Transcript/      # Transcript Aggregate
│   │   │   ├── Transcript.ts
│   │   │   ├── Section.ts
│   │   │   └── Sentence.ts
│   │   └── Highlight.ts     # Highlight Aggregate Root
│   ├── value-objects/        # 值物件
│   │   ├── TimeStamp.ts
│   │   ├── TimeRange.ts
│   │   └── VideoMetadata.ts
│   └── repositories/         # 儲存庫介面
│       ├── IVideoRepository.ts
│       ├── ITranscriptRepository.ts
│       └── IHighlightRepository.ts
│
├── application/              # Application Layer - 應用服務
│   ├── use-cases/           # 用例
│   │   ├── UploadVideoUseCase.ts
│   │   ├── ProcessTranscriptUseCase.ts
│   │   ├── CreateHighlightUseCase.ts
│   │   ├── ToggleSentenceInHighlightUseCase.ts
│   │   └── GenerateHighlightUseCase.ts
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
│   │   ├── TranscriptRepositoryImpl.ts
│   │   └── HighlightRepositoryImpl.ts
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

### Aggregate 設計原則

本專案採用 Domain-Driven Design (DDD) 的 Aggregate 模式來組織 Domain Layer。

#### 什麼是 Aggregate？
- **Aggregate（聚合）** 是一組相關物件的集合，作為數據變更的單位
- **Aggregate Root（聚合根）** 是聚合的入口點，外部只能通過它來訪問聚合內的物件
- **聚合邊界** 定義了一致性邊界，確保業務規則在邊界內得到保證

#### 為何需要 Aggregate？
1. **一致性保證**: 聚合內的業務規則由 Aggregate Root 統一管理
2. **封裝複雜性**: 隱藏內部結構，提供清晰的操作介面
3. **明確職責**: 每個 Aggregate Root 負責管理自己的聚合邊界
4. **事務邊界**: 一個 Repository 操作影響一個 Aggregate

#### Repository 與 Aggregate 的關係
> 原則：**只有 Aggregate Root 才有 Repository**

這意味著：
- ✅ `IVideoRepository` - Video 是 Aggregate Root
- ✅ `ITranscriptRepository` - Transcript 是 Aggregate Root
- ✅ `IHighlightRepository` - Highlight 是 Aggregate Root
- ❌ `ISectionRepository` - Section 屬於 Transcript 聚合，不應有獨立 Repository
- ❌ `ISentenceRepository` - Sentence 屬於 Transcript 聚合，不應有獨立 Repository

### 三個 Aggregate 設計

#### 1. Video Aggregate

**Aggregate Root**: `Video`

**聚合邊界**: 僅包含 Video 本身（單一實體聚合）

**職責**:
- 管理視頻文件的生命週期
- 提供視頻元數據查詢
- 驗證視頻狀態（是否準備好播放）

**為何是獨立聚合？**
- Video 的生命週期與 Transcript、Highlight 獨立
- Video 是其他聚合的參照對象（通過 `videoId` 關聯）
- 簡化設計，避免聚合過大

---

#### 2. Transcript Aggregate（唯讀數據源）

**Aggregate Root**: `Transcript`

**聚合邊界**:
```
Transcript (Root)
  └─ Section[] (Entity)
      └─ Sentence[] (Entity)
```

**職責**:
- 提供視頻轉錄內容的查詢
- 管理 Section 和 Sentence 的組織結構
- 確保轉錄數據的完整性

**關鍵特性**:
- **唯讀性**: Transcript 由 AI 生成後不可修改
- **對外可見性**: Section 和 Sentence 以 `readonly` 形式對外暴露
- **查詢導向**: 提供多種查詢方法（`getSentenceById`, `getAllSentences`）

**為何 Section 和 Sentence 是聚合內的 Entity？**
- 它們有唯一識別（`id`），但生命週期完全由 Transcript 管理
- 無法獨立存在，必須屬於某個 Transcript
- 不需要獨立的 Repository

**業務規則**:
- Transcript 生成後內容不可變
- Section 和 Sentence 的結構由 AI 決定
- 對外提供唯讀訪問

---

#### 3. Highlight Aggregate（可編輯的選擇）

**Aggregate Root**: `Highlight`

**聚合邊界**: 僅包含 Highlight 本身（單一實體聚合）

**職責**:
- 管理「哪些 Sentence 被選中」的關係
- 記錄選擇順序（`selectionOrder`）
- 提供排序功能（按選擇順序 vs 時間順序）
- 計算高光的總時長和時間範圍

**關鍵設計決策**:

**Q: 為何 `isSelected` 不在 Sentence 中？**
**A**: 因為「選中」是 Highlight 和 Sentence 之間的**關係**，不是 Sentence 的內在屬性。
- 同一個 Sentence 可能在多個不同的 Highlight 中有不同的選中狀態
- 例如：「精華版」Highlight 選中了句子 A，「完整版」Highlight 沒有選中句子 A
- 如果把 `isSelected` 放在 Sentence，就無法支援多個 Highlight 版本

**Q: 為何 Highlight 只存 `sentenceIds` 而不存 `Sentence[]`？**
**A**: 避免跨聚合的直接引用
- Sentence 屬於 Transcript 聚合
- Highlight 通過 ID 引用，保持聚合獨立性
- 需要實際 Sentence 數據時，通過 Transcript 查詢

**Q: 為何記錄 `selectionOrder`？**
**A**: 支援兩種排序方式
- **時間順序**: 按 Sentence 的時間範圍排序（自然播放順序）
- **選擇順序**: 按用戶選擇的先後順序排序（用戶可能想要不同的敘事順序）

**業務規則**:
- 一個 Video 可以有多個 Highlight（不同版本）
- 每個 Highlight 有獨立的名稱（`name`）
- Highlight 的選擇可以隨時修改（add/remove）
- Highlight 必須關聯到有效的 Video

---

### Entities 詳細設計

#### Video Entity (Aggregate Root)

**核心屬性**:
- `id: string` - 唯一識別碼
- `file: File` - 視頻文件
- `metadata: VideoMetadata` - 視頻元數據（Value Object）
- `url?: string` - 視頻 URL（可選，載入後生成）

**查詢方法**:
- `get duration(): number` - 獲取視頻時長
- `get isReady(): boolean` - 檢查視頻是否已準備好播放

**設計意圖**:
- 作為簡單的 Aggregate Root，管理視頻文件本身
- 提供視頻元數據的查詢介面
- 不包含轉錄或高光相關的業務邏輯

---

#### Transcript Entity (Aggregate Root)

**核心屬性**:
- `readonly id: string` - 轉錄 ID
- `readonly videoId: string` - 關聯的視頻 ID
- `readonly sections: ReadonlyArray<Section>` - 段落列表（唯讀）
- `readonly fullText: string` - 完整轉錄文字

**查詢方法**:
- `getSentenceById(sentenceId: string): Sentence | undefined` - 根據 ID 查找句子
- `getAllSentences(): Sentence[]` - 獲取所有句子（扁平化）
- `getSectionById(sectionId: string): Section | undefined` - 根據 ID 查找段落

**設計意圖**:
- 作為唯讀數據源，提供轉錄內容查詢
- Section 和 Sentence 以 `readonly` 形式對外暴露，確保不可變性
- 不包含「選擇」相關的邏輯（由 Highlight Aggregate 管理）

**可見性規則**:
- 外部可以讀取 `sections` 和 `sentences`
- 外部**不可以**直接修改 Section 或 Sentence

---

#### Section Entity（屬於 Transcript Aggregate）

**核心屬性**:
- `readonly id: string` - 段落 ID
- `readonly title: string` - 段落標題
- `readonly sentences: ReadonlyArray<Sentence>` - 句子列表（唯讀）

**計算屬性**:
- `get timeRange(): TimeRange` - 計算段落的時間範圍（從第一個到最後一個句子）

**設計意圖**:
- 組織和分組 Sentence
- 不可獨立存在，必須屬於 Transcript
- 生命週期由 Transcript 管理

---

#### Sentence Entity（屬於 Transcript Aggregate）

**核心屬性**:
- `readonly id: string` - 句子 ID
- `readonly text: string` - 句子文字
- `readonly timeRange: TimeRange` - 時間範圍（Value Object）
- `readonly isHighlightSuggestion: boolean` - 是否為 AI 建議的高光句子

**設計意圖**:
- 代表轉錄中的一個句子
- 不包含 `isSelected` 狀態（由 Highlight Aggregate 管理）
- 不包含 `select()` / `deselect()` 方法（違反聚合原則）

**為何移除 `isSelected`？**
- 「選中」是 Highlight 和 Sentence 的**關係**，不是 Sentence 的屬性
- 同一個 Sentence 可能在不同的 Highlight 中有不同的選中狀態

---

#### Highlight Entity (Aggregate Root)

**核心屬性**:
- `readonly id: string` - 高光 ID
- `readonly videoId: string` - 關聯的視頻 ID
- `readonly name: string` - 高光名稱（例如：「精華版」、「完整版」）
- `private selectedSentenceIds: Set<string>` - 選中的句子 ID 集合
- `private selectionOrder: string[]` - 選擇順序記錄

**選擇管理方法**:
- `addSentence(sentenceId: string): void` - 添加句子到選擇
- `removeSentence(sentenceId: string): void` - 從選擇中移除句子
- `toggleSentence(sentenceId: string): void` - 切換句子選中狀態
- `isSelected(sentenceId: string): boolean` - 檢查句子是否被選中

**查詢方法（需要 Transcript 協助）**:
- `getSelectedSentences(transcript: Transcript, sortBy: 'selection' | 'time'): Sentence[]` - 獲取選中的句子
- `getTimeRanges(transcript: Transcript, sortBy: 'selection' | 'time'): TimeRange[]` - 獲取時間範圍
- `getTotalDuration(transcript: Transcript): number` - 計算總時長

**設計意圖**:
- 管理「哪些句子被選中」的關係
- 支援一個視頻多個高光版本
- 提供靈活的排序方式（選擇順序 vs 時間順序）

**為何查詢方法需要傳入 Transcript？**
- Highlight 只存 `sentenceIds`（ID 引用）
- 需要實際的 Sentence 數據時，通過 Transcript 查詢
- 避免跨聚合的直接引用，保持聚合獨立性

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

---

#### CreateHighlightUseCase
**依賴**:
- `IHighlightRepository` - 高光儲存庫
- `IVideoRepository` - 視頻儲存庫（用於驗證 Video 存在）

**輸入**:
- `videoId: string` - 關聯的視頻 ID
- `name: string` - 高光名稱

**輸出**: `Promise<Highlight>` - 建立的高光實體

**職責**:
1. 驗證 Video 存在
2. 建立 Highlight Entity（初始狀態：沒有選中任何句子）
3. 儲存至 Repository

**驗證規則**:
- Video 必須存在
- 名稱不可為空

**錯誤處理**:
- Video 不存在時拋出 `VideoNotFoundError`

---

#### ToggleSentenceInHighlightUseCase
**依賴**:
- `IHighlightRepository` - 高光儲存庫

**輸入**:
- `highlightId: string` - 高光 ID
- `sentenceId: string` - 句子 ID

**輸出**: `Promise<void>`

**職責**:
1. 從 Repository 獲取 Highlight
2. 調用 `highlight.toggleSentence(sentenceId)` 切換選中狀態
3. 儲存變更至 Repository

**錯誤處理**:
- Highlight 不存在時拋出 `HighlightNotFoundError`

**設計說明**:
- 不需要 `ITranscriptRepository`，因為只是管理 ID 關係
- 通過 Aggregate Root 操作，確保聚合一致性

---

#### GenerateHighlightUseCase
**依賴**:
- `IHighlightRepository` - 高光儲存庫
- `ITranscriptRepository` - 轉錄儲存庫

**輸入**:
- `highlightId: string` - 高光 ID
- `sortBy: 'selection' | 'time'` - 排序方式

**輸出**:
```typescript
Promise<{
  sentences: Sentence[];
  timeRanges: TimeRange[];
  totalDuration: number;
}>
```

**職責**:
1. 從 Repository 獲取 Highlight
2. 從 Repository 獲取對應的 Transcript
3. 調用 `highlight.getSelectedSentences(transcript, sortBy)` 獲取選中的句子
4. 計算時間範圍和總時長
5. 返回生成結果

**錯誤處理**:
- Highlight 不存在時拋出 `HighlightNotFoundError`
- Transcript 不存在時拋出 `TranscriptNotFoundError`

**設計說明**:
- 這個 Use Case 協調兩個 Aggregate（Highlight 和 Transcript）
- 展示了跨聚合查詢的模式

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
- `playingSentenceId: string | null` - 當前播放的句子 ID（用於同步高亮）

**Actions**:
- `processVideo(videoId: string): Promise<void>` - 處理視頻轉錄

**依賴**:
- `ProcessTranscriptUseCase`

**設計說明**:
- 此 Store 只負責管理 Transcript 數據
- 不再包含 `toggleSentence` 方法（移至 highlightStore）
- `playingSentenceId` 用於視頻播放同步，不是業務狀態

---

#### Highlight Store (highlightStore.ts)
**狀態**:
- `currentHighlight: Highlight | null` - 當前編輯的高光
- `highlights: Highlight[]` - 所有高光版本（一個視頻可能有多個）
- `isLoading: boolean` - 載入狀態

**Getters**:
- `hasHighlight: boolean` - 是否有當前高光
- `selectedSentenceIds: string[]` - 當前高光選中的句子 ID（用於 UI 渲染）

**Actions**:
- `createHighlight(videoId: string, name: string): Promise<void>` - 建立新的高光
- `loadHighlights(videoId: string): Promise<void>` - 載入視頻的所有高光版本
- `switchHighlight(highlightId: string): void` - 切換當前編輯的高光
- `toggleSentence(sentenceId: string): Promise<void>` - 切換句子選中狀態
- `generatePreview(sortBy: 'selection' | 'time'): Promise<PreviewData>` - 生成預覽數據

**依賴**:
- `CreateHighlightUseCase`
- `ToggleSentenceInHighlightUseCase`
- `GenerateHighlightUseCase`
- `IHighlightRepository`

**設計說明**:
- 管理 Highlight 相關的所有操作
- 支援多個高光版本的管理
- 提供 UI 需要的計算屬性（`selectedSentenceIds`）

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
**職責**: 封裝高光相關的 UI 邏輯

**返回值**:
- `currentHighlight: ComputedRef<Highlight | null>` - 當前高光
- `selectedSentences: ComputedRef<Sentence[]>` - 選中的句子列表
- `highlightRanges: ComputedRef<TimeRange[]>` - 高光時間範圍
- `isSentenceSelected: (sentenceId: string) => boolean` - 檢查句子是否被選中
- `toggleSentence: (sentenceId: string) => Promise<void>` - 切換句子選中狀態
- `getCurrentSentence: (currentTime: number) => Sentence | undefined` - 獲取當前時間對應的句子

**實作要點**:
- 從 `highlightStore` 和 `transcriptStore` 獲取數據
- 使用 `computed` 計算選中句子和時間範圍
- 封裝常用的查詢和操作方法

**設計說明**:
- 作為 UI 層和 Store 層的橋接
- 簡化組件中的邏輯

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
HighlightRepositoryToken: InjectionKey<IHighlightRepository>
TranscriptGeneratorToken: InjectionKey<ITranscriptGenerator>
```

**註冊的實作**:
- `VideoRepositoryImpl` → `VideoRepositoryToken`
- `TranscriptRepositoryImpl` → `TranscriptRepositoryToken`
- `HighlightRepositoryImpl` → `HighlightRepositoryToken`
- `MockAIService` → `TranscriptGeneratorToken`

**使用方式**:
在 `main.ts` 中調用 `setupDependencies(app)` 完成依賴注入配置。

## 測試策略

### 單元測試重點
- **Domain Entities**:
  - `Highlight`: `addSentence()`, `removeSentence()`, `toggleSentence()` 邏輯
  - `TimeRange`: `contains()`, `duration` 計算
  - `Transcript`: 查詢方法（`getSentenceById`, `getAllSentences`）
- **Use Cases**:
  - `CreateHighlightUseCase`: 驗證流程
  - `ToggleSentenceInHighlightUseCase`: 聚合操作
  - `GenerateHighlightUseCase`: 跨聚合協調
- **Value Objects**: 驗證邏輯（如時間範圍檢查、TimeStamp 格式化）

### 組件測試重點
- **SentenceItem**: 選擇/取消選擇交互（調用 `highlightStore.toggleSentence`）
- **VideoPlayer**: 播放、暫停、跳轉控制
- **Timeline**: 視覺呈現和同步行為（基於 `highlightRanges`）

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
