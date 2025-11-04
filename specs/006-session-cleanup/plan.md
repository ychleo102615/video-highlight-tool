# Implementation Plan: 會話清理與刪除

**Branch**: `006-session-cleanup` | **Date**: 2025-11-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-session-cleanup/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

本功能為視頻高光編輯工具新增手動會話清理能力。使用者可透過 header 的「刪除高光紀錄」按鈕手動刪除當前分頁會話的所有持久化資料(IndexedDB 中的 videos/transcripts/highlights 以及 sessionStorage 中的 sessionId),並將應用狀態重置為初始上傳介面。按鈕旁顯示說明文字,告知使用者系統會在應用啟動時自動清理超過 24 小時的會話資料(BrowserStorage.cleanupStaleData() 機制)。刪除操作前會顯示確認對話框,防止誤刪。

技術實作採用 Clean Architecture:建立 DeleteSessionUseCase 協調 BrowserStorage 的刪除操作,透過 videoStore 的 deleteSession() action 調用,並在刪除完成後重置所有 Pinia stores 狀態。

## Technical Context

**Language/Version**: TypeScript 5.9.0
**Primary Dependencies**: Vue 3.5.22, Pinia 3.0.3, idb 8.0.3, Naive UI 2.43.1
**Storage**: IndexedDB (視頻檔案 + Entity DTOs) + SessionStorage (sessionId)
**Testing**: Vitest (單元測試) + Vue Test Utils (組件測試)
**Target Platform**: Web (Desktop & Mobile), Chrome/Safari/Firefox 最新版
**Project Type**: Web (Frontend SPA)
**Performance Goals**:
  - 刪除操作完成時間 < 3 秒(從點擊到狀態重置)
  - UI 回應時間 < 100ms(按鈕點擊到對話框顯示)
  - IndexedDB 批次刪除操作 < 2 秒
**Constraints**:
  - 必須正確隔離會話(只刪除當前 sessionId 的資料)
  - 不得影響其他分頁的會話
  - 刪除失敗時必須保留原有資料不變
  - 刪除後狀態必須完全重置(無殘留)
**Scale/Scope**:
  - 單一會話資料規模: 1 個 Video + 1 個 Transcript + 1-3 個 Highlights
  - IndexedDB 可能同時儲存 5-10 個過期會話(待清理)
  - 預期同時開啟的分頁數: 1-5 個

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- ✅ **Clean Architecture**:
  - Domain Layer: 無需新增 Entity(使用現有 Video/Transcript/Highlight)
  - Application Layer: 新增 DeleteSessionUseCase
  - Infrastructure Layer: 擴展 BrowserStorage.deleteSession() 方法
  - Presentation Layer: 新增 DeleteButton 組件,擴展 videoStore

- ✅ **Infrastructure 與 Presentation 職責分離**:
  - BrowserStorage(Infrastructure) 負責 IndexedDB 刪除邏輯
  - DeleteButton(Presentation) 負責 UI 互動與確認對話框
  - 通過 DeleteSessionUseCase 協調,無直接依賴

- ✅ **DDD 模式**: DeleteSessionUseCase 代表完整的用戶操作流程(刪除會話),包含驗證(檢查 sessionId 存在)、執行(調用 BrowserStorage)、狀態重置(清空 stores)

- ✅ **TypeScript 型別安全**:
  - DeleteSessionUseCase.execute() 返回型別明確: `Promise<{ success: boolean; error?: string }>`
  - BrowserStorage.deleteSession(sessionId: string): Promise<void>
  - 無 any 型別使用

- ✅ **RWD**: DeleteButton 在 Desktop 和 Mobile 版本的 header 中顯示,按鈕大小與間距符合各平台觸控標準

- ✅ **單向數據流**:
  - 流程: DeleteButton 點擊 → videoStore.deleteSession() → DeleteSessionUseCase.execute() → BrowserStorage.deleteSession() → stores.reset()
  - Store 為單一數據源,組件不直接操作狀態

- ✅ **依賴注入**: DeleteSessionUseCase 透過建構函式接收 BrowserStorage 依賴,在 di-container.ts 中註冊

- ✅ **Mock 數據標準**: 不適用(本功能為數據刪除,無 Mock 數據需求)

**結論**: 所有憲法要求均符合,無需豁免。可進行 Phase 0 研究。

## Project Structure

### Documentation (this feature)

```text
specs/006-session-cleanup/
├── spec.md              # 功能規格
├── plan.md              # 本文件 (/speckit.plan 輸出)
├── research.md          # Phase 0 輸出 (研究成果)
├── data-model.md        # Phase 1 輸出 (資料模型)
├── quickstart.md        # Phase 1 輸出 (快速上手指南)
├── contracts/           # Phase 1 輸出 (API 合約)
│   └── DeleteSessionUseCase.ts  # Use Case 介面定義
└── checklists/
    └── requirements.md  # 規格驗證清單
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── entities/
│   │   ├── Video.ts              # 現有(無需修改)
│   │   ├── Transcript.ts         # 現有(無需修改)
│   │   └── Highlight.ts          # 現有(無需修改)
│   └── repositories/
│       ├── IVideoRepository.ts   # 現有(無需修改)
│       ├── ITranscriptRepository.ts  # 現有(無需修改)
│       └── IHighlightRepository.ts   # 現有(無需修改)
│
├── application/
│   └── use-cases/
│       ├── UploadVideoUseCase.ts      # 現有
│       ├── RestoreSessionUseCase.ts   # 現有
│       └── DeleteSessionUseCase.ts    # 新增 ⭐
│
├── infrastructure/
│   └── storage/
│       ├── BrowserStorage.ts     # 擴展 deleteSession() 方法 ⭐
│       └── dto/
│           ├── VideoPersistenceDTO.ts     # 現有
│           ├── TranscriptPersistenceDTO.ts # 現有
│           └── HighlightPersistenceDTO.ts  # 現有
│
├── presentation/
│   ├── components/
│   │   ├── AppHeader.vue         # 修改(加入 DeleteButton) ⭐
│   │   └── DeleteButton.vue      # 新增 ⭐
│   └── stores/
│       ├── videoStore.ts         # 擴展 deleteSession() action + 手動實作 reset() ⭐
│       ├── transcriptStore.ts    # 手動實作 reset() ⭐
│       └── highlightStore.ts     # 手動實作 reset() ⭐
│
├── di/
│   └── container.ts              # 註冊 DeleteSessionUseCase ⭐
│
└── config/
    └── constants.ts              # 現有(SESSION_ID_KEY 常數)
```

**Structure Decision**: 採用專案現有的 Clean Architecture 四層結構。本功能主要擴展 Application Layer(新增 Use Case)、Infrastructure Layer(擴展 BrowserStorage)、Presentation Layer(新增刪除按鈕組件與 store action)。Domain Layer 無需修改,直接重用現有 Entity 定義。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

無違反項目。本功能完全符合專案憲法要求。

## Phase 0: Research & Decision Records

_Output: `research.md`_

### Research Tasks

1. **IndexedDB 批次刪除最佳實踐**
   - 研究主題: 如何高效刪除 IndexedDB 中特定 sessionId 的所有記錄
   - 關鍵問題:
     - 使用 transaction + cursor 遍歷刪除 vs. 使用 index.getAll() 再逐一刪除
     - 錯誤處理策略(部分刪除失敗時如何 rollback)
     - 大量記錄刪除時的性能考量

2. **Pinia Store 狀態重置模式**
   - 研究主題: 如何安全地重置所有 Pinia stores 到初始狀態
   - 關鍵問題:
     - 使用 store.$reset() vs. 手動重新賦值
     - 多個 stores 的重置順序是否重要
     - 重置後如何觸發相關組件的重新渲染

3. **確認對話框 UX 最佳實踐**
   - 研究主題: 危險操作(刪除)的確認對話框設計模式
   - 關鍵問題:
     - 使用 Naive UI 的 NDialog vs. 自訂 Modal 組件
     - 對話框內容應包含哪些資訊(資料範圍、不可逆警告)
     - 確認按鈕的文案與顏色(主題色 vs. 危險色)

4. **SessionStorage 清理與重新初始化**
   - 研究主題: 刪除 sessionId 後如何處理後續流程
   - 關鍵問題:
     - 刪除後是否立即生成新 sessionId
     - 新 sessionId 的生成時機(刪除時 vs. 下次上傳時)
     - 多分頁場景下 sessionStorage 的同步問題

### Decision Records

_將在 research.md 中記錄各項研究結果與決策_

## Phase 1: Design Artifacts

_Output: `data-model.md`, `contracts/`, `quickstart.md`_

### Data Model

本功能不涉及新的 Domain Entity,重用現有模型:
- Video (domain/entities/Video.ts)
- Transcript (domain/entities/Transcript.ts)
- Highlight (domain/entities/Highlight.ts)

新增 DTO:
- DeleteSessionResultDTO (application/dto/DeleteSessionResultDTO.ts)
  - success: boolean
  - error?: string

### API Contracts

```typescript
// contracts/DeleteSessionUseCase.ts

export interface IDeleteSessionUseCase {
  /**
   * 刪除當前會話的所有持久化資料
   *
   * @returns Promise<DeleteSessionResultDTO>
   * @throws 不拋出例外,錯誤封裝在 result.error 中
   */
  execute(): Promise<DeleteSessionResultDTO>;
}

export interface DeleteSessionResultDTO {
  success: boolean;
  error?: string;
}
```

```typescript
// BrowserStorage 擴展方法簽名

export class BrowserStorage {
  // ... 現有方法 ...

  /**
   * 刪除指定 sessionId 的所有資料
   *
   * @param sessionId - 要刪除的會話 ID
   * @throws 若 IndexedDB 操作失敗則拋出錯誤
   */
  async deleteSession(sessionId: string): Promise<void>;
}
```

### Component API

```typescript
// DeleteButton.vue props

interface DeleteButtonProps {
  disabled?: boolean;  // 是否禁用(無會話時禁用)
  size?: 'small' | 'medium' | 'large';  // 按鈕大小(RWD)
}

interface DeleteButtonEmits {
  (e: 'deleted'): void;  // 刪除成功後觸發
  (e: 'error', error: string): void;  // 刪除失敗時觸發
}
```

### Quickstart Guide

_將在 quickstart.md 中提供開發者快速上手指南,包含:_
- 如何在本地測試刪除功能
- 如何驗證 IndexedDB 資料已清除
- 如何模擬刪除失敗情境
- 如何測試多分頁隔離

## Phase 2: Task Breakdown

_This phase is handled by `/speckit.tasks` command (NOT part of `/speckit.plan`)_

任務拆解將在執行 `/speckit.tasks` 時自動生成,包含:
- Application Layer: DeleteSessionUseCase 實作
- Infrastructure Layer: BrowserStorage.deleteSession() 實作
- Presentation Layer: DeleteButton 組件與 videoStore.deleteSession() 實作
- Integration: DI Container 註冊與端到端測試
- Testing: 單元測試與組件測試
