# Tasks: Domain Layer - 核心業務實體與值物件

**Input**: Design documents from `/specs/001-domain-layer/`
**Prerequisites**: plan.md, spec.md, data-model.md, research.md, quickstart.md, contracts/

**Tests**: 測試任務不包含在此階段，將在 Phase 7（測試與部署）實作

**Organization**: 任務按 User Story 組織，但由於 Domain Layer 實體間的依賴關係，將值物件作為 Foundational Phase

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: 可並行執行（不同檔案，無依賴）
- **[Story]**: 任務所屬的 User Story（例如：US1, US2, US3）
- 包含明確的檔案路徑

## Path Conventions

專案採用單一專案結構，所有 Domain Layer 程式碼位於 `src/domain/`

---

## Phase 1: Setup（專案初始化）

**目的**: 建立 Domain Layer 的資料夾結構

- [X] T001 建立 Domain Layer 資料夾結構：src/domain/aggregates/, src/domain/value-objects/, src/domain/services/, src/domain/repositories/
- [X] T002 建立 Transcript 聚合子資料夾：src/domain/aggregates/Transcript/

---

## Phase 2: Foundational（值物件 - User Story 4 的一部分）

**目的**: 建立值物件，所有實體都依賴這些基礎組件

**⚠️ 重要**: 值物件必須先完成，因為所有實體都依賴它們

**對應**: User Story 4 - 時間值物件 (Priority: P2)

- [X] T003 [P] 實作 TimeStamp 值物件 in src/domain/value-objects/TimeStamp.ts（包含 milliseconds 屬性、seconds/minutes getters、toString(format?)、fromSeconds、fromMilliseconds、fromString 靜態方法，**支援毫秒精度**，驗證 milliseconds >= 0）
- [X] T004 [P] 實作 VideoMetadata 值物件 in src/domain/value-objects/VideoMetadata.ts（包含 duration, width, height, format 屬性，驗證 duration > 0, width > 0, height > 0, format 以 "video/" 開頭，提供 aspectRatio getter）
- [X] T005 實作 TimeRange 值物件 in src/domain/value-objects/TimeRange.ts（包含 start, end 屬性，驗證 end.milliseconds >= start.milliseconds，提供 duration getter（毫秒）、durationInSeconds getter、contains(timestamp) 方法）

**Checkpoint**: 值物件完成 - User Story 4 的核心部分已實作，實體實作可以開始

---

## Phase 3: User Story 1 - 視頻實體管理（Priority: P1）🎯 MVP

**目標**: 建立 Video 聚合根來管理視頻文件，提供視頻元數據查詢和播放準備狀態檢查

**Independent Test**: 建立 Video 實體實例，驗證屬性（id, file, metadata, url）正確設定，測試 `duration` 和 `isReady` getter 方法返回預期值

### 實作 User Story 1

- [X] T006 [US1] 實作 Video 聚合根 in src/domain/aggregates/Video.ts（包含 id, file, metadata, url 屬性，提供 duration getter（從 metadata 提取）、isReady getter（檢查 url 是否存在），所有屬性使用 readonly，url 為 optional）

**Checkpoint**: User Story 1 完成 - Video 聚合根可獨立運作並測試

---

## Phase 4: User Story 2 - 轉錄聚合與句子管理（Priority: P1）🎯 MVP

**目標**: 建立 Transcript 聚合來組織和查詢視頻轉錄內容，包括 Section 和 Sentence 的結構化管理，確保轉錄數據的唯讀性

**Independent Test**: 建立 Transcript 實體（包含多個 Section 和 Sentence），測試 `getSentenceById`、`getAllSentences`、`getSectionById` 查詢方法正確返回數據，驗證 sections 和 sentences 的唯讀性

### 實作 User Story 2

- [X] T007 [P] [US2] 實作 Sentence 實體 in src/domain/aggregates/Transcript/Sentence.ts（包含 id, text, timeRange, isHighlightSuggestion 屬性，所有屬性使用 readonly，**不包含** isSelected 狀態）
- [X] T008 [US2] 實作 Section 實體 in src/domain/aggregates/Transcript/Section.ts（包含 id, title, sentences 屬性，sentences 宣告為 ReadonlyArray<Sentence>，驗證 sentences.length > 0，提供 timeRange getter 計算從第一個到最後一個句子的時間範圍）
- [X] T009 [US2] 實作 Transcript 聚合根 in src/domain/aggregates/Transcript/Transcript.ts（包含 id, videoId, sections, fullText 屬性，sections 宣告為 ReadonlyArray<Section>，提供 getSentenceById(sentenceId: string)、getAllSentences()、getSectionById(sectionId: string) 查詢方法，使用 flatMap 實作 getAllSentences）

**Checkpoint**: User Story 2 完成 - Transcript 聚合可獨立運作，提供完整的轉錄內容查詢功能

---

## Phase 5: User Story 3 - 高光選擇管理（Priority: P1）🎯 MVP

**目標**: 建立 Highlight 聚合來管理「哪些句子被選中」的關係，支援添加、移除、切換句子選擇狀態，記錄選擇順序，並使用 Domain Service 處理跨聚合查詢

**Independent Test**: 建立 Highlight 實體，測試 `addSentence`、`removeSentence`、`toggleSentence`、`isSelected` 方法正確管理選擇狀態，驗證 `getSelectedSentenceIds` 方法返回正確順序，使用 HighlightService 測試 `getSelectedSentences`、`getTimeRanges`、`getTotalDuration` 方法正確協調 Highlight 和 Transcript

### 實作 User Story 3

- [ ] T010 [US3] 實作 Highlight 聚合根 in src/domain/aggregates/Highlight.ts（包含 id, videoId, name 屬性，私有屬性 selectedSentenceIds: Set<string> 和 selectionOrder: string[]，提供 addSentence、removeSentence、toggleSentence、isSelected、getSelectedSentenceIds、getSelectedSentenceCount 方法，**不包含需要傳入 Transcript 的方法**，addSentence 自動去重且不重複記錄在 selectionOrder）
- [ ] T011 [US3] 實作 HighlightService Domain Service in src/domain/services/HighlightService.ts（提供 getSelectedSentences(highlight, transcript, sortBy: 'selection' | 'time')、getTimeRanges(highlight, transcript, sortBy)、getTotalDuration(highlight, transcript) 方法，處理 Highlight 和 Transcript 之間的跨聚合查詢，sortBy='time' 時按 timeRange.start.milliseconds 排序，sortBy='selection' 時保持 selectionOrder 順序）

**Checkpoint**: User Story 3 完成 - Highlight 聚合和 HighlightService 可獨立運作，完整的高光選擇管理功能已實作

---

## Phase 6: User Story 5 - 儲存庫介面定義（Priority: P2）

**目標**: 定義三個 Aggregate Root 的 Repository 介面，規範聚合根的儲存和查詢操作，供 Infrastructure Layer 實作

**Independent Test**: 檢查介面定義包含所需的方法簽名（save, findById, findByVideoId 等），驗證方法的輸入輸出型別正確，所有查詢方法返回 Promise 型別

### 實作 User Story 5

- [ ] T012 [P] [US5] 定義 IVideoRepository 介面 in src/domain/repositories/IVideoRepository.ts（包含 save(video: Video): Promise<void>、findById(id: string): Promise<Video | null> 方法）
- [ ] T013 [P] [US5] 定義 ITranscriptRepository 介面 in src/domain/repositories/ITranscriptRepository.ts（包含 save(transcript: Transcript): Promise<void>、findById(id: string): Promise<Transcript | null>、findByVideoId(videoId: string): Promise<Transcript | null> 方法）
- [ ] T014 [P] [US5] 定義 IHighlightRepository 介面 in src/domain/repositories/IHighlightRepository.ts（包含 save(highlight: Highlight): Promise<void>、findById(id: string): Promise<Highlight | null>、findByVideoId(videoId: string): Promise<Highlight[]> 方法，注意一個視頻可能有多個高光版本）

**Checkpoint**: User Story 5 完成 - 所有 Repository 介面已定義，Infrastructure Layer 可以開始實作

---

## Phase 7: Polish & Cross-Cutting Concerns

**目的**: 跨多個 User Story 的改進和驗證

- [ ] T015 [P] 建立 index.ts 導出檔案 in src/domain/aggregates/index.ts（導出 Video, Transcript, Section, Sentence, Highlight）
- [ ] T016 [P] 建立 index.ts 導出檔案 in src/domain/value-objects/index.ts（導出 TimeStamp, TimeRange, VideoMetadata）
- [ ] T017 [P] 建立 index.ts 導出檔案 in src/domain/repositories/index.ts（導出 IVideoRepository, ITranscriptRepository, IHighlightRepository）
- [ ] T018 [P] 建立 index.ts 導出檔案 in src/domain/services/index.ts（導出 HighlightService）
- [ ] T019 執行 TypeScript 型別檢查：npm run type-check（確保 100% 型別覆蓋率，無 any 型別）
- [ ] T020 執行 ESLint 檢查：npm run lint（確保程式碼符合專案規範）
- [ ] T021 驗證 quickstart.md 中的範例程式碼可正常執行

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無依賴 - 可立即開始
- **Foundational (Phase 2)**: 依賴 Setup 完成 - 阻塞所有實體實作
- **User Story 1 (Phase 3)**: 依賴 Foundational 完成（需要 VideoMetadata）
- **User Story 2 (Phase 4)**: 依賴 Foundational 完成（需要 TimeStamp, TimeRange）
- **User Story 3 (Phase 5)**: 依賴 User Story 2 完成（HighlightService 需要 Transcript 和 Sentence）
- **User Story 5 (Phase 6)**: 依賴 User Stories 1, 2, 3 完成（需要引用所有聚合根）
- **Polish (Phase 7)**: 依賴所有實作完成

### User Story Dependencies

- **User Story 4 (時間值物件)**: 在 Phase 2 (Foundational) 實作 - 所有實體的基礎
- **User Story 1 (Video)**: 可在 Phase 2 完成後開始 - 無其他 User Story 依賴
- **User Story 2 (Transcript)**: 可在 Phase 2 完成後開始 - 無其他 User Story 依賴
- **User Story 3 (Highlight)**: 必須在 User Story 2 完成後開始（HighlightService 需要 Transcript）
- **User Story 5 (Repository 介面)**: 必須在 User Stories 1, 2, 3 完成後開始

### Within Each Phase

- **Phase 2**: T003 (TimeStamp) 和 T004 (VideoMetadata) 可並行，T005 (TimeRange) 依賴 T003
- **Phase 3**: 單一任務 T006
- **Phase 4**: T007 (Sentence) 可先執行，T008 (Section) 依賴 T007，T009 (Transcript) 依賴 T007 和 T008
- **Phase 5**: T010 (Highlight) 必須在 T009 完成後執行，T011 (HighlightService) 依賴 T010 和 T009
- **Phase 6**: T012, T013, T014 可完全並行（不同介面檔案）
- **Phase 7**: T015-T018 可並行（不同 index.ts），T019-T021 依賴所有程式碼完成

### Parallel Opportunities

- **Phase 1**: T001 和 T002 可並行（不同資料夾）
- **Phase 2**: T003 和 T004 可並行，T005 需等待 T003
- **Phase 4**: T007 獨立，完成後 T008 開始
- **Phase 6**: T012, T013, T014 可完全並行
- **Phase 7**: T015, T016, T017, T018 可完全並行

**注意**: User Story 1 和 User Story 2 在 Foundational Phase 完成後可並行開發（由不同開發者），但 User Story 3 必須等待 User Story 2 完成

---

## Parallel Example: Phase 2 (Foundational)

```bash
# 同時啟動 TimeStamp 和 VideoMetadata（並行）:
Task: "實作 TimeStamp 值物件 in src/domain/value-objects/TimeStamp.ts"
Task: "實作 VideoMetadata 值物件 in src/domain/value-objects/VideoMetadata.ts"

# TimeStamp 完成後，啟動 TimeRange:
Task: "實作 TimeRange 值物件 in src/domain/value-objects/TimeRange.ts"
```

## Parallel Example: Phase 6 (Repository 介面)

```bash
# 同時啟動所有 Repository 介面（並行）:
Task: "定義 IVideoRepository 介面 in src/domain/repositories/IVideoRepository.ts"
Task: "定義 ITranscriptRepository 介面 in src/domain/repositories/ITranscriptRepository.ts"
Task: "定義 IHighlightRepository 介面 in src/domain/repositories/IHighlightRepository.ts"
```

## Parallel Example: Phase 7 (Index 檔案)

```bash
# 同時建立所有 index.ts（並行）:
Task: "建立 index.ts 導出檔案 in src/domain/aggregates/index.ts"
Task: "建立 index.ts 導出檔案 in src/domain/value-objects/index.ts"
Task: "建立 index.ts 導出檔案 in src/domain/repositories/index.ts"
Task: "建立 index.ts 導出檔案 in src/domain/services/index.ts"
```

---

## Implementation Strategy

### MVP First (僅 P1 User Stories)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational（User Story 4 的核心部分）
3. 完成 Phase 3: User Story 1（Video）
4. 完成 Phase 4: User Story 2（Transcript）
5. 完成 Phase 5: User Story 3（Highlight + HighlightService）
6. **STOP and VALIDATE**: 獨立測試所有 P1 User Stories
7. 此時已完成 MVP，所有核心業務實體可運作

### Incremental Delivery

1. Setup + Foundational → 基礎就緒
2. 添加 User Story 1 → 獨立測試 → Video 聚合可用
3. 添加 User Story 2 → 獨立測試 → Transcript 聚合可用（MVP 接近完成）
4. 添加 User Story 3 → 獨立測試 → Highlight 聚合可用（**MVP 完成！**）
5. 添加 User Story 5 → Repository 介面就緒，Infrastructure Layer 可開始實作
6. Polish → 整個 Domain Layer 完成

### Parallel Team Strategy

如果有多位開發者：

1. 團隊一起完成 Setup + Foundational
2. Foundational 完成後：
   - **Developer A**: User Story 1（Video）
   - **Developer B**: User Story 2（Transcript）→ 完成後接 User Story 3（Highlight）
3. 兩個 User Story 完成後：
   - **Developer A + B**: User Story 5（Repository 介面，可並行完成 3 個介面）
4. Polish 階段可並行執行多個任務

---

## Estimated Effort

根據 plan.md 的估算：

| Component | Tasks | Estimated Time | Priority |
|-----------|-------|---------------|----------|
| 值物件 (3 個) | T003-T005 | 2 小時 | P1 |
| Video (1 個) | T006 | 1 小時 | P1 |
| Transcript 聚合 (3 個) | T007-T009 | 4 小時 | P1 |
| Highlight 聚合 + Service (2 個) | T010-T011 | 3 小時 | P1 |
| Repository 介面 (3 個) | T012-T014 | 1 小時 | P2 |
| Setup + Polish | T001-T002, T015-T021 | 1 小時 | - |
| **Total** | **21 tasks** | **12 小時** | **~1.5 天** |

**MVP Scope** (P1 User Stories only): T001-T011 + T019-T021 = **14 tasks**, **~10 小時** (~1.25 天)

---

## Notes

- [P] 任務 = 不同檔案，無依賴，可並行執行
- [Story] 標籤將任務映射到特定 User Story，便於追蹤
- 每個 User Story 應可獨立完成和測試
- 在每個 Checkpoint 停下來獨立驗證 User Story
- 避免：模糊任務、相同檔案衝突、破壞獨立性的跨 Story 依賴
- **重要**: Highlight 聚合不包含需要 Transcript 參數的方法，使用 HighlightService 代替（符合 DDD 原則）
- **重要**: TimeStamp 使用毫秒（milliseconds）作為內部儲存，支援視頻播放所需的毫秒級精度
- 測試任務不包含在此階段，將在專案的 Phase 7（測試與部署）統一實作
- Domain Layer 不依賴任何外層技術（Vue, Pinia, axios 等），僅使用 TypeScript 標準庫
