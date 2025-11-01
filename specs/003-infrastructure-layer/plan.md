# Implementation Plan: Infrastructure Layer Implementation

**Branch**: `003-infrastructure-layer` | **Date**: 2025-10-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-infrastructure-layer/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

實作 Infrastructure Layer，包含 Mock AI Service、File Storage Service、以及三個 Repository 實作（Video、Transcript、Highlight）。Mock AI Service 透過記憶體快取讀取使用者上傳的 JSON 檔案並轉換為 TranscriptDTO。File Storage Service 使用瀏覽器原生 URL.createObjectURL() 管理視頻檔案。所有 Repository 使用記憶體 Map 進行運行時 CRUD，並整合 BrowserStorage 工具類別實現基本持久化（IndexedDB + SessionStorage），防止用戶誤刷新導致工作遺失。

技術方案採用：
- MockAIService 提供 setMockData(videoId, jsonContent) 暫存 JSON 到記憶體 Map，generate(videoId) 從 Map 讀取並解析
- FileStorageService 封裝 URL.createObjectURL/revokeObjectURL
- BrowserStorage 內部工具類別封裝 IndexedDB 和 SessionStorage 操作，由 Repository 透過建構函式注入使用
- 小視頻（≤ 50MB）儲存到 IndexedDB，大視頻僅記錄元資料到 SessionStorage
- 啟動時清理屬於已關閉 Tab 的資料（基於 sessionId）及超過 24 小時的資料

## Technical Context

**Language/Version**: TypeScript ^5.0.0
**Primary Dependencies**: idb (Jake Archibald's IndexedDB Promise wrapper)
**Storage**: IndexedDB (小視頻檔案 + 所有 Entity DTO) + SessionStorage (sessionId + 大視頻元資料)
**Testing**: Vitest (單元測試)
**Target Platform**: 瀏覽器環境 (Desktop: Windows/Mac Chrome, Mobile: iOS/Android Chrome/Safari)
**Project Type**: Web 前端 (單一專案)
**Performance Goals**:
- Repository CRUD 操作 < 10ms (記憶體操作)
- Mock AI generate() 返回時間 ≈ 1.5 秒 (模擬延遲)
- IndexedDB 讀寫 < 100ms (小視頻恢復)
- FileStorageService save() < 50ms (blob URL 生成)
**Constraints**:
- IndexedDB 儲存限制 50MB 視頻檔案
- SessionStorage 容量限制 < 5MB (僅儲存 sessionId 和大視頻元資料)
- Mock AI 延遲固定 1.5 秒
- 不支援跨 Tab 同步
**Scale/Scope**:
- 支援單一視頻編輯會話
- Mock 資料規模：5-10 個段落，15-80 個句子
- 最多支援 5 個不同的 Highlight 版本

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- ✅ **Clean Architecture 分層架構**: Infrastructure Layer 僅實作 Domain/Application Layer 定義的介面（IVideoRepository、ITranscriptRepository、IHighlightRepository、ITranscriptGenerator、IFileStorage），不引入新的業務邏輯
- ✅ **Infrastructure 和 Presentation 職責分離**: Infrastructure Layer 專注於技術基礎設施（Repository、API、Storage），不包含任何 Vue 組件或 UI 邏輯
- ✅ **通過 Port 解耦**: MockAIService 實作 ITranscriptGenerator Port，FileStorageService 實作 IFileStorage Port，Repository 實作對應的 Domain Repository 介面
- ✅ **DDD 模式**: Repository 返回的是 Domain Entity（Video、Transcript、Highlight），不直接暴露持久化細節
- ✅ **TypeScript 型別覆蓋率 > 90%**: 所有 Repository、Service、BrowserStorage 方法都有明確型別定義，DTO 使用 TypeScript interface 定義
- ⚠️ **RWD 支援**: N/A (Infrastructure Layer 不涉及 UI)
- ⚠️ **Pinia 單向數據流**: N/A (Infrastructure Layer 不涉及狀態管理)
- ✅ **DI Container 管理依賴**: Repository 透過建構函式注入 BrowserStorage，Service 在 DI Container 中註冊
- ✅ **Mock 數據品質標準**: MockAIService 使用使用者上傳的 JSON（在 Presentation Layer 驗證品質），Infrastructure Layer 僅負責解析和轉換

## Project Structure

### Documentation (this feature)

```text
specs/003-infrastructure-layer/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - 技術調研結果
├── data-model.md        # Phase 1 output - DTO 與持久化模型設計
├── quickstart.md        # Phase 1 output - 快速開始指南
├── contracts/           # Phase 1 output - API 合約（Mock AI JSON schema）
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── di/                          # **專案級 DI Container**
│   └── container.ts            # 依賴注入容器（Infrastructure + Presentation 共用）
│
├── domain/                      # Domain Layer (已存在)
│   ├── aggregates/
│   │   ├── Video.ts
│   │   ├── Transcript/
│   │   │   ├── Transcript.ts
│   │   │   ├── Section.ts
│   │   │   └── Sentence.ts
│   │   └── Highlight.ts
│   ├── value-objects/
│   │   ├── TimeStamp.ts
│   │   ├── TimeRange.ts
│   │   └── VideoMetadata.ts
│   └── repositories/            # Repository 介面 (已存在)
│       ├── IVideoRepository.ts
│       ├── ITranscriptRepository.ts
│       └── IHighlightRepository.ts
│
├── application/                 # Application Layer (已存在)
│   ├── use-cases/
│   │   ├── UploadVideoUseCase.ts
│   │   ├── ProcessTranscriptUseCase.ts
│   │   ├── CreateHighlightUseCase.ts
│   │   ├── ToggleSentenceInHighlightUseCase.ts
│   │   └── GenerateHighlightUseCase.ts
│   ├── dto/
│   │   ├── VideoDTO.ts
│   │   └── TranscriptDTO.ts
│   └── ports/                   # Port 介面 (已存在)
│       ├── ITranscriptGenerator.ts
│       └── IFileStorage.ts
│
└── infrastructure/              # **本次實作重點**
    ├── api/
    │   └── MockAIService.ts            # 實作 ITranscriptGenerator
    ├── repositories/
    │   ├── VideoRepositoryImpl.ts      # 實作 IVideoRepository
    │   ├── TranscriptRepositoryImpl.ts # 實作 ITranscriptRepository
    │   └── HighlightRepositoryImpl.ts  # 實作 IHighlightRepository
    ├── storage/
    │   ├── FileStorageService.ts       # 實作 IFileStorage
    │   ├── BrowserStorage.ts           # 內部工具：IndexedDB + SessionStorage
    │   └── dto/                        # 持久化 DTO (與 application/dto/ 不同)
    │       ├── VideoPersistenceDTO.ts     # 包含 savedAt, sessionId
    │       ├── TranscriptPersistenceDTO.ts # 包含 savedAt, sessionId
    │       └── HighlightPersistenceDTO.ts  # 包含 savedAt, sessionId
    └── utils/                          # 輔助工具
        ├── json-validator.ts           # JSON 格式驗證
        └── dto-mapper.ts               # DTO ↔ Domain Entity 轉換

tests/
└── unit/
    ├── di/
    │   └── container.test.ts
    └── infrastructure/
        ├── MockAIService.test.ts
        ├── FileStorageService.test.ts
        ├── VideoRepositoryImpl.test.ts
        ├── TranscriptRepositoryImpl.test.ts
        ├── HighlightRepositoryImpl.test.ts
        └── BrowserStorage.test.ts
```

**Structure Decision**:
採用 Clean Architecture 標準四層結構（Domain → Application → Infrastructure/Presentation），本次實作專注於 Infrastructure Layer。Infrastructure Layer 不創建新的業務邏輯，僅實作已在 Domain 和 Application Layer 定義的介面。BrowserStorage 為內部工具類別，封裝 IndexedDB 和 SessionStorage 操作，不對外暴露為 Port。**DI Container 建立在專案級位置 `src/di/container.ts`，作為 Infrastructure 和 Presentation Layer 的共享依賴注入機制**。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

無憲法違反項目，無需複雜度追蹤。
