# Quickstart: Application Layer Development

**Feature**: Application Layer Development
**Date**: 2025-10-29

## Overview

本指南提供 Application Layer 開發的快速入門，包含如何建立 Use Cases、定義 Ports、撰寫單元測試和配置依賴注入。

---

## 1. 建立新的 Use Case

### Step 1: 定義 Use Case 類別

在 `src/application/use-cases/` 目錄下建立新的 Use Case 檔案：

```typescript
// src/application/use-cases/UploadVideoUseCase.ts
import { Video } from '@/domain/aggregates/Video';
import { IVideoRepository } from '@/domain/repositories/IVideoRepository';
import { IFileStorage } from '@/application/ports/IFileStorage';
import { VideoMetadata } from '@/domain/value-objects/VideoMetadata';
import {
  InvalidVideoFormatError,
  VideoFileTooLargeError,
  VideoMetadataExtractionError,
} from '@/application/errors/ApplicationErrors';

export class UploadVideoUseCase {
  constructor(
    private readonly videoRepository: IVideoRepository,
    private readonly fileStorage: IFileStorage
  ) {}

  async execute(file: File): Promise<Video> {
    // 1. 驗證輸入
    this.validateInput(file);

    // 2. 儲存文件
    const url = await this.fileStorage.save(file);

    // 3. 提取元數據
    const metadata = await this.extractMetadata(file);

    // 4. 建立 Entity
    const video = new Video(
      this.generateId(),
      file,
      metadata,
      url
    );

    // 5. 持久化
    await this.videoRepository.save(video);

    // 6. 返回結果
    return video;
  }

  private validateInput(file: File): void {
    const allowedTypes = ['video/mp4', 'video/mov', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      throw new InvalidVideoFormatError(file.type);
    }

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      throw new VideoFileTooLargeError(file.size, maxSize);
    }
  }

  private async extractMetadata(file: File): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        resolve(new VideoMetadata(
          video.duration,
          video.videoWidth,
          video.videoHeight,
          file.type
        ));
        URL.revokeObjectURL(video.src);
      };
      video.onerror = () => reject(new VideoMetadataExtractionError());
      video.src = URL.createObjectURL(file);
    });
  }

  private generateId(): string {
    return `video_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
```

### Step 2: 定義介面（可選，用於依賴注入）

在 `specs/002-application-layer/contracts/use-cases.ts` 中定義介面：

```typescript
export interface IUploadVideoUseCase {
  execute(file: File): Promise<Video>;
}
```

---

## 2. 定義新的 Port

### Step 1: 建立 Port 介面

在 `src/application/ports/` 目錄下建立新的 Port 檔案：

```typescript
// src/application/ports/IFileStorage.ts
export interface IFileStorage {
  /**
   * 儲存文件並返回可訪問的 URL
   */
  save(file: File): Promise<string>;

  /**
   * 刪除文件
   */
  delete(url: string): Promise<void>;
}
```

### Step 2: 在 Infrastructure Layer 實作

```typescript
// src/infrastructure/storage/FileStorageService.ts
import { IFileStorage } from '@/application/ports/IFileStorage';
import { FileStorageError } from '@/application/errors/ApplicationErrors';

export class FileStorageService implements IFileStorage {
  async save(file: File): Promise<string> {
    try {
      // 使用瀏覽器本地 Object URL
      const url = URL.createObjectURL(file);
      return url;
    } catch (error) {
      throw new FileStorageError(`Failed to save file: ${error.message}`);
    }
  }

  async delete(url: string): Promise<void> {
    try {
      URL.revokeObjectURL(url);
    } catch (error) {
      throw new FileStorageError(`Failed to delete file: ${error.message}`);
    }
  }
}
```

---

## 3. 撰寫單元測試

### Step 1: 建立測試檔案

在 `tests/unit/application/use-cases/` 目錄下建立測試檔案：

```typescript
// tests/unit/application/use-cases/UploadVideoUseCase.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UploadVideoUseCase } from '@/application/use-cases/UploadVideoUseCase';
import { IVideoRepository } from '@/domain/repositories/IVideoRepository';
import { IFileStorage } from '@/application/ports/IFileStorage';
import {
  InvalidVideoFormatError,
  VideoFileTooLargeError,
} from '@/application/errors/ApplicationErrors';

describe('UploadVideoUseCase', () => {
  let useCase: UploadVideoUseCase;
  let mockVideoRepository: IVideoRepository;
  let mockFileStorage: IFileStorage;

  beforeEach(() => {
    // 建立 Mock 依賴
    mockVideoRepository = {
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn().mockResolvedValue(null),
    };

    mockFileStorage = {
      save: vi.fn().mockResolvedValue('http://example.com/video.mp4'),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    // 注入 Mock 依賴
    useCase = new UploadVideoUseCase(mockVideoRepository, mockFileStorage);
  });

  describe('Happy Path', () => {
    it('應該成功上傳有效的 MP4 視頻', async () => {
      // Arrange
      const file = new File(['video content'], 'test.mp4', { type: 'video/mp4' });
      Object.defineProperty(file, 'size', { value: 50 * 1024 * 1024 }); // 50MB

      // Act
      const video = await useCase.execute(file);

      // Assert
      expect(video).toBeDefined();
      expect(video.file).toBe(file);
      expect(mockFileStorage.save).toHaveBeenCalledWith(file);
      expect(mockVideoRepository.save).toHaveBeenCalledWith(video);
    });
  });

  describe('輸入驗證', () => {
    it('應該拒絕不支援的視頻格式', async () => {
      // Arrange
      const file = new File(['video content'], 'test.avi', { type: 'video/avi' });

      // Act & Assert
      await expect(useCase.execute(file)).rejects.toThrow(InvalidVideoFormatError);
      expect(mockFileStorage.save).not.toHaveBeenCalled();
    });

    it('應該拒絕超過 100MB 的視頻', async () => {
      // Arrange
      const file = new File(['video content'], 'test.mp4', { type: 'video/mp4' });
      Object.defineProperty(file, 'size', { value: 150 * 1024 * 1024 }); // 150MB

      // Act & Assert
      await expect(useCase.execute(file)).rejects.toThrow(VideoFileTooLargeError);
    });
  });

  describe('依賴失敗', () => {
    it('當文件儲存失敗時應該拋出錯誤', async () => {
      // Arrange
      const file = new File(['video content'], 'test.mp4', { type: 'video/mp4' });
      Object.defineProperty(file, 'size', { value: 50 * 1024 * 1024 });
      mockFileStorage.save = vi.fn().mockRejectedValue(new Error('Storage failed'));

      // Act & Assert
      await expect(useCase.execute(file)).rejects.toThrow();
    });
  });
});
```

### Step 2: 執行測試

```bash
# 執行所有測試
npm run test

# 執行特定測試檔案
npm run test UploadVideoUseCase.test.ts

# 執行測試並顯示覆蓋率
npm run test:coverage
```

---

## 4. 配置依賴注入

### Step 1: 在 DI Container 註冊依賴

```typescript
// src/di-container.ts
import { App, InjectionKey } from 'vue';
import { IVideoRepository } from '@/domain/repositories/IVideoRepository';
import { IFileStorage } from '@/application/ports/IFileStorage';
import { VideoRepositoryImpl } from '@/infrastructure/repositories/VideoRepositoryImpl';
import { FileStorageService } from '@/infrastructure/storage/FileStorageService';

// Injection Keys
export const VideoRepositoryKey: InjectionKey<IVideoRepository> = Symbol('VideoRepository');
export const FileStorageKey: InjectionKey<IFileStorage> = Symbol('FileStorage');

// Setup function
export function setupDependencies(app: App) {
  // 建立實作實例
  const videoRepository = new VideoRepositoryImpl();
  const fileStorage = new FileStorageService();

  // 註冊到 Vue DI Container
  app.provide(VideoRepositoryKey, videoRepository);
  app.provide(FileStorageKey, fileStorage);
}
```

### Step 2: 在 main.ts 中呼叫 Setup

```typescript
// src/main.ts
import { createApp } from 'vue';
import App from './App.vue';
import { setupDependencies } from './di-container';

const app = createApp(App);

// 設定依賴注入
setupDependencies(app);

app.mount('#app');
```

### Step 3: 在 Pinia Store 中使用 Use Case

```typescript
// src/presentation/state/videoStore.ts
import { defineStore } from 'pinia';
import { inject, ref } from 'vue';
import { VideoRepositoryKey, FileStorageKey } from '@/di-container';
import { UploadVideoUseCase } from '@/application/use-cases/UploadVideoUseCase';
import { Video } from '@/domain/aggregates/Video';

export const useVideoStore = defineStore('video', () => {
  // 狀態
  const video = ref<Video | null>(null);
  const isUploading = ref(false);

  // 注入依賴
  const videoRepository = inject(VideoRepositoryKey);
  const fileStorage = inject(FileStorageKey);

  if (!videoRepository || !fileStorage) {
    throw new Error('VideoRepository or FileStorage not provided');
  }

  // 建立 Use Case
  const uploadVideoUseCase = new UploadVideoUseCase(videoRepository, fileStorage);

  // Actions
  async function uploadVideo(file: File): Promise<void> {
    try {
      isUploading.value = true;
      video.value = await uploadVideoUseCase.execute(file);
    } catch (error) {
      // 錯誤處理由上層處理
      throw error;
    } finally {
      isUploading.value = false;
    }
  }

  return {
    video,
    isUploading,
    uploadVideo,
  };
});
```

---

## 5. 在 Vue 組件中使用

```vue
<!-- src/presentation/components/upload/VideoUpload.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import { useVideoStore } from '@/presentation/state/videoStore';
import { InvalidVideoFormatError, VideoFileTooLargeError } from '@/application/errors/ApplicationErrors';

const videoStore = useVideoStore();
const errorMessage = ref<string>('');

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  try {
    errorMessage.value = '';
    await videoStore.uploadVideo(file);
    // 上傳成功，顯示通知或跳轉頁面
  } catch (error) {
    // 根據錯誤類型顯示友好訊息
    if (error instanceof InvalidVideoFormatError) {
      errorMessage.value = '請選擇 MP4、MOV 或 WebM 格式的視頻';
    } else if (error instanceof VideoFileTooLargeError) {
      errorMessage.value = '視頻文件過大，請選擇小於 100MB 的文件';
    } else {
      errorMessage.value = '上傳失敗，請稍後再試';
    }
  }
}
</script>

<template>
  <div>
    <input type="file" accept="video/*" @change="handleFileSelect" />
    <p v-if="videoStore.isUploading">上傳中...</p>
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </div>
</template>
```

---

## 6. 常見模式

### 6.1 DTO → Entity 轉換

```typescript
// Use Case 內部轉換
private convertToEntity(dto: TranscriptDTO): Transcript {
  const sections = dto.sections.map(sectionDTO =>
    this.convertSectionToEntity(sectionDTO)
  );

  return new Transcript(
    this.generateId(),
    dto.videoId,
    sections,
    dto.fullText
  );
}

private convertSectionToEntity(dto: SectionDTO): Section {
  const sentences = dto.sentences.map(sentenceDTO =>
    new Sentence(
      sentenceDTO.id,
      sentenceDTO.text,
      new TimeRange(
        new TimeStamp(sentenceDTO.startTime),
        new TimeStamp(sentenceDTO.endTime)
      ),
      sentenceDTO.isHighlight
    )
  );

  return new Section(dto.id, dto.title, sentences);
}
```

### 6.2 跨聚合協調

```typescript
// GenerateHighlightUseCase 協調兩個聚合
async execute(input: GenerateHighlightInput): Promise<GenerateHighlightOutput> {
  // 1. 獲取 Highlight 聚合
  const highlight = await this.highlightRepository.findById(input.highlightId);
  if (!highlight) {
    throw new HighlightNotFoundError(input.highlightId);
  }

  // 2. 獲取 Transcript 聚合
  const transcript = await this.transcriptRepository.findByVideoId(highlight.videoId);
  if (!transcript) {
    throw new TranscriptNotFoundError(highlight.videoId);
  }

  // 3. 協調兩個聚合
  const sentences = highlight.getSelectedSentences(transcript, input.sortBy);
  const timeRanges = highlight.getTimeRanges(transcript, input.sortBy);
  const totalDuration = highlight.getTotalDuration(transcript);

  return {
    sentences,
    timeRanges,
    totalDuration,
  };
}
```

### 6.3 錯誤處理

```typescript
// 統一錯誤處理（Presentation Layer）
function handleApplicationError(error: unknown): string {
  if (error instanceof InvalidVideoFormatError) {
    return '請選擇 MP4、MOV 或 WebM 格式的視頻';
  } else if (error instanceof VideoFileTooLargeError) {
    return '視頻文件過大，請選擇小於 100MB 的文件';
  } else if (error instanceof VideoNotFoundError) {
    return '視頻不存在';
  } else if (error instanceof HighlightNotFoundError) {
    return '高光不存在';
  } else if (error instanceof TranscriptNotFoundError) {
    return '轉錄不存在';
  } else {
    return '操作失敗，請稍後再試';
  }
}
```

---

## 7. 檢查清單

開發 Use Case 時的檢查清單：

- [ ] Use Case 類別使用 PascalCase + UseCase 後綴命名
- [ ] Use Case 僅有一個公開方法 `execute`
- [ ] 依賴透過建構函式注入
- [ ] 輸入驗證在 `execute` 開頭進行
- [ ] 業務邏輯清晰且單一職責
- [ ] 錯誤處理完整（拋出領域特定錯誤）
- [ ] 撰寫單元測試（Happy Path + 輸入驗證 + 依賴失敗）
- [ ] 在 DI Container 中註冊依賴
- [ ] 文檔註釋完整（JSDoc）

---

## 8. 下一步

完成 Application Layer 開發後，進入 Infrastructure Layer 和 Presentation Layer 實作：

1. **Infrastructure Layer**: 實作 Repositories 和 Ports（MockAIService, FileStorageService）
2. **Presentation Layer**: 建立 Vue 組件、Composables 和 Pinia Stores
3. **整合測試**: 驗證各層協作正確性
4. **部署**: 打包並部署應用

參考 `TECHNICAL_DESIGN.md` 了解完整架構設計。
