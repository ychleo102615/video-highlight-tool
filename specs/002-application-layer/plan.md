# Implementation Plan: Application Layer Development

**Branch**: `002-application-layer` | **Date**: 2025-10-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-application-layer/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

實作 Application Layer 的核心功能，包含 5 個 Use Cases（UploadVideoUseCase, ProcessTranscriptUseCase, CreateHighlightUseCase, ToggleSentenceInHighlightUseCase, GenerateHighlightUseCase）以及 2 個 Port 介面（ITranscriptGenerator, IFileStorage）。Application Layer 負責協調 Domain Layer 的業務邏輯，透過 Port 介面與 Infrastructure Layer 解耦，並提供 DTO 進行跨層數據傳輸。

## Technical Context

**Language/Version**: TypeScript ^5.0.0
**Primary Dependencies**: 僅依賴 Domain Layer（無外部框架依賴）
**Storage**: N/A（Application Layer 定義 Repository 介面，由 Infrastructure Layer 實作）
**Testing**: Vitest（單元測試框架）
**Target Platform**: Web (Desktop & Mobile browsers)
**Project Type**: Single project (Frontend application with Clean Architecture)
**Performance Goals**:
- Use Case 執行時間 < 100ms（不含外部 I/O）
- DTO 轉換效能 < 10ms
- 記憶體使用合理（每個 Use Case 實例 < 1MB）

**Constraints**:
- Application Layer 不得依賴 Infrastructure 或 Presentation Layer
- 所有外部依賴必須透過 Port 介面定義
- Use Cases 必須保持單一職責原則
- DTO 僅用於數據傳輸，不包含業務邏輯

**Scale/Scope**:
- 5 個 Use Cases
- 2 個 Port 介面
- 2 個 DTO 類別
- 平均每個 Use Case < 100 行代碼

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Core Principles Compliance

| 原則 | 狀態 | 說明 |
|------|------|------|
| Clean Architecture 分層 | ✅ PASS | Application Layer 僅依賴 Domain Layer，通過 Port 介面與外層解耦 |
| Infrastructure/Presentation 分離 | ✅ PASS | Application Layer 定義 Port，由 Infrastructure 實作，Presentation 呼叫 Use Cases |
| DDD 模式 | ✅ PASS | 使用 Use Case 模式組織業務邏輯，每個 Use Case 代表完整用戶操作 |
| TypeScript 型別安全 | ✅ PASS | 所有 Use Cases、Ports、DTOs 都有明確型別定義，無 `any` 使用 |
| RWD 支援 | N/A | Application Layer 不涉及 UI，由 Presentation Layer 負責 |
| Pinia 單向數據流 | ✅ PASS | Use Cases 不知道 Store 存在，Store 呼叫 Use Cases 執行邏輯 |
| 依賴注入 | ✅ PASS | 所有 Use Cases 透過建構函式接收 Repository 和 Port 依賴 |
| Mock 數據品質 | N/A | Application Layer 不包含 Mock 數據，由 Infrastructure Layer 實作 |

### Architecture Constraints Compliance

| 約束 | 狀態 | 說明 |
|------|------|------|
| 資料夾結構 | ✅ PASS | `src/application/` 包含 `use-cases/`, `dto/`, `ports/` |
| 命名規範 | ✅ PASS | Use Cases 使用 PascalCase + UseCase 後綴，Ports 使用 I 前綴 |
| 依賴方向 | ✅ PASS | Application → Domain，無反向依賴 |

### Performance Goals Compliance

| 指標 | 目標 | 預期 | 狀態 |
|------|------|------|------|
| Use Case 執行時間 | < 100ms | < 50ms（純邏輯） | ✅ PASS |
| DTO 轉換效能 | < 10ms | < 5ms | ✅ PASS |

### Gate Result

**✅ PASS** - 所有核心原則與架構約束均符合憲法要求，可進入 Phase 0 研究階段。

## Project Structure

### Documentation (this feature)

```text
specs/002-application-layer/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (design patterns & DTO conversion)
├── data-model.md        # Phase 1 output (DTOs, Ports, Use Cases structure)
├── quickstart.md        # Phase 1 output (how to create & test Use Cases)
├── contracts/           # Phase 1 output (Use Case interfaces)
│   ├── use-cases.ts     # TypeScript interfaces for all Use Cases
│   └── ports.ts         # TypeScript interfaces for Ports
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── domain/                     # 🔴 Domain Layer (已完成)
│   ├── aggregates/
│   │   ├── Video.ts
│   │   ├── Transcript/
│   │   └── Highlight.ts
│   ├── value-objects/
│   │   ├── TimeStamp.ts
│   │   ├── TimeRange.ts
│   │   └── VideoMetadata.ts
│   └── repositories/           # Repository 介面定義
│       ├── IVideoRepository.ts
│       ├── ITranscriptRepository.ts
│       └── IHighlightRepository.ts
│
├── application/                # 🟡 Application Layer (本 feature)
│   ├── use-cases/              # Use Cases 實作
│   │   ├── UploadVideoUseCase.ts
│   │   ├── ProcessTranscriptUseCase.ts
│   │   ├── CreateHighlightUseCase.ts
│   │   ├── ToggleSentenceInHighlightUseCase.ts
│   │   └── GenerateHighlightUseCase.ts
│   ├── dto/                    # 數據傳輸物件
│   │   ├── VideoDTO.ts
│   │   └── TranscriptDTO.ts
│   └── ports/                  # 輸入/輸出埠介面
│       ├── IVideoProcessor.ts
│       ├── ITranscriptGenerator.ts
│       └── IFileStorage.ts
│
├── infrastructure/             # 🟢 Infrastructure Layer (未來實作)
│   ├── api/
│   ├── repositories/
│   └── storage/
│
└── presentation/               # 🔵 Presentation Layer (未來實作)
    ├── components/
    ├── composables/
    └── state/

tests/
├── unit/
│   └── application/
│       └── use-cases/          # Use Case 單元測試
│           ├── UploadVideoUseCase.test.ts
│           ├── ProcessTranscriptUseCase.test.ts
│           ├── CreateHighlightUseCase.test.ts
│           ├── ToggleSentenceInHighlightUseCase.test.ts
│           └── GenerateHighlightUseCase.test.ts
└── integration/                # 整合測試（未來）
```

**Structure Decision**: 採用 Clean Architecture 單一專案結構，本 feature 專注於 `src/application/` 目錄的實作。Application Layer 透過 Port 介面與 Infrastructure Layer 解耦，透過 Repository 介面與 Domain Layer 互動。測試採用 Vitest，單元測試使用 mock dependencies 確保獨立性。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

本 feature 無憲法違反項目，所有設計均符合 Clean Architecture 和 DDD 原則。

---

## Phase 0: Research & Design Decisions

本階段將研究以下主題，解決 Technical Context 中的所有未知項：

### 研究主題

1. **Use Case 設計模式**
   - 最佳實踐：輸入驗證、錯誤處理、返回值設計
   - 依賴注入模式（建構函式 vs 方法參數）
   - 事務邊界處理

2. **DTO 轉換策略**
   - DTO → Domain Entity 轉換的位置（Use Case 內 vs 獨立 Mapper）
   - 巢狀結構處理（Section/Sentence 轉換）
   - 驗證邏輯放置位置

3. **錯誤處理模式**
   - 自定義錯誤類別設計（VideoNotFoundError, HighlightNotFoundError）
   - 錯誤傳播機制（throw vs Result pattern）
   - 錯誤訊息國際化考量

4. **Port 介面設計**
   - 介面粒度（粗粒度 vs 細粒度）
   - 異步處理（Promise vs Observable）
   - 介面版本管理

### 預期產出

`research.md` 將記錄所有研究結果，包含：
- 每個主題的決策
- 選擇理由
- 替代方案分析
- 實作範例

---

## Phase 1: Data Model & Contracts

本階段將生成以下文件：

### 1. data-model.md

定義所有 DTOs、Ports 和 Use Cases 的結構：

**DTOs**:
- `VideoDTO`: 視頻元數據（duration, width, height, format）
- `TranscriptDTO`: 轉錄數據（fullText, sections[]）
  - `SectionDTO`: 段落數據（id, title, sentences[]）
  - `SentenceDTO`: 句子數據（id, text, startTime, endTime, isHighlight）

**Ports**:
- `ITranscriptGenerator`: 轉錄生成服務
- `IFileStorage`: 文件儲存服務

**Use Cases**:
- `UploadVideoUseCase`: 輸入、輸出、依賴、流程
- `ProcessTranscriptUseCase`: 輸入、輸出、依賴、流程
- `CreateHighlightUseCase`: 輸入、輸出、依賴、流程
- `ToggleSentenceInHighlightUseCase`: 輸入、輸出、依賴、流程
- `GenerateHighlightUseCase`: 輸入、輸出、依賴、流程

### 2. contracts/

TypeScript 介面定義：

**contracts/ports.ts**:
```typescript
export interface ITranscriptGenerator {
  generate(videoId: string): Promise<TranscriptDTO>;
}

export interface IFileStorage {
  save(file: File): Promise<string>;
  delete(url: string): Promise<void>;
}
```

**contracts/use-cases.ts**:
```typescript
// 所有 Use Cases 的介面簽名
export interface IUploadVideoUseCase {
  execute(file: File): Promise<Video>;
}
// ... 其他 Use Cases
```

### 3. quickstart.md

快速入門指南：
- 如何建立新的 Use Case
- 如何注入依賴
- 如何撰寫單元測試
- 範例程式碼

---

## Next Steps

執行 `/speckit.tasks` 命令生成 `tasks.md`，將 Use Cases 拆解為可執行的開發任務。

---

## Post-Design Constitution Check

*重新評估設計完成後的憲法合規性*

### Phase 1 設計審查

| 原則 | 狀態 | 驗證結果 |
|------|------|----------|
| Clean Architecture 分層 | ✅ PASS | - `data-model.md` 明確定義 DTOs、Ports、Use Cases 結構<br>- Application Layer 僅依賴 Domain Layer 介面<br>- Ports 由 Infrastructure Layer 實作 |
| Infrastructure/Presentation 分離 | ✅ PASS | - Ports（ITranscriptGenerator, IFileStorage）明確定義<br>- Use Cases 不知道實作細節<br>- DI Container 管理依賴注入 |
| DDD 模式 | ✅ PASS | - 每個 Use Case 代表完整用戶操作<br>- DTO 轉換邏輯清晰<br>- 聚合協調模式正確（GenerateHighlightUseCase） |
| TypeScript 型別安全 | ✅ PASS | - 所有 contracts 定義完整型別<br>- 輸入/輸出型別明確<br>- 無 `any` 使用 |
| 單一職責原則 | ✅ PASS | - 每個 Use Case 職責單一且清晰<br>- 平均程式碼行數預估 < 100 行<br>- 私有方法輔助邏輯提取 |
| 錯誤處理 | ✅ PASS | - 9 個領域特定錯誤類別<br>- 錯誤碼支援國際化<br>- 錯誤傳播機制明確 |

### 設計文件完整性

| 文件 | 狀態 | 內容檢查 |
|------|------|----------|
| `research.md` | ✅ 完成 | - 4 個研究主題全部完成<br>- 決策理由清晰<br>- 無 NEEDS CLARIFICATION |
| `data-model.md` | ✅ 完成 | - 2 個 DTOs 定義完整<br>- 2 個 Ports 定義完整<br>- 5 個 Use Cases 流程清晰<br>- 9 個錯誤類別定義 |
| `contracts/ports.ts` | ✅ 完成 | - TypeScript 介面定義<br>- JSDoc 註釋完整 |
| `contracts/use-cases.ts` | ✅ 完成 | - 所有 Use Cases 介面定義<br>- 輸入/輸出型別定義 |
| `quickstart.md` | ✅ 完成 | - 建立 Use Case 步驟<br>- 測試範例<br>- DI 配置範例<br>- 檢查清單 |

### Gate Result

**✅ PASS** - Phase 1 設計完全符合憲法要求，所有設計文件完整且正確。

### 發現與改進

**優點**:
1. 架構清晰，依賴方向正確
2. 錯誤處理完整，支援國際化
3. 測試策略明確（單元測試 + Mock）
4. 文檔完整，開發者友好

**潛在改進**（未來考慮）:
1. 若 Use Cases 數量增加，考慮引入 Use Case 分類（如 Video、Transcript、Highlight 分組）
2. 若需要事務管理，考慮引入 Unit of Work 模式
3. 若需要進度回報，Ports 可添加 `onProgress` 回調參數

**結論**: 設計已準備好進入實作階段（Phase 2: Tasks）。
