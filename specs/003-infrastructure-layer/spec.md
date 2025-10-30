# Feature Specification: Infrastructure Layer Implementation

**Feature Branch**: `003-infrastructure-layer`
**Created**: 2025-10-30
**Status**: Draft
**Input**: User description: "@README.md @TECHNICAL_DESIGN.md 參考 @REQUIREMENTS.md ## 開發任務清單 Phase 4: Infrastructure Layer 接下來我們要開發的是基礎建設層，是實際操作影片檔案系統、與 API 交互的地方。目前影片不會真的上傳，也不會真的呼叫 API 來獲取資料。API 的結果可以是透過讀取其他地方已經存在的假檔案，並將結果回傳。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mock AI Transcript Generation (Priority: P1)

開發者需要模擬 AI 處理流程，當系統接收到視頻 ID 時，能夠返回完整的轉錄資料（包含段落、句子、時間戳和高光建議），無需真實的 AI API 調用。

**Why this priority**: 這是整個系統的核心資料來源，沒有轉錄資料就無法進行後續的高光編輯功能。作為最關鍵的基礎設施，必須最優先實作。

**Independent Test**: 可以透過單元測試獨立驗證：調用 Mock AI Service 並傳入視頻 ID，驗證返回的 JSON 數據結構是否符合 TranscriptDTO 格式，包含所有必要欄位和合理的時間戳。

**Acceptance Scenarios**:

1. **Given** 系統已啟動且 Mock 資料檔案存在, **When** 調用 MockAIService.generate(videoId), **Then** 系統返回包含完整轉錄的 TranscriptDTO 物件，包含段落標題、句子文字、時間戳和高光建議
2. **Given** Mock 資料包含 3 個段落共 15 個句子, **When** 開發者調用生成方法, **Then** 返回的資料結構完整保留所有段落和句子，並且時間戳按時間順序排列
3. **Given** 系統模擬網路延遲, **When** 調用生成方法, **Then** 系統在 1.5 秒後返回結果（模擬真實 API 延遲）

---

### User Story 2 - Video File Storage Management (Priority: P1)

開發者需要在瀏覽器本地環境中儲存和管理視頻檔案，生成可訪問的 URL 供播放器使用，並在不需要時釋放資源。

**Why this priority**: 視頻檔案管理是視頻播放的前提條件，與 Mock AI Service 同等重要。沒有有效的檔案儲存機制，就無法實現視頻上傳和播放功能。

**Independent Test**: 可以透過單元測試獨立驗證：創建一個 File 物件，調用 FileStorageService.save()，驗證返回的 URL 是否為有效的 blob URL，並確認可以用於視頻元素的 src 屬性。

**Acceptance Scenarios**:

1. **Given** 用戶上傳了一個視頻檔案, **When** 系統調用 FileStorageService.save(file), **Then** 系統返回一個有效的 blob URL（格式為 "blob:http://..."）
2. **Given** 視頻檔案已儲存並生成 URL, **When** 系統調用 FileStorageService.delete(url), **Then** 系統成功釋放該 URL 資源，並且該 URL 不再可用
3. **Given** 多個視頻檔案同時上傳, **When** 系統為每個檔案生成 URL, **Then** 每個 URL 都是唯一的且可獨立管理

---

### User Story 3 - Video Repository Data Persistence (Priority: P2)

開發者需要在記憶體中持久化 Video Entity，支援儲存和查詢操作，確保視頻資料在應用生命週期內可用。

**Why this priority**: 資料持久化是應用狀態管理的基礎，但相較於資料來源（Mock AI）和檔案管理，可以在稍後階段實作，因為初期可以用臨時變數測試。

**Independent Test**: 可以透過單元測試獨立驗證：創建一個 Video Entity，儲存到 Repository，然後透過 ID 查詢，驗證返回的 Entity 與原始 Entity 相同。

**Acceptance Scenarios**:

1. **Given** Video Entity 已創建, **When** 調用 VideoRepository.save(video), **Then** 視頻資料成功儲存到記憶體中
2. **Given** 視頻已儲存, **When** 調用 VideoRepository.findById(id), **Then** 系統返回對應的 Video Entity
3. **Given** 查詢不存在的視頻 ID, **When** 調用 findById(), **Then** 系統返回 null 而不拋出錯誤

---

### User Story 4 - Transcript Repository Data Persistence (Priority: P2)

開發者需要在記憶體中持久化 Transcript Entity（包含 Section 和 Sentence），支援按視頻 ID 查詢轉錄資料。

**Why this priority**: 與 Video Repository 同等重要，但可以並行開發，因此列為 P2。轉錄資料的儲存和查詢是實現編輯功能的基礎。

**Independent Test**: 可以透過單元測試獨立驗證：創建一個 Transcript Entity，儲存到 Repository，然後透過視頻 ID 查詢，驗證返回的 Transcript 包含完整的 Section 和 Sentence 結構。

**Acceptance Scenarios**:

1. **Given** Transcript Entity 已從 Mock AI Service 生成, **When** 調用 TranscriptRepository.save(transcript), **Then** 轉錄資料成功儲存
2. **Given** 轉錄資料已儲存, **When** 調用 TranscriptRepository.findByVideoId(videoId), **Then** 系統返回對應的 Transcript Entity
3. **Given** 查詢不存在的視頻 ID, **When** 調用 findByVideoId(), **Then** 系統返回 null

---

### User Story 5 - Highlight Repository Data Persistence (Priority: P3)

開發者需要在記憶體中持久化 Highlight Entity，支援儲存、查詢和按視頻 ID 篩選多個高光版本。

**Why this priority**: 高光功能依賴於視頻和轉錄資料已存在，因此可以在最後階段實作。但這是完整功能的必要組成部分。

**Independent Test**: 可以透過單元測試獨立驗證：創建多個 Highlight Entity（關聯到同一個視頻），儲存到 Repository，然後透過視頻 ID 查詢，驗證返回所有相關的 Highlight。

**Acceptance Scenarios**:

1. **Given** Highlight Entity 已創建, **When** 調用 HighlightRepository.save(highlight), **Then** 高光資料成功儲存
2. **Given** 多個高光關聯到同一個視頻, **When** 調用 HighlightRepository.findByVideoId(videoId), **Then** 系統返回所有相關的 Highlight Entity 陣列
3. **Given** 特定高光 ID, **When** 調用 HighlightRepository.findById(id), **Then** 系統返回對應的 Highlight Entity

---

### Edge Cases

- **Mock 資料檔案不存在時**: MockAIService 應提供內建的預設資料，確保系統在任何情況下都能返回有效的轉錄結構
- **視頻 ID 不存在時的查詢**: 所有 Repository 的查詢方法應一致返回 null，而不是拋出例外
- **重複儲存相同 ID 的 Entity**: Repository 應覆蓋舊資料（Map.set 行為），確保資料一致性
- **記憶體資料遺失（頁面重新整理）**: 系統應能優雅處理，因為這是展示型專案，不需要實作 IndexedDB 或 LocalStorage
- **blob URL 生命週期管理**: 確保在組件卸載或不再需要時調用 URL.revokeObjectURL()，避免記憶體洩漏
- **Mock AI 延遲過長導致用戶等待**: 延遲時間設為 1.5 秒，足以模擬真實 API 體驗但不會讓用戶感到明顯卡頓

## Requirements *(mandatory)*

### Functional Requirements

#### Mock AI Service

- **FR-001**: MockAIService MUST 實作 ITranscriptGenerator 介面，提供 generate(videoId: string) 方法
- **FR-002**: generate() 方法 MUST 返回符合 TranscriptDTO 格式的 JSON 數據，包含 fullText、sections、sentences、startTime、endTime 和 isHighlight 欄位
- **FR-003**: MockAIService MUST 模擬 1.5 秒的處理延遲（使用 setTimeout 或 Promise.delay）
- **FR-004**: MockAIService MUST 提供至少 2-3 組不同主題的 Mock 資料（例如：技術分享、產品介紹、教學視頻）
- **FR-005**: Mock 資料中的句子時間戳 MUST 按時間順序排列，且不重疊（endTime[n] <= startTime[n+1]）
- **FR-006**: Mock 資料 MUST 包含建議高光句子的標記（isHighlight: true），佔總句子數的 20-30%

#### File Storage Service

- **FR-007**: FileStorageService MUST 實作 IFileStorage 介面，提供 save(file: File) 和 delete(url: string) 方法
- **FR-008**: save() 方法 MUST 使用 URL.createObjectURL() 生成本地 blob URL
- **FR-009**: delete() 方法 MUST 使用 URL.revokeObjectURL() 釋放資源
- **FR-010**: save() 方法 MUST 返回有效的 URL 字串（格式：blob:http://...）

#### Video Repository

- **FR-011**: VideoRepositoryImpl MUST 實作 IVideoRepository 介面，提供 save() 和 findById() 方法
- **FR-012**: Repository MUST 使用 Map<string, Video> 作為記憶體儲存結構
- **FR-013**: save() 方法 MUST 覆蓋已存在的相同 ID 的 Video Entity
- **FR-014**: findById() 方法 MUST 在查詢不存在的 ID 時返回 null

#### Transcript Repository

- **FR-015**: TranscriptRepositoryImpl MUST 實作 ITranscriptRepository 介面
- **FR-016**: Repository MUST 使用 Map<string, Transcript> 作為記憶體儲存結構
- **FR-017**: Repository MUST 提供 findByVideoId(videoId: string) 方法，支援按視頻 ID 查詢

#### Highlight Repository

- **FR-018**: HighlightRepositoryImpl MUST 實作 IHighlightRepository 介面
- **FR-019**: Repository MUST 使用 Map<string, Highlight> 作為記憶體儲存結構
- **FR-020**: Repository MUST 提供 findByVideoId(videoId: string) 方法，返回所有關聯到該視頻的 Highlight Entity 陣列

### Key Entities

- **TranscriptDTO**: 資料傳輸物件，包含完整轉錄文字（fullText）、段落陣列（sections）、段落標題（title）、句子陣列（sentences）、句子文字（text）、時間範圍（startTime, endTime）和高光建議標記（isHighlight）
- **ITranscriptGenerator**: 輸出埠介面，定義 generate() 方法，由 MockAIService 實作
- **IFileStorage**: 輸出埠介面，定義 save() 和 delete() 方法，由 FileStorageService 實作
- **IVideoRepository**: Domain Layer 定義的儲存庫介面，由 VideoRepositoryImpl 實作
- **ITranscriptRepository**: Domain Layer 定義的儲存庫介面，由 TranscriptRepositoryImpl 實作
- **IHighlightRepository**: Domain Layer 定義的儲存庫介面，由 HighlightRepositoryImpl 實作

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Mock AI Service 能在 2 秒內返回包含至少 5 個段落和 15 個句子的轉錄資料
- **SC-002**: 所有 Repository 操作（save 和 findById）的執行時間少於 10 毫秒（記憶體操作）
- **SC-003**: FileStorageService 能成功為上傳的視頻檔案生成有效的 blob URL，並可用於 HTML5 video 元素播放
- **SC-004**: 開發者能透過單元測試獨立驗證每個 Repository 的 CRUD 操作，測試覆蓋率達到 90% 以上
- **SC-005**: Mock 資料的時間戳合理反映自然說話節奏（平均每個句子 3-5 秒），無時間重疊或異常跳躍
- **SC-006**: 系統能正確處理邊界情況（如查詢不存在的 ID），返回 null 而不拋出未處理的例外
- **SC-007**: blob URL 資源能在不需要時被正確釋放，避免記憶體洩漏（可透過 Chrome DevTools Memory Profiler 驗證）

## Assumptions

- Mock 資料將以 TypeScript 常數或 JSON 檔案形式存在於 `infrastructure/api/mock-data/` 目錄
- 記憶體儲存足以滿足展示型專案需求，不需要實作 IndexedDB 或 LocalStorage
- Mock AI 延遲時間設為 1.5 秒，足以模擬真實 API 體驗但不會讓用戶感到明顯卡頓
- 視頻檔案儲存使用瀏覽器原生 URL.createObjectURL()，無需實作上傳至伺服器的功能
- 所有 Repository 使用 Map 作為儲存結構，提供 O(1) 的查詢性能
- 專案採用 Clean Architecture，Infrastructure Layer 僅實作 Domain Layer 定義的介面，不包含業務邏輯
- 依賴注入將在後續階段（Presentation Layer）配置，Infrastructure Layer 僅提供實作類別
- Mock 資料的句子 ID 格式為 "sent_1", "sent_2"，段落 ID 格式為 "sec_1", "sec_2"，確保唯一性

## Out of Scope

- 真實 AI API 整合（如 OpenAI Whisper、Google Speech-to-Text）
- 視頻檔案上傳至雲端儲存（AWS S3、Azure Blob Storage）
- 持久化儲存實作（IndexedDB、LocalStorage、SessionStorage）
- 視頻檔案格式驗證和轉換
- 錯誤日誌和監控系統
- Repository 的分頁查詢功能
- 資料庫遷移和版本控制
- 多租戶支援和資料隔離
- 視頻檔案壓縮和優化
