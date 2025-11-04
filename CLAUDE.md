# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# **使用繁體中文**

# 反幻覺指示

你必須在回答前先進行「事實檢查思考」(fact-check thinking)。 除非使用者明確提供、或資料中確實存在，否則不得假設、推測或自行創造內容。

具體規則如下：

1. **嚴格依據來源**
   - 僅使用使用者提供的內容、你內部明確記載的知識、或經明確查證的資料。
   - 若資訊不足，請直接說明「沒有足夠資料」或「我無法確定」，不要臆測。

2. **顯示思考依據**
   - 若你引用資料或推論，請說明你依據的段落或理由。
   - 若是個人分析或估計，必須明確標註「這是推論」或「這是假設情境」。

3. **避免裝作知道**
   - 不可為了讓答案完整而「補完」不存在的內容。
   - 若遇到模糊或不完整的問題，請先回問確認或提出選項，而非自行決定。

4. **保持語意一致**
   - 不可改寫或擴大使用者原意。
   - 若你需要重述，應明確標示為「重述版本」，並保持語義對等。

5. **回答格式**
   - 若有明確資料：回答並附上依據。
   - 若無明確資料：回答「無法確定」並說明原因。
   - 不要在回答中使用「應該是」「可能是」「我猜」等模糊語氣，除非使用者要求。

6. **思考深度**
   - 在產出前，先檢查答案是否： a. 有清楚依據
     b. 未超出題目範圍
     c. 沒有出現任何未被明確提及的人名、數字、事件或假設

最終原則：**寧可空白，不可捏造。**

# 架構

採用 Clean Architecture、Domain Driven Development (DDD) 原則來組織程式碼。

- 四層架構（Domain, Application, Infrastracture, Presentation）
- Use Case 設計原則
- 依賴注入配置

# 專案 Memory 文件

> 本文件記錄專案的關鍵資訊、決策記錄和開發上下文，供開發過程中快速查閱。

## 專案快速概覽

### 專案資訊

- **專案名稱**: Video Highlight Tool
- **專案類型**: Frontend Homework Assignment
- **目標平台**: Web (Desktop & Mobile)

### 核心技術棧

```
Vue 3 + TypeScript + Tailwind v4 + Vite + Pinia + Naive UI + video.js
```

### 專案目標

建立一個視頻高光編輯工具的展示版本，允許用戶：

1. 上傳視頻
2. 透過 Mock AI 獲取轉錄和高光建議
3. 選擇/編輯高光片段
4. 預覽編輯後的高光視頻（含文字疊加）

### 架構原則

- ✅ Clean Architecture（四層架構）
- ✅ Domain-Driven Development (DDD)
- ✅ 依賴注入
- ✅ 單向數據流

## 重要決策記錄 (ADR)

### ADR-001: 使用 video.js 而非原生 HTML5 Video

**日期**: 2024-10-29
**狀態**: ✅ 已採納

**背景**:
需要實現複雜的視頻播放功能，包括片段播放、時間軸控制等。

**決策**:
使用 video.js 作為視頻播放器解決方案

**理由**:

1. 跨瀏覽器兼容性好（iOS Safari 等）
2. 提供豐富的 API 和插件系統
3. 社群活躍，文檔完善
4. 支援自定義 UI

**替代方案**:

- 原生 HTML5 Video: 功能受限，兼容性需自行處理
- Plyr: 較輕量，但功能不如 video.js 豐富

**後果**:

- 正面: 減少開發時間，提高穩定性
- 負面: 增加 bundle 大小（約 200KB）

---

### ADR-002: 片段播放使用 Seek + TimeUpdate 方案

**日期**: 2024-10-29
**狀態**: ✅ 已採納

**背景**:
需要實現只播放選中句子的片段，跳過未選中部分。

**決策**:
使用 timeupdate 事件監聽 + seekTo 方法跳轉

**理由**:

1. 實現簡單，不需要複雜的視頻處理
2. 適用於展示型專案
3. 不需要後端支援

**替代方案**:

- Media Source Extensions (MSE): 過於複雜，開發成本高
- 伺服器端視頻剪輯: 需要後端，超出專案範圍

**後果**:

- 正面: 快速實現，易於維護
- 負面: 片段切換可能有輕微延遲（需優化）

---

### ADR-003: 使用 Mock Service 而非真實 AI API

**日期**: 2024-10-29
**狀態**: ✅ 已採納

**背景**:
作業要求使用 Mock API 模擬 AI 處理。

**決策**:
建立 MockAIService 類別，返回預設的 JSON 數據

**理由**:

1. 符合作業要求
2. 無需申請 AI API 金鑰
3. 開發速度快，可專注於 UI 和交互
4. 易於後續替換為真實 API

**實作細節**:

- 模擬 1.5 秒處理延遲
- 準備 2-3 組不同主題的 Mock 數據
- 數據格式與真實 API 保持一致

**後續計劃**:

- Phase 2 可考慮接入真實 AI API (如 OpenAI Whisper)

## 開發指南

### 開發流程

1. **建立新功能**

   ```bash
   # 1. 從 Domain Layer 開始，定義 Entity 或 Value Object
   # 2. 建立對應的 Use Case (Application Layer)
   # 3. 實作 Repository  (Infrastructure Layer)
   # 4. 建立 UI 組件 (Presentation Layer)
   # 5. 撰寫測試
   ```

2. **依賴方向檢查**
   - 確保內層不依賴外層
   - 使用介面解耦
   - 透過 DI Container 注入依賴

### 資料夾結構速查

```
src/
├── domain/          # 🔴 核心業務邏輯，不依賴任何外層
├── application/     # 🟡 應用服務層，編排 domain
├── infrastructure/  # 🟢 適配器層，連接外部
└── presentation/    # 🔵 UI 層，Vue 組件
```

**記憶口訣**: 紅 → 黃 → 綠 → 藍（由內到外）

### 命名規範

| 類型         | 規範                         | 範例                             |
| ------------ | ---------------------------- | -------------------------------- |
| Entity       | PascalCase, 名詞             | `Video`, `Transcript`            |
| Value Object | PascalCase, 名詞             | `TimeStamp`, `TimeRange`         |
| Use Case     | PascalCase + UseCase 後綴    | `UploadVideoUseCase`             |
| Repository   | PascalCase + Repository 後綴 | `VideoRepository`                |
| Store        | camelCase + Store 後綴       | `videoStore`, `transcriptStore`  |
| Component    | PascalCase                   | `VideoPlayer.vue`                |
| Composable   | camelCase, use 前綴          | `useVideoPlayer`, `useHighlight` |

### 型別定義位置

| 型別            | 定義位置                                     |
| --------------- | -------------------------------------------- |
| Domain 型別     | `domain/entities/`, `domain/value-objects/`  |
| DTO             | `application/dto/`                           |
| Interface       | `domain/repositories/`, `application/ports/` |
| API Response    | `adapter/api/types.ts`                       |
| Component Props | 組件內部使用 `defineProps<T>()`              |

## 關鍵概念速查

### 1. Entity vs Value Object

**Entity (實體)**:

- 有唯一識別 (ID)
- 可變 (mutable)
- 例如: `Video`, `Transcript`, `Sentence`

**Value Object (值物件)**:

- 無唯一識別
- 不可變 (immutable)
- 透過值比較相等性
- 例如: `TimeStamp`, `TimeRange`

### 2. Use Case 設計模式

```typescript
export class SomeUseCase {
  constructor(private dependency: IDependency) {}

  async execute(input: InputDTO): Promise<OutputDTO> {
    // 1. 驗證輸入
    // 2. 執行業務邏輯
    // 3. 返回結果
  }
}
```

### 3. Repository Pattern

```typescript
// Interface (domain layer)
export interface IVideoRepository {
  save(video: Video): Promise<void>;
  findById(id: string): Promise<Video | null>;
}

// Implementation (adapter layer)
export class VideoRepositoryImpl implements IVideoRepository {
  private videos = new Map<string, Video>();

  async save(video: Video): Promise<void> {
    this.videos.set(video.id, video);
  }

  async findById(id: string): Promise<Video | null> {
    return this.videos.get(id) || null;
  }
}
```

### 4. Composable 模式

```typescript
export function useFeature() {
  const state = ref(initialValue);

  function action() {
    // do something
  }

  const computed = computed(() => {
    // compute something
  });

  return {
    state,
    action,
    computed
  };
}
```

## 常見問題 (FAQ)

### Q1: 為什麼要使用 Clean Architecture？

**A**:

1. **關注點分離**: 業務邏輯與 UI 框架解耦
2. **可測試性**: 核心邏輯不依賴外部，易於單元測試
3. **可維護性**: 清晰的層次結構，易於理解和修改
4. **可擴展性**: 容易替換外層實作（如替換 UI 框架）

### Q2: Domain Layer 可以使用外部套件嗎？

**A**:

- ❌ 不可使用 UI 框架 (Vue, React)
- ❌ 不可使用狀態管理 (Pinia, Vuex)
- ❌ 不可使用 HTTP 客戶端 (axios)
- ✅ 可使用工具函式庫 (lodash, date-fns) - 但建議最小化
- ✅ 可使用 TypeScript 標準庫

### Q3: 何時該建立新的 Use Case？

**A**: 當有以下情況之一時：

1. 用戶的一個完整操作流程（如「上傳視頻」）
2. 需要協調多個 Entity 的操作
3. 包含業務規則驗證
4. 需要在多處重用的邏輯

### Q4: Store 和 Use Case 的關係？

**A**:

- **Store**: 管理狀態，呼叫 Use Case
- **Use Case**: 執行業務邏輯，不知道 Store 的存在
- **流程**: Component → Store → Use Case → Repository

```typescript
// Store 中使用 Use Case
export const useVideoStore = defineStore('video', () => {
  const uploadVideoUseCase = new UploadVideoUseCase(videoRepo);

  async function uploadVideo(file: File) {
    const video = await uploadVideoUseCase.execute(file);
    // 更新 store state
  }
});
```

### Q5: 如何處理視頻片段切換的卡頓？

**A**:

1. 添加短暫的淡入淡出過渡
2. 預加載下一個片段
3. 使用 `requestAnimationFrame` 優化 seek 時機
4. 考慮添加 loading 狀態

### Q6: Mobile 上自動播放被阻擋怎麼辦？

**A**:

1. 不要自動播放，等待用戶點擊
2. 顯示明確的播放按鈕
3. 在用戶交互後再初始化播放器

### Q7: 如何確保編輯區和預覽區同步？

**A**:
使用 Pinia Store 作為單一數據源：

```typescript
// 預覽區更新時
watch(currentTime, (time) => {
  const sentence = getCurrentSentence(time);
  transcriptStore.currentSentenceId = sentence?.id;
});

// 編輯區監聽
watch(
  () => transcriptStore.currentSentenceId,
  (id) => {
    scrollToSentence(id);
    highlightSentence(id);
  }
);
```

### Q8: Mock 數據應該多詳細？

**A**:

- 視頻時長: 2-5 分鐘
- 段落數: 5-10 個
- 每段句子數: 3-8 個
- 句子長度: 10-30 字
- 高光比例: 20-30%
- 時間戳: 符合自然說話節奏

範例:

```json
{
  "id": "sent_1",
  "text": "大家好，歡迎來到今天的分享。",
  "startTime": 0.0,
  "endTime": 3.2,
  "isHighlightSuggestion": true
}
```

## 關鍵檔案速查

### 必讀檔案

| 檔案                  | 內容               | 何時查閱            |
| --------------------- | ------------------ | ------------------- |
| `REQUIREMENTS.md`     | 完整需求拆解       | 不確定功能範圍時    |
| `TECHNICAL_DESIGN.md` | 技術架構和實作細節 | 開發前和開發中      |
| `CLAUDE.md`           | AI 協作規則        | 使用 Claude Code 時 |

### 待建立的關鍵檔案

```
src/
├── domain/
│   └── entities/Video.ts          # 第一個要建立
├── application/
│   └── use-cases/UploadVideoUseCase.ts
├── infrastructure/
│   └── api/MockAIService.ts       # 包含 Mock 數據
└── presentation/
    └── components/VideoUpload.vue # 第一個 UI 組件
```

## Mock 數據範例參考

### 範例 1: 技術分享主題

```json
{
  "videoId": "video_001",
  "title": "前端架構設計分享",
  "duration": 180,
  "sections": [
    {
      "id": "sec_1",
      "title": "開場介紹",
      "sentences": [
        {
          "id": "sent_1",
          "text": "大家好，今天要和大家分享前端架構設計的經驗。",
          "startTime": 0.0,
          "endTime": 4.5,
          "isHighlightSuggestion": true
        },
        {
          "id": "sent_2",
          "text": "我們會討論 Clean Architecture 在前端的應用。",
          "startTime": 4.5,
          "endTime": 8.0,
          "isHighlightSuggestion": true
        }
      ]
    },
    {
      "id": "sec_2",
      "title": "Clean Architecture 介紹",
      "sentences": [
        {
          "id": "sent_3",
          "text": "Clean Architecture 是由 Robert Martin 提出的軟體架構模式。",
          "startTime": 8.0,
          "endTime": 13.5,
          "isHighlightSuggestion": false
        },
        {
          "id": "sent_4",
          "text": "核心理念是讓業務邏輯獨立於框架和外部依賴。",
          "startTime": 13.5,
          "endTime": 18.0,
          "isHighlightSuggestion": true
        }
      ]
    }
  ]
}
```

### 範例 2: 產品介紹主題

```json
{
  "videoId": "video_002",
  "title": "新產品功能展示",
  "duration": 240,
  "sections": [
    {
      "id": "sec_1",
      "title": "產品概述",
      "sentences": [
        {
          "id": "sent_1",
          "text": "歡迎觀看我們最新產品的功能展示。",
          "startTime": 0.0,
          "endTime": 3.5,
          "isHighlightSuggestion": true
        }
      ]
    }
  ]
}
```

## 效能基準目標

| 指標               | 目標值         | 測量方式        |
| ------------------ | -------------- | --------------- |
| 首次內容繪製 (FCP) | < 1.5s         | Lighthouse      |
| 最大內容繪製 (LCP) | < 2.5s         | Lighthouse      |
| 視頻上傳回應       | < 100ms        | 手動測試        |
| 句子選擇回應       | < 50ms         | 手動測試        |
| 預覽更新延遲       | < 200ms        | 手動測試        |
| Bundle 大小        | < 500KB (gzip) | `npm run build` |

### 3. 視頻播放問題

```typescript
// 添加詳細日誌
videoElement.addEventListener('error', (e) => {
  console.error('Video error:', {
    error: e,
    src: videoElement.src,
    networkState: videoElement.networkState,
    readyState: videoElement.readyState
  });
});
```

### 4. 時間同步問題

```typescript
// 監控時間差異
watch([currentTime, currentSentenceTime], ([video, sentence]) => {
  const diff = Math.abs(video - sentence);
  if (diff > 0.5) {
    console.warn('Time sync issue:', { video, sentence, diff });
  }
});
```

## 部署檢查清單

### 部署前

- [ ] 所有測試通過 (`npm run test`)
- [ ] 沒有 TypeScript 錯誤 (`npm run type-check`)
- [ ] 沒有 ESLint 錯誤 (`npm run lint`)
- [ ] Build 成功 (`npm run build`)
- [ ] 本地預覽正常 (`npm run preview`)

### 功能檢查

- [ ] 視頻上傳成功
- [ ] Mock AI 處理正常
- [ ] 轉錄內容顯示正確
- [ ] 句子選擇/取消選擇正常
- [ ] 時間戳點擊跳轉正常
- [ ] 預覽播放正常
- [ ] 片段切換流暢
- [ ] 文字疊加同步
- [ ] 編輯區自動滾動
- [ ] RWD 在各尺寸正常

### 部署後

- [ ] 部署 URL 可訪問
- [ ] HTTPS 正常
- [ ] 所有資源載入成功
- [ ] 控制台無錯誤
- [ ] 效能符合目標

## Active Technologies
- TypeScript 5.9.0 + Vue 3.5.22, Pinia 3.0.3, idb 8.0.3, Naive UI 2.43.1 (006-session-cleanup)
- IndexedDB (視頻檔案 + Entity DTOs) + SessionStorage (sessionId) (006-session-cleanup)

- TypeScript ^5.0.0 + 無（Domain Layer 不依賴任何外部框架，僅使用 TypeScript 標準庫） (001-domain-layer)
- N/A（儲存由 Infrastructure Layer 負責，此層僅定義 Repository 介面） (001-domain-layer)
- TypeScript ^5.0.0 + 僅依賴 Domain Layer（無外部框架依賴） (002-application-layer)
- N/A（Application Layer 定義 Repository 介面，由 Infrastructure Layer 實作） (002-application-layer)
- TypeScript ^5.0.0 + idb (Jake Archibald's IndexedDB Promise wrapper) (003-infrastructure-layer)
- IndexedDB (視頻檔案 + 所有 Entity DTO) + SessionStorage (sessionId) (003-infrastructure-layer)
- TypeScript ^5.9.0 + Vue 3 ^3.5.22 + Pinia ^3.0.3, video.js ^8.0.0（待安裝）, Naive UI ^2.40.0（待安裝）, @heroicons/vue（待安裝）, Tailwind CSS v4（待設定） (004-presentation-layer)
- N/A（Presentation Layer 不直接操作儲存，通過 Use Case 和 Repository） (004-presentation-layer)
- TypeScript 5.9.0 + Vue 3.5.22, Pinia 3.0.3, idb 8.0.3, video.js 8.23.4, Naive UI 2.43.1 (005-session-restore)
- IndexedDB (視頻檔案 + 所有 Entity) + SessionStorage (sessionId) (005-session-restore)

## Recent Changes

- 005-session-restore: Completed session restore feature implementation - RestoreSessionUseCase, SessionRestorer component, error handling, and validation
- 001-domain-layer: Added TypeScript ^5.0.0 + 無（Domain Layer 不依賴任何外部框架，僅使用 TypeScript 標準庫）
