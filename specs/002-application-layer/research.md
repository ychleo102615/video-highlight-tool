# Research: Application Layer Design Decisions

**Feature**: Application Layer Development
**Date**: 2025-10-29
**Status**: Completed

## Overview

本文件記錄 Application Layer 實作的研究結果與設計決策。研究主題包含 Use Case 設計模式、DTO 轉換策略、錯誤處理模式和 Port 介面設計。所有決策均參考 Clean Architecture 和 DDD 最佳實踐。

---

## 1. Use Case 設計模式

### 研究問題

- Use Case 的最佳實踐是什麼？
- 輸入驗證應該放在哪裡？
- 依賴注入應該使用建構函式還是方法參數？
- 如何處理事務邊界？

### 決策: 標準 Use Case 模式

**選擇**: 採用以下標準模式

```typescript
export class UploadVideoUseCase {
  constructor(
    private readonly videoRepository: IVideoRepository,
    private readonly fileStorage: IFileStorage
  ) {}

  async execute(input: File): Promise<Video> {
    // 1. 輸入驗證
    this.validateInput(input);

    // 2. 業務邏輯執行
    const url = await this.fileStorage.save(input);
    const metadata = await this.extractMetadata(input);
    const video = new Video(generateId(), input, metadata, url);

    // 3. 持久化
    await this.videoRepository.save(video);

    // 4. 返回結果
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
    // 使用 HTMLVideoElement 提取元數據
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
}
```

**理由**:
1. **建構函式注入**: 依賴在 Use Case 生命週期中不變，使用建構函式注入更清晰
2. **單一公開方法 `execute`**: 清楚表達 Use Case 的唯一職責
3. **輸入驗證在前**: 快速失敗（Fail Fast），減少無效處理
4. **私有方法輔助**: 提取複雜邏輯到私有方法，保持 `execute` 可讀性

**替代方案**:
- **方法參數注入**: 使依賴可變，增加測試複雜度（rejected）
- **多個公開方法**: 違反單一職責原則（rejected）
- **驗證在 Domain Entity**: 驗證屬於應用層職責，Domain 只驗證不變量（rejected）

**事務邊界處理**:
- 本專案使用前端儲存（Map/IndexedDB），無分佈式事務需求
- 每個 Use Case 操作單一 Aggregate，Repository save 即事務邊界
- 若未來需要跨 Aggregate 事務，考慮使用 Unit of Work 模式

---

## 2. DTO 轉換策略

### 研究問題

- DTO → Domain Entity 轉換應該在哪裡進行？
- 如何處理巢狀結構（Section/Sentence）？
- 驗證邏輯應該放在哪裡？

### 決策: Use Case 內轉換 + 輔助函數

**選擇**: 在 Use Case 內進行轉換，提取複雜邏輯到獨立函數

```typescript
// application/dto/TranscriptDTO.ts
export interface TranscriptDTO {
  videoId: string;
  fullText: string;
  sections: SectionDTO[];
}

export interface SectionDTO {
  id: string;
  title: string;
  sentences: SentenceDTO[];
}

export interface SentenceDTO {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  isHighlight: boolean;
}

// application/use-cases/ProcessTranscriptUseCase.ts
export class ProcessTranscriptUseCase {
  constructor(
    private readonly transcriptGenerator: ITranscriptGenerator,
    private readonly transcriptRepository: ITranscriptRepository,
    private readonly videoRepository: IVideoRepository
  ) {}

  async execute(videoId: string): Promise<Transcript> {
    // 1. 驗證視頻存在
    const video = await this.videoRepository.findById(videoId);
    if (!video) {
      throw new VideoNotFoundError(videoId);
    }

    // 2. 生成轉錄 DTO
    const transcriptDTO = await this.transcriptGenerator.generate(videoId);

    // 3. 轉換為 Domain Entity
    const transcript = this.convertToEntity(transcriptDTO);

    // 4. 持久化
    await this.transcriptRepository.save(transcript);

    return transcript;
  }

  private convertToEntity(dto: TranscriptDTO): Transcript {
    const sections = dto.sections.map(sectionDTO =>
      this.convertSectionToEntity(sectionDTO)
    );

    return new Transcript(
      generateId(),
      dto.videoId,
      sections,
      dto.fullText
    );
  }

  private convertSectionToEntity(dto: SectionDTO): Section {
    const sentences = dto.sentences.map(sentenceDTO =>
      this.convertSentenceToEntity(sentenceDTO)
    );

    return new Section(
      dto.id,
      dto.title,
      sentences
    );
  }

  private convertSentenceToEntity(dto: SentenceDTO): Sentence {
    return new Sentence(
      dto.id,
      dto.text,
      new TimeRange(
        new TimeStamp(dto.startTime),
        new TimeStamp(dto.endTime)
      ),
      dto.isHighlight
    );
  }
}
```

**理由**:
1. **Use Case 負責協調**: 轉換是應用層職責，Use Case 是最適合的位置
2. **私有方法處理複雜性**: 巢狀結構轉換邏輯清晰，易於測試
3. **避免引入 Mapper 類別**: 本專案 DTO 結構簡單，無需額外抽象層
4. **DTO 保持純數據**: 不包含轉換邏輯，符合 DTO 定義

**替代方案**:
- **獨立 Mapper 類別**: 適用於複雜轉換，本專案過度設計（rejected）
- **Domain Entity 接受 DTO**: 違反依賴方向，Domain 不應知道 DTO（rejected）
- **DTO 包含 `toEntity()` 方法**: DTO 應保持純數據，避免邏輯（rejected）

**驗證邏輯位置**:
- **DTO 驗證**: 在 Use Case 的 `validateInput` 中進行（格式、必填欄位）
- **Domain 驗證**: 在 Entity 建構函式中進行（業務不變量，如時間範圍合法性）

---

## 3. 錯誤處理模式

### 研究問題

- 如何設計自定義錯誤類別？
- 應該使用 throw 還是 Result pattern？
- 如何處理錯誤訊息國際化？

### 決策: 自定義錯誤類別 + throw 機制

**選擇**: 定義領域特定錯誤類別，使用異常拋出機制

```typescript
// application/errors/ApplicationErrors.ts
export class ApplicationError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class VideoNotFoundError extends ApplicationError {
  constructor(videoId: string) {
    super(`Video not found: ${videoId}`, 'VIDEO_NOT_FOUND');
  }
}

export class HighlightNotFoundError extends ApplicationError {
  constructor(highlightId: string) {
    super(`Highlight not found: ${highlightId}`, 'HIGHLIGHT_NOT_FOUND');
  }
}

export class TranscriptNotFoundError extends ApplicationError {
  constructor(transcriptId: string) {
    super(`Transcript not found: ${transcriptId}`, 'TRANSCRIPT_NOT_FOUND');
  }
}

export class InvalidVideoFormatError extends ApplicationError {
  constructor(format: string) {
    super(`Invalid video format: ${format}. Allowed: mp4, mov, webm`, 'INVALID_VIDEO_FORMAT');
  }
}

export class VideoFileTooLargeError extends ApplicationError {
  constructor(size: number, maxSize: number) {
    super(
      `Video file too large: ${size} bytes. Maximum: ${maxSize} bytes`,
      'VIDEO_FILE_TOO_LARGE'
    );
  }
}

export class VideoMetadataExtractionError extends ApplicationError {
  constructor() {
    super('Failed to extract video metadata', 'VIDEO_METADATA_EXTRACTION_FAILED');
  }
}

export class TranscriptGenerationError extends ApplicationError {
  constructor(reason: string) {
    super(`Transcript generation failed: ${reason}`, 'TRANSCRIPT_GENERATION_FAILED');
  }
}

export class FileStorageError extends ApplicationError {
  constructor(reason: string) {
    super(`File storage operation failed: ${reason}`, 'FILE_STORAGE_FAILED');
  }
}
```

**使用範例**:

```typescript
// Use Case 中拋出錯誤
const video = await this.videoRepository.findById(videoId);
if (!video) {
  throw new VideoNotFoundError(videoId);
}

// Presentation Layer 統一捕獲
try {
  await uploadVideoUseCase.execute(file);
} catch (error) {
  if (error instanceof InvalidVideoFormatError) {
    showErrorNotification('請選擇 MP4、MOV 或 WebM 格式的視頻');
  } else if (error instanceof VideoFileTooLargeError) {
    showErrorNotification('視頻文件過大，請選擇小於 100MB 的文件');
  } else {
    showErrorNotification('上傳失敗，請稍後再試');
  }
}
```

**理由**:
1. **語義清晰**: 錯誤類別名稱直接表達錯誤含義
2. **易於處理**: Presentation Layer 可根據錯誤類型提供友好訊息
3. **錯誤碼支援**: `code` 屬性可用於日誌記錄和監控
4. **TypeScript 友好**: 類型檢查幫助確保錯誤處理完整性

**替代方案**:
- **Result pattern (`Result<T, E>`)**: 適用於函數式風格，TypeScript 生態系統更習慣異常（rejected）
- **錯誤碼字串**: 缺乏型別安全，易於拼寫錯誤（rejected）
- **通用 Error**: 無法區分錯誤類型，處理邏輯混亂（rejected）

**國際化考量**:
- 錯誤訊息使用英文（開發友好）
- 錯誤碼（`code`）用於查找本地化訊息
- Presentation Layer 負責顯示本地化訊息

```typescript
// 未來國際化範例
const errorMessages: Record<string, Record<string, string>> = {
  'zh-TW': {
    'VIDEO_NOT_FOUND': '找不到指定的視頻',
    'INVALID_VIDEO_FORMAT': '視頻格式不支援，請選擇 MP4、MOV 或 WebM',
  },
  'en-US': {
    'VIDEO_NOT_FOUND': 'Video not found',
    'INVALID_VIDEO_FORMAT': 'Invalid video format. Please select MP4, MOV, or WebM',
  },
};

function getLocalizedMessage(error: ApplicationError, locale: string): string {
  return errorMessages[locale]?.[error.code] || error.message;
}
```

---

## 4. Port 介面設計

### 研究問題

- Port 介面應該多粗還是多細？
- 應該使用 Promise 還是 Observable？
- 如何管理介面版本？

### 決策: 粗粒度介面 + Promise 異步

**選擇**: 定義業務導向的粗粒度介面，使用 Promise 處理異步操作

```typescript
// application/ports/ITranscriptGenerator.ts
export interface ITranscriptGenerator {
  /**
   * 生成視頻轉錄
   * @param videoId - 視頻 ID
   * @returns Promise<TranscriptDTO> - 轉錄數據
   * @throws TranscriptGenerationError - 當生成失敗時
   */
  generate(videoId: string): Promise<TranscriptDTO>;
}

// application/ports/IFileStorage.ts
export interface IFileStorage {
  /**
   * 儲存文件並返回可訪問的 URL
   * @param file - 要儲存的文件
   * @returns Promise<string> - 文件 URL
   * @throws FileStorageError - 當儲存失敗時
   */
  save(file: File): Promise<string>;

  /**
   * 刪除文件
   * @param url - 文件 URL
   * @returns Promise<void>
   * @throws FileStorageError - 當刪除失敗時
   */
  delete(url: string): Promise<void>;
}

// application/ports/IVideoProcessor.ts (未來可能需要)
export interface IVideoProcessor {
  /**
   * 提取視頻元數據
   * @param file - 視頻文件
   * @returns Promise<VideoMetadata>
   * @throws VideoMetadataExtractionError
   */
  extractMetadata(file: File): Promise<VideoMetadata>;
}
```

**理由**:
1. **粗粒度**: 每個方法代表一個完整的業務操作，減少介面數量
2. **Promise**: TypeScript 生態系統標準，易於使用和測試
3. **註釋完整**: JSDoc 提供清晰的契約定義
4. **錯誤明確**: 明確標註可能拋出的錯誤類型

**替代方案**:
- **細粒度介面**: 如 `ITranscriptGenerator` 拆分為 `ITranscriptFetcher`, `ITranscriptParser`，過度設計（rejected）
- **Observable**: 適用於流式數據，本專案無需（rejected）
- **Callback**: 過時模式，Promise 更清晰（rejected）

**介面版本管理**:
- 目前無版本管理需求（單一實作）
- 若未來需要多版本，採用以下策略：
  ```typescript
  // 方案 1: 介面繼承
  export interface ITranscriptGeneratorV2 extends ITranscriptGenerator {
    generateWithOptions(videoId: string, options: GenerateOptions): Promise<TranscriptDTO>;
  }

  // 方案 2: 新介面
  export interface IAdvancedTranscriptGenerator {
    // 全新方法簽名
  }
  ```

**擴展性考量**:
```typescript
// 未來可能需要進度回報
export interface ITranscriptGenerator {
  generate(
    videoId: string,
    onProgress?: (progress: number) => void
  ): Promise<TranscriptDTO>;
}

// 未來可能需要取消操作
export interface ITranscriptGenerator {
  generate(
    videoId: string,
    signal?: AbortSignal
  ): Promise<TranscriptDTO>;
}
```

---

## 5. 測試策略

### 研究問題

- 如何測試 Use Cases？
- Mock 應該如何設計？
- 測試應該覆蓋哪些場景？

### 決策: 單元測試 + Mock Dependencies

**選擇**: 使用 Vitest + 手動 Mock 進行單元測試

```typescript
// tests/unit/application/use-cases/UploadVideoUseCase.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UploadVideoUseCase } from '@/application/use-cases/UploadVideoUseCase';
import { IVideoRepository } from '@/domain/repositories/IVideoRepository';
import { IFileStorage } from '@/application/ports/IFileStorage';
import { InvalidVideoFormatError, VideoFileTooLargeError } from '@/application/errors';

describe('UploadVideoUseCase', () => {
  let useCase: UploadVideoUseCase;
  let mockVideoRepository: IVideoRepository;
  let mockFileStorage: IFileStorage;

  beforeEach(() => {
    // 建立 Mock
    mockVideoRepository = {
      save: vi.fn(),
      findById: vi.fn(),
    };

    mockFileStorage = {
      save: vi.fn().mockResolvedValue('http://example.com/video.mp4'),
      delete: vi.fn(),
    };

    // 注入 Mock
    useCase = new UploadVideoUseCase(mockVideoRepository, mockFileStorage);
  });

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

  it('當文件儲存失敗時應該拋出錯誤', async () => {
    // Arrange
    const file = new File(['video content'], 'test.mp4', { type: 'video/mp4' });
    Object.defineProperty(file, 'size', { value: 50 * 1024 * 1024 });
    mockFileStorage.save = vi.fn().mockRejectedValue(new Error('Storage failed'));

    // Act & Assert
    await expect(useCase.execute(file)).rejects.toThrow();
  });
});
```

**測試覆蓋場景**:
1. **Happy Path**: 正常流程成功執行
2. **輸入驗證**: 各種無效輸入（格式、大小）
3. **依賴失敗**: Mock 依賴拋出錯誤
4. **業務規則**: 特定業務邏輯（如重複性檢查）

**理由**:
1. **單元測試隔離**: Mock 所有依賴，確保測試獨立
2. **快速執行**: 無真實 I/O，測試秒級完成
3. **易於維護**: 測試結構清晰，易於理解和修改

---

## 6. 依賴注入配置

### 研究問題

- 如何管理依賴注入？
- 應該使用 DI 容器還是手動注入？

### 決策: 使用 Vue 的 provide/inject

**選擇**: 利用 Vue 3 的 provide/inject 機制

```typescript
// di-container.ts
import { InjectionKey } from 'vue';
import { IVideoRepository } from '@/domain/repositories/IVideoRepository';
import { ITranscriptRepository } from '@/domain/repositories/ITranscriptRepository';
import { IHighlightRepository } from '@/domain/repositories/IHighlightRepository';
import { ITranscriptGenerator } from '@/application/ports/ITranscriptGenerator';
import { IFileStorage } from '@/application/ports/IFileStorage';

// Injection Keys
export const VideoRepositoryKey: InjectionKey<IVideoRepository> = Symbol('VideoRepository');
export const TranscriptRepositoryKey: InjectionKey<ITranscriptRepository> = Symbol('TranscriptRepository');
export const HighlightRepositoryKey: InjectionKey<IHighlightRepository> = Symbol('HighlightRepository');
export const TranscriptGeneratorKey: InjectionKey<ITranscriptGenerator> = Symbol('TranscriptGenerator');
export const FileStorageKey: InjectionKey<IFileStorage> = Symbol('FileStorage');

// Setup function
export function setupDependencies(app: App) {
  // Infrastructure Layer 實作
  const videoRepository = new VideoRepositoryImpl();
  const transcriptRepository = new TranscriptRepositoryImpl();
  const highlightRepository = new HighlightRepositoryImpl();
  const transcriptGenerator = new MockAIService();
  const fileStorage = new FileStorageService();

  // Provide
  app.provide(VideoRepositoryKey, videoRepository);
  app.provide(TranscriptRepositoryKey, transcriptRepository);
  app.provide(HighlightRepositoryKey, highlightRepository);
  app.provide(TranscriptGeneratorKey, transcriptGenerator);
  app.provide(FileStorageKey, fileStorage);
}

// Usage in Pinia Store
export const useVideoStore = defineStore('video', () => {
  const videoRepository = inject(VideoRepositoryKey);
  const fileStorage = inject(FileStorageKey);

  if (!videoRepository || !fileStorage) {
    throw new Error('Dependencies not provided');
  }

  const uploadVideoUseCase = new UploadVideoUseCase(videoRepository, fileStorage);

  async function uploadVideo(file: File) {
    const video = await uploadVideoUseCase.execute(file);
    // Update store state
  }

  return { uploadVideo };
});
```

**理由**:
1. **Vue 原生支援**: 無需額外 DI 庫
2. **型別安全**: InjectionKey 提供型別檢查
3. **易於測試**: 可在測試中 provide mock 實作

---

## Summary

所有研究主題均已完成決策，無遺留的 NEEDS CLARIFICATION 項目。主要決策如下：

| 主題 | 決策 | 理由 |
|------|------|------|
| Use Case 模式 | 建構函式注入 + execute 方法 | 清晰、易測試、符合 DDD |
| DTO 轉換 | Use Case 內轉換 + 私有輔助函數 | 避免過度抽象，結構簡單 |
| 錯誤處理 | 自定義錯誤類別 + throw | 語義清晰、易於處理 |
| Port 介面 | 粗粒度 + Promise | 業務導向、TypeScript 友好 |
| 測試策略 | Vitest + Mock | 快速、獨立、易維護 |
| 依賴注入 | Vue provide/inject | 原生支援、型別安全 |

所有設計均符合 Clean Architecture 和 DDD 原則，可進入 Phase 1 設計階段。
