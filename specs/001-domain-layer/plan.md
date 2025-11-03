# Implementation Plan: Domain Layer - 核心業務實體與值物件

**Branch**: `001-domain-layer` | **Date**: 2025-10-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-domain-layer/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

開發 Domain Layer - 定義核心業務實體（Video, Transcript, Highlight）、值物件（TimeStamp, TimeRange, VideoMetadata）和儲存庫介面（IVideoRepository, ITranscriptRepository, IHighlightRepository）。這是整個系統的基礎層，遵循 Clean Architecture 和 DDD 原則，確保業務邏輯純粹且不依賴任何外層技術。所有實體和值物件必須使用 TypeScript 強型別定義，並提供完整的驗證規則。

## Technical Context

**Language/Version**: TypeScript ^5.0.0
**Primary Dependencies**: 無（Domain Layer 不依賴任何外部框架，僅使用 TypeScript 標準庫）
**Storage**: N/A（儲存由 Infrastructure Layer 負責，此層僅定義 Repository 介面）
**Testing**: Vitest（用於單元測試，但此階段專注於定義，測試在 Phase 7 實作）
**Target Platform**: Web (Desktop & Mobile)，瀏覽器環境
**Project Type**: Web Application (Vue 3 + Vite)
**Performance Goals**:

- Transcript 查詢方法（getSentenceById, getAllSentences）必須在 O(n) 時間複雜度內完成（n 為句子或段落總數）
- Highlight 選擇管理方法（addSentence, removeSentence, toggleSentence）必須在 O(1) 時間複雜度內完成（使用 Set 數據結構）
  **Constraints**:
- Domain Layer 不得依賴任何外層技術（Vue, Pinia, axios, video.js 等）
- TypeScript 型別覆蓋率必須達到 100%，無 any 型別
- 所有公開 API 必須有明確的型別定義
- 遵循 Clean Architecture 依賴規則：內層不依賴外層
  **Scale/Scope**:
- 單個 Transcript 預計包含 5-10 個 Section
- 每個 Section 預計包含 3-8 個 Sentence
- 總句子數預計在 1000 以內
- 支援一個視頻多個 Highlight 版本

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Core Principles Verification

| Principle                               | Status  | Notes                                                                                                                                                                                                           |
| --------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Clean Architecture (NON-NEGOTIABLE)** | ✅ PASS | Domain Layer 是最內層，不依賴任何外層技術（Vue, Pinia, axios 等）。僅使用 TypeScript 標準庫。                                                                                                                   |
| **DDD (Domain-Driven Development)**     | ✅ PASS | 使用 Entity（Video, Transcript, Section, Sentence, Highlight）、Value Object（TimeStamp, TimeRange, VideoMetadata）和 Repository Pattern 組織業務邏輯。遵循 Aggregate 模式，只有 Aggregate Root 有 Repository。 |
| **反幻覺指示：事實檢查思考**            | ✅ PASS | 所有技術細節均來自 TECHNICAL_DESIGN.md 和 REQUIREMENTS.md，無假設或臆測。Technical Context 中所有項目均已明確定義，無 NEEDS CLARIFICATION。                                                                     |
| **TypeScript 型別安全**                 | ✅ PASS | 要求型別覆蓋率 100%，無 any 型別，所有公開 API 必須明確定義型別。                                                                                                                                               |
| **RWD (響應式網頁設計)**                | N/A     | Domain Layer 不涉及 UI，此原則在 Presentation Layer 驗證。                                                                                                                                                      |
| **單向數據流與狀態管理**                | N/A     | Domain Layer 不涉及狀態管理，此原則在 Presentation Layer 驗證。                                                                                                                                                 |
| **依賴注入 (DI)**                       | ✅ PASS | Repository 介面在此層定義，供 Application Layer 的 Use Case 透過建構函式注入。                                                                                                                                  |

### Architecture Constraints Verification

| Constraint                                    | Status  | Notes                                                                                                                                                       |
| --------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **資料夾結構規範**                            | ✅ PASS | 遵循 `src/domain/` 結構，包含 `aggregates/`、`value-objects/`、`repositories/`。                                                                            |
| **依賴方向**                                  | ✅ PASS | Domain Layer 是最內層，不依賴 Application、Infrastructure、Presentation 層。                                                                                |
| **命名規範**                                  | ✅ PASS | Entity 使用 PascalCase 名詞（Video, Transcript），Value Object 使用 PascalCase 名詞（TimeStamp, TimeRange），Repository 介面以 I 開頭（IVideoRepository）。 |
| **Infrastructure 和 Presentation 不相互依賴** | N/A     | Domain Layer 不涉及此約束。                                                                                                                                 |

### Performance Goals Verification

| Goal                  | Target | Status  | Notes                                          |
| --------------------- | ------ | ------- | ---------------------------------------------- |
| TypeScript 型別覆蓋率 | > 90%  | ✅ PASS | 要求 100% 覆蓋率，超過基準。                   |
| 查詢效能              | O(n)   | ✅ PASS | Transcript 查詢方法設計為 O(n) 複雜度。        |
| 選擇操作效能          | O(1)   | ✅ PASS | Highlight 使用 Set 數據結構，選擇操作為 O(1)。 |

### Gate Decision

**RESULT**: ✅ **PASS** - 所有核心原則和架構約束均符合憲法要求，可進入 Phase 0 研究階段。

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
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
├── domain/                    # 🔴 Domain Layer - 核心業務邏輯（本階段開發）
│   ├── aggregates/           # 聚合根與聚合
│   │   ├── Video.ts         # Video Aggregate Root
│   │   ├── Transcript/      # Transcript Aggregate
│   │   │   ├── Transcript.ts    # Transcript Aggregate Root
│   │   │   ├── Section.ts       # Section Entity（屬於 Transcript 聚合）
│   │   │   └── Sentence.ts      # Sentence Entity（屬於 Transcript 聚合）
│   │   └── Highlight.ts     # Highlight Aggregate Root
│   ├── value-objects/        # 值物件
│   │   ├── TimeStamp.ts     # 時間點（支援毫秒精度）
│   │   ├── TimeRange.ts     # 時間範圍
│   │   └── VideoMetadata.ts # 視頻元數據
│   ├── services/             # 領域服務
│   │   └── HighlightService.ts  # 協調 Highlight 和 Transcript 的跨聚合查詢
│   └── repositories/         # 儲存庫介面
│       ├── IVideoRepository.ts
│       ├── ITranscriptRepository.ts
│       └── IHighlightRepository.ts
│
├── application/              # 🟡 Application Layer（Phase 3 開發）
│   ├── use-cases/
│   ├── dto/
│   └── ports/
│
├── infrastructure/           # 🟢 Infrastructure Layer（Phase 4 開發）
│   ├── api/
│   ├── repositories/
│   └── storage/
│
└── presentation/             # 🔵 Presentation Layer（Phase 5 開發）
    ├── components/
    ├── composables/
    ├── state/
    ├── App.vue
    └── main.ts

tests/                        # Phase 7 開發
├── unit/
│   └── domain/              # Domain Layer 單元測試
│       ├── Video.test.ts
│       ├── Transcript.test.ts
│       ├── Highlight.test.ts
│       ├── TimeStamp.test.ts
│       └── TimeRange.test.ts
└── integration/
```

**Structure Decision**:

採用 Clean Architecture 四層結構（Domain, Application, Infrastructure, Presentation）。本階段（Phase 2）專注於 **Domain Layer** 的開發，包括：

1. **Aggregates（聚合）**:
   - `Video.ts`: 視頻聚合根（單一實體聚合）
   - `Transcript/`: 轉錄聚合（包含 Transcript、Section、Sentence）
   - `Highlight.ts`: 高光聚合根（單一實體聚合）

2. **Value Objects（值物件）**:
   - `TimeStamp.ts`: 時間點值物件
   - `TimeRange.ts`: 時間範圍值物件
   - `VideoMetadata.ts`: 視頻元數據值物件

3. **Repositories（儲存庫介面）**:
   - `IVideoRepository.ts`: 視頻儲存庫介面
   - `ITranscriptRepository.ts`: 轉錄儲存庫介面
   - `IHighlightRepository.ts`: 高光儲存庫介面

**關鍵設計決策**:

- Transcript 聚合使用子資料夾組織（Transcript/），因為包含多個 Entity（Section, Sentence）
- Video 和 Highlight 為單一實體聚合，直接放在 `aggregates/` 目錄
- 所有 Repository 介面在 Domain Layer 定義，由 Infrastructure Layer 實作（符合依賴反轉原則）

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**無違反項目** - 所有設計決策均符合憲法要求，無需額外複雜度證明。

---

## Phase 0: Research (COMPLETED ✅)

**Output**: [research.md](./research.md)

**Key Decisions**:

1. 使用 TypeScript Class 定義實體和值物件
2. 使用 `readonly` 和 `ReadonlyArray` 確保不可變性
3. 在建構函式中執行值物件驗證
4. 使用 `Set<string>` + `string[]` 管理高光選擇
5. 通過 ID 引用實現跨聚合查詢
6. 只有 Aggregate Root 才有 Repository 介面

---

## Phase 1: Design & Contracts (COMPLETED ✅)

**Outputs**:

- [data-model.md](./data-model.md) - 完整的數據模型設計
- [contracts/type-definitions.ts](./contracts/type-definitions.ts) - TypeScript 型別契約
- [contracts/README.md](./contracts/README.md) - 契約使用說明
- [quickstart.md](./quickstart.md) - 快速開發指南

**Key Artifacts**:

1. **Data Model**: 定義了 3 個 Aggregate（Video, Transcript, Highlight）、3 個 Value Object（TimeStamp, TimeRange, VideoMetadata）和 3 個 Repository 介面
2. **Type Definitions**: 定義了所有實體、值物件和 Repository 的 TypeScript 型別契約
3. **Quickstart Guide**: 提供了詳細的開發流程和程式碼範例

---

## Post-Design Constitution Check

### Core Principles Re-verification (After Phase 1)

| Principle               | Status  | Notes                                                                              |
| ----------------------- | ------- | ---------------------------------------------------------------------------------- |
| **Clean Architecture**  | ✅ PASS | Data model 確認無外層依賴，所有型別定義純粹使用 TypeScript 標準庫。                |
| **DDD**                 | ✅ PASS | 聚合邊界清晰（Video, Transcript, Highlight），Repository 只定義在 Aggregate Root。 |
| **反幻覺指示**          | ✅ PASS | 所有設計決策均基於 TECHNICAL_DESIGN.md，無假設內容。                               |
| **TypeScript 型別安全** | ✅ PASS | 型別契約 100% 覆蓋，無 any 型別。                                                  |

### Architecture Constraints Re-verification

| Constraint     | Status  | Notes                                                                                             |
| -------------- | ------- | ------------------------------------------------------------------------------------------------- |
| **資料夾結構** | ✅ PASS | 完全符合 `src/domain/aggregates/`, `src/domain/value-objects/`, `src/domain/repositories/` 結構。 |
| **依賴方向**   | ✅ PASS | 無向外依賴，Value Object → Entity → Aggregate Root 的依賴方向正確。                               |
| **命名規範**   | ✅ PASS | Video, Transcript, Highlight (PascalCase), IVideoRepository (I 前綴), TimeStamp (PascalCase)。    |

**Final Gate Decision**: ✅ **PASS** - Phase 1 設計完全符合憲法要求，可以開始實作。

---

## Implementation Plan

### Recommended Implementation Order

1. **值物件** (優先，無依賴):
   - `TimeStamp.ts` → `TimeRange.ts` → `VideoMetadata.ts`

2. **簡單實體**:
   - `Video.ts` (依賴 VideoMetadata)
   - `Sentence.ts` (依賴 TimeRange)

3. **複雜實體**:
   - `Section.ts` (依賴 Sentence, TimeRange)
   - `Transcript.ts` (依賴 Section, Sentence)

4. **跨聚合查詢**:
   - `Highlight.ts` (依賴 Transcript)

5. **儲存庫介面**:
   - `IVideoRepository.ts` → `ITranscriptRepository.ts` → `IHighlightRepository.ts`

### Estimated Effort

| Component              | Estimated Time | Priority    |
| ---------------------- | -------------- | ----------- |
| 值物件 (3 個)          | 2 小時         | P1          |
| 簡單實體 (2 個)        | 2 小時         | P1          |
| 複雜實體 (2 個)        | 3 小時         | P1          |
| 跨聚合查詢 (1 個)      | 3 小時         | P1          |
| Repository 介面 (3 個) | 1 小時         | P2          |
| **Total**              | **11 小時**    | **~1.5 天** |

---

## Next Steps

本計劃（`/speckit.plan`）已完成。後續步驟：

1. **執行 `/speckit.tasks`**: 生成詳細的任務清單（tasks.md）
2. **開始實作**: 按照 quickstart.md 的指引開始開發
3. **持續驗證**: 每完成一個組件，執行 `npm run type-check` 確保型別正確

---

## References

- [spec.md](./spec.md) - 功能規格說明
- [research.md](./research.md) - 實作研究與最佳實踐
- [data-model.md](./data-model.md) - 詳細的數據模型設計
- [quickstart.md](./quickstart.md) - 快速開發指南
- [contracts/](./contracts/) - TypeScript 型別契約
- [TECHNICAL_DESIGN.md](../../TECHNICAL_DESIGN.md) - 整體技術設計
- [憲法](../../.specify/memory/constitution.md) - 專案憲法
