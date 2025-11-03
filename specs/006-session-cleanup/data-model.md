# Data Model: 會話清除功能

**Feature**: 006-session-cleanup
**Date**: 2025-11-03

## Overview

本功能不涉及新的 Domain Entity 或 Value Object，主要是對現有資料模型（Video、Transcript、Highlight）進行刪除操作。為了確保刪除操作的完整性（原子性），新增 ISessionRepository 作為專門處理整個會話生命週期的 Repository。

---

## Domain Layer 變更

### 新增：ISessionRepository

**目的**: 管理整個會話的生命週期（創建、恢復、清除），確保跨多個 Entity 的操作具有原子性。

**職責**:
- 刪除所有會話資料（Video + Transcript + Highlight）
- 透過 IndexedDB Transaction 確保原子性

**介面定義**:

```typescript
// domain/repositories/ISessionRepository.ts

/**
 * ISessionRepository - 會話生命週期管理
 *
 * 職責:
 * - 管理整個會話的生命週期（創建、恢復、清除）
 * - 確保跨多個 Entity 的操作具有原子性
 *
 * 設計理由:
 * - 原有的 IVideoRepository、ITranscriptRepository、IHighlightRepository
 *   各自負責單一 Entity，不適合處理跨 Entity 的原子性操作
 * - ISessionRepository 作為高層次抽象，協調多個 Repository
 */
export interface ISessionRepository {
  /**
   * 刪除所有會話資料
   *
   * 包含：
   * - 所有 Video Entities
   * - 所有 Transcript Entities
   * - 所有 Highlight Entities
   * - SessionStorage 中的 sessionId
   *
   * 原子性保證：
   * - 透過 IndexedDB Transaction 包裝所有刪除操作
   * - 如果任何刪除失敗，整個 Transaction 回滾
   *
   * @throws SessionCleanupError 當刪除失敗時
   */
  deleteAllSessionData(): Promise<void>;

  /**
   * 檢查是否存在會話資料
   *
   * 用途：
   * - 在 App.vue 啟動時判斷是否需要恢復會話
   * - 在編輯畫面判斷資料是否已被刪除
   *
   * @returns true 如果存在任何會話資料（Video/Transcript/Highlight 之一）
   */
  hasSessionData(): Promise<boolean>;
}
```

**設計理由**:
1. **單一職責**: ISessionRepository 專注於會話級別的操作，不涉及單一 Entity 的 CRUD
2. **原子性**: 透過 Transaction 確保刪除操作的完整性
3. **可測試性**: 可以 mock ISessionRepository 來測試 Use Case
4. **未來擴展性**: 如果需要新增「導出會話」、「導入會話」等功能，可在此介面擴展

---

### 修改：現有 Repository 介面

**注意**: 經過調研，決定不修改現有的 IVideoRepository、ITranscriptRepository、IHighlightRepository，因為：

1. **職責分離**: 單一 Entity 的 Repository 不應負責跨 Entity 的原子性操作
2. **避免破壞現有功能**: 新增刪除方法可能影響其他功能
3. **符合 SOLID 原則**: ISessionRepository 遵循單一職責原則和介面隔離原則

因此，刪除操作將完全由 ISessionRepository 負責，不修改現有 Repository。

---

## Application Layer 變更

### 新增：CleanupSessionUseCase

**職責**: 清除所有會話資料，包括 IndexedDB 和 SessionStorage。

**輸入**:
- 無（清除當前會話的所有資料）

**輸出**:
- `Promise<void>`（成功時無返回值）
- 失敗時拋出 `SessionCleanupError`

**流程**:
1. 呼叫 `sessionRepo.deleteAllSessionData()` 刪除 IndexedDB 資料
2. 清除 SessionStorage 中的 `sessionId` 和其他標記
3. 如果步驟 1 失敗，拋出 `SessionCleanupError`

**Use Case 定義**:

```typescript
// application/use-cases/CleanupSessionUseCase.ts

import type { ISessionRepository } from '@/domain/repositories/ISessionRepository';
import { SessionCleanupError } from '@/application/errors/SessionCleanupError';

/**
 * CleanupSessionUseCase - 清除會話 Use Case
 *
 * 職責:
 * - 清除所有會話資料（IndexedDB + SessionStorage）
 * - 確保清除操作的完整性
 *
 * 使用場景:
 * 1. 使用者手動點擊「刪除此會話」按鈕
 * 2. 應用啟動時檢測到 `pendingCleanup` 標記（延遲刪除）
 *
 * 錯誤處理:
 * - 如果 IndexedDB 刪除失敗，拋出 SessionCleanupError
 * - SessionStorage 清除失敗不影響主流程（僅記錄警告）
 */
export class CleanupSessionUseCase {
  constructor(private sessionRepo: ISessionRepository) {}

  /**
   * 執行會話清除
   *
   * @throws SessionCleanupError 當 IndexedDB 刪除失敗時
   */
  async execute(): Promise<void> {
    try {
      // 1. 刪除 IndexedDB 資料（原子性操作）
      await this.sessionRepo.deleteAllSessionData();

      // 2. 清除 SessionStorage（即使失敗也不影響主流程）
      try {
        sessionStorage.removeItem('sessionId');
        sessionStorage.removeItem('pendingCleanup');
        sessionStorage.removeItem('isClosing');
      } catch (error) {
        // SessionStorage 清除失敗不影響主流程
        console.warn('Failed to clear SessionStorage:', error);
      }

    } catch (error) {
      throw new SessionCleanupError(
        'Failed to cleanup session data',
        { cause: error }
      );
    }
  }
}
```

### 新增：SessionCleanupError

```typescript
// application/errors/SessionCleanupError.ts

import { ApplicationError } from './ApplicationError';

/**
 * SessionCleanupError - 會話清除失敗錯誤
 *
 * 觸發情境:
 * - IndexedDB 刪除操作失敗（如 Transaction 失敗）
 * - 資料庫連線異常
 *
 * 處理建議:
 * - 顯示錯誤訊息給使用者
 * - 保留 `pendingCleanup` 標記，下次啟動時重試
 */
export class SessionCleanupError extends ApplicationError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SessionCleanupError';
  }
}
```

---

## Infrastructure Layer 變更

### 新增：SessionRepositoryImpl

**實作細節**:

```typescript
// infrastructure/repositories/SessionRepositoryImpl.ts

import type { ISessionRepository } from '@/domain/repositories/ISessionRepository';
import type { BrowserStorage } from '@/infrastructure/storage/BrowserStorage';
import { SessionCleanupError } from '@/application/errors/SessionCleanupError';

/**
 * SessionRepositoryImpl - ISessionRepository 實作
 *
 * 技術細節:
 * - 使用 IndexedDB Transaction 確保原子性
 * - 使用 idb 套件的 Promise-based API
 * - 清除三個 Object Store: videos, transcripts, highlights
 */
export class SessionRepositoryImpl implements ISessionRepository {
  constructor(private storage: BrowserStorage) {}

  /**
   * 刪除所有會話資料（原子性操作）
   *
   * 實作細節:
   * 1. 開啟 readwrite Transaction（包含三個 Object Store）
   * 2. 並行執行三個 clear() 操作
   * 3. 等待 tx.done 確保 Transaction 完成
   * 4. 如果任何操作失敗，Transaction 自動回滾
   */
  async deleteAllSessionData(): Promise<void> {
    try {
      const db = await this.storage.getDatabase();

      // 開啟 Transaction（包含三個 Object Store）
      const tx = db.transaction(
        ['videos', 'transcripts', 'highlights'],
        'readwrite'
      );

      // 並行執行三個 clear() 操作
      await Promise.all([
        tx.objectStore('videos').clear(),
        tx.objectStore('transcripts').clear(),
        tx.objectStore('highlights').clear(),
        tx.done // 等待 Transaction 完成
      ]);

    } catch (error) {
      throw new SessionCleanupError(
        'Failed to delete session data from IndexedDB',
        { cause: error }
      );
    }
  }

  /**
   * 檢查是否存在會話資料
   *
   * 實作：只檢查 videos Object Store（如果有 video，必然有 transcript 和 highlight）
   */
  async hasSessionData(): Promise<boolean> {
    try {
      const db = await this.storage.getDatabase();
      const count = await db.count('videos');
      return count > 0;
    } catch (error) {
      // 檢查失敗時預設為無資料（安全選擇）
      console.warn('Failed to check session data:', error);
      return false;
    }
  }
}
```

---

## Presentation Layer 變更

### 資料流

```
使用者操作
    ↓
Presentation Layer (UI 組件 / Composable)
    ↓
Store (videoStore / transcriptStore / highlightStore)
    ↓
Application Layer (CleanupSessionUseCase)
    ↓
Infrastructure Layer (SessionRepositoryImpl)
    ↓
IndexedDB (Transaction: clear videos, transcripts, highlights)
```

### Store 變更

**修改**:
- `videoStore.clearSession()`
- `transcriptStore.clearSession()`
- `highlightStore.clearSession()`

**實作**:

```typescript
// presentation/stores/videoStore.ts (範例)
export const useVideoStore = defineStore('video', () => {
  const video = ref<Video | null>(null);

  async function clearSession() {
    // 清除 Store 狀態
    video.value = null;
    // 不直接呼叫 Repository，由 Use Case 統一處理
  }

  return { video, clearSession };
});
```

**注意**: Store 的 `clearSession()` 僅清除記憶體中的狀態，實際的 IndexedDB 刪除由 `CleanupSessionUseCase` 負責。

---

## 狀態轉換圖

```
[有會話資料]
    ↓ (使用者點擊「刪除此會話」)
[顯示確認對話框]
    ↓ (使用者確認)
[執行 CleanupSessionUseCase]
    ↓
[清除 IndexedDB + SessionStorage]
    ↓
[清除 Store 狀態]
    ↓
[導航至初始畫面 (router.replace)]
    ↓
[無會話資料]


[編輯中]
    ↓ (使用者關閉分頁)
[beforeunload 事件觸發]
    ↓
[設定 sessionStorage.pendingCleanup = true]
    ↓
[顯示確認對話框]
    ↓ (使用者確認關閉)
[分頁關閉]
    ↓ (下次啟動應用)
[App.vue 檢測到 pendingCleanup]
    ↓
[執行 CleanupSessionUseCase]
    ↓
[清除 IndexedDB + SessionStorage]
    ↓
[顯示初始上傳畫面]
    ↓
[無會話資料]
```

---

## 資料完整性約束

1. **原子性**: 透過 IndexedDB Transaction 確保 Video、Transcript、Highlight 同時刪除或同時保留
2. **一致性**: 如果 `hasSessionData()` 返回 true，必然存在 Video、Transcript、Highlight 三者
3. **隔離性**: Transaction 的 `readwrite` 模式確保刪除期間其他操作無法讀取
4. **持久性**: Transaction 完成後（`tx.done`），刪除操作立即生效

---

## 測試策略

### 單元測試

1. **CleanupSessionUseCase**:
   - ✅ 成功刪除所有資料
   - ✅ IndexedDB 刪除失敗時拋出 SessionCleanupError
   - ✅ SessionStorage 清除失敗不影響主流程

2. **SessionRepositoryImpl**:
   - ✅ Transaction 成功清除三個 Object Store
   - ✅ Transaction 失敗時拋出錯誤
   - ✅ `hasSessionData()` 正確判斷資料存在性

### 整合測試

1. **完整清除流程**:
   - ✅ 上傳視頻 → 手動刪除 → 確認 IndexedDB 清空
   - ✅ 上傳視頻 → 關閉分頁（pendingCleanup）→ 重新開啟 → 確認清除完成

2. **原子性測試**:
   - ✅ 模擬 Transaction 中某個 clear() 失敗 → 確認所有資料保留

### E2E 測試

1. **手動刪除場景**:
   - ✅ 點擊「刪除此會話」→ 確認對話框 → 導航至首頁 → 確認無法「上一頁」

2. **分頁關閉場景** (Playwright):
   - ✅ 編輯視頻 → 關閉分頁（模擬）→ 重新開啟 → 確認資料已清除

3. **分頁重整場景**:
   - ✅ 編輯視頻 → 刷新頁面 → 確認資料仍存在（未清除）

---

## 延伸閱讀

- [IndexedDB Transaction](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction)
- [idb 套件文件](https://github.com/jakearchibald/idb)
- [beforeunload 事件最佳實踐](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event)
