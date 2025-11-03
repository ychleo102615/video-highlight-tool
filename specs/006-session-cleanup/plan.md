# Implementation Plan: 會話清除功能

**Branch**: `006-session-cleanup` | **Date**: 2025-11-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-session-cleanup/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

本功能提供兩種會話資料清除機制：(1) 瀏覽器分頁關閉時自動清除 IndexedDB 中的所有會話資料（需使用者確認），(2) 編輯畫面提供手動刪除按鈕立即清除資料。關鍵技術挑戰在於區分「分頁關閉」與「分頁重整」兩種情境，確保重整時不觸發清除邏輯（與 005-session-restore 功能協調），同時保證刪除操作的完整性（無殘留資料）。

技術方案：使用瀏覽器 `beforeunload` 事件攔截關閉行為，透過 `isClosing` flag + `load` event 區分關閉與重整（`beforeunload` 設定 flag，`load` 清除 flag，若 flag 仍存在則為關閉），手動刪除則在 Presentation Layer 提供 UI 按鈕並使用 Naive UI Dialog 確認。刪除邏輯封裝為新的 Use Case（CleanupSessionUseCase），協調 SessionRepository 刪除所有 Entity（Video、Transcript、Highlight），確保原子性（使用 IndexedDB Transaction）。

## Technical Context

**Language/Version**: TypeScript 5.9.0
**Primary Dependencies**: Vue 3.5.22, Pinia 3.0.3, Naive UI 2.43.1, idb 8.0.3 (IndexedDB wrapper), Vue Router
**Storage**: IndexedDB (視頻檔案 + 所有 Entity DTO) + SessionStorage (sessionId)
**Testing**: Vitest 3.2.4 (單元測試), Playwright 1.56.1 (E2E 測試)
**Target Platform**: Web (Desktop: Windows/Mac Chrome, Mobile: iOS/Android Chrome/Safari)
**Project Type**: Single-page web application (SPA) with Clean Architecture
**Performance Goals**:
  - beforeunload 事件處理邏輯執行時間 < 100ms
  - 手動刪除後導航至初始畫面 < 500ms
  - IndexedDB 完整清除時間 < 1s（使用 Transaction 確保原子性）
**Constraints**:
  - 必須區分 beforeunload 的觸發原因（關閉 vs 重整）
  - 必須與 005-session-restore 功能協調（重整時不觸發清除）
  - 必須確保刪除完整性（無殘留資料）
  - beforeunload 確認對話框內容受瀏覽器限制，無法完全自定義
**Scale/Scope**:
  - 單使用者單會話（瀏覽器單分頁）
  - 預期資料量：視頻檔案 < 500MB, Transcript Entities < 1000 筆
  - 新增 1 個 Use Case, 修改 3 個 Repository, 新增 1 個 UI 組件

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Initial Check (Before Phase 0)

- ✅ **Clean Architecture 分層架構**: 遵循 Domain → Application → Infrastructure/Presentation 依賴方向
  - 新增 CleanupSessionUseCase 於 Application Layer
  - 新增刪除方法於現有 Repository 介面（IVideoRepository, ITranscriptRepository, IHighlightRepository）
  - Infrastructure Layer 實作刪除邏輯
  - Presentation Layer 提供 UI 按鈕和 beforeunload 事件處理
- ✅ **Infrastructure/Presentation 職責分離**: 不相互依賴
  - Infrastructure Layer 負責 IndexedDB 刪除操作
  - Presentation Layer 負責 UI 交互和事件監聽
  - 通過 Application Layer 的 Use Case 解耦
- ✅ **通過 Port 解耦**: 透過 Repository 介面（Port）定義刪除方法
  - IVideoRepository.deleteAll(), ITranscriptRepository.deleteByVideoId(), IHighlightRepository.deleteByVideoId()
- ✅ **DDD 模式組織**: Use Case 代表完整的業務流程（清除會話）
  - CleanupSessionUseCase 協調三個 Repository 的刪除操作
- ✅ **TypeScript 型別覆蓋率 > 90%**: 所有新增函數和介面都將明確定義型別
- ✅ **RWD 支援**: 刪除按鈕在 Desktop 和 Mobile 都可正常顯示和操作
- ✅ **Pinia 單向數據流**: Store 呼叫 Use Case，Use Case 不知道 Store 存在
  - videoStore/transcriptStore/highlightStore 提供 clearSession() 方法
- ✅ **DI Container 管理依賴**: CleanupSessionUseCase 透過 DI Container 注入 Repository
- N/A **Mock 數據品質**: 本功能不涉及 Mock 數據

**結論**: ✅ 通過初始檢查，無憲法違反項目，可進入 Phase 0 研究階段。

### Post-Phase 1 Check (After Design)

- ✅ **Clean Architecture 分層架構**: 設計完全遵循依賴方向
  - Domain Layer: ISessionRepository 介面（無外部依賴）
  - Application Layer: CleanupSessionUseCase, SessionCleanupError
  - Infrastructure Layer: SessionRepositoryImpl（依賴 ISessionRepository）
  - Presentation Layer: useSessionCleanup, SessionCleanupButton, Store 修改
- ✅ **Infrastructure/Presentation 職責分離**: 完全解耦
  - Infrastructure 透過 Repository 實作資料存取
  - Presentation 透過 Use Case 呼叫業務邏輯
  - 無直接依賴關係
- ✅ **通過 Port 解耦**: ISessionRepository 作為 Port
  - Domain Layer 定義介面
  - Infrastructure Layer 實作介面
  - Application Layer 依賴介面（非實作）
- ✅ **DDD 模式組織**: CleanupSessionUseCase 完整封裝業務流程
  - 輸入：無（清除當前會話）
  - 輸出：Promise<void> 或 SessionCleanupError
  - 協調 Repository 和 SessionStorage 清除
- ✅ **TypeScript 型別覆蓋率 > 90%**: 所有介面、Use Case、Repository 都有完整型別定義
  - ISessionRepository: 完整型別定義
  - CleanupSessionUseCase: 無 any 型別
  - SessionRepositoryImpl: 依賴 BrowserStorage 型別
- ✅ **RWD 支援**: SessionCleanupButton 使用 Naive UI 響應式組件
- ✅ **Pinia 單向數據流**: Store → Use Case → Repository
  - Store 不直接呼叫 Repository
  - Store 透過 Use Case 執行業務邏輯
- ✅ **DI Container 管理依賴**:
  - BrowserStorage → SessionRepositoryImpl → CleanupSessionUseCase
  - 透過 Vue provide/inject 注入到組件
- N/A **Mock 數據品質**: 本功能不涉及 Mock 數據

**設計變更摘要**:
1. 新增 ISessionRepository（Domain Layer）- 專責會話 (Session) 生命週期管理，協調刪除所有 Entity（Video, Transcript, Highlight）
2. 新增 CleanupSessionUseCase（Application Layer）- 協調清除邏輯
3. 新增 SessionRepositoryImpl（Infrastructure Layer）- 實作 IDB Transaction 清除，確保原子性
4. 新增 useSessionCleanup（Presentation Layer）- 封裝 UI 事件處理（beforeunload, load, pagehide）
5. **未修改現有 Repository 介面**（IVideoRepository, ITranscriptRepository, IHighlightRepository）- 避免破壞現有功能，保持向後兼容

**結論**: ✅ 通過 Post-Phase 1 檢查，設計完全符合憲法要求，可進入 Phase 2（任務生成）。

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
├── application/
│   ├── use-cases/
│   │   └── CleanupSessionUseCase.ts          # [NEW] 會話清除 Use Case
│   └── errors/
│       └── SessionCleanupError.ts             # [NEW] 清除失敗錯誤
│
├── domain/
│   └── repositories/
│       ├── ISessionRepository.ts              # [NEW] 會話生命週期管理介面
│       ├── IVideoRepository.ts                # [NO CHANGE]
│       ├── ITranscriptRepository.ts           # [NO CHANGE]
│       └── IHighlightRepository.ts            # [NO CHANGE]
│
├── infrastructure/
│   └── repositories/
│       ├── SessionRepositoryImpl.ts           # [NEW] 實作 ISessionRepository
│       ├── VideoRepositoryImpl.ts             # [NO CHANGE]
│       ├── TranscriptRepositoryImpl.ts        # [NO CHANGE]
│       └── HighlightRepositoryImpl.ts         # [NO CHANGE]
│
├── presentation/
│   ├── components/
│   │   └── editing/
│   │       └── SessionCleanupButton.vue       # [NEW] 刪除按鈕組件
│   ├── composables/
│   │   └── useSessionCleanup.ts               # [NEW] 會話清除 Composable
│   └── stores/
│       ├── videoStore.ts                      # [MODIFY] 新增 clearSession()
│       ├── transcriptStore.ts                 # [MODIFY] 新增 clearSession()
│       └── highlightStore.ts                  # [MODIFY] 新增 clearSession()
│
└── di/
    └── container.ts                            # [MODIFY] 註冊 CleanupSessionUseCase

tests/
├── unit/
│   └── application/
│       └── CleanupSessionUseCase.spec.ts      # [NEW] Use Case 單元測試
└── e2e/
    └── session-cleanup.spec.ts                # [NEW] E2E 測試（關閉/刷新/手動刪除）
```

**Structure Decision**: 採用現有的 Clean Architecture 分層結構（Domain → Application → Infrastructure/Presentation）。本功能主要影響 Application Layer（新增 Use Case）和 Infrastructure Layer（新增 SessionRepository 實作刪除方法），以及 Presentation Layer（UI 組件和事件處理）。所有新增檔案都遵循現有的命名規範和資料夾結構。**重要**: 不修改現有 Repository 介面（IVideoRepository 等），而是新增專責會話生命週期管理的 ISessionRepository。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

無憲法違反項目，此區塊為空。
