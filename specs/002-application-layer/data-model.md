# Data Model: Application Layer

**Feature**: Application Layer Development
**Date**: 2025-10-29

## Overview

本文件定義 Application Layer 的所有數據結構，包含 DTOs（Data Transfer Objects）、Ports（輸入/輸出埠）和 Use Cases。Application Layer 負責協調 Domain Layer 的業務邏輯，透過 DTOs 進行跨層數據傳輸，透過 Ports 與 Infrastructure Layer 解耦。

---

## 1. Data Transfer Objects (DTOs)

DTOs 用於在 Application Layer 和 Infrastructure/Presentation Layer 之間傳輸數據，不包含業務邏輯。

### 1.1 VideoDTO

**用途**: 傳輸視頻元數據

```typescript
export interface VideoDTO {
  /** 視頻時長（秒） */
  duration: number;

  /** 視頻寬度（像素） */
  width: number;

  /** 視頻高度（像素） */
  height: number;

  /** 視頻格式（MIME type） */
  format: string;
}
```

**範例**:
```typescript
{
  duration: 180.5,
  width: 1920,
  height: 1080,
  format: 'video/mp4'
}
```

**驗證規則**:
- `duration` 必須 > 0
- `width` 和 `height` 必須 > 0
- `format` 必須為支援的 MIME type

---

### 1.2 TranscriptDTO

**用途**: 傳輸視頻轉錄數據，包含巢狀的段落和句子結構

```typescript
export interface TranscriptDTO {
  /** 關聯的視頻 ID */
  videoId: string;

  /** 完整轉錄文字 */
  fullText: string;

  /** 段落列表 */
  sections: SectionDTO[];
}

export interface SectionDTO {
  /** 段落 ID */
  id: string;

  /** 段落標題 */
  title: string;

  /** 句子列表 */
  sentences: SentenceDTO[];
}

export interface SentenceDTO {
  /** 句子 ID */
  id: string;

  /** 句子文字 */
  text: string;

  /** 起始時間（秒） */
  startTime: number;

  /** 結束時間（秒） */
  endTime: number;

  /** 是否為 AI 建議的高光句子 */
  isHighlight: boolean;
}
```

**範例**:
```typescript
{
  videoId: 'video_001',
  fullText: '大家好，今天要和大家分享前端架構設計的經驗...',
  sections: [
    {
      id: 'sec_1',
      title: '開場介紹',
      sentences: [
        {
          id: 'sent_1',
          text: '大家好，今天要和大家分享前端架構設計的經驗。',
          startTime: 0.0,
          endTime: 4.5,
          isHighlight: true
        },
        {
          id: 'sent_2',
          text: '我們會討論 Clean Architecture 在前端的應用。',
          startTime: 4.5,
          endTime: 8.0,
          isHighlight: true
        }
      ]
    },
    {
      id: 'sec_2',
      title: 'Clean Architecture 介紹',
      sentences: [
        {
          id: 'sent_3',
          text: 'Clean Architecture 是由 Robert Martin 提出的軟體架構模式。',
          startTime: 8.0,
          endTime: 13.5,
          isHighlight: false
        }
      ]
    }
  ]
}
```

**驗證規則**:
- `videoId` 不可為空
- `sections` 不可為空陣列
- 每個 `SentenceDTO` 的 `endTime` 必須 > `startTime`
- 句子的時間範圍不可重疊（同一 Section 內）

---

## 2. Ports（輸入/輸出埠）

Ports 定義 Application Layer 與外部系統的介面，由 Infrastructure Layer 實作。

### 2.1 ITranscriptGenerator

**用途**: 生成視頻轉錄（由 AI 服務實作）

```typescript
export interface ITranscriptGenerator {
  /**
   * 生成視頻轉錄
   * @param videoId - 視頻 ID
   * @returns Promise<TranscriptDTO> - 轉錄數據
   * @throws TranscriptGenerationError - 當生成失敗時
   */
  generate(videoId: string): Promise<TranscriptDTO>;
}
```

**職責**:
- 接受視頻 ID，調用 AI 服務生成轉錄
- 返回結構化的 TranscriptDTO
- 處理 AI 服務錯誤並拋出領域錯誤

**實作範例** (Infrastructure Layer):
```typescript
// infrastructure/api/MockAIService.ts
export class MockAIService implements ITranscriptGenerator {
  async generate(videoId: string): Promise<TranscriptDTO> {
    // 模擬 1.5 秒處理延遲
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 返回 Mock 數據
    return mockTranscriptData;
  }
}
```

---

### 2.2 IFileStorage

**用途**: 儲存和管理視頻文件

```typescript
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
```

**職責**:
- `save`: 儲存文件並返回可用於播放的 URL
- `delete`: 清理文件資源

**實作範例** (Infrastructure Layer):
```typescript
// infrastructure/storage/FileStorageService.ts
export class FileStorageService implements IFileStorage {
  async save(file: File): Promise<string> {
    // 使用 URL.createObjectURL 建立本地 URL
    return URL.createObjectURL(file);
  }

  async delete(url: string): Promise<void> {
    URL.revokeObjectURL(url);
  }
}
```

---

### 2.3 IVideoProcessor

**用途**: 視頻處理操作（如元數據提取）

```typescript
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

**職責**:
- `extractMetadata`: 從視頻文件中提取元數據（時長、尺寸、格式）

**實作範例** (Infrastructure Layer):
```typescript
// infrastructure/video/VideoProcessorService.ts
export class VideoProcessorService implements IVideoProcessor {
  async extractMetadata(file: File): Promise<VideoMetadata> {
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

**使用場景**:
- 在 `UploadVideoUseCase` 中使用，用於上傳視頻時提取元數據

---

## 3. Use Cases

Use Cases 代表完整的用戶操作流程，協調 Domain Layer 和 Infrastructure Layer。

### 3.1 UploadVideoUseCase

**職責**: 處理視頻上傳，驗證文件，提取元數據，儲存視頻

**輸入**:
```typescript
execute(file: File): Promise<Video>
```

**輸出**:
- 成功: 返回建立的 `Video` Entity
- 失敗: 拋出錯誤

**依賴**:
- `IVideoRepository` (Domain Layer)
- `IFileStorage` (Application Port)

**流程**:
1. 驗證視頻格式（僅允許 mp4, mov, webm）
2. 驗證視頻大小（最大 100MB）
3. 透過 `IFileStorage.save()` 儲存文件，獲取 URL
4. 提取視頻元數據（時長、尺寸）
5. 建立 `Video` Entity
6. 透過 `IVideoRepository.save()` 持久化
7. 返回 `Video`

**錯誤處理**:
- `InvalidVideoFormatError`: 格式不支援
- `VideoFileTooLargeError`: 文件過大
- `VideoMetadataExtractionError`: 元數據提取失敗
- `FileStorageError`: 儲存失敗

**範例**:
```typescript
const uploadVideoUseCase = new UploadVideoUseCase(videoRepository, fileStorage);
const video = await uploadVideoUseCase.execute(file);
console.log(`Video uploaded: ${video.id}`);
```

---

### 3.2 ProcessTranscriptUseCase

**職責**: 處理視頻轉錄，調用 AI 服務，轉換 DTO 為 Domain Entity

**輸入**:
```typescript
execute(videoId: string): Promise<Transcript>
```

**輸出**:
- 成功: 返回建立的 `Transcript` Entity
- 失敗: 拋出錯誤

**依賴**:
- `ITranscriptGenerator` (Application Port)
- `ITranscriptRepository` (Domain Layer)
- `IVideoRepository` (Domain Layer, 用於驗證視頻存在性)

**流程**:
1. 透過 `IVideoRepository.findById()` 驗證視頻存在
2. 透過 `ITranscriptGenerator.generate()` 生成轉錄 DTO
3. 將 `TranscriptDTO` 轉換為 `Transcript` Entity（包含 Section 和 Sentence）
4. 透過 `ITranscriptRepository.save()` 持久化
5. 返回 `Transcript`

**DTO → Entity 轉換邏輯**:
```typescript
private convertToEntity(dto: TranscriptDTO): Transcript {
  const sections = dto.sections.map(sectionDTO => {
    const sentences = sectionDTO.sentences.map(sentenceDTO =>
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

    return new Section(sectionDTO.id, sectionDTO.title, sentences);
  });

  return new Transcript(
    generateId(),
    dto.videoId,
    sections,
    dto.fullText
  );
}
```

**錯誤處理**:
- `VideoNotFoundError`: 視頻不存在
- `TranscriptGenerationError`: AI 服務失敗

**範例**:
```typescript
const processTranscriptUseCase = new ProcessTranscriptUseCase(
  transcriptGenerator,
  transcriptRepository,
  videoRepository
);
const transcript = await processTranscriptUseCase.execute('video_001');
console.log(`Transcript created: ${transcript.id}`);
```

---

### 3.3 CreateHighlightUseCase

**職責**: 建立新的高光版本，驗證視頻存在性

**輸入**:
```typescript
execute(input: CreateHighlightInput): Promise<Highlight>

interface CreateHighlightInput {
  videoId: string;
  name: string;
}
```

**輸出**:
- 成功: 返回建立的 `Highlight` Entity（初始狀態：無選中句子）
- 失敗: 拋出錯誤

**依賴**:
- `IHighlightRepository` (Domain Layer)
- `IVideoRepository` (Domain Layer, 用於驗證視頻存在性)

**流程**:
1. 透過 `IVideoRepository.findById()` 驗證視頻存在
2. 驗證高光名稱不為空
3. 建立 `Highlight` Entity（初始 `selectedSentenceIds` 為空）
4. 透過 `IHighlightRepository.save()` 持久化
5. 返回 `Highlight`

**錯誤處理**:
- `VideoNotFoundError`: 視頻不存在
- `InvalidHighlightNameError`: 名稱為空

**範例**:
```typescript
const createHighlightUseCase = new CreateHighlightUseCase(
  highlightRepository,
  videoRepository
);
const highlight = await createHighlightUseCase.execute({
  videoId: 'video_001',
  name: '精華版'
});
console.log(`Highlight created: ${highlight.id}`);
```

---

### 3.4 ToggleSentenceInHighlightUseCase

**職責**: 切換句子在高光中的選中狀態

**輸入**:
```typescript
execute(input: ToggleSentenceInput): Promise<void>

interface ToggleSentenceInput {
  highlightId: string;
  sentenceId: string;
}
```

**輸出**:
- 成功: `void`（狀態已更新並持久化）
- 失敗: 拋出錯誤

**依賴**:
- `IHighlightRepository` (Domain Layer)

**流程**:
1. 透過 `IHighlightRepository.findById()` 獲取 Highlight
2. 調用 `highlight.toggleSentence(sentenceId)` 切換狀態
3. 透過 `IHighlightRepository.save()` 持久化變更

**錯誤處理**:
- `HighlightNotFoundError`: 高光不存在

**範例**:
```typescript
const toggleSentenceUseCase = new ToggleSentenceInHighlightUseCase(highlightRepository);
await toggleSentenceUseCase.execute({
  highlightId: 'highlight_001',
  sentenceId: 'sent_1'
});
console.log('Sentence toggled');
```

---

### 3.5 GenerateHighlightUseCase

**職責**: 生成高光預覽數據，協調 Highlight 和 Transcript 兩個聚合

**輸入**:
```typescript
execute(input: GenerateHighlightInput): Promise<GenerateHighlightOutput>

interface GenerateHighlightInput {
  highlightId: string;
  sortBy: 'selection' | 'time';
}
```

**輸出**:
```typescript
interface GenerateHighlightOutput {
  /** 選中的句子列表（已排序） */
  sentences: Sentence[];

  /** 時間範圍列表 */
  timeRanges: TimeRange[];

  /** 總時長（秒） */
  totalDuration: number;
}
```

**依賴**:
- `IHighlightRepository` (Domain Layer)
- `ITranscriptRepository` (Domain Layer)

**流程**:
1. 透過 `IHighlightRepository.findById()` 獲取 Highlight
2. 透過 `ITranscriptRepository.findByVideoId()` 獲取對應的 Transcript
3. 調用 `highlight.getSelectedSentences(transcript, sortBy)` 獲取選中的句子
4. 計算時間範圍和總時長
5. 返回結果

**排序邏輯**:
- `sortBy: 'selection'`: 按用戶選擇順序排序（`selectionOrder`）
- `sortBy: 'time'`: 按句子時間順序排序（`startTime`）

**錯誤處理**:
- `HighlightNotFoundError`: 高光不存在
- `TranscriptNotFoundError`: 轉錄不存在

**範例**:
```typescript
const generateHighlightUseCase = new GenerateHighlightUseCase(
  highlightRepository,
  transcriptRepository
);
const result = await generateHighlightUseCase.execute({
  highlightId: 'highlight_001',
  sortBy: 'time'
});
console.log(`Total duration: ${result.totalDuration}s`);
console.log(`Selected ${result.sentences.length} sentences`);
```

---

## 4. Error Definitions

Application Layer 定義的錯誤類別：

```typescript
export class ApplicationError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

// Video related errors
export class VideoNotFoundError extends ApplicationError {
  constructor(videoId: string) {
    super(`Video not found: ${videoId}`, 'VIDEO_NOT_FOUND');
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

// Transcript related errors
export class TranscriptNotFoundError extends ApplicationError {
  constructor(transcriptId: string) {
    super(`Transcript not found: ${transcriptId}`, 'TRANSCRIPT_NOT_FOUND');
  }
}

export class TranscriptGenerationError extends ApplicationError {
  constructor(reason: string) {
    super(`Transcript generation failed: ${reason}`, 'TRANSCRIPT_GENERATION_FAILED');
  }
}

// Highlight related errors
export class HighlightNotFoundError extends ApplicationError {
  constructor(highlightId: string) {
    super(`Highlight not found: ${highlightId}`, 'HIGHLIGHT_NOT_FOUND');
  }
}

export class InvalidHighlightNameError extends ApplicationError {
  constructor() {
    super('Highlight name cannot be empty', 'INVALID_HIGHLIGHT_NAME');
  }
}

// File storage errors
export class FileStorageError extends ApplicationError {
  constructor(reason: string) {
    super(`File storage operation failed: ${reason}`, 'FILE_STORAGE_FAILED');
  }
}
```

---

## 5. Data Flow Diagram

```
┌──────────────┐
│ Presentation │
│    Layer     │
└──────┬───────┘
       │ (呼叫 Use Case)
       ▼
┌──────────────────────────────────────┐
│       Application Layer              │
│                                      │
│  ┌────────────┐    ┌─────────────┐  │
│  │ Use Cases  │───▶│    Ports    │  │
│  └─────┬──────┘    └──────┬──────┘  │
│        │                  │         │
│        │ (使用)           │ (定義)  │
│        ▼                  ▼         │
│  ┌────────────┐    ┌─────────────┐  │
│  │   DTOs     │    │ IFileStorage│  │
│  └────────────┘    │ITranscript  │  │
│                    │Generator    │  │
│                    └─────────────┘  │
└──────────┬───────────────────────────┘
           │ (依賴)
           ▼
┌──────────────────────────────────────┐
│         Domain Layer                 │
│                                      │
│  ┌────────────┐    ┌─────────────┐  │
│  │ Entities   │    │Repositories │  │
│  │ - Video    │    │ Interfaces  │  │
│  │ - Transcript│   │             │  │
│  │ - Highlight│    │             │  │
│  └────────────┘    └─────────────┘  │
└──────────────────────────────────────┘
           ▲
           │ (實作)
┌──────────┴───────────────────────────┐
│      Infrastructure Layer            │
│                                      │
│  ┌─────────────────────────────────┐ │
│  │ Repository Implementations      │ │
│  │ - VideoRepositoryImpl           │ │
│  │ - TranscriptRepositoryImpl      │ │
│  │ - HighlightRepositoryImpl       │ │
│  └─────────────────────────────────┘ │
│                                      │
│  ┌─────────────────────────────────┐ │
│  │ Port Implementations            │ │
│  │ - MockAIService                 │ │
│  │ - FileStorageService            │ │
│  │ - VideoProcessorService         │ │
│  └─────────────────────────────────┘ │
└──────────────────────────────────────┘
```

---

## 6. Summary

Application Layer 定義了：

- **2 個 DTOs**: `VideoDTO`, `TranscriptDTO`（含巢狀結構）
- **3 個 Ports**: `ITranscriptGenerator`, `IFileStorage`, `IVideoProcessor`
- **5 個 Use Cases**: 涵蓋視頻上傳、轉錄處理、高光管理的完整流程
- **9 個錯誤類別**: 提供清晰的錯誤語義

所有設計均符合 Clean Architecture 原則，Application Layer 僅依賴 Domain Layer，透過 Ports 與 Infrastructure Layer 解耦。
