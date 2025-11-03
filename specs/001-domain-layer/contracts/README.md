# Domain Layer Contracts

## Overview

Domain Layer 不暴露 HTTP API，因為它是純粹的業務邏輯層。本資料夾定義的是 **TypeScript 型別契約**，供 Application Layer 和其他外層使用。

## Contract Files

### 1. type-definitions.ts

定義所有實體、值物件和 Repository 介面的 TypeScript 型別契約。

**包含內容**:

- **Value Objects**: `ITimeStamp`, `ITimeRange`, `IVideoMetadata`
- **Entities**: `IVideo`, `ISentence`, `ISection`, `ITranscript`, `IHighlight`
- **Repository Interfaces**: `IVideoRepository`, `ITranscriptRepository`, `IHighlightRepository`
- **Error Types**: `ValidationError`, `EntityNotFoundError`
- **Type Guards**: 運行時型別檢查函數

## Usage Examples

### 在 Application Layer 使用

```typescript
import type {
  IVideo,
  ITranscript,
  IHighlight,
  IVideoRepository,
  ITranscriptRepository,
  IHighlightRepository
} from '@/domain/contracts/type-definitions';

export class CreateHighlightUseCase {
  constructor(
    private videoRepository: IVideoRepository,
    private highlightRepository: IHighlightRepository
  ) {}

  async execute(videoId: string, name: string): Promise<IHighlight> {
    // 驗證 Video 存在
    const video = await this.videoRepository.findById(videoId);
    if (!video) {
      throw new EntityNotFoundError('Video', videoId);
    }

    // 建立 Highlight（實際實作由 Domain Layer 提供）
    const highlight = new Highlight(generateId(), videoId, name);
    await this.highlightRepository.save(highlight);

    return highlight;
  }
}
```

### 在 Infrastructure Layer 實作 Repository

```typescript
import type { IVideoRepository, IVideo } from '@/domain/contracts/type-definitions';
import { Video } from '@/domain/aggregates/Video';

export class VideoRepositoryImpl implements IVideoRepository {
  private videos = new Map<string, IVideo>();

  async save(video: IVideo): Promise<void> {
    this.videos.set(video.id, video);
  }

  async findById(id: string): Promise<IVideo | null> {
    return this.videos.get(id) || null;
  }
}
```

### 使用 Type Guards

```typescript
import { isVideo, isTranscript } from '@/domain/contracts/type-definitions';

function processEntity(entity: unknown) {
  if (isVideo(entity)) {
    console.log(`Video duration: ${entity.duration}`);
  } else if (isTranscript(entity)) {
    console.log(`Transcript sentences: ${entity.getAllSentences().length}`);
  }
}
```

## Contract Guarantees

### 1. 型別安全

所有公開 API 都有明確的型別定義，避免使用 `any`。

### 2. 不可變性

使用 `readonly` 修飾符確保數據不可變性（Transcript 和相關實體）。

### 3. 驗證規則

值物件在建構時執行驗證，驗證失敗時拋出 `ValidationError`。

### 4. 非同步操作

所有 Repository 方法返回 `Promise`，支援非同步儲存和查詢。

## Breaking Changes Policy

任何對這些契約的修改都應視為 **Breaking Change**，需要：

1. 更新版本號（MAJOR 版本）
2. 通知所有依賴層（Application, Infrastructure, Presentation）
3. 提供遷移指南

## Versioning

當前版本：**1.0.0**

版本規則：

- **MAJOR**: 移除或重新定義介面方法
- **MINOR**: 新增介面方法（可選）
- **PATCH**: 文檔更新、型別註釋修正

## Related Documents

- [data-model.md](../data-model.md) - 詳細的數據模型設計
- [spec.md](../spec.md) - 功能規格說明
- [TECHNICAL_DESIGN.md](../../../TECHNICAL_DESIGN.md) - 整體技術設計
