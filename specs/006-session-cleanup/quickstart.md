# Quickstart Guide: 會話清除功能

**Feature**: 006-session-cleanup
**Last Updated**: 2025-11-03

本指南提供會話清除功能的快速實作路徑，協助開發者理解關鍵檔案、實作順序和測試策略。

---

## 目標

實作兩種會話清除機制：
1. **自動清除**：分頁關閉時（`beforeunload` 事件）
2. **手動清除**：編輯畫面的「刪除此會話（示意）」按鈕

---

## 開發順序（推薦）

### Phase 1: Domain & Application Layer (核心邏輯)

**預計時間**: 2 小時

1. **定義 ISessionRepository 介面**
   - 檔案：`src/domain/repositories/ISessionRepository.ts`
   - 參考：`specs/006-session-cleanup/contracts/ISessionRepository.contract.ts`
   - 關鍵方法：`deleteAllSessionData()`, `hasSessionData()`

2. **實作 SessionCleanupError**
   - 檔案：`src/application/errors/SessionCleanupError.ts`
   - 繼承 `ApplicationError`
   - 用於標識清除失敗錯誤

3. **實作 CleanupSessionUseCase**
   - 檔案：`src/application/use-cases/CleanupSessionUseCase.ts`
   - 參考：`specs/006-session-cleanup/contracts/CleanupSessionUseCase.contract.ts`
   - 協調 Repository 和 SessionStorage 清除

4. **單元測試 CleanupSessionUseCase**
   - 檔案：`tests/unit/application/CleanupSessionUseCase.spec.ts`
   - 測試：成功清除、IndexedDB 失敗、SessionStorage 失敗

---

### Phase 2: Infrastructure Layer (資料存取)

**預計時間**: 2 小時

5. **實作 SessionRepositoryImpl**
   - 檔案：`src/infrastructure/repositories/SessionRepositoryImpl.ts`
   - 使用 `BrowserStorage.getDatabase()` 取得 IDB 連線
   - 使用 Transaction 包裝三個 `clear()` 操作

6. **整合測試 SessionRepositoryImpl**
   - 檔案：`tests/integration/repositories/SessionRepositoryImpl.spec.ts`
   - 測試：Transaction 原子性、成功清除、失敗回滾

---

### Phase 3: Presentation Layer (UI & 事件處理)

**預計時間**: 3 小時

7. **實作 useSessionCleanup Composable**
   - 檔案：`src/presentation/composables/useSessionCleanup.ts`
   - 功能：
     - `handleManualDelete()`: 手動刪除邏輯
     - `handleBeforeUnload()`: beforeunload 事件處理
   - 參考：`specs/006-session-cleanup/contracts/CleanupSessionUseCase.contract.ts`

8. **建立 SessionCleanupButton 組件**
   - 檔案：`src/presentation/components/editing/SessionCleanupButton.vue`
   - UI：使用 Naive UI 的 `n-button` 和 `n-dialog`
   - 呼叫 `useSessionCleanup().handleManualDelete()`

9. **修改 Store 新增 clearSession()**
   - 檔案：
     - `src/presentation/stores/videoStore.ts`
     - `src/presentation/stores/transcriptStore.ts`
     - `src/presentation/stores/highlightStore.ts`
   - 功能：清除記憶體中的狀態（不直接呼叫 Repository）

10. **整合 useSessionCleanup 到 App.vue**
    - 檔案：`src/App.vue`
    - 功能：
      - 啟動時檢查 `pendingCleanup` 標記（延遲清除）
      - 全域監聽 `beforeunload` 事件

11. **整合 SessionCleanupButton 到編輯畫面**
    - 檔案：（根據專案結構決定，如 `src/presentation/components/editing/EditingView.vue`）
    - 位置：編輯畫面的工具列或側邊欄

---

### Phase 4: DI Container & 測試

**預計時間**: 2 小時

12. **註冊到 DI Container**
    - 檔案：`src/di/container.ts`
    - 註冊 `SessionRepositoryImpl` 和 `CleanupSessionUseCase`

13. **E2E 測試**
    - 檔案：`tests/e2e/session-cleanup.spec.ts`
    - 場景：
      - 手動刪除 → 確認資料清除 → 無法「上一頁」
      - 刷新頁面 → 資料保留
      - 關閉分頁（模擬）→ 重新開啟 → 資料清除

---

## 關鍵檔案清單

### 新增檔案（7 個）

| 檔案                                                         | 類型           | 預計行數 |
| ------------------------------------------------------------ | -------------- | -------- |
| `src/domain/repositories/ISessionRepository.ts`              | Interface      | 30       |
| `src/application/errors/SessionCleanupError.ts`              | Error Class    | 10       |
| `src/application/use-cases/CleanupSessionUseCase.ts`         | Use Case       | 40       |
| `src/infrastructure/repositories/SessionRepositoryImpl.ts`   | Repository     | 60       |
| `src/presentation/composables/useSessionCleanup.ts`          | Composable     | 80       |
| `src/presentation/components/editing/SessionCleanupButton.vue` | Component      | 60       |
| `tests/e2e/session-cleanup.spec.ts`                          | E2E Test       | 100      |

**總計**: 約 380 行新增程式碼

### 修改檔案（4 個）

| 檔案                                           | 修改內容                            | 預計行數 |
| ---------------------------------------------- | ----------------------------------- | -------- |
| `src/presentation/stores/videoStore.ts`        | 新增 `clearSession()`               | +5       |
| `src/presentation/stores/transcriptStore.ts`   | 新增 `clearSession()`               | +5       |
| `src/presentation/stores/highlightStore.ts`    | 新增 `clearSession()`               | +5       |
| `src/App.vue`                                  | 整合 `useSessionCleanup`            | +20      |
| `src/di/container.ts`                          | 註冊 `CleanupSessionUseCase`        | +10      |

**總計**: 約 45 行修改程式碼

---

## 實作檢查清單

### Domain & Application Layer

- [ ] ISessionRepository 介面定義完成
- [ ] SessionCleanupError 實作完成
- [ ] CleanupSessionUseCase 實作完成
- [ ] CleanupSessionUseCase 單元測試通過

### Infrastructure Layer

- [ ] SessionRepositoryImpl 實作完成
- [ ] Transaction 正確包裝三個 clear() 操作
- [ ] SessionRepositoryImpl 整合測試通過
- [ ] 原子性測試通過（模擬部分失敗）

### Presentation Layer

- [ ] useSessionCleanup Composable 實作完成
- [ ] SessionCleanupButton 組件實作完成
- [ ] Store 的 clearSession() 實作完成
- [ ] App.vue 整合 useSessionCleanup
- [ ] 編輯畫面整合 SessionCleanupButton

### DI & Testing

- [ ] DI Container 註冊完成
- [ ] E2E 測試：手動刪除場景通過
- [ ] E2E 測試：分頁重整場景通過
- [ ] E2E 測試：分頁關閉場景通過（延遲清除）

### 文件與規範

- [ ] 所有新增檔案都有 TSDoc 註解
- [ ] TypeScript 型別覆蓋率 > 90%
- [ ] ESLint 檢查無錯誤
- [ ] 符合 Clean Architecture 依賴規則

---

## 常見陷阱與解決方案

### 1. beforeunload 無法區分關閉與刷新

**陷阱**: 直接在 `beforeunload` 中刪除資料會導致刷新時也觸發清除。

**解決方案**: 採用「延遲刪除」策略：
- `beforeunload` 僅設定 `sessionStorage.pendingCleanup = true`
- 下次啟動時檢查標記並執行清除
- 如果是刷新，`load` 事件會清除標記

### 2. IndexedDB 刪除操作無法在 beforeunload 中完成

**陷阱**: IndexedDB 是非同步的，瀏覽器可能在刪除完成前就關閉分頁。

**解決方案**: 延遲到下次啟動時刪除（見上述方案）。

### 3. Transaction 未正確等待 tx.done

**陷阱**: 未等待 `tx.done` 可能導致 Transaction 未完成就返回。

**解決方案**:
```typescript
await Promise.all([
  tx.objectStore('videos').clear(),
  tx.objectStore('transcripts').clear(),
  tx.objectStore('highlights').clear(),
  tx.done // ← 關鍵：必須等待
]);
```

### 4. 手動刪除後「上一頁」仍可導航回編輯畫面

**陷阱**: 使用 `router.push('/')` 會留下歷史記錄。

**解決方案**: 使用 `router.replace('/')` 替換當前歷史記錄。

### 5. SessionStorage 不可用（隱私模式）

**陷阱**: 某些瀏覽器隱私模式下 SessionStorage 不可用。

**解決方案**: 使用 try-catch 包裹 SessionStorage 操作，失敗時僅記錄警告。

---

## 效能優化建議

### 1. 並行執行 clear() 操作

```typescript
// ✅ 好：並行執行
await Promise.all([
  tx.objectStore('videos').clear(),
  tx.objectStore('transcripts').clear(),
  tx.objectStore('highlights').clear(),
  tx.done
]);

// ❌ 壞：串行執行
await tx.objectStore('videos').clear();
await tx.objectStore('transcripts').clear();
await tx.objectStore('highlights').clear();
await tx.done;
```

### 2. 避免在 beforeunload 中執行同步操作

```typescript
// ❌ 壞：同步操作會阻塞關閉
window.addEventListener('beforeunload', (e) => {
  // 大量同步計算
  for (let i = 0; i < 1000000; i++) { /* ... */ }
});

// ✅ 好：僅設定標記
window.addEventListener('beforeunload', (e) => {
  sessionStorage.setItem('pendingCleanup', 'true');
  e.preventDefault();
  e.returnValue = '';
});
```

### 3. 使用 count() 而非 getAll() 檢查資料存在

```typescript
// ✅ 好：僅查詢計數
const count = await db.count('videos');
return count > 0;

// ❌ 壞：查詢所有資料
const videos = await db.getAll('videos');
return videos.length > 0;
```

---

## 測試策略

### 單元測試（Vitest）

**檔案**: `tests/unit/application/CleanupSessionUseCase.spec.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { CleanupSessionUseCase } from '@/application/use-cases/CleanupSessionUseCase';
import type { ISessionRepository } from '@/domain/repositories/ISessionRepository';
import { SessionCleanupError } from '@/application/errors/SessionCleanupError';

describe('CleanupSessionUseCase', () => {
  it('should delete all session data successfully', async () => {
    const mockRepo: ISessionRepository = {
      deleteAllSessionData: vi.fn().mockResolvedValue(undefined),
      hasSessionData: vi.fn()
    };
    const useCase = new CleanupSessionUseCase(mockRepo);

    await useCase.execute();

    expect(mockRepo.deleteAllSessionData).toHaveBeenCalledOnce();
  });

  it('should throw SessionCleanupError when repository fails', async () => {
    const mockRepo: ISessionRepository = {
      deleteAllSessionData: vi.fn().mockRejectedValue(new Error('IDB error')),
      hasSessionData: vi.fn()
    };
    const useCase = new CleanupSessionUseCase(mockRepo);

    await expect(useCase.execute()).rejects.toThrow(SessionCleanupError);
  });
});
```

### E2E 測試（Playwright）

**檔案**: `tests/e2e/session-cleanup.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Session Cleanup', () => {
  test('manual delete should clear session and prevent back navigation', async ({ page }) => {
    // 1. 上傳視頻並編輯
    await page.goto('/');
    await page.setInputFiles('input[type="file"]', 'test-video.mp4');
    await page.waitForSelector('text=編輯畫面');

    // 2. 點擊「刪除此會話」
    await page.click('button:has-text("刪除此會話")');
    await page.click('button:has-text("確定")'); // 確認對話框

    // 3. 確認導航至首頁
    await expect(page).toHaveURL('/');

    // 4. 嘗試「上一頁」
    await page.goBack();
    await expect(page).toHaveURL('/'); // 仍在首頁（無法回編輯畫面）
  });

  test('page refresh should preserve session data', async ({ page }) => {
    // 1. 上傳視頻並編輯
    await page.goto('/');
    await page.setInputFiles('input[type="file"]', 'test-video.mp4');
    await page.waitForSelector('text=編輯畫面');

    // 2. 刷新頁面
    await page.reload();

    // 3. 確認資料仍存在
    await expect(page).toHaveURL('/editing'); // 仍在編輯畫面
    await expect(page.locator('video')).toBeVisible(); // 視頻仍存在
  });
});
```

---

## 除錯技巧

### 1. 檢查 IndexedDB 資料

使用 Chrome DevTools:
1. 打開 DevTools → Application → Storage → IndexedDB
2. 展開 `video-highlight-tool` 資料庫
3. 查看 `videos`, `transcripts`, `highlights` Object Store

### 2. 檢查 SessionStorage 標記

```javascript
// 在 Console 中執行
console.log('sessionId:', sessionStorage.getItem('sessionId'));
console.log('pendingCleanup:', sessionStorage.getItem('pendingCleanup'));
console.log('isClosing:', sessionStorage.getItem('isClosing'));
```

### 3. 監聽 beforeunload 事件

```javascript
window.addEventListener('beforeunload', (e) => {
  console.log('beforeunload triggered');
  console.log('pendingCleanup:', sessionStorage.getItem('pendingCleanup'));
});
```

### 4. 模擬延遲清除

```javascript
// 在 Console 中手動設定標記
sessionStorage.setItem('pendingCleanup', 'true');
// 然後刷新頁面,觀察 App.vue 是否執行清除
```

---

## 參考資源

- [Spec: spec.md](./spec.md) - 功能需求
- [Research: research.md](./research.md) - 技術調研
- [Data Model: data-model.md](./data-model.md) - 資料模型
- [Contract: ISessionRepository.contract.ts](./contracts/ISessionRepository.contract.ts)
- [Contract: CleanupSessionUseCase.contract.ts](./contracts/CleanupSessionUseCase.contract.ts)

## 外部文件

- [MDN: beforeunload Event](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event)
- [MDN: IndexedDB Transaction](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction)
- [idb Library](https://github.com/jakearchibald/idb)
- [Vue Router: Navigation Guards](https://router.vuejs.org/guide/advanced/navigation-guards.html)

---

## 預計時間分配

| 階段                     | 預計時間 |
| ------------------------ | -------- |
| Domain & Application     | 2 小時   |
| Infrastructure           | 2 小時   |
| Presentation             | 3 小時   |
| DI & Testing             | 2 小時   |
| 整合與除錯               | 1 小時   |
| **總計**                 | **10 小時** |

**建議分配**: 2 個工作日（每日 5 小時）

---

## 下一步

完成本功能後,執行:
```bash
npm run type-check  # 型別檢查
npm run lint        # 代碼風格檢查
npm run test:unit   # 單元測試
npm run test:e2e    # E2E 測試
```

確認所有檢查通過後,準備進入 `/speckit.tasks` 階段生成詳細任務清單。
