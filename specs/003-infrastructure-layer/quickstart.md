# Infrastructure Layer - Quick Start Guide

**Feature**: Infrastructure Layer Implementation
**Date**: 2025-10-30
**Target Audience**: 開發者

## Overview

本指南幫助開發者快速理解和使用 Infrastructure Layer 的各個組件。

## Prerequisites

- 已完成 Domain Layer 和 Application Layer 實作
- 已安裝 `idb` 套件：`npm install idb`
- 熟悉 TypeScript 和 Clean Architecture 概念

## Architecture Overview

```
Infrastructure Layer
├── api/
│   └── MockAIService.ts            # 實作 ITranscriptGenerator
├── repositories/
│   ├── VideoRepositoryImpl.ts      # 實作 IVideoRepository
│   ├── TranscriptRepositoryImpl.ts # 實作 ITranscriptRepository
│   └── HighlightRepositoryImpl.ts  # 實作 IHighlightRepository
├── storage/
│   ├── FileStorageService.ts       # 實作 IFileStorage
│   ├── BrowserStorage.ts           # IndexedDB + SessionStorage 工具
│   └── dto/                        # 持久化 DTO
└── utils/
    ├── json-validator.ts           # JSON 格式驗證
    └── dto-mapper.ts               # DTO ↔ Domain Entity 轉換
```

## Component Usage

### 1. MockAIService

**Purpose**: 模擬 AI 生成轉錄資料

#### 基本用法

```typescript
import { MockAIService } from '@/infrastructure/api/MockAIService';

// 初始化服務
const mockAI = new MockAIService();

// 步驟 1: 暫存 JSON 內容到記憶體（由 Presentation Layer 調用）
const jsonContent = `{
  "sections": [
    {
      "id": "sec_1",
      "title": "開場介紹",
      "sentences": [
        {
          "id": "sent_1",
          "text": "大家好，歡迎來到今天的分享。",
          "startTime": 0.0,
          "endTime": 3.5,
          "isHighlightSuggestion": true
        }
      ]
    }
  ]
}`;

mockAI.setMockData('video-123', jsonContent);

// 步驟 2: 生成轉錄（由 Application Layer 調用）
const transcriptDTO = await mockAI.generate('video-123');

console.log(transcriptDTO.sections.length); // 1
console.log(transcriptDTO.sections[0].title); // "開場介紹"
```

#### 錯誤處理

```typescript
try {
  // 未暫存 JSON 就調用 generate()
  const dto = await mockAI.generate('unknown-video-id');
} catch (error) {
  console.error(error.message); // "找不到 videoId 的 Mock 資料，請先上傳 JSON 檔案"
}

try {
  // JSON 缺少必要欄位
  mockAI.setMockData('video-456', '{"invalid": true}');
  const dto = await mockAI.generate('video-456');
} catch (error) {
  console.error(error.message); // "JSON 格式錯誤：缺少必要欄位 'sections'"
}
```

#### 寬鬆補完示例

```typescript
// JSON 缺少 isHighlightSuggestion 和 fullText
const partialJson = `{
  "sections": [
    {
      "id": "sec_1",
      "title": "測試段落",
      "sentences": [
        {
          "id": "sent_1",
          "text": "這是一個句子。",
          "startTime": 0.0,
          "endTime": 2.0
        }
      ]
    }
  ]
}`;

mockAI.setMockData('video-789', partialJson);
const dto = await mockAI.generate('video-789');

// 自動補完
console.log(dto.fullText); // "這是一個句子。"
console.log(dto.sections[0].sentences[0].isHighlightSuggestion); // false
```

---

### 2. FileStorageService

**Purpose**: 管理視頻檔案的 blob URL

#### 基本用法

```typescript
import { FileStorageService } from '@/infrastructure/storage/FileStorageService';

const fileStorage = new FileStorageService();

// 儲存視頻檔案
const file = new File([videoBlob], 'demo.mp4', { type: 'video/mp4' });
const url = await fileStorage.save(file);

console.log(url); // "blob:http://localhost:3000/abc-123-def"

// 使用 URL 播放視頻
const videoElement = document.querySelector('video');
videoElement.src = url;

// 不需要時釋放 URL
await fileStorage.delete(url);
```

#### 生命週期管理

```typescript
// 在 Vue 組件中使用
import { onUnmounted } from 'vue';

export default {
  setup() {
    const videoUrl = ref<string | null>(null);

    async function handleUpload(file: File) {
      videoUrl.value = await fileStorage.save(file);
    }

    // 組件卸載時釋放資源
    onUnmounted(() => {
      if (videoUrl.value) {
        fileStorage.delete(videoUrl.value);
      }
    });

    return { videoUrl, handleUpload };
  }
};
```

---

### 3. Repository 使用

#### VideoRepositoryImpl

```typescript
import { VideoRepositoryImpl } from '@/infrastructure/repositories/VideoRepositoryImpl';
import { BrowserStorage } from '@/infrastructure/storage/BrowserStorage';

// 初始化（通常在 DI Container 中完成）
const browserStorage = new BrowserStorage();
await browserStorage.init();

const videoRepo = new VideoRepositoryImpl(browserStorage);

// 儲存視頻
const video = new Video('video-123', file, metadata);
await videoRepo.save(video);

// 查詢視頻
const found = await videoRepo.findById('video-123');
if (found) {
  console.log(found.metadata.duration); // 視頻時長
}

// 查詢不存在的視頻
const notFound = await videoRepo.findById('unknown-id');
console.log(notFound); // null
```

#### TranscriptRepositoryImpl

```typescript
import { TranscriptRepositoryImpl } from '@/infrastructure/repositories/TranscriptRepositoryImpl';

const transcriptRepo = new TranscriptRepositoryImpl(browserStorage);

// 儲存轉錄
const transcript = new Transcript('trans-123', 'video-123', sections, fullText);
await transcriptRepo.save(transcript);

// 按視頻 ID 查詢
const found = await transcriptRepo.findByVideoId('video-123');
if (found) {
  console.log(found.sections.length); // 段落數量
}
```

#### HighlightRepositoryImpl

```typescript
import { HighlightRepositoryImpl } from '@/infrastructure/repositories/HighlightRepositoryImpl';

const highlightRepo = new HighlightRepositoryImpl(browserStorage);

// 儲存高光
const highlight = new Highlight('hl-123', 'video-123', '精華版');
highlight.addSentence('sent_1');
highlight.addSentence('sent_5');
await highlightRepo.save(highlight);

// 查詢某視頻的所有高光版本
const highlights = await highlightRepo.findByVideoId('video-123');
console.log(highlights.length); // 可能有多個高光版本
```

---

### 4. BrowserStorage 內部工具

**Note**: BrowserStorage 通常不直接使用，而是透過 Repository 注入。

#### 初始化

```typescript
import { BrowserStorage } from '@/infrastructure/storage/BrowserStorage';

const storage = new BrowserStorage();
await storage.init(); // 初始化 IndexedDB 和 sessionId

console.log(storage.getSessionId()); // "session_1698765432000_a3f5e9"
```

#### 手動儲存和恢復（僅供測試）

```typescript
import { VideoPersistenceDTO } from '@/infrastructure/storage/dto/VideoPersistenceDTO';

// 儲存視頻（僅當 ≤ 50MB）
const videoDto: VideoPersistenceDTO = {
  id: 'video-123',
  file: smallFile, // ≤ 50MB
  metadata: {
    /* ... */
  },
  savedAt: Date.now(),
  sessionId: storage.getSessionId()
};
await storage.saveVideo(videoDto);

// 恢復視頻
const restored = await storage.restoreVideo('video-123');
if (restored) {
  console.log(restored.metadata.name);
}
```

#### 清理過期資料

```typescript
// 在應用啟動時自動調用（init() 中）
await storage.cleanupStaleData();

// 手動觸發清理
await storage.cleanupStaleData();
```

---

## Common Workflows

### Workflow 1: 上傳視頻並生成轉錄

```typescript
// 1. 上傳視頻檔案
const videoFile = new File([blob], 'demo.mp4', { type: 'video/mp4' });
const videoUrl = await fileStorage.save(videoFile);

// 2. 建立 Video Entity
const metadata = new VideoMetadata(/* 從視頻提取 */);
const video = new Video(crypto.randomUUID(), videoFile, metadata, videoUrl);
await videoRepo.save(video);

// 3. 暫存 JSON 內容（Presentation Layer）
const jsonContent = await readJsonFile(jsonFile);
mockAI.setMockData(video.id, jsonContent);

// 4. 生成轉錄（Application Layer - ProcessTranscriptUseCase）
const transcriptDTO = await mockAI.generate(video.id);

// 5. 轉換為 Domain Entity 並儲存
const transcript = DTOMapper.transcriptDtoToEntity(transcriptDTO, video.id);
await transcriptRepo.save(transcript);

console.log('視頻上傳和轉錄完成！');
```

---

### Workflow 2: 刷新後恢復狀態

```typescript
// 1. 應用啟動時初始化 BrowserStorage
const browserStorage = new BrowserStorage();
await browserStorage.init(); // 自動清理過期資料

// 2. 嘗試恢復視頻
const videoId = 'video-123'; // 從 URL 或 LocalStorage 獲取
const video = await videoRepo.findById(videoId);

if (video) {
  if (video.file) {
    // 小視頻，完整恢復
    console.log('視頻完整恢復，可繼續編輯');
  } else {
    // 大視頻，僅元資料恢復
    console.log(`檢測到未完成的編輯，請重新上傳視頻 "${video.metadata.name}"`);
  }

  // 3. 恢復轉錄
  const transcript = await transcriptRepo.findByVideoId(videoId);
  if (transcript) {
    console.log(`轉錄資料已恢復，共 ${transcript.sections.length} 個段落`);
  }

  // 4. 恢復高光
  const highlights = await highlightRepo.findByVideoId(videoId);
  if (highlights.length > 0) {
    console.log(`高光資料已恢復，共 ${highlights.length} 個版本`);
  }
} else {
  console.log('無先前會話資料，開始新的編輯');
}
```

---

### Workflow 3: 建立和管理高光版本

```typescript
// 1. 建立新的高光版本
const highlight = new Highlight(crypto.randomUUID(), 'video-123', '精華版');
await highlightRepo.save(highlight);

// 2. 選擇句子
highlight.addSentence('sent_1');
highlight.addSentence('sent_5');
highlight.addSentence('sent_8');
await highlightRepo.save(highlight); // 更新持久化

// 3. 查詢選中狀態
console.log(highlight.isSelected('sent_1')); // true
console.log(highlight.isSelected('sent_2')); // false

// 4. 建立另一個版本
const highlightFull = new Highlight(crypto.randomUUID(), 'video-123', '完整版');
highlightFull.addSentence('sent_1');
highlightFull.addSentence('sent_2');
highlightFull.addSentence('sent_3');
// ... 選擇更多句子
await highlightRepo.save(highlightFull);

// 5. 查詢某視頻的所有高光版本
const allHighlights = await highlightRepo.findByVideoId('video-123');
console.log(allHighlights.map((h) => h.name)); // ["精華版", "完整版"]
```

---

## Testing

### 單元測試範例

#### MockAIService 測試

```typescript
import { describe, it, expect } from 'vitest';
import { MockAIService } from '@/infrastructure/api/MockAIService';

describe('MockAIService', () => {
  it('should generate transcript from cached JSON', async () => {
    const service = new MockAIService();
    const json = JSON.stringify({
      sections: [
        {
          id: 'sec_1',
          title: 'Test',
          sentences: [
            {
              id: 'sent_1',
              text: 'Hello',
              startTime: 0,
              endTime: 1
            }
          ]
        }
      ]
    });

    service.setMockData('video-1', json);
    const dto = await service.generate('video-1');

    expect(dto.sections).toHaveLength(1);
    expect(dto.sections[0].title).toBe('Test');
    expect(dto.sections[0].sentences[0].isHighlightSuggestion).toBe(false); // 自動補完
  });

  it('should throw error if JSON not cached', async () => {
    const service = new MockAIService();

    await expect(service.generate('unknown-id')).rejects.toThrow('找不到 videoId 的 Mock 資料');
  });
});
```

#### Repository 測試

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { VideoRepositoryImpl } from '@/infrastructure/repositories/VideoRepositoryImpl';
import { BrowserStorage } from '@/infrastructure/storage/BrowserStorage';
import { Video } from '@/domain/aggregates/Video';

describe('VideoRepositoryImpl', () => {
  let repo: VideoRepositoryImpl;
  let storage: BrowserStorage;

  beforeEach(async () => {
    storage = new BrowserStorage();
    await storage.init();
    repo = new VideoRepositoryImpl(storage);
  });

  it('should save and retrieve video', async () => {
    const video = new Video('video-1', file, metadata);
    await repo.save(video);

    const found = await repo.findById('video-1');
    expect(found).not.toBeNull();
    expect(found!.id).toBe('video-1');
  });

  it('should return null for non-existent video', async () => {
    const found = await repo.findById('unknown-id');
    expect(found).toBeNull();
  });
});
```

---

## Troubleshooting

### 問題 1: IndexedDB 配額不足

**症狀**: 控制台出現 "QuotaExceededError"

**解決方案**:

1. 檢查視頻大小是否超過 50MB（應僅儲存元資料）
2. 手動清理 IndexedDB 資料（Chrome DevTools → Application → IndexedDB）
3. 檢查 `cleanupStaleData()` 是否正確執行

### 問題 2: 刷新後資料未恢復

**症狀**: Repository.findById() 返回 null

**可能原因**:

1. sessionId 不匹配（被清理）
2. IndexedDB 未正確初始化
3. 視頻超過 50MB 且檔案未重新上傳

**檢查步驟**:

```typescript
// 1. 檢查 sessionId
console.log(browserStorage.getSessionId());
console.log(sessionStorage.getItem('sessionId'));

// 2. 檢查 IndexedDB 資料
const allVideos = await browserStorage.db.getAll('videos');
console.log(allVideos);

// 3. 檢查是否為大視頻
const meta = sessionStorage.getItem('video_meta_video-123');
if (meta) {
  console.log('這是大視頻，需要重新上傳', JSON.parse(meta));
}
```

### 問題 3: JSON 解析失敗

**症狀**: MockAIService.generate() 拋出錯誤

**可能原因**:

1. JSON 格式無效（非合法 JSON）
2. 缺少必要欄位（sections, sentences）
3. 時間戳格式錯誤

**檢查步驟**:

```typescript
try {
  const data = JSON.parse(jsonContent);
  console.log('JSON 解析成功', data);

  // 檢查必要欄位
  if (!data.sections) {
    throw new Error('缺少 sections');
  }
  if (!data.sections[0].sentences) {
    throw new Error('缺少 sentences');
  }
} catch (error) {
  console.error('JSON 驗證失敗', error);
}
```

---

## Best Practices

### 1. 依賴注入

**推薦**: 在 DI Container 中集中管理所有依賴

```typescript
// di-container.ts
export function setupInfrastructure(app: App) {
  const browserStorage = new BrowserStorage();
  await browserStorage.init();

  app.provide(VideoRepositoryToken, new VideoRepositoryImpl(browserStorage));
  app.provide(TranscriptRepositoryToken, new TranscriptRepositoryImpl(browserStorage));
  app.provide(HighlightRepositoryToken, new HighlightRepositoryImpl(browserStorage));
  app.provide(TranscriptGeneratorToken, new MockAIService());
  app.provide(FileStorageToken, new FileStorageService());
}
```

### 2. 錯誤處理

**推薦**: 在 Use Case 層處理業務錯誤，Infrastructure Layer 僅拋出技術錯誤

```typescript
// ❌ 不推薦：在 Repository 中處理業務邏輯
async findById(id: string): Promise<Video | null> {
  const video = this.videos.get(id);
  if (!video) {
    throw new Error('視頻不存在'); // 業務錯誤應由 Use Case 處理
  }
  return video;
}

// ✅ 推薦：返回 null，由 Use Case 判斷
async findById(id: string): Promise<Video | null> {
  return this.videos.get(id) || null;
}
```

### 3. 記憶體管理

**推薦**: 及時釋放不需要的 blob URL

```typescript
// ❌ 不推薦：未釋放 URL
const url = await fileStorage.save(file);
// ... 使用完畢後未調用 delete()

// ✅ 推薦：使用 try-finally 確保釋放
const url = await fileStorage.save(file);
try {
  // 使用 URL
  videoElement.src = url;
} finally {
  await fileStorage.delete(url);
}
```

---

## Next Steps

1. ✅ 熟悉各組件的基本用法
2. ⏭️ 閱讀 `data-model.md` 理解 DTO 結構
3. ⏭️ 閱讀 `contracts/README.md` 理解 JSON Schema
4. ⏭️ 開始實作 Infrastructure Layer 組件（參考 `tasks.md`）

## Resources

- [idb GitHub](https://github.com/jakearchibald/idb)
- [IndexedDB API MDN](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Clean Architecture 文章](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- 專案內部文檔：`TECHNICAL_DESIGN.md`, `REQUIREMENTS.md`
