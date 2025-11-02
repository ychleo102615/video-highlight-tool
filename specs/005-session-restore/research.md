# Research: 會話恢復 (Session Restore)

**Feature Branch**: `005-session-restore`
**Date**: 2025-11-02
**Status**: Completed

## Overview

本研究文件記錄了會話恢復功能的技術決策、最佳實踐和實作方案。目標是在應用啟動時自動恢復使用者的編輯狀態，針對小視頻和大視頻提供不同的恢復策略。

## Key Research Areas

### 1. Repository 批量查詢方法設計

**決策**: 在 BrowserStorage 新增 `restoreAllVideos()` / `restoreAllTranscripts()` / `restoreAllHighlights()` 方法

**理由**:
- 當前 BrowserStorage 僅提供單一 Entity 查詢（`restoreVideo(id)`, `restoreTranscript(id)`）
- 會話恢復需要一次性查詢所有相關資料，以判斷是否有可恢復的會話
- 批量查詢比多次單一查詢更高效，減少 IndexedDB 事務次數

**實作方案**:
```typescript
// BrowserStorage 新增方法
async restoreAllVideos(): Promise<VideoPersistenceDTO[]> {
  try {
    // 1. 從 IndexedDB 查詢所有視頻
    const videos = await this.db.getAll('videos');

    // 2. 從 SessionStorage 查詢大視頻元資料
    const sessionKeys = Object.keys(sessionStorage).filter(k => k.startsWith('video_meta_'));
    const sessionMetas = sessionKeys.map(key => {
      const meta = JSON.parse(sessionStorage.getItem(key)!);
      return {
        id: meta.id,
        file: null,
        metadata: { /* ... */ },
        savedAt: 0,
        sessionId: this.sessionId
      };
    });

    return [...videos, ...sessionMetas];
  } catch (error) {
    console.warn('Failed to restore all videos:', error);
    return [];
  }
}
```

**替代方案考慮**:
- **方案 A**: Repository 直接注入 BrowserStorage 並調用批量查詢
  - ❌ 違反單一職責原則，Repository 應該專注於 Entity 管理
- **方案 B**: Use Case 直接調用 BrowserStorage（跳過 Repository）
  - ❌ 違反 Clean Architecture，Application Layer 不應直接依賴 Infrastructure 實作
- **方案 C** (採用): Repository 提供 `findAll()` 介面，內部調用 BrowserStorage 批量查詢
  - ✅ 遵循分層架構，維持 Repository 抽象

### 2. Repository findAll() 記憶體恢復策略

**決策**: `findAll()` 在記憶體 Map 為空時，自動從 BrowserStorage 恢復資料

**理由**:
- 應用啟動時記憶體 Map 為空，但 IndexedDB 可能有先前的會話資料
- Repository 的職責是提供統一的資料訪問介面，應該隱藏資料來源細節
- 自動恢復使 Use Case 邏輯更簡潔，不需要顯式判斷和恢復

**實作方案**:
```typescript
// VideoRepositoryImpl
async findAll(): Promise<Video[]> {
  // 1. 若記憶體 Map 不為空，直接返回
  if (this.videos.size > 0) {
    return Array.from(this.videos.values());
  }

  // 2. 記憶體為空時，從 BrowserStorage 恢復
  const persistenceDtos = await this.browserStorage.restoreAllVideos();

  // 3. 轉換 DTO → Entity 並填充記憶體 Map
  const videos = persistenceDtos.map(dto => {
    const video = DTOMapper.videoPersistenceDtoToEntity(dto);
    this.videos.set(video.id, video);
    return video;
  });

  return videos;
}
```

**注意事項**:
- 僅在首次調用 `findAll()` 時恢復，後續調用直接返回記憶體資料
- 若 IndexedDB 查詢失敗，返回空陣列（優雅降級）
- 恢復的資料自動填充記憶體 Map，後續 `findById()` 可直接命中

### 3. RestoreSessionUseCase 返回值設計

**決策**: 直接返回 Entity 組成的物件，不建立新的 DTO

**理由**:
- 專案慣例：Presentation Layer (Store) 直接使用 Domain Entity（如 `video: Video`）
- 避免過度設計：新建 SessionStateDTO 僅為了包裝既有的 Entity 沒有必要
- 保持一致性：與專案現有模式一致（videoStore, transcriptStore 直接使用 Entity）
- Infrastructure DTO 不適用：Persistence DTO 包含技術細節（savedAt, sessionId），不應暴露給 Application Layer

**實作方案**:
```typescript
export class RestoreSessionUseCase {
  constructor(
    private videoRepo: IVideoRepository,
    private transcriptRepo: ITranscriptRepository,
    private highlightRepo: IHighlightRepository
  ) {}

  async execute(): Promise<{
    video: Video;
    transcript: Transcript;
    highlights: Highlight[];
    needsReupload: boolean;
  } | null> {
    // 1. 查詢所有視頻（目前假設單視頻專案，取第一個）
    const videos = await this.videoRepo.findAll();
    if (videos.length === 0) {
      return null; // 無會話資料
    }

    const video = videos[0]; // 取最新視頻

    // 2. 查詢轉錄文字
    const transcript = await this.transcriptRepo.findByVideoId(video.id);
    if (!transcript) {
      throw new Error('Transcript not found'); // 資料不完整錯誤
    }

    // 3. 查詢高光片段
    const highlights = await this.highlightRepo.findByVideoId(video.id);
    if (highlights.length === 0) {
      throw new Error('Highlight not found'); // 資料不完整錯誤
    }

    // 4. 判斷是否需要重新上傳（視頻 file 為 null）
    const needsReupload = video.file === null;

    // 5. 直接返回 Entity
    return {
      video,
      transcript,
      highlights,
      needsReupload
    };
  }
}
```

**錯誤處理策略**:
- 無會話資料: 返回 `null`（非錯誤，正常情境）
- 資料不完整（有 video 但無 transcript/highlight）: 拋出錯誤，由 Store 捕獲並顯示錯誤訊息
- IndexedDB 查詢失敗: Repository 內部捕獲，返回空結果

### 4. videoStore.restoreSession() 實作

**決策**: 在 videoStore 新增 `restoreSession()` action，調用 Use Case 並更新狀態

**理由**:
- Store 負責狀態管理和 Use Case 調用
- 統一在 videoStore 處理會話恢復邏輯，避免分散在多個 Store
- 根據 needsReupload 決定顯示提示訊息或完整恢復狀態

**實作方案**:
```typescript
// videoStore.ts
export const useVideoStore = defineStore('video', () => {
  const restoreSessionUseCase = container.resolve<RestoreSessionUseCase>('RestoreSessionUseCase');
  const { showInfo, showError } = useNotification();

  async function restoreSession() {
    try {
      const sessionState = await restoreSessionUseCase.execute();

      if (!sessionState) {
        // 無會話資料，正常啟動（不顯示任何訊息）
        return;
      }

      // 更新 videoStore 狀態
      video.value = sessionState.video;

      // 更新 transcriptStore 狀態
      const transcriptStore = useTranscriptStore();
      transcriptStore.setTranscript(sessionState.transcript);

      // 更新 highlightStore 狀態
      const highlightStore = useHighlightStore();
      highlightStore.setHighlights(sessionState.highlights);

      if (sessionState.needsReupload) {
        // 大視頻：顯示提示訊息
        showInfo('偵測到先前的編輯內容，請重新上傳視頻以繼續編輯');
      } else {
        // 小視頻：完整恢復
        showInfo('已恢復先前的編輯狀態');
      }
    } catch (error) {
      // 資料不完整或其他錯誤
      showError('恢復會話失敗，請重新上傳視頻');
      console.error('RestoreSession failed:', error);
    }
  }

  return { restoreSession, /* ... */ };
});
```

**跨 Store 狀態同步**:
- 採用顯式調用其他 Store 的方法（如 `transcriptStore.setTranscript()`）
- 避免使用 watch 等隱式同步機制（可能有競態條件）
- 確保狀態更新的順序和一致性

### 5. App.vue onMounted 調用時機

**決策**: 在 App.vue 的 onMounted 中調用 `videoStore.restoreSession()`

**理由**:
- onMounted 確保 DOM 已渲染完成，Pinia Store 已初始化
- 在應用最外層調用，確保所有子組件都能獲得恢復後的狀態
- 早於用戶操作，提供無縫的恢復體驗

**實作方案**:
```typescript
// App.vue
<script setup lang="ts">
import { onMounted } from 'vue';
import { useVideoStore } from '@/presentation/stores/videoStore';

const videoStore = useVideoStore();

onMounted(async () => {
  await videoStore.restoreSession();
});
</script>
```

**注意事項**:
- restoreSession() 是 async 函數，使用 await 確保恢復完成後再進行其他操作
- 若恢復失敗，不應阻塞應用正常啟動（錯誤已在 Store 內部處理）
- 恢復期間可顯示 loading 狀態（可選，本階段不實作）

### 6. 通知顯示策略

**決策**: 使用 Naive UI 的 useNotification 顯示恢復提示

**理由**:
- 專案已使用 Naive UI，保持 UI 一致性
- useNotification 提供 showInfo / showError 等便捷方法
- 支援桌面和移動平台，RWD 友善

**實作方案**:
```typescript
// useNotification.ts (已存在，確認支援以下方法)
import { useNotification as useNaiveNotification } from 'naive-ui';

export function useNotification() {
  const notification = useNaiveNotification();

  const showInfo = (message: string) => {
    notification.info({
      title: '資訊',
      content: message,
      duration: 3000
    });
  };

  const showError = (message: string) => {
    notification.error({
      title: '錯誤',
      content: message,
      duration: 5000
    });
  };

  return { showInfo, showError };
}
```

**通知顯示時機**:
- 小視頻恢復成功: `showInfo('已恢復先前的編輯狀態')`
- 大視頻恢復成功: `showInfo('偵測到先前的編輯內容，請重新上傳視頻以繼續編輯')`
- 恢復失敗: `showError('恢復會話失敗，請重新上傳視頻')`
- 無會話資料: 不顯示任何訊息

### 7. 會話過期處理

**決策**: 在 BrowserStorage.cleanupStaleData() 中處理（已實作）

**理由**:
- BrowserStorage 初始化時已自動清理過期資料（超過 24 小時）
- sessionId 機制確保只恢復當前 Tab 的資料
- 不需要在 Use Case 或 Store 層額外處理

**現有實作**:
```typescript
// BrowserStorage.ts (line 247-263)
async cleanupStaleData(): Promise<void> {
  const currentSessionId = this.sessionId;
  const now = Date.now();

  // 清理條件: sessionId 不匹配 或 超過 24 小時
  for (const item of items) {
    if (item.sessionId !== currentSessionId || now - item.savedAt > MAX_AGE_MS) {
      await store.delete(item.id);
    }
  }
}
```

**無需額外實作**: ✅

### 8. 資料不完整處理

**決策**: 在 RestoreSessionUseCase 中拋出錯誤，由 Store 捕獲並顯示訊息

**理由**:
- 資料不完整是錯誤情境（有 video 但無 transcript），不應靜默失敗
- Use Case 專注於業務邏輯驗證，拋出明確的錯誤
- Store 負責錯誤處理和用戶提示

**錯誤訊息**:
- 'Transcript not found': 缺少轉錄文字
- 'Highlight not found': 缺少高光片段
- 顯示給用戶: '恢復會話失敗，請重新上傳視頻'

### 9. DI Container 註冊

**決策**: 在 di/container.ts 註冊 RestoreSessionUseCase

**理由**:
- 遵循依賴注入原則，統一管理依賴
- Use Case 透過建構函式注入三個 Repository
- Store 從 Container 獲取 Use Case 實例

**實作方案**:
```typescript
// di/container.ts
container.register('RestoreSessionUseCase', () => {
  return new RestoreSessionUseCase(
    container.resolve('VideoRepositoryImpl'),
    container.resolve('TranscriptRepositoryImpl'),
    container.resolve('HighlightRepositoryImpl')
  );
});
```

## Best Practices

### IndexedDB 批量查詢

- 使用 `getAll()` 一次性查詢所有資料，減少事務次數
- 避免在迴圈中調用 `get(id)`，效能較差
- 查詢失敗時返回空陣列，不拋出例外（優雅降級）

### Repository 自動恢復

- `findAll()` 在記憶體為空時自動從 BrowserStorage 恢復
- 恢復後填充記憶體 Map，後續查詢直接命中
- 避免在每次查詢時都訪問 IndexedDB

### Use Case 返回值設計

- 直接返回 Domain Entity，避免建立不必要的 DTO
- 遵循專案慣例：Store 直接使用 Entity
- 僅在需要轉換或隱藏細節時才建立 Application DTO

### Use Case 錯誤處理

- 區分「無資料」（返回 null）和「錯誤」（拋出例外）
- 資料不完整視為錯誤，拋出明確訊息
- 由 Store 捕獲錯誤並顯示用戶友善提示

### Store 狀態同步

- 在 videoStore.restoreSession() 中顯式調用其他 Store 方法
- 避免使用 watch 等隱式同步機制（可能有競態條件）
- 確保狀態更新的順序和一致性

### 通知顯示原則

- 無會話資料：不顯示任何訊息（避免困擾首次訪問用戶）
- 小視頻恢復：簡潔提示「已恢復先前的編輯狀態」
- 大視頻恢復：引導性提示「請重新上傳視頻以繼續編輯」
- 錯誤情境：清楚說明問題和解決方案

## Technology Choices

### 儲存技術

**選擇**: IndexedDB (idb 庫) + SessionStorage

**理由**:
- 已在專案中使用，無需引入新依賴
- idb 提供 Promise-based API，易於使用
- IndexedDB 適合儲存大量結構化資料（小視頻檔案、Entity）
- SessionStorage 適合儲存少量元資料（sessionId、大視頻元資料）

### 通知元件

**選擇**: Naive UI useNotification

**理由**:
- 專案已使用 Naive UI
- 提供統一的通知 API（info, error, warning 等）
- 支援 RWD，在桌面和移動平台表現良好
- 可自定義樣式和持續時間

### 狀態管理

**選擇**: Pinia

**理由**:
- Vue 3 官方推薦的狀態管理庫
- 專案已使用，保持一致性
- 提供 Composition API 風格，與 Vue 3 整合良好

## Implementation Checklist

### Phase 1: Infrastructure Layer

- [ ] BrowserStorage 新增 `restoreAllVideos()` 方法
- [ ] BrowserStorage 新增 `restoreAllTranscripts()` 方法
- [ ] BrowserStorage 新增 `restoreAllHighlights()` 方法
- [ ] VideoRepositoryImpl 修改 `findAll()` 實作自動恢復
- [ ] TranscriptRepositoryImpl 新增 `findByVideoId()` 實作自動恢復
- [ ] HighlightRepositoryImpl 新增 `findByVideoId()` 實作自動恢復

### Phase 2: Application Layer

- [ ] 實作 RestoreSessionUseCase
- [ ] 單元測試: RestoreSessionUseCase.spec.ts

### Phase 3: Presentation Layer

- [ ] videoStore 新增 `restoreSession()` action
- [ ] transcriptStore 新增 `setTranscript()` 方法（若不存在）
- [ ] highlightStore 新增 `setHighlights()` 方法（若不存在）
- [ ] useNotification 確認支援所需的通知方法
- [ ] App.vue onMounted 調用 `restoreSession()`

### Phase 4: DI Container

- [ ] di/container.ts 註冊 RestoreSessionUseCase

### Phase 5: Testing

- [ ] E2E 測試: 小視頻完整恢復
- [ ] E2E 測試: 大視頻提示重新上傳
- [ ] E2E 測試: 首次訪問無恢復
- [ ] E2E 測試: 資料不完整錯誤處理

## Open Questions

1. **多視頻專案支援**: 目前假設單視頻專案，若未來支援多視頻，需要如何選擇恢復哪一個？
   - 暫定方案: 恢復最後編輯的視頻（依 savedAt 排序）
   - 未來擴展: 提供視頻專案列表供用戶選擇

2. **播放進度恢復**: 目前不恢復播放進度（始終從 0 秒開始），是否需要支援？
   - 暫定方案: 不支援（簡化實作）
   - 未來擴展: 在 SessionStorage 儲存 currentTime

3. **儲存閾值動態調整**: 目前固定 50MB，是否需要根據平台動態調整？
   - 暫定方案: 使用固定值（簡化實作）
   - 未來擴展: 使用 navigator.storage.estimate() 偵測可用空間

## References

- [IndexedDB API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [idb Library - GitHub](https://github.com/jakearchibald/idb)
- [Naive UI Notification](https://www.naiveui.com/en-US/os-theme/components/notification)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Clean Architecture - Robert Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

---

**Research Completed**: 2025-11-02
**Next Step**: Proceed to Phase 1 - Data Model Design
