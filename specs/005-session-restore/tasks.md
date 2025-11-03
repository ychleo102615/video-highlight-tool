# Tasks: 會話恢復 (Session Restore)

**Input**: Design documents from `/specs/005-session-restore/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested - focusing on implementation tasks only

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

本專案採用單專案結構（Clean Architecture），路徑位於 repository root：
- Domain Layer: `src/domain/`
- Application Layer: `src/application/`
- Infrastructure Layer: `src/infrastructure/`
- Presentation Layer: `src/presentation/`
- DI Container: `di/container.ts`
- App Entry: `App.vue`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project structure verification and prerequisites check

- [X] T001 Verify Clean Architecture structure is in place per plan.md
- [X] T002 Verify existing entities (Video, Transcript, Highlight) in src/domain/aggregates/
- [X] T003 [P] Verify existing repositories (VideoRepositoryImpl, TranscriptRepositoryImpl, HighlightRepositoryImpl) in src/infrastructure/repositories/
- [X] T004 [P] Verify BrowserStorage service exists in src/infrastructure/storage/BrowserStorage.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure extensions that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Repository Interface Extensions

- [X] T005 [P] Extend IVideoRepository interface with findAll() method in src/domain/repositories/IVideoRepository.ts
- [X] T006 [P] Extend ITranscriptRepository interface with findByVideoId(videoId: string) method in src/domain/repositories/ITranscriptRepository.ts (已存在)
- [X] T007 [P] Extend IHighlightRepository interface with findByVideoId(videoId: string) method in src/domain/repositories/IHighlightRepository.ts (已存在)

### BrowserStorage Batch Query Methods

- [X] T008 [P] Implement restoreAllVideos() method in src/infrastructure/storage/BrowserStorage.ts (query IndexedDB + SessionStorage)
- [X] T009 [P] Implement restoreAllTranscripts() method in src/infrastructure/storage/BrowserStorage.ts
- [X] T010 [P] Implement restoreAllHighlights() method in src/infrastructure/storage/BrowserStorage.ts

### Repository Implementation Extensions

- [X] T011 [P] Implement VideoRepositoryImpl.findAll() with auto-restore from BrowserStorage in src/infrastructure/repositories/VideoRepositoryImpl.ts
- [X] T012 [P] Implement TranscriptRepositoryImpl.findByVideoId() with auto-restore from BrowserStorage in src/infrastructure/repositories/TranscriptRepositoryImpl.ts (已存在)
- [X] T013 [P] Implement HighlightRepositoryImpl.findByVideoId() with auto-restore from BrowserStorage in src/infrastructure/repositories/HighlightRepositoryImpl.ts (已存在)

### RestoreSessionUseCase

- [X] T014 Implement RestoreSessionUseCase.execute() method in src/application/use-cases/RestoreSessionUseCase.ts (coordinates Video/Transcript/Highlight repositories, returns { video, transcript, highlights, needsReupload } or null)

### DI Container Registration

- [X] T015 Register RestoreSessionUseCase in di/container.ts with VideoRepositoryImpl, TranscriptRepositoryImpl, and HighlightRepositoryImpl dependencies

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - 小視頻完整恢復 (Priority: P1) 🎯 MVP

**Goal**: 自動恢復小視頻（≤ 50MB）的完整編輯狀態，包含視頻檔案、轉錄文字和高光選擇

**Independent Test**: 上傳小視頻（20MB）→ 選擇高光片段 → 刷新頁面 → 確認狀態完整恢復（視頻播放、轉錄文字、高光選擇）

### Implementation for User Story 1

- [X] T016 [US1] Add restoreSession() action to videoStore in src/presentation/stores/videoStore.ts (calls RestoreSessionUseCase, updates video state)
- [X] T017 [P] [US1] Add setTranscript(transcript: Transcript) method to transcriptStore in src/presentation/stores/transcriptStore.ts (if not exists)
- [X] T018 [P] [US1] Add setHighlights(highlights: Highlight[]) method to highlightStore in src/presentation/stores/highlightStore.ts (if not exists)
- [X] T019 [US1] Integrate videoStore.restoreSession() with transcriptStore and highlightStore state updates in src/presentation/stores/videoStore.ts
- [X] T020 [US1] Verify useNotification composable supports showInfo() and showError() methods in src/presentation/composables/useNotification.ts
- [X] T021 [US1] Add notification display logic to restoreSession() action (small video: "已恢復先前的編輯狀態") in src/presentation/stores/videoStore.ts
- [X] T022 [US1] Call videoStore.restoreSession() in App.vue onMounted lifecycle hook

**Checkpoint**: 小視頻完整恢復功能已完成。使用者刷新頁面後，視頻、轉錄文字和高光選擇應該自動恢復。

---

## Phase 4: User Story 2 - 大視頻編輯內容保留 (Priority: P2)

**Goal**: 保留大視頻（> 50MB）的編輯內容（轉錄文字、高光選擇），提示使用者重新上傳視頻

**Independent Test**: 上傳大視頻（100MB）→ 選擇高光片段 → 刷新頁面 → 確認顯示提示訊息 → 重新上傳視頻 → 確認編輯內容恢復

### Implementation for User Story 2

- [ ] T023 [US2] Add large video reupload notification logic to restoreSession() action (needsReupload: "偵測到先前的編輯內容,請重新上傳視頻以繼續編輯") in src/presentation/stores/videoStore.ts
- [ ] T024 [US2] Verify video.file === null detection logic in RestoreSessionUseCase returns needsReupload flag correctly in src/application/use-cases/RestoreSessionUseCase.ts
- [ ] T025 [US2] Test large video reupload workflow: verify state updates after user re-uploads video via VideoUpload component

**Checkpoint**: 大視頻恢復功能已完成。使用者刷新頁面後，看到提示訊息並重新上傳視頻後，編輯內容應該恢復。

---

## Phase 5: User Story 3 - 首次訪問無恢復狀態 (Priority: P3)

**Goal**: 首次訪問或清除資料後，正常顯示初始上傳介面，不顯示錯誤訊息

**Independent Test**: 清除瀏覽器資料 → 訪問應用 → 確認顯示正常的上傳介面，無恢復訊息

### Implementation for User Story 3

- [ ] T026 [US3] Verify RestoreSessionUseCase.execute() returns null when no session data exists in src/application/use-cases/RestoreSessionUseCase.ts
- [ ] T027 [US3] Verify videoStore.restoreSession() handles null result silently (no notification) in src/presentation/stores/videoStore.ts
- [ ] T028 [US3] Test first-time visit scenario: clear IndexedDB and SessionStorage, verify normal upload interface displays

**Checkpoint**: 首次訪問功能已完成。使用者首次訪問或清除資料後，應該看到正常的上傳介面，無任何提示訊息。

---

## Phase 6: User Story 4 - 會話過期處理 (Priority: P3)

**Goal**: 自動清除超過 24 小時的過期會話資料，顯示全新上傳介面

**Independent Test**: 上傳視頻 → 編輯內容 → 模擬 24 小時後訪問（手動修改 savedAt）→ 確認顯示全新介面

### Implementation for User Story 4

- [ ] T029 [US4] Verify BrowserStorage.cleanupStaleData() correctly deletes data older than 24 hours in src/infrastructure/storage/BrowserStorage.ts
- [ ] T030 [US4] Verify BrowserStorage.init() calls cleanupStaleData() on initialization in src/infrastructure/storage/BrowserStorage.ts
- [ ] T031 [US4] Test session expiration scenario: manually modify savedAt timestamp in IndexedDB, verify stale data is cleared on next visit

**Checkpoint**: 會話過期處理功能已完成。超過 24 小時的資料應該自動清除，使用者看到全新介面。

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements and error handling that affect multiple user stories

### Error Handling

- [ ] T032 [P] Add comprehensive error handling for incomplete data (missing transcript) in RestoreSessionUseCase in src/application/use-cases/RestoreSessionUseCase.ts
- [ ] T033 [P] Add comprehensive error handling for incomplete data (missing highlights) in RestoreSessionUseCase in src/application/use-cases/RestoreSessionUseCase.ts
- [ ] T034 Add error notification display ("恢復會話失敗,請重新上傳視頻") in videoStore.restoreSession() catch block in src/presentation/stores/videoStore.ts
- [ ] T035 [P] Add console error logging for RestoreSession failures in videoStore.restoreSession() in src/presentation/stores/videoStore.ts

### Edge Cases Handling

- [ ] T036 [P] Test and handle corrupted video file in IndexedDB (playback error detection)
- [ ] T037 [P] Test and handle storage quota exceeded error (treat as large video)
- [ ] T038 [P] Verify sessionId filtering works correctly in BrowserStorage.cleanupStaleData()

### Performance Optimization

- [ ] T039 [P] Verify batch query performance (IndexedDB getAll) meets < 150ms target for session restore
- [ ] T040 [P] Verify overall app startup delay stays under 500ms with session restore enabled
- [ ] T041 [P] Verify notification display response time < 100ms

### Documentation

- [ ] T042 [P] Update CLAUDE.md if new coding conventions emerged during implementation
- [ ] T043 [P] Update Active Technologies section in CLAUDE.md with session restore feature info
- [ ] T044 Update quickstart.md with manual test scenarios for session restore in specs/005-session-restore/quickstart.md

### Validation

- [ ] T045 Run type-check: npm run type-check
- [ ] T046 Run lint: npm run lint
- [ ] T047 Manual test on desktop platform (Chrome/Mac or Chrome/Windows)
- [ ] T048 Manual test on mobile platform (iOS Safari or Android Chrome)
- [ ] T049 Run quickstart.md validation scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P3)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Builds on US1's videoStore.restoreSession() but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Tests null handling in US1's implementation but independently testable
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Uses existing BrowserStorage.cleanupStaleData() logic, independently testable

### Within Each User Story

- Foundational tasks (T005-T015) must complete before user story tasks begin
- Store methods (setTranscript, setHighlights) before restoreSession integration
- RestoreSessionUseCase implementation before videoStore.restoreSession
- Core implementation before App.vue integration
- Story complete before moving to next priority

### Parallel Opportunities

- **Setup (Phase 1)**: T002, T003, T004 can run in parallel
- **Foundational (Phase 2)**:
  - Repository interfaces (T005, T006, T007) can run in parallel
  - BrowserStorage methods (T008, T009, T010) can run in parallel
  - Repository implementations (T011, T012, T013) can run in parallel after interfaces complete
- **User Story 1 (Phase 3)**: T017, T018 can run in parallel
- **User Story 2 (Phase 4)**: T023, T024 can run in parallel
- **User Story 3 (Phase 5)**: T026, T027 can run in parallel
- **User Story 4 (Phase 6)**: T029, T030 can run in parallel
- **Polish (Phase 7)**: Most error handling (T032, T033, T035), edge cases (T036, T037, T038), performance (T039, T040, T041), and documentation (T042, T043) tasks can run in parallel

---

## Parallel Example: Foundational Phase

```bash
# Launch all repository interface extensions together:
Task T005: "Extend IVideoRepository interface with findAll()"
Task T006: "Extend ITranscriptRepository interface with findByVideoId()"
Task T007: "Extend IHighlightRepository interface with findByVideoId()"

# Then launch all BrowserStorage methods together:
Task T008: "Implement restoreAllVideos() in BrowserStorage"
Task T009: "Implement restoreAllTranscripts() in BrowserStorage"
Task T010: "Implement restoreAllHighlights() in BrowserStorage"

# Then launch all repository implementations together:
Task T011: "Implement VideoRepositoryImpl.findAll()"
Task T012: "Implement TranscriptRepositoryImpl.findByVideoId()"
Task T013: "Implement HighlightRepositoryImpl.findByVideoId()"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T015) - CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T016-T022)
4. **STOP and VALIDATE**: Test small video restore independently
5. Deploy/demo if ready - 小視頻完整恢復功能已可使用

### Incremental Delivery

1. Complete Setup + Foundational (T001-T015) → Foundation ready
2. Add User Story 1 (T016-T022) → Test independently → Deploy/Demo (MVP! 小視頻完整恢復)
3. Add User Story 2 (T023-T025) → Test independently → Deploy/Demo (大視頻編輯內容保留)
4. Add User Story 3 (T026-T028) → Test independently → Deploy/Demo (首次訪問處理)
5. Add User Story 4 (T029-T031) → Test independently → Deploy/Demo (會話過期處理)
6. Complete Phase 7: Polish (T032-T049) → Final validation
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T015)
2. Once Foundational is done:
   - Developer A: User Story 1 (T016-T022)
   - Developer B: User Story 2 (T023-T025) - can start in parallel if familiar with US1
   - Developer C: User Story 3 (T026-T028) - can start in parallel
   - Developer D: User Story 4 (T029-T031) - can start in parallel
3. Stories complete and integrate independently
4. Team completes Polish together (T032-T049)

---

## Summary

**Total Tasks**: 49
- Phase 1 (Setup): 4 tasks
- Phase 2 (Foundational): 11 tasks (BLOCKING)
- Phase 3 (User Story 1 - P1): 7 tasks 🎯 MVP
- Phase 4 (User Story 2 - P2): 3 tasks
- Phase 5 (User Story 3 - P3): 3 tasks
- Phase 6 (User Story 4 - P3): 3 tasks
- Phase 7 (Polish): 18 tasks

**Parallel Opportunities Identified**: 27 tasks marked [P]

**Independent Test Criteria**:
- US1: Upload 20MB video → select highlights → refresh → verify full restore
- US2: Upload 100MB video → select highlights → refresh → verify prompt and restore after reupload
- US3: Clear browser data → visit app → verify normal upload interface
- US4: Modify savedAt timestamp → visit app → verify stale data cleared

**Suggested MVP Scope**: User Story 1 only (小視頻完整恢復)

**Format Validation**: ✅ All tasks follow the required checklist format:
- [x] Checkbox format: `- [ ]`
- [x] Task ID: Sequential (T001-T049)
- [x] [P] marker: Present on parallelizable tasks
- [x] [Story] label: Present on user story phase tasks (US1-US4)
- [x] Description: Clear action with exact file path

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Tests are OPTIONAL and not included as they were not explicitly requested in spec.md
