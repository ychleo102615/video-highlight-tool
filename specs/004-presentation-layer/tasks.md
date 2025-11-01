# Tasks: Presentation Layer Development

**Input**: Design documents from `/specs/004-presentation-layer/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Not explicitly requested in feature specification - tests are OPTIONAL and not included in this task list.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

單一專案結構：`src/` 和 `tests/` 位於專案根目錄

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 專案初始化與基礎設定

- [ ] T001 安裝新依賴套件（tailwindcss@next, @tailwindcss/vite@next, video.js, @types/video.js, naive-ui, @heroicons/vue）
- [ ] T002 [P] 設定 Tailwind CSS v4 在 vite.config.ts 中新增 tailwindcss() 插件
- [ ] T003 [P] 建立 src/assets/main.css 並加入 @import "tailwindcss"
- [ ] T004 [P] 更新 src/main.ts 引入 ./assets/main.css
- [ ] T005 建立 Presentation Layer 資料夾結構（components/layout, components/upload, components/editing, components/preview, composables, stores, types）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 核心基礎設施，必須在任何 User Story 開始前完成

**⚠️ 關鍵**: 所有 User Story 都必須等待此階段完成

### Application Layer 更新

- [ ] T006 [P] 新增 IMockDataProvider Port 在 src/application/ports/IMockDataProvider.ts
- [ ] T007 [P] 更新 IFileStorage Port 在 src/application/ports/IFileStorage.ts 新增 onProgress 回調參數
- [ ] T008 更新 UploadVideoUseCase 在 src/application/use-cases/UploadVideoUseCase.ts 的 execute 方法新增 onProgress 參數
- [ ] T009 [P] 新增 UploadVideoWithMockTranscriptUseCase 在 src/application/use-cases/UploadVideoWithMockTranscriptUseCase.ts

### Infrastructure Layer 更新

- [ ] T010 [P] 更新 MockAIService 在 src/infrastructure/api/MockAIService.ts 實作 IMockDataProvider 介面
- [ ] T011 [P] 更新 FileStorageService 在 src/infrastructure/storage/FileStorageService.ts 支援 onProgress 回調

### DI Container 設定

- [ ] T012 更新 DI Container 在 src/di/container.ts 註冊 MockDataProvider 和 UploadVideoWithMockTranscriptUseCase

### Type Definitions

- [ ] T013 [P] 建立 Store Contracts 在 src/presentation/types/store-contracts.ts（複製自 specs/004-presentation-layer/contracts/）
- [ ] T014 [P] 建立 Component Contracts 在 src/presentation/types/component-contracts.ts（複製自 specs/004-presentation-layer/contracts/）
- [ ] T015 建立型別統一匯出檔 src/presentation/types/index.ts

**Checkpoint**: 基礎設施就緒 - 現在可以開始平行實作 User Story

---

## Phase 3: User Story 1 - 視頻上傳與初始化 (Priority: P1) 🎯 MVP

**Goal**: 使用者能上傳視頻文件、看到上傳進度、並在完成後觸發 AI 處理以生成轉錄內容和預設高光

**Independent Test**:
1. 選擇有效視頻文件（MP4, MOV, WEBM）→ 顯示上傳進度 → 完成後自動處理轉錄 → 建立預設高光
2. 選擇超過 100MB 的文件 → 顯示錯誤訊息「文件大小超過 100MB 限制」
3. 選擇不支援格式（AVI）→ 顯示錯誤訊息「不支援的視頻格式」
4. 同時上傳視頻和轉錄 JSON → 使用 JSON 資料而非 Mock AI

### Implementation for User Story 1

- [ ] T016 [P] [US1] 建立 videoStore 在 src/presentation/stores/videoStore.ts（State: video, isUploading, uploadProgress, error）
- [ ] T017 [P] [US1] 建立 transcriptStore 在 src/presentation/stores/transcriptStore.ts（State: transcript, isProcessing, playingSentenceId, error）
- [ ] T018 [P] [US1] 建立 highlightStore 在 src/presentation/stores/highlightStore.ts（State: currentHighlight, isLoading, error）
- [ ] T019 [P] [US1] 建立 useVideoUpload composable 在 src/presentation/composables/useVideoUpload.ts
- [ ] T020 [P] [US1] 建立 useTranscript composable 在 src/presentation/composables/useTranscript.ts
- [ ] T021 [US1] 建立 VideoUpload 組件在 src/presentation/components/upload/VideoUpload.vue（支援視頻和可選轉錄 JSON 檔案上傳）
- [ ] T022 [US1] 整合 VideoUpload 到 App.vue 並測試上傳流程（包含錯誤處理和進度顯示）
- [ ] T023 [US1] 測試上傳完成後自動觸發轉錄處理和預設高光建立

**Checkpoint**: 此時 User Story 1 應完全可用且可獨立測試（視頻上傳 → AI 處理 → 預設高光建立）

---

## Phase 4: User Story 2 - 瀏覽和選擇高光句子 (Priority: P1)

**Goal**: 使用者能在編輯區查看結構化的轉錄內容（段落、句子、時間戳），並能點擊句子切換選中狀態

**Independent Test**:
1. 視頻處理完成 → 編輯區顯示段落和句子，AI 建議的句子已選中（藍色邊框 + 淺藍背景）
2. 點擊未選中句子 → 變為選中（視覺標示出現）
3. 點擊已選中句子 → 取消選中（視覺標示移除）
4. 選中狀態在 50ms 內響應（流暢無延遲）

### Implementation for User Story 2

- [ ] T024 [P] [US2] 建立 useHighlight composable 在 src/presentation/composables/useHighlight.ts
- [ ] T025 [P] [US2] 建立 SentenceItem 組件在 src/presentation/components/editing/SentenceItem.vue（顯示句子、時間戳、選中狀態視覺化）
- [ ] T026 [P] [US2] 建立 SectionItem 組件在 src/presentation/components/editing/SectionItem.vue（顯示段落標題和句子列表）
- [ ] T027 [US2] 建立 SectionList 組件在 src/presentation/components/editing/SectionList.vue（渲染所有段落）
- [ ] T028 [US2] 建立 EditingArea 組件在 src/presentation/components/editing/EditingArea.vue（容器組件，處理滾動）
- [ ] T029 [US2] 整合 EditingArea 到 App.vue 並測試句子選擇功能
- [ ] T030 [US2] 驗證選中狀態的視覺反饋（未選中、選中、播放中三種狀態）

**Checkpoint**: 此時 User Stories 1 和 2 都應該獨立運作（上傳視頻 → 顯示轉錄 → 選擇句子）

---

## Phase 5: User Story 3 - 預覽高光視頻 (Priority: P1)

**Goal**: 使用者能在預覽區播放選中的高光片段（跳過未選中部分），並能使用標準播放控制

**Independent Test**:
1. 選擇至少一個句子 → 點擊播放 → 只播放選中片段，跳過未選中部分
2. 片段切換時過渡流暢（< 100ms 卡頓感）
3. 點擊暫停 → 視頻暫停在當前位置
4. 拖動進度條到非選中區域 → 跳轉到最近的選中片段起點
5. 無選中句子時 → 顯示提示「請在編輯區選擇至少一個句子來建立高光片段」

### Implementation for User Story 3

- [ ] T031 [P] [US3] 建立 useVideoPlayer composable 在 src/presentation/composables/useVideoPlayer.ts（封裝 video.js 和片段播放邏輯）
- [ ] T032 [US3] 建立 VideoPlayer 組件在 src/presentation/components/preview/VideoPlayer.vue（使用 video.js 播放器）
- [ ] T033 [US3] 實作片段播放機制在 useVideoPlayer.ts（基於 timeupdate 事件 + seekTo 方法）
- [ ] T034 [P] [US3] 建立 EmptyState 組件在 src/presentation/components/common/EmptyState.vue（顯示空狀態提示）
- [ ] T035 [US3] 建立 PreviewArea 組件在 src/presentation/components/preview/PreviewArea.vue（容器組件，整合 VideoPlayer）
- [ ] T036 [US3] 整合 PreviewArea 到 App.vue 並測試片段播放功能
- [ ] T037 [US3] 測試邊緣情況（無選中句子、拖動到非選中區域、片段切換流暢度）

**Checkpoint**: 此時 User Stories 1, 2, 3 都應該獨立運作（上傳 → 選擇 → 預覽片段）

---

## Phase 6: User Story 4 - 文字疊加同步顯示 (Priority: P2)

**Goal**: 預覽視頻時，選中的句子文字疊加在視頻上，且時間與音頻精確同步（< 100ms 誤差）

**Independent Test**:
1. 播放高光片段 → 當前句子文字疊加在視頻底部（半透明黑底白字）
2. 播放時間超出句子結束時間 → 文字消失，進入下一句時顯示新文字
3. 文字出現/消失時有淡入淡出效果（300ms 過渡）
4. 文字時間與音頻同步（誤差 < 100ms）

### Implementation for User Story 4

- [ ] T038 [US4] 建立 TranscriptOverlay 組件在 src/presentation/components/preview/TranscriptOverlay.vue（文字疊加層，支援淡入淡出）
- [ ] T039 [US4] 整合 TranscriptOverlay 到 PreviewArea.vue 並實作時間同步邏輯
- [ ] T040 [US4] 測試文字同步精確度（使用 useVideoPlayer 的 currentTime 更新 transcriptStore.playingSentenceId）
- [ ] T041 [US4] 驗證文字疊加樣式（位置、背景、過渡效果）

**Checkpoint**: 此時 User Stories 1-4 都應該獨立運作（上傳 → 選擇 → 預覽 + 文字疊加）

---

## Phase 7: User Story 5 - 時間軸視覺化與導航 (Priority: P2)

**Goal**: 預覽區顯示時間軸，視覺化呈現選中片段的時間分布，支援點擊跳轉

**Independent Test**:
1. 選擇多個句子 → 時間軸顯示所有選中片段的時間範圍（藍色區塊）
2. 點擊時間軸上的片段區塊 → 視頻跳轉到該片段起點
3. 播放時進度指示器隨視頻移動
4. 修改句子選擇 → 時間軸即時更新（< 200ms 延遲）

### Implementation for User Story 5

- [ ] T042 [US5] 建立 Timeline 組件在 src/presentation/components/preview/Timeline.vue（時間軸視覺化，支援點擊跳轉）
- [ ] T043 [US5] 整合 Timeline 到 PreviewArea.vue 並實作片段區塊渲染
- [ ] T044 [US5] 實作播放進度指示器在 Timeline.vue（監聽 currentTime 變化）
- [ ] T045 [US5] 測試時間軸點擊跳轉和即時更新功能

**Checkpoint**: 此時 User Stories 1-5 都應該獨立運作（上傳 → 選擇 → 預覽 + 文字 + 時間軸）

---

## Phase 8: User Story 6 - 編輯區與預覽區雙向同步 (Priority: P1)

**Goal**: 編輯區和預覽區互動同步：點擊時間戳跳轉視頻、播放時編輯區高亮當前句子並自動滾動

**Independent Test**:
1. 點擊編輯區的時間戳 → 預覽區視頻跳轉到該時間（< 100ms 延遲）
2. 預覽區播放時 → 編輯區當前句子高亮（深藍背景 + 粗邊框）
3. 當前句子不在可見範圍 → 編輯區自動滾動使其可見（< 100ms）
4. 修改句子選擇 → 預覽區內容即時更新（< 200ms 延遲）

### Implementation for User Story 6

- [ ] T046 [US6] 實作時間戳點擊跳轉在 SentenceItem.vue（emit seek 事件）
- [ ] T047 [US6] 實作預覽區 → 編輯區同步在 EditingArea.vue（監聽 playingSentenceId 變化並高亮 + 滾動）
- [ ] T048 [US6] 實作編輯區 → 預覽區同步在 PreviewArea.vue（監聽 seek 事件並更新 VideoPlayer）
- [ ] T049 [US6] 測試雙向同步的正確性和效能（延遲 < 100-200ms）
- [ ] T050 [US6] 測試自動滾動機制（scrollIntoView 實作）

**Checkpoint**: 此時 User Stories 1-6 都應該獨立運作（完整的雙向同步體驗）

---

## Phase 9: User Story 7 - 響應式佈局 (Priority: P2)

**Goal**: 應用在不同設備（桌面、平板、手機）上佈局自動調整，確保良好的使用體驗

**Independent Test**:
1. 桌面瀏覽器（> 1024px）→ 左右分屏佈局（編輯區左、預覽區右）
2. 平板/手機（≤ 768px）→ 上下堆疊佈局（編輯區上、預覽區下）
3. iOS Safari 上所有功能正常運作（無兼容性問題）
4. Android Chrome 上所有功能正常運作

### Implementation for User Story 7

- [ ] T051 [US7] 建立 SplitLayout 組件在 src/presentation/components/layout/SplitLayout.vue（響應式分屏容器）
- [ ] T052 [US7] 整合 EditingArea 和 PreviewArea 到 SplitLayout 中
- [ ] T053 [US7] 更新 App.vue 使用 SplitLayout 作為主佈局
- [ ] T054 [US7] 調整移動端樣式（觸控目標 ≥ 44x44px、字級適中）
- [ ] T055 [US7] 測試桌面和移動端佈局切換（使用瀏覽器開發者工具模擬不同螢幕尺寸）
- [ ] T056 [US7] 在實際 iOS 和 Android 裝置上測試功能（特別是視頻播放和自動播放限制）

**Checkpoint**: 此時所有 User Stories 都應該在桌面和移動端正常運作

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: 改進和優化多個 User Story 的共通問題

- [ ] T057 [P] 新增錯誤邊界在關鍵組件（VideoPlayer, EditingArea）捕獲執行時錯誤
- [ ] T058 [P] 效能優化：為 timeupdate 事件添加 requestAnimationFrame 防抖
- [ ] T059 [P] 效能優化：長列表渲染優化（考慮使用虛擬滾動，如有需要）
- [ ] T060 [P] 無障礙性改善：確保色彩對比度符合 WCAG AA 標準（4.5:1）
- [ ] T061 [P] 新增 Loading 狀態指示器（使用 Naive UI 的 NSpin 組件）
- [ ] T062 [P] 新增成功/錯誤通知（使用 Naive UI 的 NNotificationProvider）
- [ ] T063 程式碼清理和重構（移除未使用的程式碼、統一命名風格）
- [ ] T064 執行 TypeScript 型別檢查（npm run type-check）確保無錯誤
- [ ] T065 執行 ESLint 檢查（npm run lint）確保無 linting 錯誤
- [ ] T066 執行 quickstart.md 驗證（確認所有設定步驟正確）
- [ ] T067 建置專案（npm run build）並驗證 Bundle 大小 < 500KB (gzip)
- [ ] T068 本地預覽（npm run preview）並測試完整工作流程

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無依賴 - 可立即開始
- **Foundational (Phase 2)**: 依賴 Setup 完成 - 阻擋所有 User Story
- **User Stories (Phase 3-9)**: 全部依賴 Foundational 完成
  - User Stories 可以平行進行（如果有足夠人力）
  - 或按優先順序依序執行（P1 → P2）
- **Polish (Phase 10)**: 依賴所有想要的 User Story 完成

### User Story Dependencies

- **User Story 1 (P1) - 視頻上傳**: 依賴 Foundational - 無其他 Story 依賴
- **User Story 2 (P1) - 選擇句子**: 依賴 Foundational - 獨立可測，但與 US1 整合以完整工作流程
- **User Story 3 (P1) - 預覽片段**: 依賴 Foundational - 需要 US1, US2 的資料但應獨立可測
- **User Story 4 (P2) - 文字疊加**: 依賴 US3（VideoPlayer）- 增強預覽功能
- **User Story 5 (P2) - 時間軸**: 依賴 US3（PreviewArea）- 增強預覽功能
- **User Story 6 (P1) - 雙向同步**: 依賴 US2（EditingArea）和 US3（PreviewArea）- 整合兩個區域
- **User Story 7 (P2) - 響應式佈局**: 依賴所有組件完成 - 最後的佈局整合

### Within Each User Story

- Stores 必須在 Composables 之前
- Composables 必須在 Components 之前
- 基礎組件（SentenceItem）必須在容器組件（EditingArea）之前
- 核心實作完成後才進行整合和測試

### Parallel Opportunities

- Phase 1 中所有標記 [P] 的任務可以平行執行
- Phase 2 中所有標記 [P] 的任務可以平行執行（在 Phase 2 內部）
- T016, T017, T018（三個 Stores）可以平行建立
- T019, T020（兩個 Composables）可以平行建立
- T024, T025, T026（編輯區的基礎組件）可以平行建立
- 一旦 Foundational 完成，不同 User Stories 可以由不同團隊成員平行開發

---

## Parallel Example: Foundational Phase

```bash
# 同時啟動 Application Layer 更新：
Task: "新增 IMockDataProvider Port 在 src/application/ports/IMockDataProvider.ts"
Task: "更新 IFileStorage Port 在 src/application/ports/IFileStorage.ts"
Task: "新增 UploadVideoWithMockTranscriptUseCase 在 src/application/use-cases/UploadVideoWithMockTranscriptUseCase.ts"

# 同時啟動 Infrastructure Layer 更新：
Task: "更新 MockAIService 在 src/infrastructure/api/MockAIService.ts"
Task: "更新 FileStorageService 在 src/infrastructure/storage/FileStorageService.ts"

# 同時啟動 Type Definitions：
Task: "建立 Store Contracts 在 src/presentation/types/store-contracts.ts"
Task: "建立 Component Contracts 在 src/presentation/types/component-contracts.ts"
```

## Parallel Example: User Story 1

```bash
# 同時建立三個 Stores：
Task: "建立 videoStore 在 src/presentation/stores/videoStore.ts"
Task: "建立 transcriptStore 在 src/presentation/stores/transcriptStore.ts"
Task: "建立 highlightStore 在 src/presentation/stores/highlightStore.ts"

# 同時建立 Composables：
Task: "建立 useVideoUpload composable 在 src/presentation/composables/useVideoUpload.ts"
Task: "建立 useTranscript composable 在 src/presentation/composables/useTranscript.ts"
```

## Parallel Example: User Story 2

```bash
# 同時建立基礎組件：
Task: "建立 SentenceItem 組件在 src/presentation/components/editing/SentenceItem.vue"
Task: "建立 SectionItem 組件在 src/presentation/components/editing/SectionItem.vue"
Task: "建立 useHighlight composable 在 src/presentation/composables/useHighlight.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1, 2, 3, 6 Only - 核心 P1 功能)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational（關鍵 - 阻擋所有 Stories）
3. 完成 Phase 3: User Story 1（視頻上傳）
4. 完成 Phase 4: User Story 2（選擇句子）
5. 完成 Phase 5: User Story 3（預覽片段）
6. 完成 Phase 8: User Story 6（雙向同步）
7. **停止並驗證**: 測試核心工作流程（上傳 → 選擇 → 預覽 + 同步）
8. 如果就緒則部署/展示

### Incremental Delivery

1. 完成 Setup + Foundational → 基礎就緒
2. 新增 User Story 1 → 獨立測試 → 部署/展示（MVP 第一步！）
3. 新增 User Story 2 → 獨立測試 → 部署/展示
4. 新增 User Story 3 → 獨立測試 → 部署/展示
5. 新增 User Story 6 → 獨立測試 → 部署/展示（核心 MVP 完成）
6. 新增 User Story 4 → 獨立測試 → 部署/展示（增強功能）
7. 新增 User Story 5 → 獨立測試 → 部署/展示（增強功能）
8. 新增 User Story 7 → 獨立測試 → 部署/展示（響應式支援）
9. 每個 Story 增加價值而不破壞先前的 Stories

### Parallel Team Strategy

使用多位開發者：

1. 團隊一起完成 Setup + Foundational
2. 一旦 Foundational 完成：
   - 開發者 A: User Story 1 + 2（編輯區）
   - 開發者 B: User Story 3 + 4 + 5（預覽區）
   - 開發者 C: User Story 6 + 7（整合和響應式）
3. Stories 獨立完成並整合

---

## Notes

- [P] 任務 = 不同檔案，無依賴關係
- [Story] 標籤將任務對應到特定 User Story，方便追蹤
- 每個 User Story 應該可以獨立完成和測試
- 在每個 Checkpoint 停止以獨立驗證 Story
- 避免：模糊的任務、相同檔案衝突、破壞獨立性的跨 Story 依賴
- 建議順序：先完成所有 P1 優先級的 User Stories（1, 2, 3, 6），再考慮 P2（4, 5, 7）

---

## Summary

- **Total Tasks**: 68
- **Task Count by Phase**:
  - Setup: 5 tasks
  - Foundational: 10 tasks
  - User Story 1: 8 tasks
  - User Story 2: 7 tasks
  - User Story 3: 7 tasks
  - User Story 4: 4 tasks
  - User Story 5: 4 tasks
  - User Story 6: 5 tasks
  - User Story 7: 6 tasks
  - Polish: 12 tasks

- **Parallel Opportunities**: 共 24 個任務標記為 [P]，可以平行執行
- **MVP Scope**: User Stories 1, 2, 3, 6（核心上傳、編輯、預覽、同步功能）
- **Enhanced Features**: User Stories 4, 5, 7（文字疊加、時間軸、響應式）

- **Format Validation**: ✅ 所有任務遵循 checklist 格式（checkbox + ID + [P] + [Story] + 描述 + 檔案路徑）
