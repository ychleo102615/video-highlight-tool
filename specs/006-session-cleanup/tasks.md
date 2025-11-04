---
description: 'Task list for session cleanup feature implementation'
---

# Tasks: 會話清理與刪除 (Session Cleanup)

**Input**: Design documents from `/specs/006-session-cleanup/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: 無明確要求測試,本文件不包含測試任務

**Organization**: 任務按 User Story 組織,每個 story 可獨立實作與測試

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: 可平行執行(不同檔案、無依賴)
- **[Story]**: 屬於哪個 User Story (US1, US2, US3)
- 所有任務包含精確檔案路徑

---

## Phase 1: Setup (無需額外設置)

**Purpose**: 本功能使用現有專案結構,無需額外初始化

✅ 專案結構已存在,跳過此階段

---

## Phase 2: Foundational (Application Layer 基礎)

**Purpose**: 建立核心 Use Case 和 DTO,所有 User Stories 的基礎

**⚠️ CRITICAL**: 此階段完成前無法開始任何 User Story

- [X] T001 [P] 建立 DeleteSessionResultDTO 在 src/application/dto/DeleteSessionResultDTO.ts
- [X] T002 建立 DeleteSessionUseCase 在 src/application/use-cases/DeleteSessionUseCase.ts (定義介面,暫不實作邏輯)
- [X] T003 在 src/di/container.ts 註冊 DeleteSessionUseCase

**Checkpoint**: Application Layer 基礎建立完成,可開始 User Story 實作

---

## Phase 3: User Story 3 - 刪除前的安全確認 (Priority: P1) 🎯 MVP Component

**Goal**: 建立確認對話框機制,防止使用者誤刪資料

**Independent Test**: 點擊刪除按鈕後,應顯示對話框,列出刪除範圍,提供「取消」與「確認刪除」選項

### Implementation for User Story 3

- [X] T004 [P] [US3] 建立 useDeleteConfirmation composable 在 src/presentation/composables/useDeleteConfirmation.ts
- [X] T005 [US3] 在 src/presentation/App.vue 確認已有 n-dialog-provider (若無則新增)
- [X] T006 [US3] 驗證對話框顯示與取消/確認流程 (手動測試:點擊按鈕 → 對話框出現 → ESC 或取消關閉)

**Checkpoint**: 確認對話框機制完成,可與 US1 整合

---

## Phase 4: User Story 1 - 手動刪除當前會話資料 (Priority: P1) 🎯 MVP Core

**Goal**: 使用者能透過按鈕刪除當前會話的所有資料,並重置應用狀態

**Independent Test**: 上傳視頻 → 點擊刪除按鈕 → 確認刪除 → 驗證 IndexedDB 清空、sessionStorage 清空、UI 重置為初始上傳介面

### Implementation for User Story 1

#### Infrastructure Layer (資料刪除)

- [X] T007 [US1] 在 src/infrastructure/storage/BrowserStorage.ts 實作 deleteSession(sessionId: string) 方法 (使用 Transaction + Cursor 批次刪除 videos/transcripts/highlights)
- [X] T008 [US1] 在 BrowserStorage.deleteSession() 中新增錯誤處理 (每個 store 獨立 try-catch,允許部分失敗)

#### Application Layer (業務邏輯協調)

- [X] T009 [US1] 在 src/application/use-cases/DeleteSessionUseCase.ts 完成 execute() 實作 (協調 BrowserStorage.deleteSession() + sessionStorage.removeItem() + stores.reset())

#### Presentation Layer (UI 與狀態管理)

- [X] T010 [P] [US1] 在 src/presentation/stores/videoStore.ts 新增 reset() 方法 (手動重置 video, isUploading 狀態)
- [X] T011 [P] [US1] 在 src/presentation/stores/transcriptStore.ts 新增 reset() 方法 (手動重置 transcript, currentSentenceId 狀態)
- [X] T012 [P] [US1] 在 src/presentation/stores/highlightStore.ts 新增 reset() 方法 (手動重置 highlights, selectedSentenceIds 狀態)
- [X] T013 [US1] 在 src/presentation/stores/videoStore.ts 新增 deleteSession() action (調用 DeleteSessionUseCase.execute() 並處理結果,依序調用 highlightStore.reset() → transcriptStore.reset() → videoStore.reset())
- [X] T014 [US1] 建立 DeleteButton 組件在 src/presentation/components/DeleteButton.vue (整合 useDeleteConfirmation 和 videoStore.deleteSession(),根據 videoStore.video 判斷 disabled 狀態)
- [X] T015 [US1] 在 src/App.vue 加入 DeleteButton 組件 (加入到 header 中)

#### Integration & Validation

- [X] T016 [US1] 手動端到端測試:上傳視頻 → 刪除 → 驗證 IndexedDB 清空 (使用 Chrome DevTools 檢查 videos/transcripts/highlights stores)
- [X] T017 [US1] 手動測試:刪除後驗證 sessionStorage 中無 session_id key
- [X] T018 [US1] 手動測試:刪除後驗證 UI 完全重置 (videoStore.video === null, 顯示上傳介面)
- [X] T019 [US1] 手動測試:錯誤處理流程 (模擬 IndexedDB 失敗,驗證顯示友善錯誤訊息)

**Checkpoint**: User Story 1 核心功能完成,使用者可完整執行刪除流程

---

## Phase 5: User Story 2 - 了解自動清理機制 (Priority: P2)

**Goal**: 使用者透過 UI 說明文字了解系統的 24 小時自動清理機制

**Independent Test**: 檢視刪除按鈕旁的說明文字,確認清楚傳達自動清理政策

### Implementation for User Story 2

- [X] T020 [US2] 在 src/presentation/components/AppHeader.vue 的 DeleteButton 旁新增說明文字 (小字:「系統會在應用啟動時自動清理超過 24 小時的會話資料」)
- [X] T021 [US2] 手動測試:驗證說明文字在 Desktop 和 Mobile 版本的可讀性 (字體大小、顏色、位置)
- [X] T022 [US2] 手動測試:驗證說明文字與按鈕的間距與對齊 (RWD 檢查)

**Checkpoint**: User Story 2 完成,使用者可透過 UI 了解自動清理機制

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 改進影響多個 User Stories 的項目

- [X] T023 [P] 多分頁隔離測試:開啟兩個分頁,分別上傳視頻,在分頁 A 刪除,驗證分頁 B 不受影響 (參考 tests/PHASE6_TESTING_GUIDE.md)
- [X] T024 [P] 無障礙功能測試:使用 Tab 鍵導航到刪除按鈕 → Enter 觸發 → Tab 切換對話框按鈕 → ESC 關閉 (參考 tests/PHASE6_TESTING_GUIDE.md)
- [X] T025 [P] 性能測試:使用 tests/performance/create-mock-sessions.html 創建 100 個會話記錄,執行刪除,驗證完成時間 < 3 秒
- [X] T026 [P] RWD 測試:在 Desktop (1920x1080) 和 Mobile (375x667) 驗證刪除按鈕與說明文字的顯示 (參考 tests/PHASE6_TESTING_GUIDE.md)
- [X] T027 程式碼清理:移除 console.log 除錯語句,確認無 TypeScript 錯誤 (npm run type-check)
- [X] T028 執行 quickstart.md 驗證:按照 quickstart.md 的測試步驟完整驗證所有功能 (參考 tests/PHASE6_TESTING_GUIDE.md)

**Checkpoint**: 所有功能完成並驗證,準備合併到 main

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 跳過 (專案已存在)
- **Foundational (Phase 2)**: 無依賴 - 可立即開始 - **BLOCKS 所有 User Stories**
- **User Story 3 (Phase 3)**: 依賴 Foundational 完成 (需要 DeleteSessionUseCase 介面)
- **User Story 1 (Phase 4)**: 依賴 Foundational 和 US3 完成 (需要確認對話框機制)
- **User Story 2 (Phase 5)**: 依賴 US1 完成 (需要 DeleteButton 組件已存在)
- **Polish (Phase 6)**: 依賴所有 User Stories 完成

### User Story Dependencies

- **US3 (P1)**: 可在 Foundational 完成後開始 - 獨立於其他 stories
- **US1 (P1)**: 需要 US3 完成 (整合確認對話框)
- **US2 (P2)**: 需要 US1 完成 (在 DeleteButton 旁加入說明)

### Within Each User Story

- **US3**: composable → App.vue 修改 → 手動測試
- **US1**:
  - Infrastructure (T007, T008) 可先行
  - Application (T009) 依賴 Infrastructure
  - Presentation Stores (T010-T012) 可平行執行
  - videoStore.deleteSession (T013) 依賴 Stores reset 方法
  - DeleteButton (T014) 依賴 T013
  - AppHeader (T015) 依賴 T014
  - 整合測試 (T016-T019) 依賴所有實作完成
- **US2**: 單一組件修改 (T020) → 手動測試 (T021, T022)

### Parallel Opportunities

- **Foundational Phase**: T001, T002 可平行 (不同檔案)
- **US3**: T004 可與 T005 平行
- **US1**:
  - T010, T011, T012 (三個 stores 的 reset) 可平行
  - T016, T017, T018, T019 (不同測試情境) 可平行
- **Polish Phase**: T023, T024, T025, T026 可平行 (不同測試類型)

---

## Parallel Example: User Story 1 - Stores Reset

```bash
# 可同時執行的任務 (不同檔案):
Task T010: "在 src/presentation/stores/videoStore.ts 新增 reset() 方法"
Task T011: "在 src/presentation/stores/transcriptStore.ts 新增 reset() 方法"
Task T012: "在 src/presentation/stores/highlightStore.ts 新增 reset() 方法"
```

---

## Parallel Example: Polish Phase - Testing

```bash
# 可同時執行的任務 (不同測試情境):
Task T023: "多分頁隔離測試"
Task T024: "無障礙功能測試"
Task T025: "性能測試"
Task T026: "RWD 測試"
```

---

## Implementation Strategy

### MVP First (US3 + US1 核心功能)

1. Complete Phase 2: Foundational (T001-T003)
2. Complete Phase 3: US3 確認對話框 (T004-T006)
3. Complete Phase 4: US1 核心刪除功能 (T007-T019)
4. **STOP and VALIDATE**: 測試刪除流程端到端 (上傳 → 刪除 → 驗證清空)
5. 若驗證通過,可先合併 MVP,再繼續 US2

### Incremental Delivery

1. Foundational → Application Layer 基礎建立
2. US3 → 確認對話框機制完成 → 可單獨驗證
3. US1 → 完整刪除流程 → 端到端測試 → **MVP 可展示**
4. US2 → 說明文字 → 提升 UX → 可獨立驗證
5. Polish → 全面測試 → 準備合併

### Sequential Execution (單人開發建議)

由於 US1 依賴 US3,US2 依賴 US1,建議順序執行:

1. Phase 2 (Foundational) → 必須完成
2. Phase 3 (US3) → 建立對話框機制
3. Phase 4 (US1) → 核心刪除功能 (可在此停止並展示 MVP)
4. Phase 5 (US2) → 說明文字 (快速完成)
5. Phase 6 (Polish) → 全面驗證

---

## Notes

- **[P] 標記**: 可平行執行的任務 (不同檔案、無依賴關係)
- **[Story] 標記**: 映射到 spec.md 的 User Stories
- **測試策略**: 本功能以手動測試為主 (端到端驗證 IndexedDB 清空、UI 重置)
- **錯誤處理**: 所有 IndexedDB 操作必須有 try-catch,失敗時顯示友善訊息
- **無障礙**: 確認對話框支援鍵盤導航 (Tab, Enter, ESC)
- **效能目標**: 完整刪除流程 < 3 秒 (從點擊到狀態重置)
- **多分頁隔離**: SessionStorage 天然隔離,IndexedDB 按 sessionId 隔離,無需額外處理

---

## Total Task Count: 28 tasks

- **Foundational**: 3 tasks (T001-T003)
- **User Story 3**: 3 tasks (T004-T006)
- **User Story 1**: 13 tasks (T007-T019)
- **User Story 2**: 3 tasks (T020-T022)
- **Polish**: 6 tasks (T023-T028)

**Parallel Opportunities**: 12 tasks marked [P] (43% parallelizable)

**Suggested MVP Scope**: Foundational + US3 + US1 (19 tasks, 核心刪除功能)
