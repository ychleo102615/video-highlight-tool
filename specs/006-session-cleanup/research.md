# Research: 會話清除功能技術調研

**Feature**: 006-session-cleanup
**Date**: 2025-11-03
**Status**: Completed

## Research Questions

本階段需要解決以下技術不確定性：

1. 如何區分 `beforeunload` 事件的觸發原因（分頁關閉 vs 頁面重整）？
2. 如何確保 IndexedDB 刪除操作的完整性（無殘留資料）？
3. 如何在 `beforeunload` 事件中執行非同步的 IndexedDB 刪除操作？
4. 如何在手動刪除後阻止使用者透過「上一頁」導航回已刪除的會話？
5. 如何在 Vue 3 應用中全域監聽 `beforeunload` 事件（最佳實踐）？

---

## 1. 區分 beforeunload 的觸發原因

### 問題描述

`beforeunload` 事件在以下情境都會觸發：
- 關閉分頁/視窗
- 刷新頁面（F5, Cmd+R）
- 導航到其他頁面
- 透過 `window.location` 修改 URL

本功能要求：僅在「關閉分頁」時清除資料，「刷新頁面」時保留資料。

### 調研結果

**方案 A: Performance Navigation API (推薦)**

使用 `performance.navigation.type` 或 Navigation Timing API v2 的 `PerformanceNavigationTiming` 來判斷導航類型。

```typescript
// 在 beforeunload 中設定標記
window.addEventListener('beforeunload', (e) => {
  // 設定 sessionStorage 標記,表示即將離開
  sessionStorage.setItem('isNavigating', 'true');

  // 顯示確認對話框（僅在需要時）
  e.preventDefault();
  e.returnValue = '';
});

// 在 DOMContentLoaded 或 load 中檢查標記
window.addEventListener('load', () => {
  const wasNavigating = sessionStorage.getItem('isNavigating');

  if (wasNavigating) {
    // 檢查是否為重整
    const navType = performance.navigation.type;
    // navType: 0 = TYPE_NAVIGATE, 1 = TYPE_RELOAD, 2 = TYPE_BACK_FORWARD

    if (navType === 1) {
      // 重整 - 不清除資料
      console.log('Page reloaded, keep data');
    } else {
      // 導航或關閉 - 清除資料（但此時分頁已關閉,無法執行）
      console.log('Page navigated away or closed');
    }

    // 清除標記
    sessionStorage.removeItem('isNavigating');
  }
});
```

**限制**: 如果分頁真的關閉,`load` 事件不會再次觸發,因此無法區分「關閉」與「導航」。

**方案 B: pagehide + pageshow 事件組合 (推薦)**

使用 `pagehide` 和 `pageshow` 事件配合 `event.persisted` 屬性來判斷是否為 bfcache（back-forward cache）恢復。

```typescript
// 在 pagehide 中設定標記
window.addEventListener('pagehide', (e) => {
  if (!e.persisted) {
    // persisted = false: 分頁真正關閉或導航到其他頁面
    // 清除資料的邏輯
    cleanupSession();
  } else {
    // persisted = true: 頁面進入 bfcache（用戶導航離開但可能返回）
    // 不清除資料
  }
});

// 在 pageshow 中檢查是否從 bfcache 恢復
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    // 從 bfcache 恢復,頁面未重新載入
    console.log('Restored from bfcache');
  }
});
```

**限制**: `pagehide` 在分頁關閉時不一定觸發（特別是強制關閉）。

**方案 C: visibilitychange + beforeunload 組合 (最可行)**

結合 `visibilitychange` 和 `beforeunload` 事件來偵測使用者意圖。

```typescript
let isRefreshing = false;

// 偵測刷新行為（Ctrl+R, F5, Cmd+R）
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
    isRefreshing = true;
  }
  if (e.key === 'F5') {
    isRefreshing = true;
  }
});

// 偵測點擊瀏覽器刷新按鈕（需配合其他方法）
// 無直接方法,但可透過 Navigation Timing API 檢測

window.addEventListener('beforeunload', (e) => {
  if (isRefreshing) {
    // 重整 - 不顯示確認,不清除
    return;
  }

  // 其他情境 - 顯示確認對話框
  e.preventDefault();
  e.returnValue = '';

  // 設定標記,表示可能即將清除
  sessionStorage.setItem('shouldCleanup', 'true');
});

// 頁面重新載入時檢查
window.addEventListener('load', () => {
  isRefreshing = false; // 重置標記

  const shouldCleanup = sessionStorage.getItem('shouldCleanup');
  if (shouldCleanup) {
    // 如果頁面重新載入,表示是刷新,不是關閉
    sessionStorage.removeItem('shouldCleanup');
    // 不執行清除
  }
});
```

**限制**: 無法完全覆蓋所有刷新場景（如瀏覽器按鈕刷新）。

### 選擇的方案

**混合方案：beforeunload + sessionStorage 標記 + load 事件檢查**

理由：
1. 在 `beforeunload` 中設定 `sessionStorage` 標記（`willUnload = true`）
2. 如果是刷新，`load` 事件會觸發，清除標記並恢復資料（透過 session-restore）
3. 如果是關閉，`load` 不會觸發，下次開啟應用時檢查標記不存在，視為新會話
4. **關鍵**: 在 `beforeunload` 中僅設定標記，不執行清除。實際清除由 `pagehide` 或同步機制完成

**實作策略**:
```typescript
// useSessionCleanup.ts
export function useSessionCleanup() {
  const router = useRouter();

  // 1. beforeunload: 設定標記 + 顯示確認對話框
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    // 設定標記
    sessionStorage.setItem('isClosing', 'true');

    // 顯示確認對話框
    e.preventDefault();
    e.returnValue = '關閉分頁將刪除此會話的所有資料，確定要繼續嗎？';
  };

  // 2. pagehide: 實際清除（如果標記存在且 persisted = false）
  const handlePageHide = (e: PageTransitionEvent) => {
    const isClosing = sessionStorage.getItem('isClosing') === 'true';

    if (isClosing && !e.persisted) {
      // 執行同步清除（IndexedDB 刪除）
      cleanupSessionSync();
      sessionStorage.removeItem('isClosing');
    }
  };

  // 3. load: 清除標記（如果頁面重新載入）
  const handleLoad = () => {
    sessionStorage.removeItem('isClosing');
  };

  onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('load', handleLoad);
  });

  onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('pagehide', handlePageHide);
    window.removeEventListener('load', handleLoad);
  });
}
```

### 替代方案與拒絕理由

| 方案                          | 優點                     | 缺點                                       | 拒絕理由                             |
| ----------------------------- | ------------------------ | ------------------------------------------ | ------------------------------------ |
| 僅使用 beforeunload           | 簡單                     | 無法區分關閉與刷新                         | 不符合需求（刷新時會誤觸發清除）     |
| 使用 Beacon API 發送請求      | 非同步,不阻塞            | 需要後端,本專案無後端                      | 超出專案範圍（純前端）               |
| 使用 Service Worker           | 可在背景執行             | 複雜度高,需額外設定                        | 過度設計（本功能不需要背景執行）     |
| 定期檢查會話是否過期          | 可清理孤兒會話           | 無法滿足「關閉時立即清除」需求             | 不符合需求（需要關閉時清除）         |
| unload 事件                   | 觸發時機明確             | 已被廢棄,現代瀏覽器可能不支援              | 相容性問題                           |

---

## 2. IndexedDB 刪除操作的完整性

### 問題描述

需要確保刪除 Video、Transcript、Highlight 三個 Object Store 的資料時不會留下殘留資料。

### 調研結果

**方案 A: Transaction 包裝所有刪除操作 (推薦)**

使用 IDB 的 Transaction 機制,將三個刪除操作包裝在同一個 transaction 中,確保原子性。

```typescript
// infrastructure/repositories/SessionCleanupHelper.ts
export async function deleteAllSessionData(db: IDBPDatabase): Promise<void> {
  const tx = db.transaction(['videos', 'transcripts', 'highlights'], 'readwrite');

  await Promise.all([
    tx.objectStore('videos').clear(),
    tx.objectStore('transcripts').clear(),
    tx.objectStore('highlights').clear(),
    tx.done
  ]);
}
```

**方案 B: 分別呼叫各 Repository 的刪除方法**

```typescript
// application/use-cases/CleanupSessionUseCase.ts
export class CleanupSessionUseCase {
  async execute(): Promise<void> {
    await this.videoRepo.deleteAll();
    await this.transcriptRepo.deleteAll();
    await this.highlightRepo.deleteAll();
  }
}
```

**限制**: 如果中間某個刪除失敗,前面已刪除的資料無法回滾。

### 選擇的方案

**方案 A: Transaction 包裝（透過 Repository 層實作）**

理由：
1. IndexedDB 的 Transaction 提供原子性保證
2. 如果任何刪除失敗,整個 transaction 回滾
3. 可在 Repository 層抽象實作細節

**實作策略**:
```typescript
// domain/repositories/ISessionRepository.ts (新增)
export interface ISessionRepository {
  deleteAllSessionData(): Promise<void>;
}

// infrastructure/repositories/SessionRepositoryImpl.ts
export class SessionRepositoryImpl implements ISessionRepository {
  constructor(private storage: BrowserStorage) {}

  async deleteAllSessionData(): Promise<void> {
    const db = await this.storage.getDatabase();
    const tx = db.transaction(['videos', 'transcripts', 'highlights'], 'readwrite');

    try {
      await Promise.all([
        tx.objectStore('videos').clear(),
        tx.objectStore('transcripts').clear(),
        tx.objectStore('highlights').clear(),
        tx.done
      ]);
    } catch (error) {
      // Transaction 自動回滾
      throw new SessionCleanupError('Failed to delete session data', { cause: error });
    }
  }
}
```

**注意**: 由於 CleanupSessionUseCase 需要刪除所有會話資料,建議新增 ISessionRepository 而非修改現有 Repository,以符合單一職責原則。

### 替代方案與拒絕理由

| 方案                               | 優點             | 缺點                             | 拒絕理由                 |
| ---------------------------------- | ---------------- | -------------------------------- | ------------------------ |
| 分別呼叫各 Repository 的 deleteAll | 符合現有架構     | 無原子性保證,可能殘留部分資料    | 不符合完整性需求         |
| 直接刪除整個 IndexedDB             | 最徹底           | 會影響其他功能的資料（如設定）   | 超出功能範圍             |
| 使用手動補償邏輯（Saga Pattern）   | 可處理失敗場景   | 複雜度過高,不適合前端 IndexedDB  | 過度設計                 |

---

## 3. beforeunload 中執行非同步操作

### 問題描述

`beforeunload` 事件處理器中無法可靠地執行非同步操作（如 IndexedDB 的 `clear()`），因為瀏覽器可能在操作完成前就關閉分頁。

### 調研結果

**方案 A: 使用 Beacon API (不適用)**

Beacon API 允許在頁面卸載時發送非同步請求,但本專案無後端。

**方案 B: 使用 synchronous IndexedDB 操作 (已廢棄)**

IndexedDB 的同步 API（`indexedDBSync`）已廢棄,現代瀏覽器不支援。

**方案 C: 延遲刪除 + 下次啟動時清理 (推薦)**

在 `beforeunload` 中設定標記,實際刪除延遲到下次應用啟動時執行。

```typescript
// beforeunload 中
window.addEventListener('beforeunload', () => {
  sessionStorage.setItem('pendingCleanup', 'true');
  // 不執行實際刪除
});

// 下次啟動時（App.vue onMounted）
const pendingCleanup = sessionStorage.getItem('pendingCleanup');
if (pendingCleanup) {
  await cleanupSessionUseCase.execute();
  sessionStorage.removeItem('pendingCleanup');
}
```

**方案 D: pagehide 中執行同步清除**

在 `pagehide` 事件中使用同步 XHR 或 `navigator.sendBeacon` 的替代方案（不可行,因為 IndexedDB 無同步 API）。

### 選擇的方案

**方案 C: 延遲刪除（下次啟動時清理）**

理由：
1. 符合瀏覽器安全模型（無法在卸載時可靠執行非同步操作）
2. 實作簡單,不依賴瀏覽器特定 API
3. 資料雖然延遲刪除,但下次啟動時會立即清除,不影響隱私性

**實作策略**:
```typescript
// App.vue
onMounted(async () => {
  // 1. 檢查是否有待清理的標記
  const pendingCleanup = sessionStorage.getItem('pendingCleanup');

  if (pendingCleanup) {
    // 2. 執行清理
    try {
      await cleanupSessionUseCase.execute();
      sessionStorage.removeItem('pendingCleanup');
    } catch (error) {
      console.error('Failed to cleanup session:', error);
      // 保留標記,下次再試
    }
    return; // 清理後停止,不恢復會話
  }

  // 3. 正常流程：嘗試恢復會話
  const session = await restoreSessionUseCase.execute();
  if (session) {
    // 恢復會話資料到 Store
  }
});
```

**折衷方案**: 如果使用者快速關閉再重新開啟（< 100ms）,可能看到短暫的恢復畫面,但這是可接受的 UX 妥協。

### 替代方案與拒絕理由

| 方案                      | 優點               | 缺點                             | 拒絕理由                       |
| ------------------------- | ------------------ | -------------------------------- | ------------------------------ |
| 在 beforeunload 直接刪除  | 即時               | 瀏覽器可能在刪除完成前關閉分頁   | 技術上不可行                   |
| 使用 Service Worker       | 可在背景執行       | 複雜度高,需額外設定              | 過度設計                       |
| 使用 Beacon API 通知後端  | 可靠               | 本專案無後端                     | 超出專案範圍                   |

---

## 4. 阻止「上一頁」導航

### 問題描述

手動刪除會話後,使用者可能按瀏覽器的「上一頁」按鈕,期望導航回編輯畫面,但資料已被刪除。

### 調研結果

**方案 A: 使用 router.replace() 替代 router.push() (推薦)**

```typescript
// 手動刪除後
await cleanupSessionUseCase.execute();
router.replace('/'); // 使用 replace 而非 push
```

理由：`replace` 會替換當前歷史記錄,而非新增,因此「上一頁」會跳過編輯畫面。

**方案 B: 在編輯畫面的 beforeRouteLeave 中檢查資料是否存在**

```typescript
// EditingView.vue
import { onBeforeRouteLeave } from 'vue-router';

onBeforeRouteLeave((to, from, next) => {
  if (sessionWasDeleted) {
    // 阻止導航回此頁面
    next(false);
  } else {
    next();
  }
});
```

限制：如果使用者已導航離開,`onBeforeRouteLeave` 不會再觸發。

**方案 C: 在編輯畫面的 onMounted 中檢查資料是否存在**

```typescript
// EditingView.vue
onMounted(async () => {
  const video = await videoRepo.findAll();
  if (video.length === 0) {
    // 資料不存在,導航回首頁
    router.replace('/');
  }
});
```

### 選擇的方案

**混合方案：router.replace() + 編輯畫面資料檢查**

理由：
1. `router.replace()` 阻止大部分「上一頁」導航
2. 如果使用者透過其他方式進入編輯畫面（如直接輸入 URL）,`onMounted` 檢查可確保導航回首頁
3. 雙重防護,提高穩健性

**實作策略**:
```typescript
// useSessionCleanup.ts
export function useSessionCleanup() {
  const router = useRouter();

  async function handleManualDelete() {
    // 1. 顯示確認對話框
    const confirmed = await showConfirmDialog();
    if (!confirmed) return;

    // 2. 執行清除
    await cleanupSessionUseCase.execute();

    // 3. 使用 replace 導航（不留歷史記錄）
    router.replace('/');
  }

  return { handleManualDelete };
}

// EditingView.vue
onMounted(async () => {
  const videos = await videoRepo.findAll();
  if (videos.length === 0) {
    // 資料不存在,重定向到首頁
    router.replace('/');
  }
});
```

### 替代方案與拒絕理由

| 方案                          | 優點         | 缺點                         | 拒絕理由                 |
| ----------------------------- | ------------ | ---------------------------- | ------------------------ |
| 使用 history.go(-2) 跳兩頁    | 簡單         | 不可靠（歷史記錄長度不確定） | 不穩健                   |
| 禁用瀏覽器「上一頁」按鈕      | 最徹底       | 技術上不可行                 | 無法實作                 |
| 監聽 popstate 事件並阻止      | 可攔截導航   | 無法真正阻止（僅可檢測）     | 技術限制                 |

---

## 5. Vue 3 應用中全域監聽 beforeunload

### 問題描述

需要在整個應用中監聽 `beforeunload` 事件,無論使用者在哪個頁面。

### 調研結果

**方案 A: 在 App.vue 的 onMounted 中註冊 (推薦)**

```typescript
// App.vue
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  // 清除邏輯
};

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload);
});

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
});
</script>
```

**方案 B: 建立 Composable (推薦)**

```typescript
// composables/useSessionCleanup.ts
export function useSessionCleanup() {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    // 清除邏輯
  };

  onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
  });

  onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  });
}

// App.vue
<script setup lang="ts">
import { useSessionCleanup } from '@/composables/useSessionCleanup';
useSessionCleanup();
</script>
```

**方案 C: 使用 Vue Router 的 navigation guard**

不適用,因為 `beforeunload` 是瀏覽器事件,不是路由導航。

### 選擇的方案

**方案 B: Composable (useSessionCleanup)**

理由：
1. 符合 Vue 3 Composition API 最佳實踐
2. 可復用（雖然本專案僅在 App.vue 使用）
3. 易於測試（可 mock Composable）
4. 職責分離（App.vue 不需要知道清除邏輯細節）

**實作策略**:
```typescript
// presentation/composables/useSessionCleanup.ts
export function useSessionCleanup() {
  const cleanupUseCase = inject<CleanupSessionUseCase>('cleanupSessionUseCase');

  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    sessionStorage.setItem('pendingCleanup', 'true');
    e.preventDefault();
    e.returnValue = ''; // 現代瀏覽器僅顯示預設訊息
  };

  onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
  });

  onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  });

  return {
    // 可暴露手動清除方法
    cleanupSession: () => cleanupUseCase.execute()
  };
}
```

### 替代方案與拒絕理由

| 方案                         | 優點           | 缺點                   | 拒絕理由           |
| ---------------------------- | -------------- | ---------------------- | ------------------ |
| 在 main.ts 中直接註冊        | 最早執行       | 無法使用 Vue 生命週期  | 不符合 Vue 模式    |
| 在 Plugin 中註冊             | 可在多個應用複用 | 過度設計（本專案單一應用） | 不需要複用         |
| 使用 window.onbeforeunload   | 簡單           | 會覆蓋其他監聽器       | 不符合最佳實踐     |

---

## 技術決策總結

| 議題                         | 選擇方案                                   | 核心理由                                     |
| ---------------------------- | ------------------------------------------ | -------------------------------------------- |
| 區分關閉與刷新               | beforeunload + sessionStorage + load 檢查  | 技術限制,無完美方案,選擇最穩健的折衷方案     |
| 刪除完整性                   | Transaction 包裝 + 新增 ISessionRepository | 原子性保證,符合單一職責原則                  |
| 非同步刪除問題               | 延遲刪除（下次啟動時清理）                 | 瀏覽器限制,選擇最可行方案                    |
| 阻止「上一頁」               | router.replace() + onMounted 資料檢查      | 雙重防護,提高穩健性                          |
| 全域監聽 beforeunload        | Composable (useSessionCleanup)             | 符合 Vue 3 最佳實踐,易測試,職責分離          |

---

## 風險與限制

1. **無法完全區分關閉與刷新**
   - 風險：某些邊緣情境（如瀏覽器崩潰）可能誤觸發或漏觸發清除
   - 緩解：提供手動清除按鈕作為備選方案

2. **延遲刪除導致短暫恢復畫面**
   - 風險：使用者快速關閉再開啟可能看到短暫的編輯畫面
   - 緩解：在 App.vue 中優先檢查 `pendingCleanup` 標記,先清除再恢復

3. **beforeunload 確認對話框無法自定義**
   - 風險：無法提供友好的確認訊息
   - 緩解：接受瀏覽器預設行為（現代瀏覽器的安全機制）

4. **移動裝置的 beforeunload 支援不一致**
   - 風險：iOS Safari 可能不觸發 `beforeunload`
   - 緩解：主要依賴手動清除按鈕,`beforeunload` 作為輔助

---

## 後續行動

Phase 1 將基於以上調研結果進行設計：
1. 定義 ISessionRepository 介面和 CleanupSessionUseCase
2. 實作 useSessionCleanup Composable
3. 修改 App.vue 以整合清除邏輯
4. 撰寫單元測試和 E2E 測試
