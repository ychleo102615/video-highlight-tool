# Data Model: Domain Layer

**Feature**: Domain Layer - 核心業務實體與值物件
**Date**: 2025-10-29
**Version**: 1.0

## Overview

本文件定義 Domain Layer 的所有實體、值物件和它們之間的關係。所有定義均遵循 Clean Architecture 和 DDD 原則。

## Entity Relationship Diagram

```
┌─────────────────────┐
│      Video          │ (Aggregate Root)
│  (聚合根)            │
├─────────────────────┤
│ - id: string        │
│ - file: File        │
│ - metadata: VM      │◄────┐
│ - url?: string      │     │
└─────────────────────┘     │
         △                  │
         │                  │
         │ videoId          │
         │                  │
┌─────────────────────┐     │
│   Transcript        │ (Aggregate Root)
│  (聚合根)            │     │
├─────────────────────┤     │
│ - id: string        │     │
│ - videoId: string   ├─────┘
│ - sections: Sect[]  │
│ - fullText: string  │
└─────────────────────┘
         │
         │ contains
         │
         ▼
┌─────────────────────┐
│      Section        │ (Entity, 屬於 Transcript 聚合)
├─────────────────────┤
│ - id: string        │
│ - title: string     │
│ - sentences: Sent[] │
└─────────────────────┘
         │
         │ contains
         │
         ▼
┌─────────────────────┐
│     Sentence        │ (Entity, 屬於 Transcript 聚合)
├─────────────────────┤
│ - id: string        │
│ - text: string      │
│ - timeRange: TR     │
│ - isHighlight: bool │
└─────────────────────┘
         △
         │
         │ 通過 ID 引用
         │
┌─────────────────────┐
│    Highlight        │ (Aggregate Root)
│  (聚合根)            │
├─────────────────────┤
│ - id: string        │
│ - videoId: string   ├─────┐
│ - name: string      │     │
│ - sentenceIds: Set  │     │
│ - selectionOrder[]  │     │
└─────────────────────┘     │
                            │
                            │ videoId
                            │
                            └──────► (關聯到 Video)

Legend:
- VM = VideoMetadata (Value Object)
- Sect = Section
- Sent = Sentence
- TR = TimeRange (Value Object)
```

## Aggregates

### 1. Video Aggregate

**Aggregate Root**: `Video`

**聚合邊界**: 僅包含 Video 本身（單一實體聚合）

**職責**:
- 管理視頻文件的生命週期
- 提供視頻元數據查詢
- 驗證視頻狀態（是否準備好播放）

**屬性**:

| 屬性 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `id` | `string` | ✅ | 視頻唯一識別碼（UUID） |
| `file` | `File` | ✅ | 視頻文件（瀏覽器原生 File 型別） |
| `metadata` | `VideoMetadata` | ✅ | 視頻元數據（值物件） |
| `url` | `string \| undefined` | ❌ | 視頻 URL（載入後生成） |

**方法**:

| 方法 | 返回型別 | 說明 |
|------|----------|------|
| `get duration()` | `number` | 獲取視頻時長（秒數），從 metadata 提取 |
| `get isReady()` | `boolean` | 檢查視頻是否已準備好播放（url 是否存在） |

**業務規則**:
- Video 的 ID 由外部生成（UUID）
- 視頻文件必須存在
- url 為 optional，載入後才會有值
- isReady = true 當且僅當 url 不為 undefined

**TypeScript 定義**:
```typescript
export class Video {
  constructor(
    public readonly id: string,
    public readonly file: File,
    public readonly metadata: VideoMetadata,
    public url?: string
  ) {}

  get duration(): number {
    return this.metadata.duration;
  }

  get isReady(): boolean {
    return this.url !== undefined;
  }
}
```

---

### 2. Transcript Aggregate

**Aggregate Root**: `Transcript`

**聚合邊界**:
```
Transcript (Root)
  └─ Section[] (Entity)
      └─ Sentence[] (Entity)
```

**職責**:
- 提供視頻轉錄內容的查詢
- 管理 Section 和 Sentence 的組織結構
- 確保轉錄數據的完整性和唯讀性

**Transcript Entity**:

| 屬性 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `id` | `string` | ✅ | 轉錄唯一識別碼 |
| `videoId` | `string` | ✅ | 關聯的視頻 ID |
| `sections` | `ReadonlyArray<Section>` | ✅ | 段落列表（唯讀） |
| `fullText` | `string` | ✅ | 完整轉錄文字 |

**方法**:

| 方法 | 返回型別 | 說明 |
|------|----------|------|
| `getSentenceById(id: string)` | `Sentence \| undefined` | 根據 ID 查找句子 |
| `getAllSentences()` | `Sentence[]` | 獲取所有句子（扁平化） |
| `getSectionById(id: string)` | `Section \| undefined` | 根據 ID 查找段落 |

**業務規則**:
- Transcript 生成後內容不可變（唯讀）
- sections 和 sentences 以 `readonly` 形式對外暴露
- 對外提供唯讀訪問，不提供修改方法

**TypeScript 定義**:
```typescript
export class Transcript {
  constructor(
    public readonly id: string,
    public readonly videoId: string,
    public readonly sections: ReadonlyArray<Section>,
    public readonly fullText: string
  ) {}

  getSentenceById(sentenceId: string): Sentence | undefined {
    for (const section of this.sections) {
      const sentence = section.sentences.find(s => s.id === sentenceId);
      if (sentence) return sentence;
    }
    return undefined;
  }

  getAllSentences(): Sentence[] {
    return this.sections.flatMap(section => [...section.sentences]);
  }

  getSectionById(sectionId: string): Section | undefined {
    return this.sections.find(s => s.id === sectionId);
  }
}
```

---

**Section Entity** (屬於 Transcript 聚合):

| 屬性 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `id` | `string` | ✅ | 段落唯一識別碼 |
| `title` | `string` | ✅ | 段落標題 |
| `sentences` | `ReadonlyArray<Sentence>` | ✅ | 句子列表（唯讀） |

**方法**:

| 方法 | 返回型別 | 說明 |
|------|----------|------|
| `get timeRange()` | `TimeRange` | 計算段落的時間範圍（從第一個到最後一個句子） |

**業務規則**:
- Section 不可獨立存在，必須屬於 Transcript
- 生命週期由 Transcript 管理
- timeRange 從第一個句子的 start 到最後一個句子的 end

**TypeScript 定義**:
```typescript
export class Section {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly sentences: ReadonlyArray<Sentence>
  ) {
    if (sentences.length === 0) {
      throw new Error('Section must contain at least one sentence');
    }
  }

  get timeRange(): TimeRange {
    const first = this.sentences[0];
    const last = this.sentences[this.sentences.length - 1];
    return new TimeRange(first.timeRange.start, last.timeRange.end);
  }
}
```

---

**Sentence Entity** (屬於 Transcript 聚合):

| 屬性 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `id` | `string` | ✅ | 句子唯一識別碼 |
| `text` | `string` | ✅ | 句子文字 |
| `timeRange` | `TimeRange` | ✅ | 時間範圍（值物件） |
| `isHighlightSuggestion` | `boolean` | ✅ | 是否為 AI 建議的高光句子 |

**業務規則**:
- Sentence 不可獨立存在，必須屬於 Section
- 不包含 `isSelected` 狀態（由 Highlight 聚合管理）
- 不提供 `select()` / `deselect()` 方法（違反聚合原則）

**TypeScript 定義**:
```typescript
export class Sentence {
  constructor(
    public readonly id: string,
    public readonly text: string,
    public readonly timeRange: TimeRange,
    public readonly isHighlightSuggestion: boolean
  ) {}
}
```

---

### 3. Highlight Aggregate

**Aggregate Root**: `Highlight`

**聚合邊界**: 僅包含 Highlight 本身（單一實體聚合）

**職責**:
- 管理「哪些 Sentence 被選中」的關係
- 記錄選擇順序（`selectionOrder`）
- 提供選中句子 ID 的查詢介面

**屬性**:

| 屬性 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `id` | `string` | ✅ | 高光唯一識別碼 |
| `videoId` | `string` | ✅ | 關聯的視頻 ID |
| `name` | `string` | ✅ | 高光名稱（例如：「精華版」、「完整版」） |
| `selectedSentenceIds` | `Set<string>` | ✅ (private) | 選中的句子 ID 集合 |
| `selectionOrder` | `string[]` | ✅ (private) | 選擇順序記錄 |

**選擇管理方法**:

| 方法 | 返回型別 | 說明 |
|------|----------|------|
| `addSentence(sentenceId: string)` | `void` | 添加句子到選擇（自動去重） |
| `removeSentence(sentenceId: string)` | `void` | 從選擇中移除句子 |
| `toggleSentence(sentenceId: string)` | `void` | 切換句子選中狀態 |
| `isSelected(sentenceId: string)` | `boolean` | 檢查句子是否被選中 |
| `getSelectedSentenceIds()` | `ReadonlyArray<string>` | 獲取所有選中的句子 ID（按選擇順序） |
| `getSelectedSentenceCount()` | `number` | 獲取選中句子的數量 |

**業務規則**:
- 一個 Video 可以有多個 Highlight（不同版本）
- 每個 Highlight 有獨立的名稱（`name`）
- Highlight 的選擇可以隨時修改（add/remove）
- Highlight 必須關聯到有效的 Video
- 重複添加同一個句子時自動忽略，不重複記錄在 selectionOrder

**TypeScript 定義**:
```typescript
export class Highlight {
  private selectedSentenceIds = new Set<string>();
  private selectionOrder: string[] = [];

  constructor(
    public readonly id: string,
    public readonly videoId: string,
    public readonly name: string
  ) {}

  addSentence(sentenceId: string): void {
    if (!this.selectedSentenceIds.has(sentenceId)) {
      this.selectedSentenceIds.add(sentenceId);
      this.selectionOrder.push(sentenceId);
    }
  }

  removeSentence(sentenceId: string): void {
    if (this.selectedSentenceIds.has(sentenceId)) {
      this.selectedSentenceIds.delete(sentenceId);
      this.selectionOrder = this.selectionOrder.filter(id => id !== sentenceId);
    }
  }

  toggleSentence(sentenceId: string): void {
    if (this.isSelected(sentenceId)) {
      this.removeSentence(sentenceId);
    } else {
      this.addSentence(sentenceId);
    }
  }

  isSelected(sentenceId: string): boolean {
    return this.selectedSentenceIds.has(sentenceId);
  }

  getSelectedSentenceIds(): ReadonlyArray<string> {
    return [...this.selectionOrder];
  }

  getSelectedSentenceCount(): number {
    return this.selectedSentenceIds.size;
  }
}
```

---

## Domain Services

### HighlightService

**職責**: 協調 Highlight 和 Transcript 聚合之間的互動，處理跨聚合的查詢邏輯

**為何需要 Domain Service？**
- 當兩個 Aggregate 需要協作時，不應該在一個 Aggregate 的方法中傳入另一個 Aggregate 作為參數
- Domain Service 是無狀態的，專門處理跨聚合的業務邏輯
- 保持 Aggregate 的獨立性和邊界清晰

**方法**:

| 方法 | 返回型別 | 說明 |
|------|----------|------|
| `getSelectedSentences(highlight, transcript, sortBy)` | `Sentence[]` | 獲取 Highlight 中選中的句子 |
| `getTimeRanges(highlight, transcript, sortBy)` | `TimeRange[]` | 獲取選中句子的時間範圍 |
| `getTotalDuration(highlight, transcript)` | `number` | 計算選中句子的總時長 |

**TypeScript 定義**:
```typescript
export class HighlightService {
  /**
   * 獲取 Highlight 中選中的句子
   * @param highlight - Highlight 聚合
   * @param transcript - Transcript 聚合
   * @param sortBy - 排序方式：'selection'（選擇順序）或 'time'（時間順序）
   * @returns 選中的句子陣列
   */
  getSelectedSentences(
    highlight: Highlight,
    transcript: Transcript,
    sortBy: 'selection' | 'time'
  ): Sentence[] {
    const sentenceIds = highlight.getSelectedSentenceIds();
    const sentences = sentenceIds
      .map(id => transcript.getSentenceById(id))
      .filter((s): s is Sentence => s !== undefined);

    if (sortBy === 'time') {
      // 按時間順序排序
      return sentences.sort((a, b) =>
        a.timeRange.start.milliseconds - b.timeRange.start.milliseconds
      );
    }

    // 保持選擇順序（sentenceIds 已經是按選擇順序排列）
    return sentences;
  }

  /**
   * 獲取選中句子的時間範圍
   * @param highlight - Highlight 聚合
   * @param transcript - Transcript 聚合
   * @param sortBy - 排序方式
   * @returns TimeRange 陣列
   */
  getTimeRanges(
    highlight: Highlight,
    transcript: Transcript,
    sortBy: 'selection' | 'time'
  ): TimeRange[] {
    return this.getSelectedSentences(highlight, transcript, sortBy)
      .map(s => s.timeRange);
  }

  /**
   * 計算選中句子的總時長
   * @param highlight - Highlight 聚合
   * @param transcript - Transcript 聚合
   * @returns 總時長（毫秒）
   */
  getTotalDuration(
    highlight: Highlight,
    transcript: Transcript
  ): number {
    return this.getSelectedSentences(highlight, transcript, 'time')
      .reduce((total, s) => total + s.timeRange.duration, 0);
  }
}
```

**設計說明**:
- HighlightService 是無狀態的，所有方法都是純函數
- 不持有任何 Aggregate 的引用，通過參數傳入
- 符合 DDD 的 Domain Service 模式：當業務邏輯不自然地屬於任何一個 Aggregate 時，使用 Domain Service

---

## Value Objects

### 1. TimeStamp

**職責**: 代表一個時間點，提供格式化和解析功能，支援毫秒精度

**屬性**:

| 屬性 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `milliseconds` | `number` | ✅ | 毫秒數（必須 >= 0） |

**Getter 屬性**:

| 屬性 | 型別 | 說明 |
|------|------|------|
| `seconds` | `number` | 秒數（毫秒 / 1000） |
| `minutes` | `number` | 分鐘數 |

**方法**:

| 方法 | 返回型別 | 說明 |
|------|----------|------|
| `toString(format?)` | `string` | 格式化為 "MM:SS" 或 "MM:SS.mmm"（可選毫秒顯示） |
| `static fromSeconds(seconds: number)` | `TimeStamp` | 從秒數建立 TimeStamp |
| `static fromMilliseconds(ms: number)` | `TimeStamp` | 從毫秒數建立 TimeStamp |
| `static fromString(timeString: string)` | `TimeStamp` | 從 "MM:SS" 或 "MM:SS.mmm" 格式字串解析 |

**驗證規則**:
- `milliseconds` 不可為負數，否則拋出 Error

**TypeScript 定義**:
```typescript
export class TimeStamp {
  constructor(public readonly milliseconds: number) {
    if (milliseconds < 0) {
      throw new Error('TimeStamp milliseconds cannot be negative');
    }
  }

  get seconds(): number {
    return this.milliseconds / 1000;
  }

  get minutes(): number {
    return Math.floor(this.seconds / 60);
  }

  /**
   * 格式化時間戳
   * @param format - 'MM:SS' (預設) 或 'MM:SS.mmm'（包含毫秒）
   */
  toString(format: 'MM:SS' | 'MM:SS.mmm' = 'MM:SS'): string {
    const totalSeconds = Math.floor(this.seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const ms = this.milliseconds % 1000;

    const base = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    if (format === 'MM:SS.mmm') {
      return `${base}.${ms.toString().padStart(3, '0')}`;
    }

    return base;
  }

  static fromSeconds(seconds: number): TimeStamp {
    return new TimeStamp(seconds * 1000);
  }

  static fromMilliseconds(milliseconds: number): TimeStamp {
    return new TimeStamp(milliseconds);
  }

  static fromString(timeString: string): TimeStamp {
    // 支援 "MM:SS" 或 "MM:SS.mmm" 格式
    const parts = timeString.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid time format. Expected MM:SS or MM:SS.mmm');
    }

    const minutes = Number(parts[0]);
    const secondsParts = parts[1].split('.');
    const seconds = Number(secondsParts[0]);
    const ms = secondsParts.length > 1 ? Number(secondsParts[1].padEnd(3, '0')) : 0;

    if (isNaN(minutes) || isNaN(seconds) || isNaN(ms)) {
      throw new Error('Invalid time format. Expected MM:SS or MM:SS.mmm');
    }

    return new TimeStamp((minutes * 60 + seconds) * 1000 + ms);
  }
}
```

**範例**:
```typescript
// 從毫秒建立
const t1 = TimeStamp.fromMilliseconds(125500); // 2分5秒500毫秒
console.log(t1.toString()); // "02:05"
console.log(t1.toString('MM:SS.mmm')); // "02:05.500"

// 從秒數建立
const t2 = TimeStamp.fromSeconds(125.5); // 2分5秒500毫秒
console.log(t2.milliseconds); // 125500

// 從字串解析
const t3 = TimeStamp.fromString("03:45"); // 225秒
console.log(t3.seconds); // 225

const t4 = TimeStamp.fromString("03:45.250"); // 225.25秒
console.log(t4.milliseconds); // 225250

// ❌ 錯誤：負數時間
const t5 = TimeStamp.fromMilliseconds(-10); // 拋出 Error
```

**設計理由**:
- 視頻播放需要毫秒級精度，秒級精度不足以滿足準確的字幕同步
- 內部儲存毫秒，提供 `seconds` getter 方便使用
- toString 支援兩種格式：預設不顯示毫秒（簡潔），可選顯示毫秒（精確）
- 向後相容：提供 `fromSeconds` 方法，方便從秒數轉換

---

### 2. TimeRange

**職責**: 代表一個時間範圍，提供時長計算和包含檢查

**屬性**:

| 屬性 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `start` | `TimeStamp` | ✅ | 起始時間 |
| `end` | `TimeStamp` | ✅ | 結束時間 |

**Getter 屬性**:

| 屬性 | 型別 | 說明 |
|------|------|------|
| `duration` | `number` | 時長（毫秒） |
| `durationInSeconds` | `number` | 時長（秒數） |

**方法**:

| 方法 | 返回型別 | 說明 |
|------|----------|------|
| `contains(timestamp: TimeStamp)` | `boolean` | 檢查時間是否在範圍內 |

**驗證規則**:
- `end` 不可早於 `start`，否則拋出 Error

**TypeScript 定義**:
```typescript
export class TimeRange {
  constructor(
    public readonly start: TimeStamp,
    public readonly end: TimeStamp
  ) {
    if (end.milliseconds < start.milliseconds) {
      throw new Error('TimeRange end cannot be earlier than start');
    }
  }

  /**
   * 時長（毫秒）
   */
  get duration(): number {
    return this.end.milliseconds - this.start.milliseconds;
  }

  /**
   * 時長（秒數）- 方便使用
   */
  get durationInSeconds(): number {
    return this.duration / 1000;
  }

  contains(timestamp: TimeStamp): boolean {
    return timestamp.milliseconds >= this.start.milliseconds &&
           timestamp.milliseconds <= this.end.milliseconds;
  }
}
```

**範例**:
```typescript
const range = new TimeRange(
  TimeStamp.fromSeconds(10),  // 00:10
  TimeStamp.fromSeconds(25)   // 00:25
);
console.log(range.duration); // 15000 (毫秒)
console.log(range.durationInSeconds); // 15 (秒)

const t = TimeStamp.fromSeconds(20);
console.log(range.contains(t)); // true

// 支援毫秒級精度
const preciseRange = new TimeRange(
  TimeStamp.fromMilliseconds(10500),  // 10.5 秒
  TimeStamp.fromMilliseconds(25250)   // 25.25 秒
);
console.log(preciseRange.duration); // 14750 (毫秒)
console.log(preciseRange.durationInSeconds); // 14.75 (秒)

// ❌ 錯誤：end 早於 start
const invalidRange = new TimeRange(
  TimeStamp.fromSeconds(30),
  TimeStamp.fromSeconds(10)
); // 拋出 Error
```

---

### 3. VideoMetadata

**職責**: 封裝視頻的元數據（時長、尺寸、格式等）

**屬性**:

| 屬性 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `duration` | `number` | ✅ | 視頻時長（秒數） |
| `width` | `number` | ✅ | 視頻寬度（像素） |
| `height` | `number` | ✅ | 視頻高度（像素） |
| `format` | `string` | ✅ | 視頻格式（如 "video/mp4"） |

**驗證規則**:
- `duration` 必須 > 0
- `width` 和 `height` 必須 > 0
- `format` 必須是有效的 MIME 類型

**TypeScript 定義**:
```typescript
export class VideoMetadata {
  constructor(
    public readonly duration: number,
    public readonly width: number,
    public readonly height: number,
    public readonly format: string
  ) {
    if (duration <= 0) {
      throw new Error('Video duration must be positive');
    }
    if (width <= 0 || height <= 0) {
      throw new Error('Video dimensions must be positive');
    }
    if (!format.startsWith('video/')) {
      throw new Error('Invalid video format');
    }
  }

  get aspectRatio(): number {
    return this.width / this.height;
  }
}
```

---

## Repository Interfaces

### 1. IVideoRepository

**職責**: 定義 Video 聚合的儲存和查詢操作

**方法**:

| 方法 | 返回型別 | 說明 |
|------|----------|------|
| `save(video: Video)` | `Promise<void>` | 儲存視頻 |
| `findById(id: string)` | `Promise<Video \| null>` | 根據 ID 查找視頻 |

**TypeScript 定義**:
```typescript
export interface IVideoRepository {
  save(video: Video): Promise<void>;
  findById(id: string): Promise<Video | null>;
}
```

---

### 2. ITranscriptRepository

**職責**: 定義 Transcript 聚合的儲存和查詢操作

**方法**:

| 方法 | 返回型別 | 說明 |
|------|----------|------|
| `save(transcript: Transcript)` | `Promise<void>` | 儲存轉錄 |
| `findById(id: string)` | `Promise<Transcript \| null>` | 根據 ID 查找轉錄 |
| `findByVideoId(videoId: string)` | `Promise<Transcript \| null>` | 根據視頻 ID 查找轉錄 |

**TypeScript 定義**:
```typescript
export interface ITranscriptRepository {
  save(transcript: Transcript): Promise<void>;
  findById(id: string): Promise<Transcript | null>;
  findByVideoId(videoId: string): Promise<Transcript | null>;
}
```

---

### 3. IHighlightRepository

**職責**: 定義 Highlight 聚合的儲存和查詢操作

**方法**:

| 方法 | 返回型別 | 說明 |
|------|----------|------|
| `save(highlight: Highlight)` | `Promise<void>` | 儲存高光 |
| `findById(id: string)` | `Promise<Highlight \| null>` | 根據 ID 查找高光 |
| `findByVideoId(videoId: string)` | `Promise<Highlight[]>` | 根據視頻 ID 查找所有高光版本 |

**TypeScript 定義**:
```typescript
export interface IHighlightRepository {
  save(highlight: Highlight): Promise<void>;
  findById(id: string): Promise<Highlight | null>;
  findByVideoId(videoId: string): Promise<Highlight[]>; // 一個視頻可能有多個高光
}
```

---

## Data Flow Examples

### 範例 1: 建立視頻和轉錄

```typescript
// 1. 建立視頻
const metadata = new VideoMetadata(180, 1920, 1080, 'video/mp4');
const video = new Video('video-001', file, metadata);

// 2. 儲存視頻
await videoRepository.save(video);

// 3. AI 生成轉錄（由 Application Layer 處理）
// 4. 建立 Transcript
const sentences = [
  new Sentence(
    'sent-001',
    '大家好，歡迎來到今天的分享。',
    new TimeRange(
      TimeStamp.fromSeconds(0),
      TimeStamp.fromSeconds(3.5)
    ),
    true
  ),
  new Sentence(
    'sent-002',
    '今天我們要討論 Domain-Driven Design。',
    new TimeRange(
      TimeStamp.fromMilliseconds(3500),  // 支援毫秒精度
      TimeStamp.fromMilliseconds(7250)
    ),
    false
  ),
  // ... 更多句子
];

const section = new Section('sec-001', '開場介紹', sentences);
const transcript = new Transcript('trans-001', 'video-001', [section], '完整文字');

// 5. 儲存轉錄
await transcriptRepository.save(transcript);
```

### 範例 2: 建立高光並選擇句子（使用 HighlightService）

```typescript
// 1. 建立高光
const highlight = new Highlight('high-001', 'video-001', '精華版');

// 2. 選擇句子
highlight.addSentence('sent-001');
highlight.addSentence('sent-003');
highlight.addSentence('sent-005');

// 3. 儲存高光
await highlightRepository.save(highlight);

// 4. 使用 HighlightService 查詢選中的句子（跨聚合查詢）
const transcript = await transcriptRepository.findByVideoId('video-001');
const highlightService = new HighlightService();

// 按時間順序獲取選中的句子
const selectedSentences = highlightService.getSelectedSentences(
  highlight,
  transcript,
  'time'
);

// 按選擇順序獲取選中的句子
const sentencesInSelectionOrder = highlightService.getSelectedSentences(
  highlight,
  transcript,
  'selection'
);

// 5. 計算總時長（毫秒）
const totalDuration = highlightService.getTotalDuration(highlight, transcript);
console.log(`總時長: ${totalDuration / 1000} 秒`); // 轉換為秒數顯示

// 6. 獲取時間範圍
const timeRanges = highlightService.getTimeRanges(highlight, transcript, 'time');
console.log(`選中 ${timeRanges.length} 個片段`);
```

### 範例 3: 直接使用 Highlight 查詢（不需要 Transcript）

```typescript
const highlight = await highlightRepository.findById('high-001');

// 獲取選中的句子 ID 列表
const selectedIds = highlight.getSelectedSentenceIds();
console.log(`選中了 ${selectedIds.length} 個句子`);

// 檢查特定句子是否被選中
if (highlight.isSelected('sent-001')) {
  console.log('句子 sent-001 已被選中');
}

// 切換句子選中狀態
highlight.toggleSentence('sent-002');

// 儲存變更
await highlightRepository.save(highlight);
```

---

## Validation Rules Summary

| Entity/Value Object | Validation Rules |
|---------------------|------------------|
| **TimeStamp** | milliseconds >= 0 |
| **TimeRange** | end.milliseconds >= start.milliseconds |
| **VideoMetadata** | duration > 0, width > 0, height > 0, format starts with "video/" |
| **Section** | sentences.length > 0 |
| **Highlight** | 重複添加同一個句子時自動忽略 |

---

## Performance Considerations

| Operation | Complexity | Notes |
|-----------|------------|-------|
| `Transcript.getSentenceById()` | O(n) | n = 句子總數，預計 < 1000 |
| `Transcript.getAllSentences()` | O(n) | 使用 flatMap |
| `Highlight.addSentence()` | O(1) | Set.add() |
| `Highlight.removeSentence()` | O(m) | m = 選擇的句子數，Array.filter() |
| `Highlight.isSelected()` | O(1) | Set.has() |
| `Highlight.getSelectedSentenceIds()` | O(m) | 複製 selectionOrder 陣列 |
| `HighlightService.getSelectedSentences()` | O(n log n) | 排序操作（time 模式） |
| `HighlightService.getTimeRanges()` | O(n log n) | 依賴 getSelectedSentences |
| `HighlightService.getTotalDuration()` | O(n log n) | 依賴 getSelectedSentences + reduce |

---

## References

- [TECHNICAL_DESIGN.md](../../TECHNICAL_DESIGN.md) - Domain Layer 詳細設計
- [spec.md](./spec.md) - 功能規格說明
- [research.md](./research.md) - 實作研究文件
