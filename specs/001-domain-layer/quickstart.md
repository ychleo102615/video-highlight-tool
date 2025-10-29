# Quickstart Guide: Domain Layer Development

**Feature**: Domain Layer - 核心業務實體與值物件
**Target Audience**: 開發團隊成員
**Estimated Time**: 5-10 分鐘

## Prerequisites

在開始之前，請確保您已經：

- ✅ 閱讀 [TECHNICAL_DESIGN.md](../../TECHNICAL_DESIGN.md) 的 Domain Layer 章節
- ✅ 閱讀 [spec.md](./spec.md) 了解功能需求
- ✅ 安裝 TypeScript 5.0+
- ✅ 配置好 Vite + Vue 3 專案環境

## Project Structure

```
src/domain/
├── aggregates/           # 聚合根與聚合
│   ├── Video.ts         # Video Aggregate Root
│   ├── Transcript/      # Transcript Aggregate
│   │   ├── Transcript.ts
│   │   ├── Section.ts
│   │   └── Sentence.ts
│   └── Highlight.ts     # Highlight Aggregate Root
├── value-objects/        # 值物件
│   ├── TimeStamp.ts
│   ├── TimeRange.ts
│   └── VideoMetadata.ts
└── repositories/         # 儲存庫介面
    ├── IVideoRepository.ts
    ├── ITranscriptRepository.ts
    └── IHighlightRepository.ts
```

## Development Workflow

### Step 1: 建立值物件（優先）

**Why First?** 值物件無外部依賴，易於測試，且被實體使用。

#### 1.1 建立 TimeStamp.ts（支援毫秒精度）

```typescript
// src/domain/value-objects/TimeStamp.ts
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
    const parts = timeString.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid time format. Expected MM:SS or MM:SS.mmm');
    }

    const minutes = Number(parts[0]);
    const secondsParts = parts[1].split('.');
    const seconds = Number(secondsParts[0]);
    const ms = secondsParts.length > 1 ? Number(secondsParts[1].padEnd(3, '0')) : 0;

    if (isNaN(minutes) || isNaN(seconds) || isNaN(ms)) {
      throw new Error('Invalid time format');
    }

    return new TimeStamp((minutes * 60 + seconds) * 1000 + ms);
  }
}
```

**Quick Test**:
```typescript
const t = TimeStamp.fromSeconds(125.5);
console.log(t.toString()); // "02:05"
console.log(t.toString('MM:SS.mmm')); // "02:05.500"
console.log(t.milliseconds); // 125500
```

#### 1.2 建立 TimeRange.ts

```typescript
// src/domain/value-objects/TimeRange.ts
import { TimeStamp } from './TimeStamp';

export class TimeRange {
  constructor(
    public readonly start: TimeStamp,
    public readonly end: TimeStamp
  ) {
    if (end.milliseconds < start.milliseconds) {
      throw new Error('TimeRange end cannot be earlier than start');
    }
  }

  get duration(): number {
    return this.end.milliseconds - this.start.milliseconds;
  }

  get durationInSeconds(): number {
    return this.duration / 1000;
  }

  contains(timestamp: TimeStamp): boolean {
    return timestamp.milliseconds >= this.start.milliseconds &&
           timestamp.milliseconds <= this.end.milliseconds;
  }
}
```

**Quick Test**:
```typescript
const range = new TimeRange(
  TimeStamp.fromSeconds(10),
  TimeStamp.fromSeconds(25)
);
console.log(range.duration); // 15000 (毫秒)
console.log(range.durationInSeconds); // 15 (秒)
```

#### 1.3 建立 VideoMetadata.ts

```typescript
// src/domain/value-objects/VideoMetadata.ts
export class VideoMetadata {
  constructor(
    public readonly duration: number,
    public readonly width: number,
    public readonly height: number,
    public readonly format: string
  ) {
    if (duration <= 0) throw new Error('Video duration must be positive');
    if (width <= 0 || height <= 0) throw new Error('Video dimensions must be positive');
    if (!format.startsWith('video/')) throw new Error('Invalid video format');
  }

  get aspectRatio(): number {
    return this.width / this.height;
  }
}
```

---

### Step 2: 建立簡單實體

#### 2.1 建立 Video.ts

```typescript
// src/domain/aggregates/Video.ts
import { VideoMetadata } from '../value-objects/VideoMetadata';

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

#### 2.2 建立 Sentence.ts

```typescript
// src/domain/aggregates/Transcript/Sentence.ts
import { TimeRange } from '../../value-objects/TimeRange';

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

### Step 3: 建立複雜實體

#### 3.1 建立 Section.ts

```typescript
// src/domain/aggregates/Transcript/Section.ts
import { TimeRange } from '../../value-objects/TimeRange';
import { Sentence } from './Sentence';

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

#### 3.2 建立 Transcript.ts

```typescript
// src/domain/aggregates/Transcript/Transcript.ts
import { Section } from './Section';
import { Sentence } from './Sentence';

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

### Step 4: 實作 Highlight 聚合（管理選擇關係）

**重要**: Highlight 只負責管理「哪些句子被選中」，不包含跨聚合查詢邏輯（符合 DDD 原則）。

```typescript
// src/domain/aggregates/Highlight.ts
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

### Step 4.5: 建立 Domain Service（協調跨聚合查詢）

**Why Domain Service?** 當兩個 Aggregate 需要協作時，應使用 Domain Service，而非在一個 Aggregate 的方法中傳入另一個 Aggregate。

```typescript
// src/domain/services/HighlightService.ts
import { Highlight } from '../aggregates/Highlight';
import { Transcript } from '../aggregates/Transcript/Transcript';
import { Sentence } from '../aggregates/Transcript/Sentence';
import { TimeRange } from '../value-objects/TimeRange';

export class HighlightService {
  /**
   * 獲取 Highlight 中選中的句子
   * @param highlight - Highlight 聚合
   * @param transcript - Transcript 聚合
   * @param sortBy - 排序方式：'selection'（選擇順序）或 'time'（時間順序）
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
   * 計算選中句子的總時長（毫秒）
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

---

### Step 5: 定義 Repository 介面

#### 5.1 IVideoRepository.ts

```typescript
// src/domain/repositories/IVideoRepository.ts
import { Video } from '../aggregates/Video';

export interface IVideoRepository {
  save(video: Video): Promise<void>;
  findById(id: string): Promise<Video | null>;
}
```

#### 5.2 ITranscriptRepository.ts

```typescript
// src/domain/repositories/ITranscriptRepository.ts
import { Transcript } from '../aggregates/Transcript/Transcript';

export interface ITranscriptRepository {
  save(transcript: Transcript): Promise<void>;
  findById(id: string): Promise<Transcript | null>;
  findByVideoId(videoId: string): Promise<Transcript | null>;
}
```

#### 5.3 IHighlightRepository.ts

```typescript
// src/domain/repositories/IHighlightRepository.ts
import { Highlight } from '../aggregates/Highlight';

export interface IHighlightRepository {
  save(highlight: Highlight): Promise<void>;
  findById(id: string): Promise<Highlight | null>;
  findByVideoId(videoId: string): Promise<Highlight[]>;
}
```

---

## Quick Verification

### Checklist

在提交代碼前，請確認：

- [ ] 所有檔案都在正確的資料夾（aggregates/, value-objects/, services/, repositories/）
- [ ] 所有類別使用 TypeScript Class 定義
- [ ] 所有屬性使用 `readonly` 修飾符（除非需要可變）
- [ ] **值物件在建構函式中執行驗證**
- [ ] **TimeStamp 使用 `milliseconds` 作為內部儲存（支援毫秒精度）**
- [ ] **TimeStamp 提供 `fromSeconds`, `fromMilliseconds`, `fromString` 靜態方法**
- [ ] **TimeRange 的 `duration` 返回毫秒數**
- [ ] Transcript 聚合的 sections 和 sentences 宣告為 `ReadonlyArray`
- [ ] Highlight 使用 `Set<string>` 儲存選中的句子 ID
- [ ] **Highlight 不包含需要傳入 Transcript 的方法（使用 HighlightService 代替）**
- [ ] **HighlightService 已建立，處理跨聚合查詢**
- [ ] 所有 Repository 介面方法返回 `Promise`
- [ ] 無使用 `any` 型別
- [ ] 無引用外層技術（Vue, Pinia, axios 等）

### Quick Test Example

建立一個簡單的測試檔案驗證整合：

```typescript
// test-domain.ts (臨時測試檔案，不提交)
import { TimeStamp, TimeRange } from './domain/value-objects';
import { Video, VideoMetadata } from './domain/aggregates/Video';
import { Sentence, Section, Transcript } from './domain/aggregates/Transcript';
import { Highlight } from './domain/aggregates/Highlight';
import { HighlightService } from './domain/services/HighlightService';

// 1. 建立值物件（使用毫秒精度）
const metadata = new VideoMetadata(180, 1920, 1080, 'video/mp4');
console.log('✅ VideoMetadata created');

// 2. 建立 Video
const video = new Video('video-001', new File([], 'test.mp4'), metadata);
console.log('✅ Video created, isReady:', video.isReady); // false

// 3. 建立 Sentence（使用 TimeStamp.fromSeconds）
const sentence1 = new Sentence(
  'sent-001',
  '大家好，歡迎來到今天的分享。',
  new TimeRange(
    TimeStamp.fromSeconds(0),
    TimeStamp.fromSeconds(3.5)
  ),
  true
);
console.log('✅ Sentence created');

// 4. 建立 Section
const section = new Section('sec-001', '開場介紹', [sentence1]);
console.log('✅ Section created, timeRange duration:', section.timeRange.durationInSeconds, 'seconds');

// 5. 建立 Transcript
const transcript = new Transcript('trans-001', 'video-001', [section], '大家好，歡迎來到今天的分享。');
console.log('✅ Transcript created, sentences count:', transcript.getAllSentences().length);

// 6. 建立 Highlight
const highlight = new Highlight('high-001', 'video-001', '精華版');
highlight.addSentence('sent-001');
console.log('✅ Highlight created, selected:', highlight.isSelected('sent-001')); // true
console.log('✅ Selected sentence count:', highlight.getSelectedSentenceCount()); // 1

// 7. 使用 HighlightService 進行跨聚合查詢
const highlightService = new HighlightService();
const selected = highlightService.getSelectedSentences(highlight, transcript, 'time');
console.log('✅ Selected sentences:', selected.length); // 1

const totalDuration = highlightService.getTotalDuration(highlight, transcript);
console.log('✅ Total duration:', totalDuration / 1000, 'seconds'); // 3.5 秒

// 8. 測試毫秒精度
const preciseTime = TimeStamp.fromMilliseconds(125500);
console.log('✅ Precise time:', preciseTime.toString('MM:SS.mmm')); // "02:05.500"

console.log('\n🎉 All Domain Layer entities working correctly!');
```

執行測試：
```bash
npx tsx test-domain.ts
```

---

## Common Pitfalls & Solutions

### ❌ Pitfall 1: 使用 Plain Object 而非 Class

```typescript
// ❌ 錯誤
export interface Video {
  id: string;
  file: File;
}

// ✅ 正確
export class Video {
  constructor(
    public readonly id: string,
    public readonly file: File
  ) {}
}
```

### ❌ Pitfall 2: 忘記驗證值物件

```typescript
// ❌ 錯誤：無驗證
export class TimeStamp {
  constructor(public readonly seconds: number) {}
}

// ✅ 正確：在建構函式中驗證
export class TimeStamp {
  constructor(public readonly seconds: number) {
    if (seconds < 0) {
      throw new Error('TimeStamp seconds cannot be negative');
    }
  }
}
```

### ❌ Pitfall 3: Transcript 聚合未使用 ReadonlyArray

```typescript
// ❌ 錯誤：可變陣列
export class Transcript {
  constructor(
    public sections: Section[]
  ) {}
}

// ✅ 正確：唯讀陣列
export class Transcript {
  constructor(
    public readonly sections: ReadonlyArray<Section>
  ) {}
}
```

### ❌ Pitfall 4: Highlight 直接持有 Sentence 引用

```typescript
// ❌ 錯誤：直接持有 Sentence[]
export class Highlight {
  private selectedSentences: Sentence[] = [];
}

// ✅ 正確：通過 ID 引用
export class Highlight {
  private selectedSentenceIds = new Set<string>();
}
```

---

## Next Steps

完成 Domain Layer 開發後：

1. **執行型別檢查**: `npm run type-check`
2. **執行 Lint**: `npm run lint`
3. **撰寫單元測試** (Phase 7)
4. **進入 Phase 3**: 開發 Application Layer（Use Cases）

---

## Resources

- [data-model.md](./data-model.md) - 詳細的數據模型設計
- [research.md](./research.md) - 實作研究與最佳實踐
- [spec.md](./spec.md) - 功能規格說明
- [TECHNICAL_DESIGN.md](../../TECHNICAL_DESIGN.md) - 整體技術設計
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/) - TypeScript 官方文檔

---

## Getting Help

遇到問題時：

1. 檢查 [data-model.md](./data-model.md) 中的 TypeScript 定義範例
2. 參考 [research.md](./research.md) 中的最佳實踐
3. 查閱 [TECHNICAL_DESIGN.md](../../TECHNICAL_DESIGN.md) 的 Domain Layer 章節
4. 與團隊成員討論 DDD 設計決策

---

**祝開發順利！** 🚀
