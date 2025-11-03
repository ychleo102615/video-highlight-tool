# Config 配置模組

此目錄集中管理應用程式的所有常數和工具函式，避免魔術數字和重複定義。

## 檔案結構

```
src/config/
├── constants.ts       # 應用程式常數定義
├── id-generator.ts    # ID 生成工具函式
├── index.ts          # 統一匯出介面
└── README.md         # 此文件
```

## 使用方式

### 匯入常數

```typescript
// 方式 1: 直接從 config 匯入
import { MAX_FILE_SIZE, MAX_FILE_SIZE_MB, ALLOWED_VIDEO_FORMATS } from '@/config';

// 方式 2: 從特定檔案匯入
import { MAX_FILE_SIZE, MAX_FILE_SIZE_MB } from '@/config/constants';

// 使用範例
// 顯示給用戶
console.log(`最大檔案大小：${MAX_FILE_SIZE_MB}MB`);

// 比較檔案大小
if (file.size > MAX_FILE_SIZE) {
  alert(`檔案過大，最大支援 ${MAX_FILE_SIZE_MB}MB`);
}
```

### 匯入 ID 生成器

```typescript
// 方式 1: 直接從 config 匯入
import { generateVideoId, generateSessionId } from '@/config';

// 方式 2: 從特定檔案匯入
import { generateVideoId } from '@/config/id-generator';

// 使用範例
const videoId = generateVideoId(); // "video_1234567890_abc123"
const sessionId = generateSessionId(); // "session_1234567890_def456"
```

## 常數分類

### Database 相關
- `DB_NAME`: IndexedDB 資料庫名稱
- `DB_VERSION`: IndexedDB 資料庫版本

### Storage 相關
- `MAX_VIDEO_SIZE_MB`: 最大視頻大小 (MB 單位，用於顯示)
- `MAX_VIDEO_SIZE`: 最大視頻大小 (bytes 單位，用於比較)
- `MAX_AGE_MS`: 資料最大保存時間 (24小時)

### File Validation 相關
- `ALLOWED_VIDEO_FORMATS`: 允許上傳的視頻格式
- `MAX_FILE_SIZE_MB`: 最大上傳檔案大小 (MB 單位，用於顯示)
- `MAX_FILE_SIZE`: 最大上傳檔案大小 (bytes 單位，用於比較)

### SessionStorage Keys
- `SESSION_ID_KEY`: SessionStorage 中儲存 sessionId 的 key
- `VIDEO_META_KEY_PREFIX`: 大視頻元資料的 key 前綴

### ID Prefixes
- `SESSION_ID_PREFIX`: Session ID 前綴
- `VIDEO_ID_PREFIX`: Video ID 前綴
- `TRANSCRIPT_ID_PREFIX`: Transcript ID 前綴
- `HIGHLIGHT_ID_PREFIX`: Highlight ID 前綴
- `SENTENCE_ID_PREFIX`: Sentence ID 前綴

## ID 生成函式

### 可用函式
- `generateSessionId()`: 生成 Session ID
- `generateVideoId()`: 生成 Video ID
- `generateTranscriptId()`: 生成 Transcript ID
- `generateHighlightId()`: 生成 Highlight ID
- `generateSentenceId()`: 生成 Sentence ID

### ID 格式
所有 ID 都遵循統一格式：`${prefix}${timestamp}_${randomString}`

範例：
- `video_1699876543210_abc123def`
- `session_1699876543210_xyz789ghi`

## 型別定義

```typescript
// 允許的視頻格式型別
type AllowedVideoFormat = 'video/mp4' | 'video/quicktime' | 'video/webm';
```

## 維護指南

### 新增常數
1. 在 `constants.ts` 中定義新常數
2. 加入清楚的 JSDoc 註解說明用途
3. 依照分類加入適當的分組
4. 更新此 README 文件

### 新增 ID 類型
1. 在 `constants.ts` 中定義 ID 前綴常數
2. 在 `id-generator.ts` 中建立對應的生成函式
3. 更新此 README 文件

## 遷移記錄

此配置模組整合了以下原本分散在各處的常數：

- **BrowserStorage.ts**:
  - `DB_NAME`
  - `DB_VERSION`
  - `MAX_VIDEO_SIZE`
  - `MAX_AGE_MS`
  - Session ID 生成邏輯

- **UploadVideoUseCase.ts**:
  - `ALLOWED_FORMATS` (改名為 `ALLOWED_VIDEO_FORMATS`)
  - `MAX_FILE_SIZE`
  - Video ID 生成邏輯

- **VideoUpload.vue**:
  - `SUPPORTED_VIDEO_FORMATS` (改名為 `ALLOWED_VIDEO_FORMATS`)
  - `MAX_FILE_SIZE_MB`
  - `MAX_FILE_SIZE`

- **CreateHighlightUseCase.ts**:
  - Highlight ID 生成邏輯

- **ProcessTranscriptUseCase.ts**:
  - Transcript ID 生成邏輯

## 優點

1. **避免魔術數字**: 所有常數都有明確的名稱和說明
2. **統一管理**: 易於查找和修改
3. **型別安全**: 提供 TypeScript 型別定義
4. **一致性**: 所有 ID 生成遵循相同格式
5. **可維護性**: 減少重複程式碼，易於維護
