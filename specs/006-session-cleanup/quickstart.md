# Quickstart Guide: 會話清理與刪除功能

**Feature**: 006-session-cleanup
**Audience**: 開發者
**Date**: 2025-11-04

## 概述

本指南幫助開發者快速上手會話清理功能的開發、測試與除錯。涵蓋本地環境設置、測試流程、常見問題排查。

---

## 前置需求

### 環境檢查
```bash
# 1. 確認 Node.js 版本
node --version  # 應為 v18+ 或 v20+

# 2. 確認依賴已安裝
npm list naive-ui idb pinia

# 3. 確認開發伺服器可啟動
npm run dev
```

### 瀏覽器要求
- **Desktop**: Chrome 90+, Firefox 88+, Safari 14+
- **Mobile**: iOS Safari 14+, Android Chrome 90+
- **必須支援**: IndexedDB, SessionStorage

---

## 快速開始 (5 分鐘)

### 1. 安裝與配置

```bash
# 切換到功能分支
git checkout 006-session-cleanup

# 確認依賴安裝
npm install

# 啟動開發伺服器
npm run dev
```

### 2. 驗證 UI 顯示

訪問 `http://localhost:5173`,檢查:
- ✅ Header 中有「刪除高光紀錄」按鈕
- ✅ 按鈕旁有小字說明「系統會在應用啟動時自動清理超過 24 小時的會話資料」
- ✅ 初始狀態下按鈕為禁用(disabled)

### 3. 測試基本流程

1. **上傳視頻**:
   - 從 `demo/` 目錄選擇測試視頻(例如 `test1.mp4`)
   - 上傳對應的 JSON 檔案(例如 `test1.json`)

2. **驗證按鈕啟用**:
   - 上傳成功後,「刪除高光紀錄」按鈕應啟用

3. **觸發刪除**:
   - 點擊「刪除高光紀錄」按鈕
   - 確認對話框應顯示
   - 點擊「永久刪除」

4. **驗證結果**:
   - 頁面應返回初始上傳介面
   - 按鈕應再次禁用
   - 控制台無錯誤訊息

---

## 開發工作流程

### 架構概覽

```
DeleteButton (Presentation)
    ↓ 點擊事件
videoStore.deleteSession() (Presentation)
    ↓ 調用 Use Case
DeleteSessionUseCase.execute() (Application)
    ↓ 協調刪除
BrowserStorage.deleteSession() (Infrastructure)
    ↓ 批次刪除
IndexedDB (videos/transcripts/highlights)
```

### 關鍵檔案位置

```
src/
├── application/
│   ├── dto/
│   │   └── DeleteSessionResultDTO.ts      # 新增 ⭐
│   └── use-cases/
│       └── DeleteSessionUseCase.ts         # 新增 ⭐
├── infrastructure/
│   └── storage/
│       └── BrowserStorage.ts               # 擴展 deleteSession() ⭐
├── presentation/
│   ├── components/
│   │   ├── AppHeader.vue                  # 修改(加入按鈕) ⭐
│   │   └── DeleteButton.vue               # 新增 ⭐
│   ├── composables/
│   │   └── useDeleteConfirmation.ts       # 新增 ⭐
│   └── stores/
│       └── videoStore.ts                  # 擴展 deleteSession() ⭐
└── di/
    └── container.ts                       # 註冊 Use Case ⭐
```

---

## 本地測試指南

### 測試 1: 基本刪除流程

```bash
# 1. 開啟瀏覽器開發者工具
# 2. 切換到 Application 標籤
# 3. 展開 IndexedDB > video-highlight-tool

# 執行測試步驟:
# Step 1: 上傳視頻
# Step 2: 觀察 IndexedDB 中新增的記錄(videos, transcripts, highlights)
# Step 3: 點擊「刪除高光紀錄」並確認
# Step 4: 刷新 IndexedDB 檢視,確認記錄已刪除
```

**預期結果**:
- ✅ IndexedDB 的 3 個 stores 都清空
- ✅ SessionStorage 中無 `session_id` key
- ✅ UI 回到初始上傳介面

### 測試 2: 多分頁隔離

```bash
# 1. 在分頁 A 上傳視頻(記錄 sessionId_A)
# 2. 複製 URL 到新分頁 B(產生 sessionId_B)
# 3. 在分頁 B 上傳不同視頻
# 4. 在分頁 A 刪除會話

# 預期結果:
# - 分頁 A: 已清空,回到初始介面
# - 分頁 B: 不受影響,仍顯示視頻 B
```

### 測試 3: 錯誤處理

**模擬 IndexedDB 刪除失敗**:
```javascript
// 在瀏覽器 Console 執行:
const db = await indexedDB.open('video-highlight-tool');
db.close();
// 然後嘗試刪除,應看到友善錯誤訊息
```

**模擬無會話時刪除**:
```javascript
// 清除 sessionStorage
sessionStorage.clear();
// 刷新頁面
// 點擊刪除按鈕(應為禁用狀態)
```

### 測試 4: 無障礙功能

```bash
# 1. 使用 Tab 鍵導航到「刪除高光紀錄」按鈕
# 2. 按 Enter 觸發點擊
# 3. 對話框出現後,使用 Tab 在按鈕間切換
# 4. 按 ESC 關閉對話框

# 預期結果:
# - ✅ 焦點順序正確(取消 → 刪除)
# - ✅ ESC 鍵關閉對話框
# - ✅ 焦點回到觸發按鈕
```

---

## 驗證 IndexedDB 資料清除

### 使用 Chrome DevTools

```javascript
// 在 Console 執行以下腳本,檢查 IndexedDB 狀態

async function checkIndexedDB() {
  const db = await indexedDB.open('video-highlight-tool', 1);

  return new Promise((resolve) => {
    db.onsuccess = async () => {
      const database = db.result;
      const stores = ['videos', 'transcripts', 'highlights'];
      const results = {};

      for (const storeName of stores) {
        const tx = database.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const count = await store.count();

        count.onsuccess = () => {
          results[storeName] = count.result;
        };
      }

      setTimeout(() => {
        console.table(results);
        database.close();
        resolve(results);
      }, 500);
    };
  });
}

// 執行檢查
await checkIndexedDB();
// 預期輸出(刪除後):
// ┌─────────────┬───────┐
// │ Store       │ Count │
// ├─────────────┼───────┤
// │ videos      │ 0     │
// │ transcripts │ 0     │
// │ highlights  │ 0     │
// └─────────────┴───────┘
```

### 使用 IndexedDB Export Tool (推薦)

```bash
# 安裝工具(可選)
npm install -g idb-export

# 匯出 IndexedDB 資料
idb-export video-highlight-tool > before-delete.json

# 執行刪除操作

# 再次匯出
idb-export video-highlight-tool > after-delete.json

# 比較差異
diff before-delete.json after-delete.json
```

---

## 模擬刪除失敗情境

### 情境 1: IndexedDB 權限錯誤

```javascript
// 在 Console 執行:
Object.defineProperty(navigator, 'storage', {
  value: { estimate: () => Promise.reject(new Error('Quota exceeded')) }
});

// 嘗試刪除,應顯示:「刪除資料時發生錯誤,請重試」
```

### 情境 2: Transaction 中途失敗

```javascript
// 修改 BrowserStorage.ts 測試分支:
async deleteSession(sessionId: string): Promise<void> {
  // ... 刪除 videos 成功 ...

  // 模擬 transcripts 刪除失敗
  if (storeName === 'transcripts') {
    throw new Error('Mock transaction failure');
  }

  // ... 繼續刪除 highlights ...
}

// 預期結果: videos 已刪除,transcripts 保留,highlights 已刪除
// (允許部分失敗)
```

---

## 測試多分頁隔離

### 手動測試步驟

```bash
# Terminal 1: 啟動開發伺服器
npm run dev

# 瀏覽器 Tab A:
1. 訪問 http://localhost:5173
2. 開啟 DevTools > Application > Session Storage
3. 記錄 session_id 的值 (例如: session_1699012345678_abc123)
4. 上傳 demo/test1.mp4 + test1.json
5. 觀察 IndexedDB 新增記錄

# 瀏覽器 Tab B (新分頁):
1. 訪問 http://localhost:5173
2. 檢查 Session Storage 的 session_id (應不同於 Tab A)
3. 上傳 demo/test2.mp4 + test2.json
4. 觀察 IndexedDB 新增記錄(不同 sessionId)

# 返回 Tab A:
1. 點擊「刪除高光紀錄」
2. 確認刪除

# 驗證:
- Tab A: 應返回初始介面,IndexedDB 中 sessionId_A 的記錄已刪除
- Tab B: 不受影響,仍顯示 test2 視頻,IndexedDB 中 sessionId_B 的記錄保留
```

---

## 常見問題排查

### 問題 1: 刪除按鈕始終禁用

**檢查清單**:
```typescript
// 1. 確認 videoStore 有 video
console.log(videoStore.video); // 應不為 null

// 2. 確認 sessionId 存在
console.log(sessionStorage.getItem('session_id')); // 應有值

// 3. 確認 DeleteButton 的 disabled 計算正確
// 在 DeleteButton.vue 中:
const isDisabled = computed(() => !videoStore.video);
```

### 問題 2: 刪除後 UI 未重置

**檢查清單**:
```typescript
// 1. 確認 stores 有 $reset 方法
console.log(typeof videoStore.$reset); // 應為 'function'

// 2. 確認 Pinia Plugin 已註冊
// 檢查 main.ts:
const pinia = createPinia();
pinia.use(createResetPlugin()); // ← 必須存在

// 3. 手動觸發重置測試
videoStore.$reset();
transcriptStore.$reset();
highlightStore.$reset();
```

### 問題 3: IndexedDB 記錄未刪除

**檢查清單**:
```typescript
// 1. 確認 sessionId 索引存在
// 在 BrowserStorage.init() 中:
videoStore.createIndex('sessionId', 'sessionId', { unique: false });

// 2. 確認 cursor 邏輯正確
// 在 deleteSession() 中添加日誌:
let cursor = await index.openCursor(sessionId);
console.log('Cursor opened:', cursor);

while (cursor) {
  console.log('Deleting:', cursor.primaryKey);
  await cursor.delete();
  cursor = await cursor.continue();
}

// 3. 確認 transaction 已完成
await tx.done;
console.log('Transaction completed');
```

### 問題 4: 對話框未顯示

**檢查清單**:
```vue
<!-- 1. 確認 App.vue 有 n-dialog-provider -->
<n-dialog-provider>
  <n-notification-provider>
    <!-- 應用內容 -->
  </n-notification-provider>
</n-dialog-provider>

<!-- 2. 確認 useDialog 正確引入 -->
<script setup>
import { useDialog } from 'naive-ui';
const dialog = useDialog();
</script>

<!-- 3. 測試對話框功能 -->
<script>
dialog.warning({
  title: '測試',
  content: '對話框顯示正常',
});
</script>
```

---

## 效能測試

### 測試大量記錄刪除

```javascript
// 在 Console 執行,創建 100 個會話記錄

async function createMockSessions(count) {
  const db = await indexedDB.open('video-highlight-tool', 1);

  db.onsuccess = async () => {
    const database = db.result;

    for (let i = 0; i < count; i++) {
      const sessionId = `session_mock_${i}`;
      const tx = database.transaction(['videos', 'transcripts', 'highlights'], 'readwrite');

      await tx.objectStore('videos').add({
        id: `video_${i}`,
        sessionId,
        name: `Mock Video ${i}`,
        duration: 120,
        file: null,
        url: null,
        savedAt: Date.now() - (25 * 60 * 60 * 1000) // 25 小時前
      });

      await tx.objectStore('transcripts').add({
        id: `transcript_${i}`,
        sessionId,
        videoId: `video_${i}`,
        sections: [],
        fullText: '',
        savedAt: Date.now() - (25 * 60 * 60 * 1000)
      });
    }

    database.close();
    console.log(`Created ${count} mock sessions`);
  };
}

// 創建 100 個會話
await createMockSessions(100);

// 測試 cleanupStaleData() 的性能
console.time('Cleanup');
await browserStorage.cleanupStaleData();
console.timeEnd('Cleanup'); // 應 < 2 秒
```

---

## 單元測試執行

```bash
# 執行所有測試
npm run test

# 執行特定測試檔案
npm run test -- DeleteSessionUseCase.spec.ts

# 執行測試並生成覆蓋率報告
npm run test:coverage

# 監聽模式(開發時推薦)
npm run test:watch
```

**測試檔案位置**:
```
tests/
├── unit/
│   ├── DeleteSessionUseCase.spec.ts       # Use Case 單元測試
│   └── BrowserStorage.spec.ts             # deleteSession() 測試
├── integration/
│   └── delete-session-flow.spec.ts        # 完整流程測試
└── e2e/
    └── delete-session.cy.ts               # Cypress E2E 測試
```

---

## 除錯技巧

### 啟用詳細日誌

```typescript
// 在 BrowserStorage.ts 中:
const DEBUG = true; // 開發時設為 true

async deleteSession(sessionId: string): Promise<void> {
  if (DEBUG) console.group(`Deleting session: ${sessionId}`);

  for (const storeName of stores) {
    if (DEBUG) console.time(`Delete ${storeName}`);
    // ... 刪除邏輯 ...
    if (DEBUG) console.timeEnd(`Delete ${storeName}`);
  }

  if (DEBUG) console.groupEnd();
}
```

### 使用 Chrome DevTools Performance

```bash
# 1. 開啟 DevTools > Performance
# 2. 點擊 Record
# 3. 執行刪除操作
# 4. 停止 Recording
# 5. 分析 IndexedDB 操作的時間(應 < 2 秒)
```

---

## 部署前檢查清單

- [ ] 所有單元測試通過
- [ ] E2E 測試通過(刪除流程)
- [ ] 無 TypeScript 錯誤 (`npm run type-check`)
- [ ] 無 ESLint 警告 (`npm run lint`)
- [ ] 無障礙測試通過(鍵盤導航)
- [ ] 多分頁隔離測試通過
- [ ] 效能測試達標(< 3 秒完整刪除)
- [ ] 錯誤處理測試通過(顯示友善訊息)
- [ ] 文件更新(CHANGELOG, README)

---

## 下一步

完成測試後,可以繼續:
1. 執行 `/speckit.tasks` 生成詳細的實作任務清單
2. 執行 `/speckit.implement` 開始實作
3. 參考 `plan.md` 了解整體架構設計

---

**有問題?** 查看 `research.md` 了解設計決策,或查看 `contracts/` 了解 API 定義。
