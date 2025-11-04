# Data Model: 會話清理與刪除

**Feature**: 006-session-cleanup
**Date**: 2025-11-04

## Overview

本功能不涉及新的 Domain Entity,完全重用現有的 Video、Transcript、Highlight 實體。唯一新增的是 Application Layer 的 DTO,用於傳遞刪除操作的結果。

---

## Domain Entities (Reused)

### Video Entity
**位置**: `src/domain/entities/Video.ts`
**狀態**: 現有,無需修改

```typescript
export class Video {
  constructor(
    public readonly id: string,
    public readonly file: File | null,  // 可能為 null(大視頻)
    public readonly name: string,
    public readonly duration: number,
    public readonly url: string | null
  ) {}
}
```

**刪除影響**: 刪除會話時,此 Entity 的 IndexedDB 記錄會被清除,記憶體中的 Repository 也會被清空。

---

### Transcript Entity
**位置**: `src/domain/entities/Transcript.ts`
**狀態**: 現有,無需修改

```typescript
export class Transcript {
  constructor(
    public readonly id: string,
    public readonly videoId: string,
    public readonly sections: Section[],
    public readonly fullText: string
  ) {}
}

export class Section {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly sentences: Sentence[]
  ) {}
}

export class Sentence {
  constructor(
    public readonly id: string,
    public readonly text: string,
    public readonly startTime: number,
    public readonly endTime: number,
    public readonly isHighlightSuggestion: boolean
  ) {}
}
```

**刪除影響**: 刪除會話時,Transcript 及其關聯的 Sections 和 Sentences 都會被清除。

---

### Highlight Entity
**位置**: `src/domain/entities/Highlight.ts`
**狀態**: 現有,無需修改

```typescript
export class Highlight {
  constructor(
    public readonly id: string,
    public readonly videoId: string,
    public readonly selectedSentenceIds: string[]
  ) {}
}
```

**刪除影響**: 刪除會話時,所有關聯的 Highlight 記錄會被清除。

---

## Application DTOs (New)

### DeleteSessionResultDTO
**位置**: `src/application/dto/DeleteSessionResultDTO.ts`
**狀態**: 新增 ⭐

```typescript
/**
 * 刪除會話操作的結果 DTO
 *
 * @property success - 刪除是否成功
 * @property error - 若失敗,包含錯誤訊息(供 UI 顯示)
 */
export interface DeleteSessionResultDTO {
  success: boolean;
  error?: string;
}
```

**使用場景**:
- DeleteSessionUseCase.execute() 的返回型別
- videoStore.deleteSession() 根據此結果決定 UI 回饋
- 錯誤訊息會顯示在 notification 或 message 中

**範例值**:
```typescript
// 成功案例
{ success: true }

// 失敗案例
{
  success: false,
  error: '刪除 IndexedDB 資料時發生錯誤,請重試'
}
```

---

## Persistence DTOs (Existing)

這些 DTO 用於 IndexedDB 儲存,已在 Infrastructure Layer 定義,刪除操作會直接操作這些記錄。

### VideoPersistenceDTO
**位置**: `src/infrastructure/storage/dto/VideoPersistenceDTO.ts`
**狀態**: 現有,無需修改

```typescript
export interface VideoPersistenceDTO {
  id: string;
  sessionId: string;  // ← 刪除時的查詢鍵
  file: File | null;
  name: string;
  duration: number;
  url: string | null;
  savedAt: number;
}
```

**IndexedDB 索引**: `sessionId` (用於批次刪除查詢)

---

### TranscriptPersistenceDTO
**位置**: `src/infrastructure/storage/dto/TranscriptPersistenceDTO.ts`
**狀態**: 現有,無需修改

```typescript
export interface TranscriptPersistenceDTO {
  id: string;
  sessionId: string;  // ← 刪除時的查詢鍵
  videoId: string;
  sections: SectionDTO[];
  fullText: string;
  savedAt: number;
}
```

**IndexedDB 索引**: `sessionId`, `videoId`

---

### HighlightPersistenceDTO
**位置**: `src/infrastructure/storage/dto/HighlightPersistenceDTO.ts`
**狀態**: 現有,無需修改

```typescript
export interface HighlightPersistenceDTO {
  id: string;
  sessionId: string;  // ← 刪除時的查詢鍵
  videoId: string;
  selectedSentenceIds: string[];
  savedAt: number;
}
```

**IndexedDB 索引**: `sessionId`, `videoId`

---

## State Transitions

### 刪除會話的狀態轉換

```
[有活躍會話]
    │
    │ 使用者點擊「刪除高光紀錄」
    ↓
[顯示確認對話框]
    │
    ├─→ 使用者點擊「取消」 → [保持現狀,有活躍會話]
    │
    └─→ 使用者點擊「永久刪除」
        ↓
    [執行刪除操作]
        │
        ├─ 刪除 IndexedDB 記錄(videos/transcripts/highlights)
        ├─ 清除 sessionStorage (sessionId)
        ├─ 重置 Pinia stores (video/transcript/highlight)
        └─ 清空 Repositories (記憶體)
        ↓
    [初始狀態,無會話]
        │
        └─→ 使用者可上傳新視頻,建立新會話
```

---

## Validation Rules

### 刪除前驗證
1. **sessionId 存在性**:
   - 驗證: sessionStorage 中必須有 SESSION_ID_KEY
   - 失敗處理: 若不存在,返回 `{ success: false, error: '無活躍會話' }`

2. **BrowserStorage 初始化**:
   - 驗證: BrowserStorage.db 必須已初始化
   - 失敗處理: 若未初始化,嘗試重新 init(),失敗則返回錯誤

### 刪除後驗證
1. **IndexedDB 清空確認**:
   - 可選: 查詢 IndexedDB 確認該 sessionId 的記錄已全部刪除
   - 開發階段: 使用 console.log 記錄刪除數量

2. **Store 狀態確認**:
   - 驗證: videoStore.video === null
   - 驗證: transcriptStore.transcript === null
   - 驗證: highlightStore.highlights.length === 0

---

## Error Scenarios

| 錯誤場景 | 檢測方式 | 處理策略 |
|---------|---------|---------|
| **IndexedDB 不可用** | BrowserStorage.db 為 undefined | 返回錯誤,提示瀏覽器不支援 |
| **部分 store 刪除失敗** | try-catch 捕獲 transaction 錯誤 | 記錄 warning,繼續刪除其他 stores |
| **sessionId 不存在** | sessionStorage.getItem() 返回 null | 返回錯誤,提示無活躍會話 |
| **Store 重置失敗** | store.reset() 拋出錯誤 | 嘗試手動重新賦值初始值 |

---

## Data Flow Diagram

```
┌─────────────────┐
│  DeleteButton   │ (Presentation Layer)
│  (UI Component) │
└────────┬────────┘
         │ 使用者點擊刪除
         ↓
┌─────────────────┐
│  videoStore     │ (Presentation Layer)
│  deleteSession()│
└────────┬────────┘
         │ 調用 Use Case
         ↓
┌─────────────────────────┐
│ DeleteSessionUseCase    │ (Application Layer)
│ execute()               │
└────────┬────────────────┘
         │
         ├──→ BrowserStorage.getSessionId()
         │
         ├──→ BrowserStorage.deleteSession(sessionId)
         │    ├─ 刪除 videos (IndexedDB)
         │    ├─ 刪除 transcripts (IndexedDB)
         │    └─ 刪除 highlights (IndexedDB)
         │
         ├──→ sessionStorage.removeItem(SESSION_ID_KEY)
         │
         └──→ 重置 Stores
              ├─ highlightStore.reset()
              ├─ transcriptStore.reset()
              └─ videoStore.reset()
```

---

## Performance Considerations

### 刪除操作的性能目標

| 資料量 | IndexedDB 刪除時間 | 預期 |
|--------|-------------------|------|
| 1 個會話(3-5 條記錄) | < 50ms | ✅ 達標 |
| 10 個會話(30-50 條記錄) | < 200ms | ✅ 達標 |
| 100 個會話(300-500 條記錄) | < 2s | ⚠️ 需監控 |

**優化策略**:
- 使用 Cursor 遍歷而非 getAll()(減少記憶體使用)
- 每個 store 使用獨立 transaction(減少鎖定時間)
- 不在 transaction 內 await 外部操作(避免提前關閉)

---

## Testing Scenarios

### 單元測試覆蓋

1. **DeleteSessionResultDTO 型別檢查**
   - 驗證 success 為 boolean
   - 驗證 error 為可選 string

2. **BrowserStorage.deleteSession()**
   - Mock IndexedDB,驗證 cursor 遍歷邏輯
   - 驗證 transaction 錯誤被正確捕獲
   - 驗證所有 stores 都被嘗試刪除

3. **DeleteSessionUseCase.execute()**
   - Mock BrowserStorage,驗證調用順序
   - 驗證成功時返回 { success: true }
   - 驗證失敗時返回 { success: false, error: ... }

### 整合測試覆蓋

1. **完整刪除流程**
   - 上傳視頻 → 刪除會話 → 驗證 IndexedDB 清空
   - 驗證 sessionStorage 清空
   - 驗證 stores 重置

2. **多分頁隔離**
   - 分頁 A 刪除會話 → 驗證分頁 B 不受影響

---

**Status**: Data model documented, no new entities required. Ready for contract generation.
