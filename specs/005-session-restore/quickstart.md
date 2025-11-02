# Quick Start: 會話恢復 (Session Restore)

**Feature**: 005-session-restore
**Date**: 2025-11-02

## 功能概述

會話恢復功能讓使用者在刷新頁面或關閉瀏覽器後，能自動恢復先前的編輯狀態：

- **小視頻（≤ 50MB）**: 完整恢復視頻檔案、轉錄文字和高光選擇，可直接繼續編輯
- **大視頻（> 50MB）**: 保留轉錄文字和高光選擇，提示使用者重新上傳視頻以繼續編輯
- **首次訪問**: 正常顯示上傳介面，無任何提示
- **會話過期**: 自動清除超過 24 小時的資料

## 快速開始

### 1. 瀏覽實作檔案

主要涉及的檔案：

```
src/
├── infrastructure/storage/
│   └── BrowserStorage.ts                    # 新增批量查詢方法
├── infrastructure/repositories/
│   ├── VideoRepositoryImpl.ts               # 實作 findAll()
│   ├── TranscriptRepositoryImpl.ts          # 實作 findByVideoId()
│   └── HighlightRepositoryImpl.ts           # 實作 findByVideoId()
├── domain/repositories/
│   ├── IVideoRepository.ts                  # 擴充介面
│   ├── ITranscriptRepository.ts             # 擴充介面
│   └── IHighlightRepository.ts              # 擴充介面
├── application/use-cases/
│   └── RestoreSessionUseCase.ts             # [NEW] 會話恢復 Use Case
├── presentation/stores/
│   ├── videoStore.ts                        # 新增 restoreSession()
│   ├── transcriptStore.ts                   # 確認 setTranscript()
│   └── highlightStore.ts                    # 確認 setHighlights()
├── di/container.ts                          # 註冊 RestoreSessionUseCase
└── App.vue                                  # onMounted 調用恢復
```

### 2. 實作順序

建議按以下順序實作（由內到外）：

#### Step 1: Infrastructure Layer - BrowserStorage
```typescript
// @src/infrastructure/storage/BrowserStorage.ts

async restoreAllVideos(): Promise<VideoPersistenceDTO[]> {
  const indexedDbVideos = await this.db.getAll('videos');
  const sessionVideos = /* 從 SessionStorage 查詢大視頻元資料 */;
  return [...indexedDbVideos, ...sessionVideos];
}

async restoreAllTranscripts(): Promise<TranscriptPersistenceDTO[]> {
  return await this.db.getAll('transcripts');
}

async restoreAllHighlights(): Promise<HighlightPersistenceDTO[]> {
  return await this.db.getAll('highlights');
}
```

#### Step 2: Domain Layer - Repository 介面擴充
```typescript
// @src/domain/repositories/IVideoRepository.ts
export interface IVideoRepository {
  save(video: Video): Promise<void>;
  findById(id: string): Promise<Video | null>;
  findAll(): Promise<Video[]>;  // [NEW]
}

// @src/domain/repositories/ITranscriptRepository.ts
export interface ITranscriptRepository {
  save(transcript: Transcript): Promise<void>;
  findById(id: string): Promise<Transcript | null>;
  findByVideoId(videoId: string): Promise<Transcript | null>;  // [NEW]
}

// @src/domain/repositories/IHighlightRepository.ts
export interface IHighlightRepository {
  save(highlight: Highlight): Promise<void>;
  findById(id: string): Promise<Highlight | null>;
  findByVideoId(videoId: string): Promise<Highlight[]>;  // [NEW]
}
```

#### Step 3: Infrastructure Layer - Repository 實作
```typescript
// @src/infrastructure/repositories/VideoRepositoryImpl.ts
async findAll(): Promise<Video[]> {
  if (this.videos.size > 0) {
    return Array.from(this.videos.values());
  }

  const dtos = await this.browserStorage.restoreAllVideos();
  return dtos.map(dto => {
    const video = DTOMapper.videoPersistenceDtoToEntity(dto);
    this.videos.set(video.id, video);
    return video;
  });
}
```

#### Step 4: Application Layer - RestoreSessionUseCase
```typescript
// @src/application/use-cases/RestoreSessionUseCase.ts
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
    const videos = await this.videoRepo.findAll();
    if (videos.length === 0) return null;

    const video = videos[0];
    const transcript = await this.transcriptRepo.findByVideoId(video.id);
    const highlights = await this.highlightRepo.findByVideoId(video.id);

    if (!transcript) throw new Error('Transcript not found');
    if (highlights.length === 0) throw new Error('Highlight not found');

    return {
      video,
      transcript,
      highlights,
      needsReupload: video.file === null
    };
  }
}
```

#### Step 5: DI Container - 註冊 Use Case
```typescript
// @src/di/container.ts
container.register('RestoreSessionUseCase', () => {
  return new RestoreSessionUseCase(
    container.resolve('VideoRepositoryImpl'),
    container.resolve('TranscriptRepositoryImpl'),
    container.resolve('HighlightRepositoryImpl')
  );
});
```

#### Step 6: Presentation Layer - videoStore
```typescript
// @src/presentation/stores/videoStore.ts
export const useVideoStore = defineStore('video', () => {
  const restoreSessionUseCase = container.resolve<RestoreSessionUseCase>('RestoreSessionUseCase');
  const { showInfo, showError } = useNotification();

  async function restoreSession() {
    try {
      const sessionState = await restoreSessionUseCase.execute();
      if (!sessionState) return;

      video.value = sessionState.video;
      useTranscriptStore().setTranscript(sessionState.transcript);
      useHighlightStore().setHighlights(sessionState.highlights);

      if (sessionState.needsReupload) {
        showInfo('偵測到先前的編輯內容，請重新上傳視頻以繼續編輯');
      } else {
        showInfo('已恢復先前的編輯狀態');
      }
    } catch (error) {
      showError('恢復會話失敗，請重新上傳視頻');
      console.error('RestoreSession failed:', error);
    }
  }

  return { restoreSession, /* ... */ };
});
```

#### Step 7: App 整合
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

### 3. 驗證實作

#### 本地開發測試
```bash
# 1. 啟動開發伺服器
npm run dev

# 2. 在瀏覽器開啟應用

# 3. 測試小視頻恢復
#    - 上傳一個 < 50MB 的視頻
#    - 選擇一些高光片段
#    - 按 F5 刷新頁面
#    - 確認：視頻、轉錄、高光都恢復，顯示「已恢復先前的編輯狀態」

# 4. 測試大視頻恢復（需要準備 > 50MB 的視頻）
#    - 上傳一個 > 50MB 的視頻
#    - 選擇一些高光片段
#    - 按 F5 刷新頁面
#    - 確認：轉錄、高光恢復，顯示「請重新上傳視頻以繼續編輯」

# 5. 測試首次訪問
#    - 清除瀏覽器資料（IndexedDB + SessionStorage）
#    - 重新訪問應用
#    - 確認：顯示正常上傳介面，無任何提示

# 6. 型別檢查
npm run type-check

# 7. 程式碼檢查
npm run lint
```

#### 單元測試
```bash
# 執行 RestoreSessionUseCase 測試
npm run test:unit src/application/use-cases/RestoreSessionUseCase.spec.ts
```

#### E2E 測試
```bash
# 執行會話恢復 E2E 測試
npm run test:e2e tests/e2e/session-restore.spec.ts
```

## 關鍵代碼示例

### 使用 DTOMapper 轉換
```typescript
// Infrastructure Layer
const persistenceDto = await this.browserStorage.restoreVideo(id);
const video = DTOMapper.videoPersistenceDtoToEntity(persistenceDto);
```

### 判斷是否需要重新上傳
```typescript
// Use Case Layer
const needsReupload = video.file === null;
```

### 顯示通知
```typescript
// Presentation Layer
import { useNotification } from '@/presentation/composables/useNotification';

const { showInfo, showError } = useNotification();

// 成功恢復
showInfo('已恢復先前的編輯狀態');

// 需要重新上傳
showInfo('偵測到先前的編輯內容，請重新上傳視頻以繼續編輯');

// 錯誤情況
showError('恢復會話失敗，請重新上傳視頻');
```

## 常見問題

### Q1: 為什麼不建立 SessionStateDTO？
**A**: 專案慣例是 Presentation Layer (Store) 直接使用 Domain Entity，避免過度設計。Use Case 直接返回包含 Entity 的匿名物件即可。

### Q2: Repository 的 findAll() 什麼時候會從 BrowserStorage 恢復？
**A**: 僅在記憶體 Map 為空時（應用首次啟動）。恢復後填充記憶體 Map，後續調用直接返回記憶體資料。

### Q3: 大視頻恢復後，video.file 是 null，這會影響播放嗎？
**A**: 會的。大視頻恢復後無法直接播放，需要使用者重新上傳相同的視頻檔案。轉錄和高光選擇會被保留。

### Q4: 如果資料不完整（有 video 但無 transcript），會發生什麼？
**A**: RestoreSessionUseCase 會拋出錯誤，videoStore.restoreSession() 捕獲後顯示「恢復會話失敗，請重新上傳視頻」。

### Q5: 會話過期時間可以調整嗎？
**A**: 可以。在 BrowserStorage.ts 中修改 `MAX_AGE_MS` 常數（預設 24 小時）。

### Q6: 如何測試會話過期清除？
**A**: 手動修改 IndexedDB 中資料的 `savedAt` 時間戳，或修改 `MAX_AGE_MS` 為較小值（如 5 秒）進行測試。

### Q7: 是否支援多視頻專案？
**A**: 目前不支援。RestoreSessionUseCase 僅恢復第一個視頻。若未來需要支援，可依 `savedAt` 排序，恢復最後編輯的視頻。

## 除錯技巧

### 檢查 IndexedDB 資料
```javascript
// 在瀏覽器 Console 執行
// 1. 開啟 IndexedDB 資料庫
const db = await indexedDB.open('video-highlight-tool-db', 1);

// 2. 查詢所有視頻
const tx = db.transaction('videos', 'readonly');
const videos = await tx.objectStore('videos').getAll();
console.log('Videos:', videos);

// 3. 查詢所有轉錄
const transcripts = await db.transaction('transcripts', 'readonly')
  .objectStore('transcripts').getAll();
console.log('Transcripts:', transcripts);
```

### 檢查 SessionStorage
```javascript
// 在瀏覽器 Console 執行
// 1. 查看 sessionId
console.log('SessionId:', sessionStorage.getItem('sessionId'));

// 2. 查看大視頻元資料
Object.keys(sessionStorage)
  .filter(k => k.startsWith('video_meta_'))
  .forEach(key => {
    console.log(key, JSON.parse(sessionStorage.getItem(key)));
  });
```

### 清除所有會話資料
```javascript
// 在瀏覽器 Console 執行
// 1. 清除 IndexedDB
indexedDB.deleteDatabase('video-highlight-tool-db');

// 2. 清除 SessionStorage
sessionStorage.clear();

// 3. 重新載入頁面
location.reload();
```

## 效能考量

- **IndexedDB 查詢時間**: ~50-100ms（取決於資料量）
- **DTO 轉換時間**: ~10ms
- **總啟動延遲**: < 150ms（符合 < 500ms 目標）
- **記憶體使用**: 小視頻 ~50MB，大視頻 ~1KB

## 下一步

完成實作後：

1. **執行測試**
   ```bash
   npm run type-check
   npm run lint
   npm run test:unit
   npm run test:e2e
   ```

2. **建立 Pull Request**
   - 分支: `005-session-restore`
   - 目標分支: `main`
   - 包含測試報告

3. **手動測試清單**
   - [ ] 小視頻完整恢復
   - [ ] 大視頻提示重新上傳
   - [ ] 首次訪問無提示
   - [ ] 資料不完整錯誤處理
   - [ ] 會話過期自動清除
   - [ ] 桌面和移動平台 RWD

4. **文件更新**
   - [ ] 更新 CLAUDE.md（若有新的慣例）
   - [ ] 更新 Active Technologies 記錄

## 相關文件

- [Feature Spec](./spec.md): 完整需求規格
- [Research](./research.md): 技術研究與決策
- [Data Model](./data-model.md): 資料模型設計
- [Contracts](./contracts/): 公開介面定義
- [Implementation Plan](./plan.md): 完整實作計劃

---

**Quick Start Completed**: 2025-11-02
**Ready to Implement**: ✅
