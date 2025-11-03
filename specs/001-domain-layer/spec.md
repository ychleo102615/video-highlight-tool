# Feature Specification: Domain Layer - 核心業務實體與值物件

**Feature Branch**: `001-domain-layer`
**Created**: 2025-10-29
**Status**: Draft
**Input**: User description: "開發 Domain Layer - 定義核心業務實體、值物件和儲存庫介面"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 視頻實體管理 (Priority: P1)

開發團隊需要建立視頻實體來管理上傳的視頻文件,提供視頻元數據查詢,並驗證視頻是否準備好播放。這是整個系統的基礎,所有其他功能都依賴於此。

**Why this priority**: 這是系統的核心基礎實體,沒有視頻實體就無法進行後續的轉錄和高光編輯功能。它是最小可行產品(MVP)的起點。

**Independent Test**: 可以通過建立一個 Video 實體實例,驗證其屬性(id, file, metadata, url)是否正確設定,並測試 `isReady` 和 `duration` getter 方法是否返回預期值。

**Acceptance Scenarios**:

1. **Given** 一個視頻文件和元數據,**When** 建立 Video 實體,**Then** 實體包含正確的 id、file、metadata 和可選的 url
2. **Given** 一個已建立的 Video 實體,**When** 調用 duration getter,**Then** 返回正確的視頻時長(秒數)
3. **Given** 一個已建立的 Video 實體,**When** 調用 isReady getter,**Then** 根據 url 是否存在返回正確的布林值
4. **Given** 一個 Video 實體,**When** url 屬性被設定,**Then** isReady 變為 true

---

### User Story 2 - 轉錄聚合與句子管理 (Priority: P1)

開發團隊需要建立 Transcript 聚合來組織和查詢視頻轉錄內容,包括段落(Section)和句子(Sentence)的結構化管理。系統必須確保轉錄數據的唯讀性和完整性。

**Why this priority**: 轉錄內容是用戶編輯高光片段的基礎數據,與 P1 的視頻實體同等重要。沒有轉錄功能,用戶無法選擇和編輯高光片段。

**Independent Test**: 可以通過建立 Transcript 實體(包含多個 Section 和 Sentence),測試 `getSentenceById`、`getAllSentences`、`getSectionById` 等查詢方法是否正確返回數據,並驗證 sections 和 sentences 的唯讀性。

**Acceptance Scenarios**:

1. **Given** 一個包含多個 Section 的 Transcript,**When** 調用 getSentenceById,**Then** 返回對應 ID 的 Sentence 或 undefined
2. **Given** 一個 Transcript 實體,**When** 調用 getAllSentences,**Then** 返回所有 Section 中的句子扁平化陣列
3. **Given** 一個 Transcript 實體,**When** 調用 getSectionById,**Then** 返回對應 ID 的 Section 或 undefined
4. **Given** 一個 Transcript 實體,**When** 嘗試修改 sections 或 sentences 屬性,**Then** TypeScript 編譯錯誤(readonly 保護)
5. **Given** 一個 Section 實體,**When** 調用 timeRange getter,**Then** 返回從第一個句子到最後一個句子的時間範圍

---

### User Story 3 - 高光選擇管理 (Priority: P1)

開發團隊需要建立 Highlight 聚合來管理「哪些句子被選中」的關係,支援添加、移除、切換句子選擇狀態,並記錄選擇順序。系統必須支援一個視頻多個高光版本。

**Why this priority**: 高光選擇是用戶的核心操作,與視頻和轉錄同等重要。這三個聚合(Video, Transcript, Highlight)構成了完整的 MVP。

**Independent Test**: 可以通過建立 Highlight 實體,測試 `addSentence`、`removeSentence`、`toggleSentence`、`isSelected` 方法是否正確管理選擇狀態,並驗證 `getSelectedSentences`、`getTimeRanges`、`getTotalDuration` 方法是否正確計算結果。

**Acceptance Scenarios**:

1. **Given** 一個新建立的 Highlight,**When** 調用 addSentence,**Then** 句子 ID 被添加到選擇集合,並記錄在 selectionOrder 中
2. **Given** 一個包含選中句子的 Highlight,**When** 調用 removeSentence,**Then** 句子 ID 從選擇集合和 selectionOrder 中移除
3. **Given** 一個 Highlight,**When** 調用 toggleSentence 兩次同一個 ID,**Then** 第一次添加,第二次移除
4. **Given** 一個 Highlight 和 Transcript,**When** 調用 getSelectedSentences with sortBy='selection',**Then** 返回按選擇順序排序的句子陣列
5. **Given** 一個 Highlight 和 Transcript,**When** 調用 getSelectedSentences with sortBy='time',**Then** 返回按時間順序排序的句子陣列
6. **Given** 一個 Highlight 和 Transcript,**When** 調用 getTotalDuration,**Then** 返回所有選中句子的總時長(秒數)
7. **Given** 一個 Highlight 和 Transcript,**When** 調用 getTimeRanges,**Then** 返回所有選中句子的 TimeRange 陣列

---

### User Story 4 - 時間值物件 (Priority: P2)

開發團隊需要建立 TimeStamp 和 TimeRange 值物件來表示時間點和時間範圍,提供驗證、格式化和計算功能。這確保了時間數據的一致性和正確性。

**Why this priority**: 時間值物件是支援其他實體(Sentence, Section, Highlight)的基礎設施,但不直接影響核心業務流程。可以在 P1 實體完成後再實作。

**Independent Test**: 可以通過建立 TimeStamp 和 TimeRange 實例,測試 `toString`、`fromString`、`duration`、`contains` 等方法是否正確工作,並驗證驗證規則(負數檢查、範圍檢查)是否生效。

**Acceptance Scenarios**:

1. **Given** 一個秒數,**When** 建立 TimeStamp,**Then** 實體包含正確的 seconds 屬性
2. **Given** 一個 TimeStamp,**When** 調用 toString,**Then** 返回 "MM:SS" 格式的字串
3. **Given** 一個 "MM:SS" 格式字串,**When** 調用 TimeStamp.fromString,**Then** 返回對應的 TimeStamp 實例
4. **Given** 負數秒數,**When** 建立 TimeStamp,**Then** 拋出驗證錯誤
5. **Given** start 和 end TimeStamp,**When** 建立 TimeRange,**Then** 實體包含正確的 start 和 end
6. **Given** 一個 TimeRange,**When** 調用 duration getter,**Then** 返回 end - start 的秒數
7. **Given** 一個 TimeRange 和 TimeStamp,**When** 調用 contains,**Then** 返回該時間是否在範圍內的布林值
8. **Given** end 早於 start,**When** 建立 TimeRange,**Then** 拋出驗證錯誤

---

### User Story 5 - 儲存庫介面定義 (Priority: P2)

開發團隊需要定義 IVideoRepository、ITranscriptRepository、IHighlightRepository 介面,規範聚合根的儲存和查詢操作。這些介面將由 Infrastructure Layer 實作。

**Why this priority**: 介面定義不影響核心業務邏輯,可以在實體定義完成後再進行。但必須在 Infrastructure Layer 開發前完成。

**Independent Test**: 可以通過檢查介面定義是否包含所需的方法簽名(save, findById, findByVideoId 等),並驗證這些方法的輸入輸出型別是否正確。

**Acceptance Scenarios**:

1. **Given** IVideoRepository 介面,**When** 檢查方法簽名,**Then** 包含 save(video: Video) 和 findById(id: string) 方法
2. **Given** ITranscriptRepository 介面,**When** 檢查方法簽名,**Then** 包含 save、findById、findByVideoId 方法
3. **Given** IHighlightRepository 介面,**When** 檢查方法簽名,**Then** 包含 save、findById、findByVideoId 方法
4. **Given** 所有 Repository 介面,**When** 檢查方法返回型別,**Then** 所有查詢方法返回 Promise 型別

---

### Edge Cases

- **視頻實體 - 缺少 URL**: 當 Video 實體的 url 為 undefined 時,`isReady` 應返回 false,系統不應嘗試播放視頻
- **轉錄查詢 - 不存在的 ID**: 當調用 `getSentenceById` 或 `getSectionById` 時傳入不存在的 ID,應返回 undefined 而非拋出錯誤
- **高光選擇 - 重複添加**: 當調用 `addSentence` 添加已存在的句子 ID 時,應該忽略(Set 特性自動處理),但不應重複添加到 selectionOrder
- **高光選擇 - 空選擇**: 當 Highlight 沒有選中任何句子時,`getSelectedSentences` 應返回空陣列,`getTotalDuration` 應返回 0
- **時間值物件 - 邊界值**: 當 TimeStamp 的 seconds 為 0 時應該合法,toString 應返回 "00:00"
- **時間範圍 - 相同時間**: 當 TimeRange 的 start 和 end 相同時,duration 應為 0,且合法
- **跨聚合查詢 - Transcript 不存在**: 當 Highlight 調用 `getSelectedSentences` 但傳入的 Transcript 不包含選中的句子 ID 時,應該過濾掉不存在的句子,而非拋出錯誤

## Requirements _(mandatory)_

### Functional Requirements

#### 視頻實體 (Video Aggregate Root)

- **FR-001**: 系統必須定義 Video 實體類別,包含屬性:id (string), file (File), metadata (VideoMetadata), url (string, optional)
- **FR-002**: Video 實體必須提供 `duration` getter 方法,返回視頻時長(秒數)
- **FR-003**: Video 實體必須提供 `isReady` getter 方法,根據 url 是否存在返回布林值
- **FR-004**: Video 實體必須使用 VideoMetadata 值物件來封裝元數據(時長、尺寸等)

#### 轉錄聚合 (Transcript Aggregate)

- **FR-005**: 系統必須定義 Transcript 實體類別(Aggregate Root),包含屬性:id, videoId, sections (ReadonlyArray<Section>), fullText
- **FR-006**: Transcript 實體必須提供 `getSentenceById(sentenceId: string)` 方法,返回對應的 Sentence 或 undefined
- **FR-007**: Transcript 實體必須提供 `getAllSentences()` 方法,返回所有 Section 中的句子扁平化陣列
- **FR-008**: Transcript 實體必須提供 `getSectionById(sectionId: string)` 方法,返回對應的 Section 或 undefined
- **FR-009**: Transcript 的 sections 和 sentences 屬性必須宣告為 ReadonlyArray,確保外部無法直接修改
- **FR-010**: 系統必須定義 Section 實體類別,包含屬性:id, title, sentences (ReadonlyArray<Sentence>)
- **FR-011**: Section 實體必須提供 `timeRange` getter 方法,返回從第一個句子到最後一個句子的 TimeRange
- **FR-012**: 系統必須定義 Sentence 實體類別,包含屬性:id, text, timeRange (TimeRange), isHighlightSuggestion (boolean)
- **FR-013**: Sentence 實體不得包含 `isSelected` 屬性(該狀態由 Highlight 聚合管理)

#### 高光聚合 (Highlight Aggregate)

- **FR-014**: 系統必須定義 Highlight 實體類別(Aggregate Root),包含屬性:id, videoId, name, selectedSentenceIds (Set<string>), selectionOrder (string[])
- **FR-015**: Highlight 實體必須提供 `addSentence(sentenceId: string)` 方法,將句子 ID 添加到選擇集合並記錄順序
- **FR-016**: Highlight 實體必須提供 `removeSentence(sentenceId: string)` 方法,從選擇集合和順序記錄中移除句子 ID
- **FR-017**: Highlight 實體必須提供 `toggleSentence(sentenceId: string)` 方法,切換句子的選中狀態
- **FR-018**: Highlight 實體必須提供 `isSelected(sentenceId: string)` 方法,返回句子是否被選中的布林值
- **FR-019**: Highlight 實體必須提供 `getSelectedSentences(transcript: Transcript, sortBy: 'selection' | 'time')` 方法,返回選中的句子陣列
- **FR-020**: Highlight 實體必須提供 `getTimeRanges(transcript: Transcript, sortBy: 'selection' | 'time')` 方法,返回選中句子的 TimeRange 陣列
- **FR-021**: Highlight 實體必須提供 `getTotalDuration(transcript: Transcript)` 方法,返回所有選中句子的總時長(秒數)
- **FR-022**: 當 sortBy='selection' 時,返回的句子必須按選擇順序排序
- **FR-023**: 當 sortBy='time' 時,返回的句子必須按時間順序(startTime)排序

#### 時間值物件 (Value Objects)

- **FR-024**: 系統必須定義 TimeStamp 值物件類別,包含屬性:seconds (number)
- **FR-025**: TimeStamp 必須驗證 seconds 不可為負數,否則拋出錯誤
- **FR-026**: TimeStamp 必須提供 `toString()` 方法,返回 "MM:SS" 格式的字串
- **FR-027**: TimeStamp 必須提供靜態方法 `fromString(timeString: string): TimeStamp`,從 "MM:SS" 格式字串解析
- **FR-028**: 系統必須定義 TimeRange 值物件類別,包含屬性:start (TimeStamp), end (TimeStamp)
- **FR-029**: TimeRange 必須驗證 end 不可早於 start,否則拋出錯誤
- **FR-030**: TimeRange 必須提供 `duration` getter 方法,返回 end - start 的秒數
- **FR-031**: TimeRange 必須提供 `contains(timestamp: TimeStamp)` 方法,檢查時間是否在範圍內
- **FR-032**: 系統必須定義 VideoMetadata 值物件類別,封裝視頻的元數據(時長、尺寸、格式等)

#### 儲存庫介面 (Repository Interfaces)

- **FR-033**: 系統必須定義 IVideoRepository 介面,包含方法:save(video: Video): Promise<void>, findById(id: string): Promise<Video | null>
- **FR-034**: 系統必須定義 ITranscriptRepository 介面,包含方法:save, findById, findByVideoId(videoId: string): Promise<Transcript | null>
- **FR-035**: 系統必須定義 IHighlightRepository 介面,包含方法:save, findById, findByVideoId(videoId: string): Promise<Highlight[]>
- **FR-036**: 所有 Repository 介面的查詢方法必須返回 Promise 型別,以支援非同步操作

### Key Entities

- **Video (Aggregate Root)**: 代表上傳的視頻文件,包含視頻元數據和播放準備狀態。關聯 VideoMetadata 值物件。
- **Transcript (Aggregate Root)**: 代表視頻的轉錄內容,包含多個 Section。提供唯讀查詢介面,確保數據不可變性。
- **Section (Entity)**: 屬於 Transcript 聚合,代表轉錄的一個段落,包含標題和多個 Sentence。
- **Sentence (Entity)**: 屬於 Transcript 聚合,代表轉錄的一個句子,包含文字、時間範圍和 AI 建議標記。
- **Highlight (Aggregate Root)**: 代表用戶建立的高光版本,管理「哪些句子被選中」的關係。通過 ID 引用 Sentence,避免跨聚合直接引用。
- **TimeStamp (Value Object)**: 代表一個時間點,提供格式化和解析功能,確保時間值的合法性。
- **TimeRange (Value Object)**: 代表一個時間範圍,提供時長計算和包含檢查功能,確保範圍的合法性。
- **VideoMetadata (Value Object)**: 封裝視頻的元數據(時長、尺寸、格式等),作為 Video 實體的屬性。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 所有實體類別(Video, Transcript, Section, Sentence, Highlight)都能成功實例化,且屬性型別符合 TypeScript 定義
- **SC-002**: 所有值物件(TimeStamp, TimeRange, VideoMetadata)的驗證規則能正確阻止非法數據(例如:負數時間、錯誤的時間範圍)
- **SC-003**: Transcript 聚合的查詢方法(getSentenceById, getAllSentences, getSectionById)能在 O(n) 時間複雜度內完成查詢(n 為句子或段落總數)
- **SC-004**: Highlight 聚合的選擇管理方法(addSentence, removeSentence, toggleSentence)能在 O(1) 時間複雜度內完成操作(得益於 Set 數據結構)
- **SC-005**: Highlight 聚合的跨聚合查詢方法(getSelectedSentences, getTimeRanges, getTotalDuration)能正確協調 Transcript 數據,返回準確結果
- **SC-006**: 所有 Repository 介面定義完整,方法簽名清晰,能夠被 Infrastructure Layer 正確實作
- **SC-007**: Domain Layer 程式碼不包含任何外層依賴(UI 框架、HTTP 客戶端、狀態管理等),確保純粹的業務邏輯實作
- **SC-008**: 單元測試覆蓋率達到 90% 以上,關鍵業務邏輯(選擇管理、時間計算、驗證規則)100% 覆蓋
- **SC-009**: TypeScript 型別覆蓋率達到 100%,無 any 型別,所有公開 API 都有明確的型別定義
- **SC-010**: 程式碼符合 Clean Architecture 和 DDD 原則,聚合邊界清晰,依賴方向正確(內層不依賴外層)

## Assumptions

1. **時間格式假設**: 假設 TimeStamp 的 toString 方法使用 "MM:SS" 格式(分鐘:秒),適用於視頻時長在 1 小時以內的場景。如需支援更長視頻,可擴展為 "HH:MM:SS" 格式。

2. **ID 生成假設**: 假設實體的 ID(如 videoId, sentenceId)由外部生成並傳入(例如使用 UUID),Domain Layer 不負責 ID 生成邏輯。

3. **File 型別假設**: 假設 Video 實體使用瀏覽器原生的 File 型別來表示視頻文件,這是 Web 平台的標準做法。

4. **唯讀性實作假設**: 假設使用 TypeScript 的 ReadonlyArray 和 readonly 修飾符來確保數據不可變性,這在編譯時提供保護,但不防止運行時強制修改(需要通過程式碼審查和測試確保)。

5. **查詢效能假設**: 假設單個 Transcript 的句子總數在 1000 以內,Section 總數在 50 以內,因此 O(n) 查詢效能可接受。如需支援更大規模數據,可考慮建立索引。

6. **跨聚合引用假設**: 假設 Highlight 通過 ID 引用 Sentence,查詢時需要傳入 Transcript 實例。這符合 DDD 原則,避免聚合間直接引用,但需要在 Application Layer 協調兩個聚合的查詢。

7. **重複選擇處理假設**: 假設當用戶重複添加同一個句子時,系統自動忽略(Set 特性),不拋出錯誤,不重複記錄在 selectionOrder 中。這提供更友好的用戶體驗。

8. **排序邏輯假設**: 假設「時間順序」排序基於 Sentence 的 timeRange.start,而非 selectionOrder。這確保播放時的自然順序。

9. **驗證錯誤處理假設**: 假設值物件的驗證錯誤拋出標準的 Error 或自定義的 ValidationError,由上層捕獲處理。具體錯誤類別由實作時決定。

10. **Repository 非同步假設**: 假設所有 Repository 方法返回 Promise,即使當前實作使用記憶體儲存(同步),這為未來替換為非同步儲存(如 IndexedDB、API)預留擴展性。

## Constraints

1. **技術約束**: Domain Layer 不得依賴任何外層技術(Vue, Pinia, axios, video.js 等),只能使用 TypeScript 標準庫和少量工具函式(如 lodash、date-fns,但建議最小化)。

2. **語言約束**: 必須使用 TypeScript 編寫,型別覆蓋率 100%,無 any 型別。

3. **架構約束**: 必須遵循 Clean Architecture 的依賴規則:Domain Layer 是最內層,不依賴 Application、Infrastructure、Presentation 層。

4. **DDD 約束**:
   - 只有 Aggregate Root 才有 Repository 介面
   - Aggregate 內的 Entity(如 Section, Sentence)不能有獨立的 Repository
   - 聚合之間通過 ID 引用,避免直接引用

5. **不可變性約束**: Transcript 聚合生成後內容不可變,必須使用 readonly 修飾符確保編譯時保護。

6. **測試約束**: 所有實體和值物件必須可單元測試,不依賴外部環境或 Mock。

7. **檔案組織約束**:
   - 實體必須放在 `src/domain/aggregates/` 或 `src/domain/entities/`
   - 值物件必須放在 `src/domain/value-objects/`
   - Repository 介面必須放在 `src/domain/repositories/`

8. **命名約束**:
   - Aggregate Root 類別名稱不需後綴(如 Video, Transcript, Highlight)
   - Repository 介面以 I 開頭(如 IVideoRepository)
   - 值物件使用名詞(如 TimeStamp, TimeRange)

## Out of Scope

1. **Repository 實作**: Infrastructure Layer 負責實作 Repository 介面,不在此階段範圍內。
2. **Use Case 實作**: Application Layer 負責編排 Domain 邏輯,不在此階段範圍內。
3. **UI 組件**: Presentation Layer 負責 UI 展示,不在此階段範圍內。
4. **API 服務**: Mock AI Service 和 File Storage Service 屬於 Infrastructure Layer,不在此階段範圍內。
5. **狀態管理**: Pinia Stores 屬於 Presentation Layer,不在此階段範圍內。
6. **視頻播放邏輯**: 視頻播放器控制邏輯屬於 Presentation Layer,不在此階段範圍內。
7. **數據持久化**: IndexedDB 或記憶體儲存的實作細節屬於 Infrastructure Layer,不在此階段範圍內。
8. **錯誤處理策略**: 全域錯誤處理和用戶提示屬於 Application 和 Presentation 層,Domain Layer 只拋出驗證錯誤。
9. **效能優化**: 快取、懶加載等效能優化策略在後續階段考慮,此階段專注於正確性。
10. **多語言支援**: 國際化(i18n)不在此階段範圍內。

## Dependencies

1. **TypeScript**: 必須安裝並配置 TypeScript 5.0+ 版本,確保強型別支援。
2. **Vite 專案環境**: Domain Layer 程式碼必須在 Vite + Vue 3 專案中建立,遵循專案的資料夾結構。
3. **測試框架**: 需要 Vitest 來撰寫單元測試(在 Phase 7 使用,但此階段需考慮可測試性)。
4. **TECHNICAL_DESIGN.md**: 必須參考該文件中的 Domain Layer 設計章節,確保實作符合架構規範。
5. **REQUIREMENTS.md**: 必須參考該文件中的 Phase 2 任務清單,確保所有任務項目都被覆蓋。

## Related Features

- **Phase 3 - Application Layer**: 將使用 Domain Layer 定義的實體和 Repository 介面來實作 Use Cases。
- **Phase 4 - Infrastructure Layer**: 將實作 Domain Layer 定義的 Repository 介面,提供實際的儲存功能。
- **Phase 5 - Presentation Layer**: 將使用 Domain Layer 的實體類別來管理和展示數據。
- **Phase 7 - 測試與部署**: 將為 Domain Layer 撰寫完整的單元測試。

## Notes

- **重要**: Domain Layer 是整個系統的基礎,必須保持純粹的業務邏輯,不包含任何技術細節或框架依賴。
- **設計原則**: 遵循 DDD 的 Aggregate 模式,確保聚合邊界清晰,業務規則由 Aggregate Root 統一管理。
- **跨聚合協調**: Highlight 和 Transcript 的協調(如 getSelectedSentences)展示了 DDD 中跨聚合查詢的模式,這種模式將在 Application Layer 的 Use Cases 中被廣泛使用。
- **可擴展性**: 雖然當前設計針對單個高光版本,但 Highlight 聚合已支援一個視頻多個高光版本,為未來功能擴展預留空間。
- **不可變性**: Transcript 的唯讀設計反映了「AI 生成的數據不可修改」的業務規則,這是 DDD 中業務規則編碼到型別系統的典範。
