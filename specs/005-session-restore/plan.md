# Implementation Plan: 會話恢復 (Session Restore)

**Branch**: `005-session-restore` | **Date**: 2025-11-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-session-restore/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

建立會話恢復功能，在應用啟動時自動檢查並恢復瀏覽器儲存中的編輯狀態。小視頻（≤ 50MB）完整恢復檔案和編輯內容，大視頻（> 50MB）保留編輯內容並提示重新上傳。透過 RestoreSessionUseCase 協調 Video、Transcript、Highlight 三個 Repository 的恢復邏輯，在 App.vue 啟動時自動執行，並處理首次訪問、會話過期、資料不完整等邊緣情境。

## Technical Context

**Language/Version**: TypeScript 5.9.0
**Primary Dependencies**: Vue 3.5.22, Pinia 3.0.3, idb 8.0.3, video.js 8.23.4, Naive UI 2.43.1
**Storage**: IndexedDB (小視頻檔案 + 所有 Entity) + SessionStorage (sessionId + 大視頻元資料)
**Testing**: Vitest 3.2.4 (unit), Playwright 1.56.1 (e2e)
**Target Platform**: Web (Desktop: Windows/Mac Chrome, Mobile: iOS/Android Chrome/Safari)
**Project Type**: Web (單專案結構，採用 Clean Architecture)
**Performance Goals**: 會話恢復完成 < 2s, 啟動延遲增加 < 500ms, 通知顯示回應 < 100ms
**Constraints**: 小視頻儲存閾值 50MB (桌面), 會話過期時間 24小時, 支援離線恢復
**Scale/Scope**: 單使用者單視頻專案，3 個 Repository (Video/Transcript/Highlight)，1 個新 Use Case

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Phase 0 Check**:

- ✅ **Clean Architecture**: 遵循四層架構 (Domain → Application → Infrastructure/Presentation)
- ✅ **Infrastructure/Presentation 分離**: Use Case 在 Application Layer，Repository 在 Infrastructure，Store 在 Presentation
- ✅ **Port 解耦**: RestoreSessionUseCase 依賴 IVideoRepository/ITranscriptRepository/IHighlightRepository (已定義)
- ✅ **DDD 模式**: 使用 Repository Pattern 和 Use Case 組織業務邏輯
- ✅ **TypeScript 型別覆蓋率**: 目標 > 90%，所有 Use Case 和 DTO 需明確型別定義
- ✅ **RWD 支援**: 通知元件需支援桌面和移動平台
- ✅ **單向數據流**: videoStore.restoreSession() action 呼叫 Use Case，不直接操作 Repository
- ✅ **依賴注入**: RestoreSessionUseCase 在 di/container.ts 註冊，透過建構函式注入 Repository
- ✅ **反幻覺指示**: 所有不確定的實作細節標註為「NEEDS CLARIFICATION」，在 Phase 0 research 中解決

**Phase 1 Re-check**:

- ✅ **Clean Architecture**: 設計遵循四層架構，RestoreSessionUseCase 在 Application Layer，Repository 實作在 Infrastructure，Store 在 Presentation
- ✅ **Infrastructure/Presentation 分離**: BrowserStorage 和 Repository 實作在 Infrastructure，Store 和 composables 在 Presentation，無直接依賴
- ✅ **Port 解耦**: RestoreSessionUseCase 依賴 Repository 介面（IVideoRepository 等），不直接依賴實作類別
- ✅ **DDD 模式**: 使用 Repository Pattern，Use Case 協調多個 Repository，直接使用 Domain Entity
- ✅ **TypeScript 型別覆蓋率**: 所有 Use Case、Repository 方法、Store action 都有明確型別定義，無 any 型別
- ✅ **RWD 支援**: 通知元件使用 Naive UI，支援桌面和移動平台
- ✅ **單向數據流**: videoStore.restoreSession() 調用 Use Case，Use Case 調用 Repository，Store 更新狀態並觸發 UI 更新
- ✅ **依賴注入**: RestoreSessionUseCase 在 di/container.ts 註冊，透過建構函式注入 Repository
- ✅ **避免過度設計**: 不建立新的 SessionStateDTO，直接使用 Domain Entity，遵循專案現有慣例

**所有 Constitution Check 項目通過** ✅

## Project Structure

### Documentation (this feature)

```text
specs/005-session-restore/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── domain/                                    # 🔴 核心業務邏輯層
│   ├── aggregates/                           # Entity 定義
│   │   ├── Video.ts
│   │   ├── Transcript/
│   │   │   ├── Transcript.ts
│   │   │   ├── Section.ts
│   │   │   └── Sentence.ts
│   │   └── Highlight.ts
│   ├── repositories/                         # Repository 介面
│   │   ├── IVideoRepository.ts
│   │   ├── ITranscriptRepository.ts
│   │   └── IHighlightRepository.ts
│   └── value-objects/                        # Value Object
│       ├── TimeStamp.ts
│       ├── TimeRange.ts
│       └── VideoMetadata.ts
│
├── application/                              # 🟡 應用服務層
│   ├── use-cases/                           # Use Case 實作
│   │   ├── UploadVideoUseCase.ts
│   │   ├── ProcessTranscriptUseCase.ts
│   │   ├── ToggleSentenceInHighlightUseCase.ts
│   │   └── RestoreSessionUseCase.ts         # [NEW] 本功能新增
│   ├── dto/                                 # Data Transfer Object
│   │   ├── VideoDTO.ts
│   │   ├── TranscriptDTO.ts
│   │   └── SessionStateDTO.ts               # [NEW] 本功能新增
│   ├── ports/                               # 介面定義
│   │   ├── IFileStorage.ts
│   │   ├── IVideoProcessor.ts
│   │   ├── ITranscriptGenerator.ts
│   │   └── IMockDataProvider.ts
│   └── errors/                              # Application 層錯誤
│       └── ...
│
├── infrastructure/                           # 🟢 技術基礎設施層
│   ├── repositories/                        # Repository 實作
│   │   ├── VideoRepositoryImpl.ts           # [MODIFY] 新增批量查詢方法
│   │   ├── TranscriptRepositoryImpl.ts      # [MODIFY] 新增批量查詢方法
│   │   └── HighlightRepositoryImpl.ts       # [MODIFY] 新增批量查詢方法
│   ├── storage/                             # 儲存服務
│   │   ├── BrowserStorage.ts                # [MODIFY] 新增 restoreAllVideos() 等
│   │   ├── FileStorageService.ts
│   │   └── dto/                             # Persistence DTO
│   │       ├── VideoPersistenceDTO.ts
│   │       ├── TranscriptPersistenceDTO.ts
│   │       └── HighlightPersistenceDTO.ts
│   ├── api/                                 # API 服務
│   │   └── MockAIService.ts
│   └── services/                            # 基礎設施服務
│       └── VideoProcessor.ts
│
└── presentation/                             # 🔵 UI 展示層
    ├── components/                          # Vue 組件
    │   ├── VideoUpload.vue
    │   ├── VideoPlayer.vue
    │   ├── TranscriptEditor.vue
    │   └── ...
    ├── stores/                              # Pinia State Management
    │   ├── videoStore.ts                    # [MODIFY] 新增 restoreSession()
    │   ├── transcriptStore.ts
    │   └── highlightStore.ts
    ├── composables/                         # Composable Functions
    │   ├── useVideoUpload.ts
    │   ├── useTranscript.ts
    │   ├── useHighlight.ts
    │   └── useNotification.ts               # [MODIFY] 用於顯示恢復通知
    └── types/                               # Presentation 層型別
        ├── store-contracts.ts
        └── component-contracts.ts

di/
└── container.ts                             # [MODIFY] 註冊 RestoreSessionUseCase

App.vue                                      # [MODIFY] onMounted 調用 restoreSession()

tests/
├── unit/
│   └── application/
│       └── use-cases/
│           └── RestoreSessionUseCase.spec.ts  # [NEW] 單元測試
└── e2e/
    └── session-restore.spec.ts              # [NEW] E2E 測試
```

**Structure Decision**: 本專案採用 Clean Architecture 單專案結構，分為四層：Domain (核心業務)、Application (應用服務)、Infrastructure (技術實作)、Presentation (UI)。本功能主要涉及：

1. **Application Layer**: 新增 RestoreSessionUseCase 和 SessionStateDTO
2. **Infrastructure Layer**: 擴充 BrowserStorage 和三個 Repository 的批量查詢功能
3. **Presentation Layer**: 擴充 videoStore 和通知顯示，在 App.vue 啟動時調用
4. **DI Container**: 註冊新的 Use Case

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**無違反項目** - 本功能設計完全符合專案憲法的所有原則，無需複雜度豁免。
