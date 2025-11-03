# Implementation Plan: Presentation Layer Development

**Branch**: `004-presentation-layer` | **Date**: 2025-11-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-presentation-layer/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

開發 Presentation Layer，實作視頻高光編輯工具的完整 UI 層，包含：

- **視頻上傳模組**: 使用 Vue 3 Composition API 建立上傳介面，整合 UploadVideoUseCase 和 ProcessTranscriptUseCase。視頻處理完成後，AI 建議的高光句子自動設為選中狀態（建立預設高光）
- **編輯區模組**: 顯示轉錄內容（段落、句子、時間戳），支援句子選擇切換和雙向同步
- **預覽區模組**: 使用 video.js 實作片段播放器、文字疊加層、時間軸視覺化
- **響應式佈局**: 使用 Tailwind v4 實作桌面（左右分屏）與移動（上下堆疊）的自適應佈局
- **狀態管理**: 使用 Pinia 建立 videoStore、transcriptStore、highlightStore，維護單向數據流
- **Composables**: 封裝可重用邏輯（useVideoUpload, useTranscript, useHighlight, useVideoPlayer）

技術方法基於 Clean Architecture 和 DDD 原則，通過 DI Container 注入 Use Case，確保 Presentation Layer 不直接依賴 Infrastructure Layer。

## Technical Context

**Language/Version**: TypeScript ^5.9.0 + Vue 3 ^3.5.22
**Primary Dependencies**: Pinia ^3.0.3, video.js ^8.0.0（待安裝）, Naive UI ^2.40.0（待安裝）, @heroicons/vue（待安裝）, Tailwind CSS v4（待設定）
**Storage**: N/A（Presentation Layer 不直接操作儲存，通過 Use Case 和 Repository）
**Testing**: Vitest ^3.2.4（單元測試）+ Vue Test Utils ^2.4.6（組件測試）+ Playwright ^1.56.1（E2E 測試）
**Target Platform**: Web（Desktop: Windows/Mac Chrome, Mobile: iOS Chrome/Safari, Android Chrome）
**Project Type**: Web Application（單一專案，Vite 建置）
**Performance Goals**:

- 句子選擇響應 < 50ms
- 預覽更新延遲 < 200ms
- 片段切換卡頓 < 100ms
- 文字同步誤差 < 100ms
- 編輯區滾動 < 100ms
- FCP < 1.5s, LCP < 2.5s
  **Constraints**:
- 視頻大小限制 100MB
- Bundle 大小 < 500KB (gzip)
- 瀏覽器兼容：支援 ES2020+ 和現代 Web API
- 移動端觸控目標 ≥ 44x44px
- 色彩對比度符合 WCAG AA 標準（4.5:1）
  **Scale/Scope**:
- 組件數量：約 15-20 個 Vue 組件
- Stores：3 個（videoStore, transcriptStore, highlightStore）
- Composables：4 個（useVideoUpload, useTranscript, useHighlight, useVideoPlayer）
- 預期轉錄內容：5-10 段落，每段 3-8 句子（總計 50-100 句子）
- 單一使用者、單一視頻、單一高光版本（此階段）

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Pre-Phase 0 檢查（設計前）

- ✅ **Clean Architecture 分層架構**: Presentation Layer 只依賴 Application 和 Domain Layer，不依賴 Infrastructure
- ✅ **Infrastructure 和 Presentation 職責分離**: Presentation 負責 UI（Components, Stores, Composables），不直接調用 Infrastructure 的實作
- ✅ **通過 Port（介面）解耦**: 透過 Use Case（Application Layer）訪問業務邏輯，透過 DI Container 注入依賴
- ✅ **使用 DDD 模式**: 使用已在 Domain Layer 定義的 Entity（Video, Transcript, Highlight）和 Value Object（TimeStamp, TimeRange）
- ✅ **TypeScript 型別覆蓋率 > 90%**: 所有組件、Store、Composable 的 props、state、methods 都明確定義型別，避免使用 `any`
- ✅ **支援 RWD**: 使用 Tailwind 響應式工具類別（sm, md, lg），桌面 > 1024px 左右分屏，移動 ≤ 768px 上下堆疊
- ✅ **使用 Pinia 單向數據流**: Store 作為單一數據源，組件透過 Store actions 修改狀態，不直接修改 state
- ✅ **透過 DI Container 管理依賴**: Use Case 透過 DI Container 注入到 Store，避免直接 new 實例
- ✅ **Mock 數據符合品質標準**: 使用 Infrastructure Layer 已實作的 MockAIService，數據符合 2-5 分鐘、5-10 段落、20-30% 高光比例等標準

### Phase 1 設計後重新檢查

- ✅ **組件結構符合 Clean Architecture**：組件只依賴 Store 和 Composable，無循環依賴
- ✅ **Composable 無狀態**：所有 Composable 只封裝邏輯和計算屬性，狀態由 Store 管理
- ✅ **非同步操作有錯誤處理**：所有 Store actions 包含 try-catch 和 error state
- ✅ **公開 API 有明確型別定義**：所有 Props、Emits、Store API 都在 contracts/ 中定義
- ✅ **透過 Port 處理 Mock 上傳**：新增 IMockDataProvider Port，符合 Clean Architecture
- ✅ **上傳進度通過回調傳遞**：IFileStorage.save() 新增 onProgress 參數，從 Infrastructure → Application → Presentation

## Project Structure

### Documentation (this feature)

```text
specs/004-presentation-layer/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command) - 定義組件 Props 和 Store API 型別
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

**此專案為單一 Web Application，採用 Clean Architecture 四層結構**

```text
src/
├── domain/                    # 🔴 Domain Layer（已完成 Phase 2）
│   ├── aggregates/           # Video, Transcript, Highlight
│   ├── value-objects/        # TimeStamp, TimeRange, VideoMetadata
│   ├── repositories/         # IVideoRepository, ITranscriptRepository, IHighlightRepository
│   └── services/             # HighlightService
│
├── application/              # 🟡 Application Layer（已完成 Phase 3）
│   ├── use-cases/            # UploadVideoUseCase, ProcessTranscriptUseCase, 等
│   ├── dto/                  # TranscriptDTO, VideoDTO
│   ├── ports/                # ITranscriptGenerator, IFileStorage, IVideoProcessor
│   └── errors/               # ApplicationError, VideoNotFoundError, 等
│
├── infrastructure/           # 🟢 Infrastructure Layer（已完成 Phase 4）
│   ├── api/                  # MockAIService
│   ├── repositories/         # VideoRepositoryImpl, TranscriptRepositoryImpl, HighlightRepositoryImpl
│   ├── storage/              # FileStorageService, BrowserStorage
│   └── utils/                # dto-mapper, json-validator
│
├── presentation/             # 🔵 Presentation Layer（本階段開發）
│   ├── components/           # Vue 組件
│   │   ├── layout/          # SplitLayout.vue
│   │   ├── upload/          # VideoUpload.vue
│   │   ├── editing/         # EditingArea.vue, SectionList.vue, SentenceItem.vue
│   │   └── preview/         # PreviewArea.vue, VideoPlayer.vue, TranscriptOverlay.vue, Timeline.vue
│   ├── composables/          # Composables
│   │   ├── useVideoUpload.ts
│   │   ├── useTranscript.ts
│   │   ├── useHighlight.ts
│   │   └── useVideoPlayer.ts
│   └── stores/               # Pinia Stores
│       ├── videoStore.ts
│       ├── transcriptStore.ts
│       └── highlightStore.ts
│
├── di/                       # 依賴注入配置
│   └── container.ts         # DI Container（已完成）
│
├── App.vue                   # 根組件（需更新）
└── main.ts                   # 應用入口（需更新以設定 Stores）

tests/                        # 測試檔案
├── unit/                     # 單元測試（Use Cases、Domain Entities）
├── component/                # 組件測試（Vue Test Utils）
└── e2e/                      # E2E 測試（Playwright）
```

**Structure Decision**:

- 採用 Clean Architecture 單一專案結構（Option 1）
- Presentation Layer 新增於 `src/presentation/`，包含 `components/`, `composables/`, `stores/` 三個子資料夾
- 組件按功能模組分類：layout（佈局）、upload（上傳）、editing（編輯區）、preview（預覽區）
- 依賴方向：Presentation → Application → Domain，Presentation 不依賴 Infrastructure
- DI Container 已存在於 `src/di/container.ts`，需新增 Store 相關的依賴注入配置

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

本階段無違反 Constitution 原則的情況，無需記錄複雜度豁免。
