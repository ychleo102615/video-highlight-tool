# Tasks: Application Layer Development

**Input**: Design documents from `/specs/002-application-layer/`
**Prerequisites**: plan.md (✓), spec.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓)

**Tests**: NOT requested - Focus on implementation only

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Application Layer: `src/application/`
- Domain Layer: `src/domain/` (already complete)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for Application Layer

- [X] T001 Create Application Layer directory structure in src/application/ (use-cases/, dto/, ports/, errors/)
- [X] T002 [P] Create barrel export file in src/application/index.ts for clean imports
- [X] T003 [P] Verify Domain Layer dependencies are available (Video, Transcript, Highlight entities and repositories)

**Checkpoint**: Directory structure ready for Use Case implementation ✅

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types and infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### DTOs and Shared Types

- [X] T004 [P] Create TranscriptDTO interface in src/application/dto/TranscriptDTO.ts (with SectionDTO and SentenceDTO)
- [X] T005 [P] Create VideoDTO interface in src/application/dto/VideoDTO.ts
- [X] T006 [P] Create barrel export in src/application/dto/index.ts

### Port Interfaces

- [X] T007 [P] Create ITranscriptGenerator port interface in src/application/ports/ITranscriptGenerator.ts
- [X] T008 [P] Create IFileStorage port interface in src/application/ports/IFileStorage.ts
- [X] T009 [P] Create IVideoProcessor port interface in src/application/ports/IVideoProcessor.ts (with extractMetadata method)
- [X] T010 Create barrel export in src/application/ports/index.ts (depends on T007, T008, T009)

### Error Definitions

- [X] T011 Create ApplicationError base class in src/application/errors/ApplicationError.ts
- [X] T012 [P] Create VideoNotFoundError in src/application/errors/VideoNotFoundError.ts
- [X] T013 [P] Create InvalidVideoFormatError in src/application/errors/InvalidVideoFormatError.ts
- [X] T014 [P] Create VideoFileTooLargeError in src/application/errors/VideoFileTooLargeError.ts
- [X] T015 [P] Create VideoMetadataExtractionError in src/application/errors/VideoMetadataExtractionError.ts
- [X] T016 [P] Create TranscriptNotFoundError in src/application/errors/TranscriptNotFoundError.ts
- [X] T017 [P] Create TranscriptGenerationError in src/application/errors/TranscriptGenerationError.ts
- [X] T018 [P] Create HighlightNotFoundError in src/application/errors/HighlightNotFoundError.ts
- [X] T019 [P] Create InvalidHighlightNameError in src/application/errors/InvalidHighlightNameError.ts
- [X] T020 [P] Create FileStorageError in src/application/errors/FileStorageError.ts
- [X] T021 Create barrel export in src/application/errors/index.ts (depends on T012-T020)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel ✅

---

## Phase 3: User Story 1 - 上傳視頻並儲存 (Priority: P1) 🎯 MVP

**Goal**: 開發者能夠透過應用層服務處理視頻上傳請求,驗證視頻文件格式和大小,並將視頻儲存到系統中

**Independent Test**: 可以透過建立 UploadVideoUseCase 並注入 mock repositories 和 file storage 來獨立測試,驗證文件驗證邏輯、儲存流程和錯誤處理

### Implementation for User Story 1

- [X] T022 [US1] Create UploadVideoUseCase in src/application/use-cases/UploadVideoUseCase.ts
- [X] T023 [US1] Implement validateInput private method in UploadVideoUseCase (format and size validation)
- [X] T024 [US1] Implement execute method in UploadVideoUseCase (orchestrate validation, IFileStorage.save(), IVideoProcessor.extractMetadata(), Video Entity creation, repository save)
- [X] T025 [US1] Add JSDoc documentation to UploadVideoUseCase

**Checkpoint**: At this point, User Story 1 should be fully functional - developers can upload videos with proper validation ✅

---

## Phase 4: User Story 2 - 處理視頻轉錄 (Priority: P1)

**Goal**: 開發者能夠透過應用層服務請求視頻轉錄處理,調用 AI 服務生成轉錄內容,並將結構化的轉錄數據儲存到系統中

**Independent Test**: 可以透過建立 ProcessTranscriptUseCase 並注入 mock transcript generator 和 repository 來獨立測試,驗證轉錄生成、DTO 轉換和儲存邏輯

### Implementation for User Story 2

- [X] T027 [US2] Create ProcessTranscriptUseCase in src/application/use-cases/ProcessTranscriptUseCase.ts
- [X] T028 [US2] Implement convertToEntity private method in ProcessTranscriptUseCase (DTO → Domain Entity conversion)
- [X] T029 [US2] Implement convertSectionToEntity private helper method in ProcessTranscriptUseCase
- [X] T030 [US2] Implement convertSentenceToEntity private helper method in ProcessTranscriptUseCase
- [X] T031 [US2] Implement execute method in ProcessTranscriptUseCase (video validation, transcript generation, DTO conversion, persistence)
- [X] T032 [US2] Add JSDoc documentation to ProcessTranscriptUseCase

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - developers can upload videos and process transcripts ✅

---

## Phase 5: User Story 3 - 建立高光版本 (Priority: P2)

**Goal**: 開發者能夠透過應用層服務為指定的視頻建立新的高光版本,驗證視頻存在性,並初始化一個空的高光實體

**Independent Test**: 可以透過建立 CreateHighlightUseCase 並注入 mock repositories 來獨立測試,驗證視頻驗證邏輯和高光實體建立

### Implementation for User Story 3

- [X] T033 [US3] Create CreateHighlightUseCase in src/application/use-cases/CreateHighlightUseCase.ts
- [X] T034 [US3] Implement validateInput private method in CreateHighlightUseCase (video existence and name validation)
- [X] T035 [US3] Implement execute method in CreateHighlightUseCase (validation, highlight creation, persistence)
- [X] T036 [US3] Add JSDoc documentation to CreateHighlightUseCase

**Checkpoint**: User Stories 1, 2, AND 3 should all work independently - full upload → transcript → highlight creation flow available ✅

---

## Phase 6: User Story 4 - 切換句子選中狀態 (Priority: P2)

**Goal**: 開發者能夠透過應用層服務切換指定句子在高光中的選中狀態,確保聚合一致性並持久化變更

**Independent Test**: 可以透過建立 ToggleSentenceInHighlightUseCase 並注入 mock repository 來獨立測試,驗證狀態切換邏輯和持久化

### Implementation for User Story 4

- [X] T037 [US4] Create ToggleSentenceInHighlightUseCase in src/application/use-cases/ToggleSentenceInHighlightUseCase.ts
- [X] T038 [US4] Implement execute method in ToggleSentenceInHighlightUseCase (fetch highlight, toggle sentence, persist)
- [X] T039 [US4] Add JSDoc documentation to ToggleSentenceInHighlightUseCase

**Checkpoint**: Highlight editing workflow complete - developers can create highlights and toggle sentence selections ✅

---

## Phase 7: User Story 5 - 生成高光預覽 (Priority: P3)

**Goal**: 開發者能夠透過應用層服務生成高光預覽數據,協調 Highlight 和 Transcript 兩個聚合,並提供排序選項

**Independent Test**: 可以透過建立 GenerateHighlightUseCase 並注入 mock repositories 來獨立測試,驗證跨聚合協調、排序邏輯和時長計算

### Implementation for User Story 5

- [X] T040 [US5] Create GenerateHighlightUseCase in src/application/use-cases/GenerateHighlightUseCase.ts
- [X] T041 [US5] Implement execute method in GenerateHighlightUseCase (fetch aggregates, coordinate highlight and transcript, calculate time ranges and duration)
- [X] T042 [US5] Add JSDoc documentation to GenerateHighlightUseCase

**Checkpoint**: All user stories complete - full application workflow from upload to highlight preview generation is available ✅

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and ensure code quality

- [X] T043 [P] Create barrel export in src/application/use-cases/index.ts (export all Use Cases)
- [X] T044 [P] Add TypeScript strict mode checks to all Use Cases
- [X] T045 [P] Verify no circular dependencies between Application and Domain layers
- [ ] T046 Review and update documentation in specs/002-application-layer/ if implementation differs from plan
- [X] T047 [P] Run type checking: npm run type-check
- [X] T048 [P] Run linting: npm run lint
- [X] T049 Verify all Use Cases follow single responsibility principle (< 100 lines per execute method)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P1 → P2 → P2 → P3)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Independent of US1 (uses same repositories but different Use Case)
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Independent of US1/US2
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Independent of US1/US2/US3
- **User Story 5 (P3)**: Can start after Foundational (Phase 2) - Independent of other stories (uses highlight and transcript repositories)

### Within Each User Story

- UploadVideoUseCase: validateInput → extractMetadata → execute (sequential implementation)
- ProcessTranscriptUseCase: conversion helpers → execute (sequential implementation)
- CreateHighlightUseCase: validateInput → execute (sequential implementation)
- ToggleSentenceInHighlightUseCase: execute (single method)
- GenerateHighlightUseCase: execute (single method with aggregate coordination)

### Parallel Opportunities

**Phase 1 Setup**:
- T002 and T003 can run in parallel

**Phase 2 Foundational**:
- DTOs (T004, T005) can run in parallel
- Ports (T007, T008) can run in parallel
- All error classes (T011-T019) can run in parallel

**Phase 3-7 User Stories**:
- Once Phase 2 is complete, ALL user stories (Phase 3, 4, 5, 6, 7) can be implemented in parallel by different developers
- Each Use Case is in a separate file with no shared state

**Phase 8 Polish**:
- T042, T043, T044, T046, T047 can run in parallel

---

## Parallel Example: Foundational Phase

```bash
# Launch all DTO creation tasks together:
Task: "Create TranscriptDTO interface in src/application/dto/TranscriptDTO.ts"
Task: "Create VideoDTO interface in src/application/dto/VideoDTO.ts"

# Launch all Port interfaces together:
Task: "Create ITranscriptGenerator port interface in src/application/ports/ITranscriptGenerator.ts"
Task: "Create IFileStorage port interface in src/application/ports/IFileStorage.ts"

# Launch all error class creation together:
Task: "Create VideoNotFoundError in src/application/errors/VideoNotFoundError.ts"
Task: "Create InvalidVideoFormatError in src/application/errors/InvalidVideoFormatError.ts"
Task: "Create VideoFileTooLargeError in src/application/errors/VideoFileTooLargeError.ts"
# ... (all error classes)
```

## Parallel Example: User Stories

```bash
# Once Phase 2 is complete, launch all user stories in parallel:
Task: "Create UploadVideoUseCase in src/application/use-cases/UploadVideoUseCase.ts" (US1)
Task: "Create ProcessTranscriptUseCase in src/application/use-cases/ProcessTranscriptUseCase.ts" (US2)
Task: "Create CreateHighlightUseCase in src/application/use-cases/CreateHighlightUseCase.ts" (US3)
Task: "Create ToggleSentenceInHighlightUseCase in src/application/use-cases/ToggleSentenceInHighlightUseCase.ts" (US4)
Task: "Create GenerateHighlightUseCase in src/application/use-cases/GenerateHighlightUseCase.ts" (US5)
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only - P1 Priority)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Upload Video)
4. Complete Phase 4: User Story 2 (Process Transcript)
5. **STOP and VALIDATE**: Test US1 and US2 independently
6. Ready for Infrastructure Layer integration

**Rationale**: US1 and US2 are both P1 priority and form the core workflow - upload video and get transcript. This provides a solid foundation for the rest of the application.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 & 2 → Test independently → MVP ready for Infrastructure integration
3. Add User Story 3 → Test independently → Highlight creation available
4. Add User Story 4 → Test independently → Highlight editing available
5. Add User Story 5 → Test independently → Full highlight preview workflow complete
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (UploadVideoUseCase)
   - Developer B: User Story 2 (ProcessTranscriptUseCase)
   - Developer C: User Story 3 (CreateHighlightUseCase)
   - Developer D: User Story 4 (ToggleSentenceInHighlightUseCase)
   - Developer E: User Story 5 (GenerateHighlightUseCase)
3. Stories complete and integrate independently through shared Domain Layer

---

## Task Summary

- **Total Tasks**: 49
- **Phase 1 (Setup)**: 3 tasks
- **Phase 2 (Foundational)**: 18 tasks (DTOs: 3, Ports: 4, Errors: 11)
- **Phase 3 (US1)**: 4 tasks
- **Phase 4 (US2)**: 6 tasks
- **Phase 5 (US3)**: 4 tasks
- **Phase 6 (US4)**: 3 tasks
- **Phase 7 (US5)**: 3 tasks
- **Phase 8 (Polish)**: 7 tasks

### Task Distribution by User Story

- **User Story 1** (Upload Video): 4 tasks - UploadVideoUseCase implementation (with IVideoProcessor integration)
- **User Story 2** (Process Transcript): 6 tasks - ProcessTranscriptUseCase with DTO conversion
- **User Story 3** (Create Highlight): 4 tasks - CreateHighlightUseCase implementation
- **User Story 4** (Toggle Sentence): 3 tasks - ToggleSentenceInHighlightUseCase implementation
- **User Story 5** (Generate Preview): 3 tasks - GenerateHighlightUseCase implementation

### Parallel Opportunities Identified

- **Phase 1**: 2 parallel tasks (setup tasks)
- **Phase 2**: 20 parallel opportunities (DTOs, Ports including IVideoProcessor, Errors can all run in parallel)
- **Phase 3-7**: 5 Use Cases can be implemented in parallel (all independent files)
- **Phase 8**: 5 parallel tasks (quality checks)

### Suggested MVP Scope

**MVP = User Stories 1 & 2 (both P1 priority)**

This provides:
- Video upload with validation (format, size)
- Video metadata extraction
- File storage integration
- Transcript generation via AI service
- DTO to Entity conversion
- Full error handling

This MVP enables testing the complete "upload → transcript" workflow and validates:
- Application Layer architecture
- Port interfaces design
- Error handling strategy
- DTO conversion logic
- Integration with Domain Layer

---

## Notes

- All Use Cases follow constructor injection pattern for dependencies
- Each Use Case has single public `execute` method
- Private helper methods extract complex logic
- DTOs are pure data structures (no business logic)
- Ports define contracts implemented by Infrastructure Layer
- Error classes provide semantic error handling with error codes
- All tasks include exact file paths for clarity
- [P] tasks indicate parallel execution opportunities
- [Story] labels enable user story traceability
- Constitution compliance verified in plan.md (all checks passed)
- No tests included per feature specification
