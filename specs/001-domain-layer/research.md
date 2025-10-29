# Research: Domain Layer Implementation

**Feature**: Domain Layer - 核心業務實體與值物件
**Date**: 2025-10-29
**Status**: Complete

## Overview

本文件記錄 Domain Layer 實作的研究結果，包括技術決策、最佳實踐和設計模式。所有決策均基於 TECHNICAL_DESIGN.md 和專案憲法的要求。

## Research Topics

### 1. TypeScript 實體設計最佳實踐

**Decision**: 使用 TypeScript Class 定義實體和值物件

**Rationale**:
1. **封裝性**: Class 提供私有屬性和方法，確保業務規則不被繞過
2. **型別安全**: TypeScript 編譯時檢查，避免執行時錯誤
3. **可讀性**: Class 語法清晰表達實體的屬性和行為
4. **可測試性**: 易於實例化和 mock

**Alternatives Considered**:
- **Interface + Factory Function**: 較輕量，但缺乏封裝性和私有屬性保護
- **Plain Object**: 無法強制業務規則，不適合 DDD

**Best Practices**:
```typescript
// ✅ 推薦：使用 Class 定義實體
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

// ❌ 不推薦：使用 Plain Object
export interface Video {
  id: string;
  file: File;
  metadata: VideoMetadata;
  url?: string;
}
```

---

### 2. 不可變性（Immutability）實作

**Decision**: 使用 `readonly` 修飾符和 `ReadonlyArray` 確保編譯時不可變性

**Rationale**:
1. **編譯時保護**: TypeScript 在編譯時阻止修改 readonly 屬性
2. **業務規則強制**: Transcript 生成後不可修改的業務規則編碼到型別系統
3. **簡單易懂**: 無需引入額外的不可變性庫（如 Immutable.js）

**Alternatives Considered**:
- **Immutable.js**: 功能強大，但增加學習成本和 bundle 大小
- **Object.freeze()**: 運行時保護，但無編譯時檢查

**Best Practices**:
```typescript
// ✅ 推薦：使用 readonly 和 ReadonlyArray
export class Transcript {
  constructor(
    public readonly id: string,
    public readonly videoId: string,
    public readonly sections: ReadonlyArray<Section>,
    public readonly fullText: string
  ) {}
}

// ✅ 推薦：Section 的 sentences 也是 ReadonlyArray
export class Section {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly sentences: ReadonlyArray<Sentence>
  ) {}
}
```

**Limitations**:
- `readonly` 只在編譯時有效，運行時仍可強制修改（通過 `any` 或 `as`）
- 需要通過代碼審查和測試確保不被繞過

---

### 3. 值物件（Value Object）驗證策略

**Decision**: 在建構函式中執行驗證，驗證失敗時拋出 Error

**Rationale**:
1. **快速失敗**: 在建立實例時立即發現問題，避免錯誤數據傳播
2. **清晰語義**: 驗證規則在建構函式中集中管理，易於理解
3. **型別安全**: 一旦建立成功，保證數據合法

**Alternatives Considered**:
- **靜態工廠方法**: 返回 `Result<T, Error>`，更函數式，但增加複雜度
- **延遲驗證**: 在使用時驗證，但可能導致錯誤數據傳播

**Best Practices**:
```typescript
// ✅ 推薦：在建構函式中驗證，支援毫秒精度
export class TimeStamp {
  constructor(public readonly milliseconds: number) {
    if (milliseconds < 0) {
      throw new Error('TimeStamp milliseconds cannot be negative');
    }
  }

  get seconds(): number {
    return this.milliseconds / 1000;
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

// ✅ 推薦：TimeRange 驗證 end >= start，支援毫秒精度
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

**設計理由 - 為何使用毫秒？**
- 視頻播放需要毫秒級精度，秒級精度不足以滿足準確的字幕同步
- 瀏覽器 video 元素的 `currentTime` 屬性返回浮點數秒，需要精確到毫秒
- 內部儲存毫秒，提供 `seconds` getter 方便使用
- toString 支援兩種格式：預設不顯示毫秒（簡潔），可選顯示毫秒（精確）
```

---

### 4. Set vs Array 用於高光選擇管理

**Decision**: 使用 `Set<string>` 儲存選中的句子 ID，使用 `string[]` 記錄選擇順序

**Rationale**:
1. **去重**: Set 自動處理重複添加，無需手動檢查
2. **效能**: `Set.has()` 為 O(1)，`Array.includes()` 為 O(n)
3. **語義清晰**: Set 表達「唯一集合」的語義，Array 表達「有序列表」的語義

**Alternatives Considered**:
- **僅使用 Array**: 需要手動去重和檢查存在性，效能較差
- **僅使用 Set**: 無法記錄選擇順序

**Best Practices**:
```typescript
// ✅ 推薦：使用 Set + Array 組合
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
}
```

**Performance Analysis**:
- `addSentence`: O(1) - Set.add()
- `removeSentence`: O(n) - Array.filter()，但 n 通常很小（< 100）
- `toggleSentence`: O(1) 或 O(n)
- `isSelected`: O(1) - Set.has()

---

### 5. 跨聚合查詢模式 - 使用 Domain Service

**Decision**: 使用 HighlightService (Domain Service) 協調 Highlight 和 Transcript 之間的互動

**Rationale**:
1. **符合 DDD 原則**: 當兩個 Aggregate 需要協作時，應使用 Domain Service，而非在一個 Aggregate 的方法中傳入另一個 Aggregate
2. **聚合獨立性**: Highlight 只管理選擇關係（sentenceIds），不依賴 Transcript
3. **職責清晰**: HighlightService 負責協調跨聚合查詢，保持 Aggregate 的純粹性
4. **無狀態服務**: Domain Service 是無狀態的，所有方法都是純函數

**Alternatives Considered**:
- **在 Highlight 中傳入 Transcript 參數**: 違反 DDD 原則，Aggregate 不應依賴其他 Aggregate
- **在 Application Layer 處理**: 會導致業務邏輯洩漏到 Application Layer，Domain Layer 失去核心邏輯

**Best Practices**:
```typescript
// ✅ 推薦：使用 Domain Service 協調跨聚合查詢
export class HighlightService {
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
      return sentences.sort((a, b) =>
        a.timeRange.start.milliseconds - b.timeRange.start.milliseconds
      );
    }

    return sentences; // 保持選擇順序
  }

  getTotalDuration(highlight: Highlight, transcript: Transcript): number {
    return this.getSelectedSentences(highlight, transcript, 'time')
      .reduce((total, s) => total + s.timeRange.duration, 0);
  }
}

// ✅ Highlight 只管理選擇關係
export class Highlight {
  getSelectedSentenceIds(): ReadonlyArray<string> {
    return [...this.selectionOrder];
  }

  isSelected(sentenceId: string): boolean {
    return this.selectedSentenceIds.has(sentenceId);
  }
}

// ❌ 錯誤：在 Aggregate 方法中傳入另一個 Aggregate
export class Highlight {
  getSelectedSentences(transcript: Transcript, sortBy: string): Sentence[] {
    // 違反 DDD 原則
  }
}
```

**Trade-offs**:
- **優點**:
  - 符合 DDD Domain Service 模式
  - 聚合保持獨立性
  - 業務邏輯集中在 Domain Layer
  - 易於測試（可以 mock Highlight 和 Transcript）
- **缺點**:
  - 引入新的類別（HighlightService）
  - 使用時需要額外 new HighlightService()

---

### 6. Repository 介面設計原則

**Decision**: 只有 Aggregate Root 才有 Repository 介面

**Rationale**:
1. **符合 DDD 原則**: Aggregate Root 是聚合的唯一入口
2. **一致性保證**: 通過 Aggregate Root 操作，確保聚合內部一致性
3. **簡化設計**: 減少 Repository 數量，降低複雜度

**Best Practices**:
```typescript
// ✅ 正確：Video 是 Aggregate Root，有 Repository
export interface IVideoRepository {
  save(video: Video): Promise<void>;
  findById(id: string): Promise<Video | null>;
}

// ✅ 正確：Transcript 是 Aggregate Root，有 Repository
export interface ITranscriptRepository {
  save(transcript: Transcript): Promise<void>;
  findById(id: string): Promise<Transcript | null>;
  findByVideoId(videoId: string): Promise<Transcript | null>;
}

// ✅ 正確：Highlight 是 Aggregate Root，有 Repository
export interface IHighlightRepository {
  save(highlight: Highlight): Promise<void>;
  findById(id: string): Promise<Highlight | null>;
  findByVideoId(videoId: string): Promise<Highlight[]>; // 一個視頻可能有多個高光版本
}

// ❌ 錯誤：Section 不是 Aggregate Root，不應有 Repository
// export interface ISectionRepository { ... }

// ❌ 錯誤：Sentence 不是 Aggregate Root，不應有 Repository
// export interface ISentenceRepository { ... }
```

**Key Insight**:
- Section 和 Sentence 的生命週期由 Transcript 管理
- 儲存或查詢 Section/Sentence 時，透過 Transcript Repository 操作整個聚合

---

### 7. TypeScript 型別定義最佳實踐

**Decision**: 所有公開 API 明確定義型別，避免使用 `any`

**Rationale**:
1. **編譯時檢查**: 捕獲型別錯誤，減少執行時 bug
2. **IDE 支援**: 提供完整的自動補全和型別提示
3. **文檔作用**: 型別定義即文檔，提高代碼可讀性

**Best Practices**:
```typescript
// ✅ 推薦：明確的型別定義
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

// ❌ 避免使用 any
export class Transcript {
  getSentenceById(sentenceId: any): any { // 不好：失去型別安全
    // ...
  }
}
```

---

## Implementation Checklist

### Phase 2: Domain Layer 開發

- [ ] **值物件（優先）**:
  - [ ] 實作 `TimeStamp.ts`（包含驗證、toString、fromString、fromSeconds、fromMilliseconds，**支援毫秒精度**）
  - [ ] 實作 `TimeRange.ts`（包含驗證、duration、durationInSeconds、contains）
  - [ ] 實作 `VideoMetadata.ts`（封裝視頻元數據）

- [ ] **實體與聚合**:
  - [ ] 實作 `Video.ts`（Video Aggregate Root）
  - [ ] 實作 `Sentence.ts`（屬於 Transcript 聚合）
  - [ ] 實作 `Section.ts`（屬於 Transcript 聚合）
  - [ ] 實作 `Transcript.ts`（Transcript Aggregate Root）
  - [ ] 實作 `Highlight.ts`（Highlight Aggregate Root，**不包含需要 Transcript 的方法**）

- [ ] **Domain Services**:
  - [ ] 實作 `HighlightService.ts`（協調 Highlight 和 Transcript 的跨聚合查詢）

- [ ] **儲存庫介面**:
  - [ ] 定義 `IVideoRepository.ts`
  - [ ] 定義 `ITranscriptRepository.ts`
  - [ ] 定義 `IHighlightRepository.ts`

### 實作順序建議

1. **先實作值物件**（無依賴，易於測試）
2. **再實作簡單實體**（Video, Sentence）
3. **實作複雜實體**（Section, Transcript）
4. **實作 Highlight 聚合**（管理選擇關係）
5. **實作 Domain Service**（HighlightService）
6. **定義 Repository 介面**

---

## Key Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| 實體定義方式 | TypeScript Class | 封裝性、型別安全、可讀性 |
| 不可變性實作 | `readonly` + `ReadonlyArray` | 編譯時保護、簡單易懂 |
| 值物件驗證 | 建構函式驗證 + 拋出 Error | 快速失敗、清晰語義 |
| **時間精度** | **毫秒（milliseconds）** | **視頻播放需要毫秒級精度** |
| 高光選擇儲存 | `Set<string>` + `string[]` | 去重 + 效能 + 記錄順序 |
| **跨聚合協作** | **Domain Service (HighlightService)** | **符合 DDD，聚合保持獨立** |
| Repository 設計 | 只有 Aggregate Root 有 Repository | 符合 DDD、簡化設計 |
| 型別定義 | 明確型別，避免 `any` | 型別安全、IDE 支援 |

---

## References

- [TECHNICAL_DESIGN.md](../../TECHNICAL_DESIGN.md) - Domain Layer 設計章節
- [憲法](../../.specify/memory/constitution.md) - Clean Architecture 和 DDD 原則
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/) - TypeScript 官方文檔
- [Domain-Driven Design Reference](https://www.domainlanguage.com/ddd/reference/) - DDD 參考資料

---

**Research Complete**: 所有技術決策已明確，無 NEEDS CLARIFICATION 項目，可進入 Phase 1 設計階段。
