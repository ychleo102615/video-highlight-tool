# Data Model: 會話恢復 (Session Restore)

**Feature**: 005-session-restore
**Date**: 2025-11-02

## Overview

本功能**不需要新增 Entity 或 DTO**，而是擴充現有的 Repository 介面和 BrowserStorage 方法，以支援批量查詢和自動恢復功能。

## Existing Entities (No Changes)

本功能使用以下現有的 Domain Entity，**不需要修改**：

### Video Entity

```typescript
// @src/domain/aggregates/Video.ts
class Video {
  id: string;
  file: File | null; // 大視頻恢復時為 null
  url: string;
  duration: number;
  metadata: VideoMetadata;
  isReady: boolean;
}
```

**會話恢復相關欄位**:

- `file`: 小視頻（≤ 50MB）恢復時有值，大視頻（> 50MB）恢復時為 `null`
- 透過 `file === null` 判斷 `needsReupload` 旗標

### Transcript Entity

```typescript
// @src/domain/aggregates/Transcript/Transcript.ts
class Transcript {
  id: string;
  videoId: string;
  fullText: string;
  sections: Section[];
}
```

**會話恢復使用**:

- 透過 `videoId` 關聯到 Video
- 完整恢復所有 sections 和 sentences

### Highlight Entity

```typescript
// @src/domain/aggregates/Highlight.ts
class Highlight {
  id: string;
  videoId: string;
  name: string;
  selectedSentenceIds: Set<string>;
  selectionOrder: string[];
}
```

**會話恢復使用**:

- 透過 `videoId` 關聯到 Video
- 恢復所有選中的句子 ID 和選擇順序

## Repository Interface Extensions

需要擴充以下 Repository 介面，新增批量查詢方法：

### IVideoRepository (擴充)

```typescript
// @src/domain/repositories/IVideoRepository.ts

export interface IVideoRepository {
  save(video: Video): Promise<void>;
  findById(id: string): Promise<Video | null>;

  // [NEW] 會話恢復新增方法
  findAll(): Promise<Video[]>;
}
```

**findAll() 行為**:

1. 若記憶體 Map 不為空，直接返回記憶體中的所有視頻
2. 若記憶體 Map 為空，從 BrowserStorage 恢復所有視頻
3. 恢復後自動填充記憶體 Map
4. 返回視頻陣列（包含小視頻和大視頻元資料）

### ITranscriptRepository (擴充)

```typescript
// @src/domain/repositories/ITranscriptRepository.ts

export interface ITranscriptRepository {
  save(transcript: Transcript): Promise<void>;
  findById(id: string): Promise<Transcript | null>;

  // [NEW] 會話恢復新增方法
  findByVideoId(videoId: string): Promise<Transcript | null>;
}
```

**findByVideoId() 行為**:

1. 先嘗試從記憶體 Map 查詢（遍歷查找 videoId 匹配的 Transcript）
2. 若記憶體中找不到，從 BrowserStorage 恢復
3. 恢復後填充記憶體 Map
4. 返回找到的 Transcript，若不存在返回 null

### IHighlightRepository (擴充)

```typescript
// @src/domain/repositories/IHighlightRepository.ts

export interface IHighlightRepository {
  save(highlight: Highlight): Promise<void>;
  findById(id: string): Promise<Highlight | null>;

  // [NEW] 會話恢復新增方法
  findByVideoId(videoId: string): Promise<Highlight[]>;
}
```

**findByVideoId() 行為**:

1. 先嘗試從記憶體 Map 查詢（遍歷查找 videoId 匹配的 Highlight）
2. 若記憶體中找不到，從 BrowserStorage 恢復
3. 恢復後填充記憶體 Map
4. 返回找到的 Highlight 陣列（目前單視頻單高光，但保持陣列格式）

## BrowserStorage Extensions

需要在 BrowserStorage 新增以下批量查詢方法：

### restoreAllVideos()

```typescript
// @src/infrastructure/storage/BrowserStorage.ts

async restoreAllVideos(): Promise<VideoPersistenceDTO[]> {
  try {
    // 1. 從 IndexedDB 查詢所有視頻（小視頻）
    const indexedDbVideos = await this.db.getAll('videos');

    // 2. 從 SessionStorage 查詢大視頻元資料
    const sessionKeys = Object.keys(sessionStorage)
      .filter(k => k.startsWith('video_meta_'));

    const sessionVideos = sessionKeys.map(key => {
      const meta = JSON.parse(sessionStorage.getItem(key)!);
      return {
        id: meta.id,
        file: null,  // 大視頻無檔案
        metadata: {
          name: meta.name,
          size: meta.size,
          duration: meta.duration,
          width: 0,
          height: 0,
          mimeType: 'video/mp4'
        },
        savedAt: 0,
        sessionId: this.sessionId
      };
    });

    return [...indexedDbVideos, ...sessionVideos];
  } catch (error) {
    console.warn('Failed to restore all videos:', error);
    return [];
  }
}
```

### restoreAllTranscripts()

```typescript
async restoreAllTranscripts(): Promise<TranscriptPersistenceDTO[]> {
  try {
    return await this.db.getAll('transcripts');
  } catch (error) {
    console.warn('Failed to restore all transcripts:', error);
    return [];
  }
}
```

### restoreAllHighlights()

```typescript
async restoreAllHighlights(): Promise<HighlightPersistenceDTO[]> {
  try {
    return await this.db.getAll('highlights');
  } catch (error) {
    console.warn('Failed to restore all highlights:', error);
    return [];
  }
}
```

## RestoreSessionUseCase Return Type

Use Case 返回一個匿名物件型別，**不建立新的 DTO**：

```typescript
// @src/application/use-cases/RestoreSessionUseCase.ts

export class RestoreSessionUseCase {
  async execute(): Promise<{
    video: Video;
    transcript: Transcript;
    highlights: Highlight[];
    needsReupload: boolean;
  } | null> {
    // ...實作邏輯
  }
}
```

**型別說明**:

- `video`: Video Entity（可能沒有 file）
- `transcript`: Transcript Entity
- `highlights`: Highlight[] Entity 陣列
- `needsReupload`: 布林旗標（`video.file === null`）
- 返回 `null` 表示無會話資料（首次訪問或已清除）

## Persistence DTOs (No Changes)

以下 Persistence DTO 已存在，**不需要修改**：

### VideoPersistenceDTO

```typescript
// @src/infrastructure/storage/dto/VideoPersistenceDTO.ts
export interface VideoPersistenceDTO {
  id: string;
  file: File | null;
  metadata: {
    name: string;
    size: number;
    duration: number;
    width: number;
    height: number;
    mimeType: string;
  };
  savedAt: number;
  sessionId: string;
}
```

### TranscriptPersistenceDTO

```typescript
// @src/infrastructure/storage/dto/TranscriptPersistenceDTO.ts
export interface TranscriptPersistenceDTO {
  id: string;
  videoId: string;
  fullText: string;
  sections: SectionPersistenceDTO[];
  savedAt: number;
  sessionId: string;
}
```

### HighlightPersistenceDTO

```typescript
// @src/infrastructure/storage/dto/HighlightPersistenceDTO.ts
export interface HighlightPersistenceDTO {
  id: string;
  videoId: string;
  name: string;
  selectedSentenceIds: string[];
  selectionOrder: string[];
  savedAt: number;
  sessionId: string;
}
```

## Data Flow

### 1. 應用啟動流程

```
App.vue (onMounted)
  → videoStore.restoreSession()
    → RestoreSessionUseCase.execute()
      → videoRepo.findAll()
        → BrowserStorage.restoreAllVideos()
          → IndexedDB.getAll('videos') + SessionStorage
        → 返回 Video[]
      → transcriptRepo.findByVideoId(videoId)
        → BrowserStorage.restoreTranscriptByVideoId(videoId)
        → 返回 Transcript | null
      → highlightRepo.findByVideoId(videoId)
        → BrowserStorage.restoreHighlightsByVideoId(videoId)
        → 返回 Highlight[]
      → 返回 { video, transcript, highlights, needsReupload }
    → 更新 Store 狀態
    → 顯示通知
```

### 2. 資料恢復流程

```
Repository.findAll() / findByVideoId()
  ↓
檢查記憶體 Map
  ↓ (若為空)
BrowserStorage.restoreAll*()
  ↓
IndexedDB.getAll() / SessionStorage
  ↓
返回 PersistenceDTO[]
  ↓
DTOMapper.toDomain()
  ↓
填充記憶體 Map
  ↓
返回 Entity[]
```

### 3. 小視頻 vs 大視頻

```
小視頻 (≤ 50MB):
  IndexedDB: 完整儲存 (file + metadata)
  恢復: Video.file !== null
  結果: needsReupload = false

大視頻 (> 50MB):
  SessionStorage: 僅儲存元資料 (無 file)
  恢復: Video.file === null
  結果: needsReupload = true
```

## Repository Implementation Changes

### VideoRepositoryImpl.findAll()

```typescript
async findAll(): Promise<Video[]> {
  // 若記憶體不為空，直接返回
  if (this.videos.size > 0) {
    return Array.from(this.videos.values());
  }

  // 從 BrowserStorage 恢復
  const dtos = await this.browserStorage.restoreAllVideos();

  // 轉換並填充記憶體
  return dtos.map(dto => {
    const video = DTOMapper.videoPersistenceDtoToEntity(dto);
    this.videos.set(video.id, video);
    return video;
  });
}
```

### TranscriptRepositoryImpl.findByVideoId()

```typescript
async findByVideoId(videoId: string): Promise<Transcript | null> {
  // 先查記憶體（遍歷查找）
  for (const transcript of this.transcripts.values()) {
    if (transcript.videoId === videoId) {
      return transcript;
    }
  }

  // 從 BrowserStorage 恢復
  const dto = await this.browserStorage.restoreTranscriptByVideoId(videoId);
  if (!dto) return null;

  // 轉換並填充記憶體
  const transcript = DTOMapper.transcriptPersistenceDtoToEntity(dto);
  this.transcripts.set(transcript.id, transcript);
  return transcript;
}
```

### HighlightRepositoryImpl.findByVideoId()

```typescript
async findByVideoId(videoId: string): Promise<Highlight[]> {
  // 先查記憶體（遍歷查找）
  const cachedHighlights = Array.from(this.highlights.values())
    .filter(h => h.videoId === videoId);

  if (cachedHighlights.length > 0) {
    return cachedHighlights;
  }

  // 從 BrowserStorage 恢復
  const dtos = await this.browserStorage.restoreHighlightsByVideoId(videoId);

  // 轉換並填充記憶體
  return dtos.map(dto => {
    const highlight = DTOMapper.highlightPersistenceDtoToEntity(dto);
    this.highlights.set(highlight.id, highlight);
    return highlight;
  });
}
```

## Error Handling

### Repository Layer

- IndexedDB 查詢失敗: 返回空陣列 / null（優雅降級）
- DTO 轉換錯誤: 記錄 console.warn，返回空結果

### Use Case Layer

- 無會話資料 (videos.length === 0): 返回 `null`
- 資料不完整 (無 transcript): 拋出 `Error('Transcript not found')`
- 資料不完整 (無 highlights): 拋出 `Error('Highlight not found')`

### Store Layer

- Use Case 返回 null: 不顯示訊息，正常啟動
- Use Case 拋出錯誤: 捕獲錯誤，顯示 `showError('恢復會話失敗，請重新上傳視頻')`

## Validation Rules

### RestoreSessionUseCase

1. ✅ 必須存在至少一個 Video
2. ✅ 必須存在對應的 Transcript（videoId 匹配）
3. ✅ 必須存在至少一個 Highlight（videoId 匹配）
4. ❌ 不驗證 Video.file 是否存在（由 needsReupload 旗標處理）

### BrowserStorage.cleanupStaleData()

1. ✅ 刪除 sessionId 不匹配的資料（其他 Tab 的資料）
2. ✅ 刪除 savedAt 超過 24 小時的資料
3. ✅ 在 init() 時自動執行

## Performance Considerations

### 批量查詢優化

- 使用 `getAll()` 一次性查詢，而非迴圈 `get(id)`
- 批量查詢時間複雜度: O(n)，n 為資料筆數
- 預期資料量: 單視頻專案，~10 筆以內

### 記憶體快取策略

- 首次查詢後填充記憶體 Map
- 後續查詢直接從記憶體返回（O(1)）
- 記憶體使用: 小視頻 ~50MB，大視頻 ~1KB（僅元資料）

### 啟動時間影響

- IndexedDB 查詢: ~50-100ms
- DTO 轉換: ~10ms
- 總計影響: < 150ms（符合 < 500ms 目標）

## Testing Considerations

### 單元測試場景

1. RestoreSessionUseCase 無會話資料 → 返回 null
2. RestoreSessionUseCase 小視頻恢復 → needsReupload = false
3. RestoreSessionUseCase 大視頻恢復 → needsReupload = true
4. RestoreSessionUseCase 資料不完整 → 拋出錯誤

### E2E 測試場景

1. 小視頻完整恢復 → 視頻可播放，編輯內容完整
2. 大視頻提示重新上傳 → 顯示提示訊息，編輯內容保留
3. 首次訪問 → 顯示上傳介面，無提示訊息
4. 會話過期 → 自動清除，顯示上傳介面

## Migration Notes

**無需資料遷移**: 本功能僅擴充查詢方法，不修改資料結構。

---

**Data Model Completed**: 2025-11-02
**Next Step**: Generate Contracts (API/Interface Definitions)
