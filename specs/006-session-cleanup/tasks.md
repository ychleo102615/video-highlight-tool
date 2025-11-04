---
description: 'Task list for 會話清除功能 (Session Cleanup)'
---

# Tasks: 會話清除功能 (Session Cleanup)

**Input**: Design documents from `/specs/006-session-cleanup/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: This feature includes E2E tests as specified in quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Project structure: `src/`, `tests/` at repository root
- Architecture: Clean Architecture (Domain → Application → Infrastructure → Presentation)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create foundational structure for session cleanup feature

- [X] T001 Review existing project structure and dependencies to understand integration points

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core domain and application layer components that MUST be complete before ANY user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 [P] Create ISessionRepository interface in src/domain/repositories/ISessionRepository.ts
- [X] T003 [P] Create SessionCleanupError class in src/application/errors/SessionCleanupError.ts
- [X] T004 Create CleanupSessionUseCase in src/application/use-cases/CleanupSessionUseCase.ts (depends on T002, T003)
- [X] T005 Implement SessionRepositoryImpl in src/infrastructure/repositories/SessionRepositoryImpl.ts (depends on T002) - MUST delete all session Entities (Video, Transcript, Highlight) using IndexedDB Transaction to ensure atomicity
- [X] T006 Register SessionRepositoryImpl and CleanupSessionUseCase in DI container at src/di/container.ts (depends on T004, T005)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 3 - 分頁重整時保留會話資料 (Priority: P1) 🎯 Critical Path

**Goal**: 確保分頁重整時不會誤觸發清除邏輯，保護現有 session-restore 功能的正常運作

**Why First**: 這是關鍵防護邏輯，必須先確保重整不會觸發清除，才能安全實作其他清除功能

**Independent Test**: 上傳視頻並編輯 → 重整頁面 (F5) → 確認資料仍存在且可繼續編輯

### Implementation for User Story 3

- [X] T007 [US3] Create useSessionCleanup composable skeleton in src/presentation/composables/useSessionCleanup.ts
- [X] T008 [US3] Implement beforeunload event handler with isClosing flag in useSessionCleanup.ts
- [X] T009 [US3] Implement load event handler to clear isClosing flag on page refresh in useSessionCleanup.ts
- [X] T010 [US3] Integrate useSessionCleanup into App.vue to establish global event listeners
- [X] T011 [US3] Add logic to App.vue onMounted to check pendingCleanup flag before session restore

**Checkpoint**: 重整時不觸發清除邏輯，session-restore 功能保持正常

---

## Phase 4: User Story 1 - 關閉分頁時自動清除會話資料 (Priority: P1) 🎯 MVP

**Goal**: 使用者關閉分頁時自動清除 IndexedDB 資料，保護隱私並釋放儲存空間

**Independent Test**: 上傳視頻並編輯 → 關閉分頁（確認提示） → 重新開啟應用 → 確認先前會話資料已被清除

### Implementation for User Story 1

- [ ] T012 [US1] Implement pagehide event handler in useSessionCleanup.ts to detect tab close
- [ ] T013 [US1] Add pendingCleanup flag setting logic in beforeunload handler
- [ ] T014 [US1] Implement delayed cleanup logic in App.vue to execute CleanupSessionUseCase on startup when pendingCleanup flag is detected
- [ ] T015 [P] [US1] Add clearSession() method to videoStore in src/presentation/stores/videoStore.ts
- [ ] T016 [P] [US1] Add clearSession() method to transcriptStore in src/presentation/stores/transcriptStore.ts
- [ ] T017 [P] [US1] Add clearSession() method to highlightStore in src/presentation/stores/highlightStore.ts
- [ ] T018 [US1] Integrate Store clearSession() calls in App.vue delayed cleanup flow
- [ ] T019 [US1] Add error handling for failed delayed cleanup with pendingCleanup flag preservation

**Checkpoint**: 關閉分頁時能設定標記，重新開啟時自動清除資料並返回初始畫面

---

## Phase 5: User Story 2 - 手動刪除會話 (Priority: P2)

**Goal**: 提供手動刪除按鈕讓使用者可以立即清除當前會話並重新開始

**Independent Test**: 在編輯畫面點擊「刪除此會話」按鈕 → 確認對話框 → 確認資料被清除且應用返回初始狀態

### Implementation for User Story 2

- [ ] T020 [US2] Create SessionCleanupButton.vue component in src/presentation/components/editing/SessionCleanupButton.vue for header integration
- [ ] T021 [US2] Implement handleManualDelete() method in useSessionCleanup.ts with confirmation dialog using Naive UI
- [ ] T022 [US2] Add Store state clearing logic in handleManualDelete() after Use Case execution
- [ ] T023 [US2] Implement router.replace('/') navigation after cleanup to prevent back navigation - verify history.back() does not return to deleted session
- [ ] T024 [US2] Add error notification handling for manual delete failures
- [ ] T025 [US2] Integrate SessionCleanupButton into header component
- [ ] T026 [US2] Add data existence check in editing view onMounted to redirect if session was deleted - prevent access to non-existent session via direct URL or history manipulation

**Checkpoint**: 手動刪除按鈕完整可用，刪除後無法透過「上一頁」返回編輯畫面

---

## Phase 6: Testing & Validation

**Purpose**: Comprehensive E2E testing to ensure all scenarios work correctly

- [ ] T027 [P] Create E2E test file at tests/e2e/session-cleanup.spec.ts
- [ ] T028 [P] E2E test: Manual delete clears session and prevents back navigation (verify router.replace blocks history.back())
- [ ] T029 [P] E2E test: Page refresh preserves session data (no cleanup triggered) - verify pendingCleanup flag is NOT set after refresh
- [ ] T030 [P] E2E test: Tab close triggers delayed cleanup on next app launch
- [ ] T030a [P] E2E test: Verify beforeunload confirmation dialog displays when closing tab with active session (browser native dialog)
- [ ] T031 Unit test for CleanupSessionUseCase in tests/unit/application/CleanupSessionUseCase.spec.ts
- [ ] T032 Integration test for SessionRepositoryImpl in tests/integration/repositories/SessionRepositoryImpl.spec.ts

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Code quality, documentation, and final validation

- [ ] T033 [P] Add comprehensive TSDoc comments to all new files (ISessionRepository, CleanupSessionUseCase, SessionRepositoryImpl)
- [ ] T034 [P] Run type-check and ensure TypeScript coverage > 90%
- [ ] T035 [P] Run ESLint and fix any style violations
- [ ] T036 Verify Clean Architecture dependency rules are followed
- [ ] T037 Performance test: Ensure IndexedDB cleanup completes < 1s with large dataset AND verify no residual data remains using IndexedDB inspection tools
- [ ] T038 Verify RWD support for SessionCleanupButton on mobile devices
- [ ] T039 Run quickstart.md validation scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 3 (Phase 3)**: Depends on Foundational - MUST complete first (protects refresh flow)
- **User Story 1 (Phase 4)**: Depends on US3 completion (builds on beforeunload handler)
- **User Story 2 (Phase 5)**: Depends on Foundational - Can proceed after Phase 2 (independent of US1/US3)
- **Testing (Phase 6)**: Depends on all user stories being complete
- **Polish (Phase 7)**: Depends on Testing completion

### User Story Dependencies

- **User Story 3 (P1 - Critical)**: Must complete FIRST - protects page refresh flow
- **User Story 1 (P1 - MVP)**: Depends on US3 - builds on the beforeunload infrastructure
- **User Story 2 (P2)**: Can start after Foundational - independent implementation path

### Within Each User Story

**User Story 3 (Refresh Protection)**:
- T007 → T008 → T009 → T010 → T011 (sequential for event handler setup)

**User Story 1 (Tab Close)**:
- T012-T014 (sequential, build on US3)
- T015-T017 (parallel, different Store files)
- T018-T019 (sequential, integration)

**User Story 2 (Manual Delete)**:
- T020-T024 (sequential, UI component and handler)
- T025-T026 (integration tasks)

### Parallel Opportunities

- **Foundational Phase**: T002, T003 can run in parallel
- **User Story 1**: T015, T016, T017 (Store modifications) can run in parallel
- **Testing Phase**: T027-T030 (E2E tests) can run in parallel; T031-T032 can run in parallel
- **Polish Phase**: T033, T034, T035, T038 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all Store clearSession() implementations together:
Task: "Add clearSession() method to videoStore in src/presentation/stores/videoStore.ts"
Task: "Add clearSession() method to transcriptStore in src/presentation/stores/transcriptStore.ts"
Task: "Add clearSession() method to highlightStore in src/presentation/stores/highlightStore.ts"
```

---

## Implementation Strategy

### Critical Path First (US3 → US1)

1. Complete Phase 1: Setup (review existing structure)
2. Complete Phase 2: Foundational (Domain + Application + Infrastructure layers)
3. Complete Phase 3: User Story 3 (ensure refresh protection works FIRST)
4. **STOP and VALIDATE**: Test page refresh does NOT trigger cleanup
5. Complete Phase 4: User Story 1 (tab close with delayed cleanup)
6. **STOP and VALIDATE**: Test tab close → reopen triggers cleanup
7. Deploy/demo if ready (US3 + US1 = core privacy protection)

### MVP + Manual Control

1. Complete Critical Path (US3 + US1)
2. Complete Phase 5: User Story 2 (manual delete button)
3. **STOP and VALIDATE**: Test manual delete flow independently
4. Complete all testing and polish
5. Full feature deployment

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Developer A: User Story 3 (critical - must finish first)
3. Once US3 is done:
   - Developer A: User Story 1 (builds on US3)
   - Developer B: User Story 2 (independent path)
4. Both developers: Testing phase (parallel E2E tests)

---

## Implementation Checklist

### Foundational Layer (Phase 2)
- [ ] ISessionRepository 介面定義完成並符合 contract 規範
- [ ] SessionCleanupError 繼承 ApplicationError
- [ ] CleanupSessionUseCase 正確協調 Repository 和 SessionStorage
- [ ] SessionRepositoryImpl 使用 Transaction 確保原子性
- [ ] DI Container 正確註冊所有依賴

### User Story 3 (Refresh Protection)
- [ ] beforeunload 設定 isClosing 標記
- [ ] load 事件清除 isClosing 標記
- [ ] 重整時不顯示確認提示
- [ ] 重整後 session-restore 功能正常

### User Story 1 (Tab Close)
- [ ] pagehide 事件偵測分頁關閉
- [ ] beforeunload 設定 pendingCleanup 標記
- [ ] App.vue 啟動時檢查 pendingCleanup 並執行清除
- [ ] Store clearSession() 正確清除記憶體狀態
- [ ] 清除後導航至初始畫面

### User Story 2 (Manual Delete)
- [ ] SessionCleanupButton 顯示 Naive UI 確認對話框
- [ ] SessionCleanupButton 整合到 header 組件
- [ ] handleManualDelete() 正確執行 Use Case
- [ ] router.replace('/') 阻止「上一頁」導航
- [ ] 編輯畫面 onMounted 檢查資料存在性
- [ ] 錯誤處理顯示使用者友好訊息

### Testing & Quality
- [ ] 所有 E2E 測試通過
- [ ] 單元測試和整合測試通過
- [ ] TypeScript 型別覆蓋率 > 90%
- [ ] ESLint 無錯誤
- [ ] Clean Architecture 依賴規則驗證通過
- [ ] 效能測試: IndexedDB 清除 < 1s

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story (US1, US2, US3)
- **US3 MUST complete before US1** - critical dependency for refresh protection
- Each user story should be independently testable after completion
- Commit after each task or logical group
- Stop at checkpoints to validate story independently
- **SessionCleanupButton 位置**: 整合至 header 組件中
- **Key Risk**: beforeunload 無法完全區分關閉與刷新，因此採用延遲刪除策略
- **Performance Goal**: IndexedDB 刪除操作 < 1s (use Promise.all for parallel clear())
- **Browser Limitation**: beforeunload 確認對話框內容受瀏覽器限制，無法完全自定義

---

## Total Task Count

- **Setup**: 1 task
- **Foundational**: 5 tasks (CRITICAL - blocks all stories)
- **User Story 3**: 5 tasks (MUST complete first)
- **User Story 1**: 8 tasks
- **User Story 2**: 7 tasks
- **Testing**: 7 tasks (added T030a for beforeunload dialog verification)
- **Polish**: 7 tasks

**Total**: 40 tasks

---

## Suggested MVP Scope

**Minimal Viable Product** = User Story 3 + User Story 1
- Protects refresh flow (US3)
- Auto-cleanup on tab close (US1)
- **Total**: 18 tasks (Setup + Foundational + US3 + US1)

**Complete Feature** = All User Stories
- Adds manual delete button in header (US2)
- **Total**: 39 tasks

---

## Parallel Opportunities Identified

1. **Foundational Phase**: 2 parallel opportunities (T002 + T003)
2. **User Story 1**: 3 parallel opportunities (T015, T016, T017)
3. **Testing Phase**: 6 parallel opportunities (all E2E and unit tests)
4. **Polish Phase**: 4 parallel opportunities (documentation, linting, type-check, RWD)

**Total Parallelizable Tasks**: 15 tasks (37.5% of total)

---

## Format Validation

✅ All tasks follow required checklist format: `- [ ] [TaskID] [P?] [Story?] Description with file path`
✅ Sequential Task IDs (T001 - T039)
✅ [P] marker present for parallelizable tasks
✅ [Story] labels (US1, US2, US3) present for user story phase tasks
✅ No story labels for Setup, Foundational, and Polish phases
✅ Clear file paths included in all implementation tasks
✅ SessionCleanupButton explicitly placed in header component
