# Data Model & Persistence Design

**Feature**: Infrastructure Layer Implementation
**Date**: 2025-10-30

## Overview

本文件定義 Infrastructure Layer 的資料模型設計，包含：
1. **Persistence DTOs**: 用於 IndexedDB 儲存的 Plain Objects（Infrastructure Layer 定義）
2. **Application DTOs**: 用於跨層傳輸的資料結構（已在 Application Layer 定義）
3. **DTO ↔ Domain Entity 映射規則**
4. **IndexedDB Schema 設計**

## DTO 分類與用途

### Application Layer DTO vs Infrastructure Persistence DTO

本專案中有**兩組** DTO，用途不同但有部分重疊：

| 特性 | Application Layer DTO | Infrastructure Persistence DTO |
|------|----------------------|-------------------------------|
| **檔案位置** | `src/application/dto/` | `src/infrastructure/storage/dto/` |
| **用途** | 跨層資料傳輸（Port 介面） | IndexedDB 持久化儲存 |
| **使用者** | Use Case, MockAIService | BrowserStorage, Repository |
| **是否包含 savedAt** | ❌ 否 | ✅ 是 |
| **是否包含 sessionId** | ❌ 否 | ✅ 是 |
| **命名規範** | `TranscriptDTO` | `TranscriptPersistenceDTO` 或 `StoredTranscript` |

**重疊的原因**: 兩者都需要表示相同的業務資料，但 Persistence DTO 額外包含持久化元資料（savedAt, sessionId）。

**命名策略**: Infrastructure Layer 的 DTO 使用 `PersistenceDTO` 後綴，避免與 Application Layer DTO 混淆。

## Persistence DTOs

**檔案位置**: `src/infrastructure/storage/dto/`

這些 DTO 專門用於 IndexedDB 持久化儲存，**不同於** Application Layer 的 DTO。

### 1. VideoPersistenceDTO

**Purpose**: 儲存到 IndexedDB 的視頻資料結構

**檔案**: `infrastructure/storage/dto/VideoPersistenceDTO.ts`

```typescript
// infrastructure/storage/dto/VideoPersistenceDTO.ts
export interface VideoPersistenceDTO {
  // Domain 屬性
  id: string;
  file: File;                    // IndexedDB 原生支援 File 物件
  metadata: {
    duration: number;            // 視頻時長（秒）
    width: number;               // 視頻寬度
    height: number;              // 視頻高度
    size: number;                // 檔案大小（bytes）
    mimeType: string;            // MIME 類型
    name: string;                // 檔案名稱
  };
  url?: string;                  // blob URL（不持久化，運行時生成）

  // Persistence 元資料
  savedAt: number;               // 儲存時間戳（毫秒）
  sessionId: string;             // 會話 ID
}
```

**Constraints**:
- `id` 為主鍵（Primary Key）
- `file` 僅在視頻 ≤ 50MB 時儲存，否則為 null
- `url` 不儲存到 IndexedDB（運行時由 FileStorageService 生成）
- `sessionId` 用於識別會話，清理時比對

**Validation Rules**:
- `id` 不可為空
- `metadata.size` 必須 > 0
- `savedAt` 必須為有效時間戳

---

### 2. TranscriptPersistenceDTO

**Purpose**: 儲存到 IndexedDB 的轉錄資料結構

**檔案**: `infrastructure/storage/dto/TranscriptPersistenceDTO.ts`

```typescript
// infrastructure/storage/dto/TranscriptPersistenceDTO.ts
export interface TranscriptPersistenceDTO {
  // Domain 屬性
  id: string;
  videoId: string;               // 關聯的視頻 ID
  fullText: string;              // 完整轉錄文字
  sections: SectionDTO[];        // 段落陣列

  // Persistence 元資料
  savedAt: number;
  sessionId: string;
}

export interface SectionDTO {
  id: string;
  title: string;
  sentences: SentenceDTO[];
}

export interface SentenceDTO {
  id: string;
  text: string;
  startTime: number;             // 起始時間（秒）
  endTime: number;               // 結束時間（秒）
  isHighlightSuggestionSuggestion: boolean; // AI 建議的高光標記
}
```

**Constraints**:
- `id` 為主鍵
- `videoId` 為外鍵（關聯到 VideoDTO）
- `sections` 和 `sentences` 內嵌儲存（非關聯式，因為 IndexedDB 是 NoSQL）

**Validation Rules**:
- `sections` 不可為空陣列
- `sentences[].endTime` ≥ `sentences[].startTime`
- `sentences[].text` 不可為空字串

---

### 3. HighlightPersistenceDTO

**Purpose**: 儲存到 IndexedDB 的高光資料結構

**檔案**: `infrastructure/storage/dto/HighlightPersistenceDTO.ts`

```typescript
// infrastructure/storage/dto/HighlightPersistenceDTO.ts
export interface HighlightPersistenceDTO {
  // Domain 屬性
  id: string;
  videoId: string;               // 關聯的視頻 ID
  name: string;                  // 高光名稱
  selectedSentenceIds: string[]; // 選中的句子 ID 陣列
  selectionOrder: string[];      // 選擇順序記錄

  // Persistence 元資料
  savedAt: number;
  sessionId: string;
}
```

**Constraints**:
- `id` 為主鍵
- `videoId` 為外鍵
- `selectedSentenceIds` 和 `selectionOrder` 應該一致（Set 轉換為陣列）

**Validation Rules**:
- `name` 不可為空字串
- `selectedSentenceIds` 可為空陣列（初始狀態）
- `selectionOrder.length` == `selectedSentenceIds.length`

---

## Application DTOs

**檔案位置**: `src/application/dto/` （已存在，不需修改）

這些 DTO 用於跨層資料傳輸，由 Application Layer 定義，Infrastructure Layer 使用但不修改。

### TranscriptDTO (Application Layer)

**Purpose**: MockAIService 返回的轉錄資料結構

**檔案**: `application/dto/TranscriptDTO.ts` （已存在）

```typescript
// application/dto/TranscriptDTO.ts (已存在，不需修改)
export interface TranscriptDTO {
  fullText: string;
  sections: {
    id: string;
    title: string;
    sentences: {
      id: string;
      text: string;
      startTime: number;
      endTime: number;
      isHighlightSuggestion: boolean;      // 注意：Application DTO 使用 isHighlightSuggestion
    }[];
  }[];
}
```

**與 TranscriptPersistenceDTO 的差異**:
- Application DTO 不包含 `savedAt` 和 `sessionId`（由 Infrastructure Layer 添加）
- Application DTO 的 `isHighlightSuggestion` 對應 Persistence DTO 的 `isHighlightSuggestionSuggestion`
- Application DTO 不包含 `id` 和 `videoId`（由 Use Case 生成/提供）

**資料流向**:
```
MockAIService.generate()
  → 返回 TranscriptDTO (Application)
  → ProcessTranscriptUseCase 轉換為 Transcript Entity
  → TranscriptRepository.save()
  → DTOMapper 轉換為 TranscriptPersistenceDTO
  → BrowserStorage 儲存到 IndexedDB
```

---

## DTO Mapping Rules

### 1. Video Entity ↔ VideoPersistenceDTO

**Entity → Persistence DTO**:
```typescript
function videoEntityToPersistenceDto(video: Video, sessionId: string): VideoPersistenceDTO {
  return {
    id: video.id,
    file: video.file,
    metadata: {
      duration: video.metadata.duration,
      width: video.metadata.width,
      height: video.metadata.height,
      size: video.metadata.size,
      mimeType: video.metadata.mimeType,
      name: video.metadata.name,
    },
    url: video.url, // blob URL（不儲存到 IndexedDB）
    savedAt: Date.now(),
    sessionId: sessionId,
  };
}
```

**Persistence DTO → Entity**:
```typescript
function videoPersistenceDtoToEntity(dto: VideoPersistenceDTO): Video {
  const metadata = new VideoMetadata(
    dto.metadata.duration,
    dto.metadata.width,
    dto.metadata.height,
    dto.metadata.size,
    dto.metadata.mimeType,
    dto.metadata.name
  );
  return new Video(dto.id, dto.file, metadata, dto.url);
}
```

**Special Handling**:
- 大視頻（> 50MB）：`file` 儲存為 null，恢復時需重新上傳
- `url` 不儲存，恢復時由 FileStorageService 重新生成

---

### 2. Transcript Mappings (兩種轉換路徑)

#### 路徑 A: Application DTO → Entity (MockAIService 返回)

**TranscriptDTO (Application) → Transcript Entity**:
```typescript
function applicationTranscriptDtoToEntity(dto: TranscriptDTO, videoId: string): Transcript {
  const sections = dto.sections.map(sectionDto => {
    const sentences = sectionDto.sentences.map(sentenceDto => {
      const timeRange = new TimeRange(
        new TimeStamp(sentenceDto.startTime),
        new TimeStamp(sentenceDto.endTime)
      );
      return new Sentence(
        sentenceDto.id,
        sentenceDto.text,
        timeRange,
        sentenceDto.isHighlightSuggestion // Application DTO 使用 isHighlightSuggestion
      );
    });
    return new Section(sectionDto.id, sectionDto.title, sentences);
  });

  return new Transcript(
    crypto.randomUUID(), // 生成轉錄 ID
    videoId,
    sections,
    dto.fullText
  );
}
```

#### 路徑 B: Entity → Persistence DTO (儲存到 IndexedDB)

**Transcript Entity → TranscriptPersistenceDTO**:
```typescript
function transcriptEntityToPersistenceDto(transcript: Transcript, sessionId: string): TranscriptPersistenceDTO {
  return {
    id: transcript.id,
    videoId: transcript.videoId,
    fullText: transcript.fullText,
    sections: transcript.sections.map(section => ({
      id: section.id,
      title: section.title,
      sentences: section.sentences.map(sentence => ({
        id: sentence.id,
        text: sentence.text,
        startTime: sentence.timeRange.start.seconds,
        endTime: sentence.timeRange.end.seconds,
        isHighlightSuggestionSuggestion: sentence.isHighlightSuggestionSuggestion,
      })),
    })),
    savedAt: Date.now(),
    sessionId: sessionId,
  };
}
```

#### 路徑 C: Persistence DTO → Entity (從 IndexedDB 恢復)

**TranscriptPersistenceDTO → Transcript Entity**:
```typescript
function transcriptPersistenceDtoToEntity(dto: TranscriptPersistenceDTO): Transcript {
  const sections = dto.sections.map(sectionDto => {
    const sentences = sectionDto.sentences.map(sentenceDto => {
      const timeRange = new TimeRange(
        new TimeStamp(sentenceDto.startTime),
        new TimeStamp(sentenceDto.endTime)
      );
      return new Sentence(
        sentenceDto.id,
        sentenceDto.text,
        timeRange,
        sentenceDto.isHighlightSuggestionSuggestion
      );
    });
    return new Section(sectionDto.id, sectionDto.title, sentences);
  });

  return new Transcript(dto.id, dto.videoId, sections, dto.fullText);
}
```

---

### 3. Highlight Entity ↔ HighlightPersistenceDTO

**Highlight Entity → HighlightPersistenceDTO**:
```typescript
function highlightEntityToPersistenceDto(highlight: Highlight, sessionId: string): HighlightPersistenceDTO {
  return {
    id: highlight.id,
    videoId: highlight.videoId,
    name: highlight.name,
    selectedSentenceIds: Array.from(highlight.selectedSentenceIds), // Set → Array
    selectionOrder: highlight.selectionOrder,
    savedAt: Date.now(),
    sessionId: sessionId,
  };
}
```

**HighlightPersistenceDTO → Highlight Entity**:
```typescript
function highlightPersistenceDtoToEntity(dto: HighlightPersistenceDTO): Highlight {
  const highlight = new Highlight(dto.id, dto.videoId, dto.name);
  // 恢復選擇狀態
  dto.selectedSentenceIds.forEach(sentenceId => {
    highlight.addSentence(sentenceId);
  });
  return highlight;
}
```

**Special Handling**:
- `selectedSentenceIds` 從 Set 轉換為 Array（IndexedDB 不支援 Set）
- 恢復時需逐一調用 `addSentence()` 重建內部狀態

---

## IndexedDB Schema Design

### Database Information

**Database Name**: `video-highlight-tool-db`
**Version**: 1

### Object Stores

#### 1. `videos` Store

```typescript
{
  keyPath: 'id',           // Primary Key
  autoIncrement: false,    // 手動指定 ID
  indexes: [
    { name: 'sessionId', keyPath: 'sessionId', unique: false },
    { name: 'savedAt', keyPath: 'savedAt', unique: false },
  ]
}
```

**Purpose**: 儲存視頻檔案和元資料

**Indexes**:
- `sessionId`: 用於清理屬於已關閉 Tab 的資料
- `savedAt`: 用於清理超過 24 小時的資料

---

#### 2. `transcripts` Store

```typescript
{
  keyPath: 'id',
  autoIncrement: false,
  indexes: [
    { name: 'videoId', keyPath: 'videoId', unique: false },
    { name: 'sessionId', keyPath: 'sessionId', unique: false },
    { name: 'savedAt', keyPath: 'savedAt', unique: false },
  ]
}
```

**Purpose**: 儲存轉錄資料

**Indexes**:
- `videoId`: 用於按視頻 ID 查詢轉錄
- `sessionId`: 用於清理
- `savedAt`: 用於清理

---

#### 3. `highlights` Store

```typescript
{
  keyPath: 'id',
  autoIncrement: false,
  indexes: [
    { name: 'videoId', keyPath: 'videoId', unique: false },
    { name: 'sessionId', keyPath: 'sessionId', unique: false },
    { name: 'savedAt', keyPath: 'savedAt', unique: false },
  ]
}
```

**Purpose**: 儲存高光資料

**Indexes**:
- `videoId`: 用於查詢某視頻的所有高光版本
- `sessionId`: 用於清理
- `savedAt`: 用於清理

---

## BrowserStorage Interface

### Core Methods

**注意**: BrowserStorage 使用 **PersistenceDTO**（帶有 savedAt 和 sessionId）

```typescript
export class BrowserStorage {
  private db: IDBPDatabase;
  private sessionId: string;

  // 初始化資料庫和會話 ID
  async init(): Promise<void>;

  // 儲存視頻（僅當 ≤ 50MB）
  async saveVideo(video: VideoPersistenceDTO): Promise<void>;

  // 恢復視頻
  async restoreVideo(id: string): Promise<VideoPersistenceDTO | null>;

  // 儲存轉錄
  async saveTranscript(transcript: TranscriptPersistenceDTO): Promise<void>;

  // 恢復轉錄
  async restoreTranscript(id: string): Promise<TranscriptPersistenceDTO | null>;

  // 按視頻 ID 恢復轉錄
  async restoreTranscriptByVideoId(videoId: string): Promise<TranscriptPersistenceDTO | null>;

  // 儲存高光
  async saveHighlight(highlight: HighlightPersistenceDTO): Promise<void>;

  // 恢復高光
  async restoreHighlight(id: string): Promise<HighlightPersistenceDTO | null>;

  // 按視頻 ID 恢復所有高光
  async restoreHighlightsByVideoId(videoId: string): Promise<HighlightPersistenceDTO[]>;

  // 清理過期資料
  async cleanupStaleData(): Promise<void>;

  // 獲取當前會話 ID
  getSessionId(): string;
}
```

### Error Handling

所有 BrowserStorage 方法應捕獲 IndexedDB 錯誤並：
1. 使用 `console.warn` 記錄錯誤（不阻斷主流程）
2. 返回 null 或空陣列（優雅降級）
3. 不拋出例外（避免影響 Repository 的 CRUD 操作）

範例：
```typescript
async saveVideo(video: VideoPersistenceDTO): Promise<void> {
  try {
    if (video.metadata.size > 50 * 1024 * 1024) {
      // 大視頻僅記錄元資料到 SessionStorage
      sessionStorage.setItem(`video_meta_${video.id}`, JSON.stringify({
        id: video.id,
        name: video.metadata.name,
        size: video.metadata.size,
      }));
      return;
    }

    // 小視頻儲存到 IndexedDB
    await this.db.put('videos', video);
  } catch (error) {
    console.warn('Failed to save video to IndexedDB:', error);
    // 優雅降級，不拋出例外
  }
}
```

---

## SessionStorage Schema

### Purpose

儲存當前會話 ID 和大視頻的元資料

### Keys

| Key | Value Type | Purpose |
|-----|------------|---------|
| `sessionId` | string | 當前會話 ID（格式：`session_${timestamp}_${random}`） |
| `video_meta_${videoId}` | JSON string | 大視頻（> 50MB）的元資料 |

### Example

```typescript
// sessionId
sessionStorage.setItem('sessionId', 'session_1698765432000_a3f5e9');

// 大視頻元資料
sessionStorage.setItem('video_meta_abc123', JSON.stringify({
  id: 'abc123',
  name: 'large-video.mp4',
  size: 80 * 1024 * 1024, // 80MB
}));
```

---

## DTO 關係總覽

### DTO 類型對比表

| DTO 類型 | 檔案位置 | 主要欄位 | 額外欄位 | 使用場景 |
|---------|---------|---------|---------|---------|
| **TranscriptDTO** (Application) | `src/application/dto/` | fullText, sections[] | ❌ 無 | MockAI 返回、Use Case 輸入 |
| **TranscriptPersistenceDTO** | `src/infrastructure/storage/dto/` | id, videoId, fullText, sections[] | ✅ savedAt, sessionId | IndexedDB 儲存、刷新恢復 |

### 轉換路徑圖

```
┌──────────────────────────────────────────────────────────────────┐
│                   Application Layer DTO                          │
│                   (TranscriptDTO)                                │
│   - 用途: MockAI 返回、跨層傳輸                                   │
│   - 欄位: fullText, sections[]                                   │
│   - 無 savedAt, sessionId                                        │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            │ applicationTranscriptDtoToEntity()
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Domain Entity                                  │
│                   (Transcript)                                   │
│   - 用途: 業務邏輯處理                                            │
│   - 包含: Sections, Sentences, 查詢方法                          │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                │ (儲存)                │ (恢復)
                ▼                       ▼
    transcriptEntityToPersistenceDto()  transcriptPersistenceDtoToEntity()
                │                       │
                ▼                       │
┌──────────────────────────────────────────────────────────────────┐
│                Infrastructure Persistence DTO                    │
│                (TranscriptPersistenceDTO)                        │
│   - 用途: IndexedDB 儲存                                          │
│   - 欄位: id, videoId, fullText, sections[]                      │
│   - 額外: savedAt, sessionId (持久化元資料)                       │
└──────────────────────────────────────────────────────────────────┘
                            │
                            │ BrowserStorage.save/restore()
                            ▼
                      [IndexedDB]
```

## Data Flow Diagram

### 完整資料流程（含兩種 DTO）

```
┌─────────────────────────────────────────────────────────────────┐
│                        Presentation Layer                        │
│  (Upload 視頻 + JSON) → (調用 Use Case)                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Application Layer                          │
│                                                                  │
│  ProcessTranscriptUseCase.execute(videoId)                       │
│    │                                                             │
│    ├─→ MockAIService.generate(videoId)                           │
│    │     └─ 返回 TranscriptDTO (Application) ⭐                  │
│    │        { fullText, sections[] }                             │
│    │        ❌ 無 savedAt, sessionId                             │
│    │                                                             │
│    ├─→ applicationTranscriptDtoToEntity(dto, videoId)            │
│    │     └─ 轉換為 Transcript Entity                             │
│    │                                                             │
│    └─→ transcriptRepo.save(entity)                               │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Infrastructure Layer                         │
│                                                                  │
│  TranscriptRepositoryImpl.save(entity)                           │
│    │                                                             │
│    ├─→ 儲存到記憶體 Map<string, Transcript>                       │
│    │                                                             │
│    ├─→ transcriptEntityToPersistenceDto(entity, sessionId)       │
│    │     └─ 轉換為 TranscriptPersistenceDTO ⭐                    │
│    │        { id, videoId, fullText, sections[],                │
│    │          savedAt: Date.now(), sessionId }                  │
│    │        ✅ 包含持久化元資料                                   │
│    │                                                             │
│    └─→ BrowserStorage.saveTranscript(persistenceDto)             │
│          └─ 儲存到 IndexedDB                                     │
│                                                                  │
│  TranscriptRepositoryImpl.findById(id)                           │
│    │                                                             │
│    ├─→ 先查記憶體 Map                                            │
│    │     └─ 若找到，直接返回 Entity                               │
│    │                                                             │
│    ├─→ 若未找到 → BrowserStorage.restoreTranscript(id)           │
│    │     └─ 返回 TranscriptPersistenceDTO ⭐                      │
│    │                                                             │
│    └─→ transcriptPersistenceDtoToEntity(dto)                     │
│          └─ 轉換為 Transcript Entity                             │
└─────────────────────────────────────────────────────────────────┘
```

### 關鍵轉換點

1. **MockAI 返回** → `TranscriptDTO` (Application) → 無持久化元資料
2. **儲存前轉換** → `TranscriptPersistenceDTO` → 添加 savedAt, sessionId
3. **恢復後轉換** → `TranscriptPersistenceDTO` → Transcript Entity

---

## Testing Considerations

### Unit Tests

1. **DTOMapper 測試**:
   - 測試 Entity → DTO 轉換的正確性
   - 測試 DTO → Entity 轉換的正確性
   - 測試邊界情況（null, undefined, 空陣列）

2. **BrowserStorage 測試**:
   - Mock IndexedDB（使用 fake-indexeddb）
   - 測試 CRUD 操作
   - 測試清理邏輯（sessionId 比對、24 小時過期）
   - 測試錯誤處理（配額不足、權限錯誤）

3. **Repository 測試**:
   - Mock BrowserStorage
   - 測試記憶體 Map 和持久化的協作
   - 測試查詢邏輯（findById, findByVideoId）

### Integration Tests

1. **完整資料流測試**:
   - 上傳視頻 → 儲存 → 刷新 → 恢復
   - 驗證小視頻（≤ 50MB）完整恢復
   - 驗證大視頻（> 50MB）僅元資料恢復

2. **清理邏輯測試**:
   - 模擬多個 Tab（不同 sessionId）
   - 驗證啟動時清理屬於其他 Tab 的資料

---

## Next Steps

1. ✅ Data Model 設計完成
2. ⏭️ 生成 contracts/（Mock AI JSON schema）
3. ⏭️ 生成 quickstart.md（開發者快速開始指南）
