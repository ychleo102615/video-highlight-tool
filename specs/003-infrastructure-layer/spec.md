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

### User Story 6 - Basic Persistence for Accidental Refresh (Priority: P2)

開發者需要實作基本持久化機制，防止用戶誤刷新導致工作遺失。小於 50MB 的視頻會儲存在 IndexedDB，大視頻則僅儲存元資料（視頻名稱、ID、轉錄、選擇狀態）在 SessionStorage。

**Why this priority**: 提升用戶體驗，防止常見的誤操作導致工作損失。這是額外的保護機制，不影響核心功能，因此列為 P2。

**Independent Test**: 可以透過整合測試獨立驗證：上傳視頻並編輯高光，模擬頁面刷新（重新載入應用），驗證是否能正確恢復狀態（小視頻完整恢復，大視頻提示重新上傳但保留編輯狀態）。

**Acceptance Scenarios**:

1. **Given** 用戶上傳了 30MB 視頻並編輯高光, **When** 按 F5 刷新頁面, **Then** 視頻檔案、轉錄資料和選擇狀態完整恢復，用戶可以繼續編輯
2. **Given** 用戶上傳了 80MB 視頻並編輯高光, **When** 刷新頁面, **Then** 系統提示「檢測到未完成的編輯，請重新上傳視頻 "filename.mp4"」，轉錄和選擇狀態保留
3. **Given** 用戶關閉瀏覽器 Tab, **When** 重新開啟應用, **Then** 所有資料清空（SessionStorage 和 IndexedDB 中的臨時資料被清除），用戶從全新狀態開始

---

### Edge Cases

- **Mock 資料檔案不存在時**: MockAIService 應提供內建的預設資料，確保系統在任何情況下都能返回有效的轉錄結構
- **視頻 ID 不存在時的查詢**: 所有 Repository 的查詢方法應一致返回 null，而不是拋出例外
- **重複儲存相同 ID 的 Entity**: Repository 應覆蓋舊資料（Map.set 行為），確保資料一致性
- **blob URL 生命週期管理**: 確保在組件卸載或不再需要時調用 URL.revokeObjectURL()，避免記憶體洩漏
- **Mock AI 延遲過長導致用戶等待**: 延遲時間設為 1.5 秒，足以模擬真實 API 體驗但不會讓用戶感到明顯卡頓
- **IndexedDB 儲存配額不足**: 當瀏覽器儲存空間不足時，應降級為僅 SessionStorage 模式，並提示用戶清理瀏覽器資料
- **用戶移動或刪除原始視頻檔案**: 不影響，因為視頻檔案已複製到 IndexedDB（小視頻）或僅儲存元資料（大視頻）
- **刷新期間 IndexedDB 讀取失敗**: 應優雅降級，提示用戶重新上傳視頻，但盡可能保留 SessionStorage 中的編輯狀態
- **視頻檔案剛好 50MB 邊界值**: 統一處理為「小視頻」，儲存到 IndexedDB
- **用戶在多個 Tab 同時編輯**: 不支援跨 Tab 同步，每個 Tab 維護獨立的編輯狀態

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
- **FR-012**: Repository MUST 使用 Map<string, Video> 作為記憶體儲存結構，僅負責運行時的 CRUD 操作，不直接寫入 IndexedDB
- **FR-013**: save() 方法 MUST 覆蓋已存在的相同 ID 的 Video Entity
- **FR-014**: findById() 方法 MUST 在查詢不存在的 ID 時返回 null

#### Transcript Repository

- **FR-015**: TranscriptRepositoryImpl MUST 實作 ITranscriptRepository 介面
- **FR-016**: Repository MUST 使用 Map<string, Transcript> 作為記憶體儲存結構，僅負責運行時的 CRUD 操作，不直接寫入 IndexedDB
- **FR-017**: Repository MUST 提供 findByVideoId(videoId: string) 方法，支援按視頻 ID 查詢

#### Highlight Repository

- **FR-018**: HighlightRepositoryImpl MUST 實作 IHighlightRepository 介面
- **FR-019**: Repository MUST 使用 Map<string, Highlight> 作為記憶體儲存結構，僅負責運行時的 CRUD 操作，不直接寫入 IndexedDB
- **FR-020**: Repository MUST 提供 findByVideoId(videoId: string) 方法，返回所有關聯到該視頻的 Highlight Entity 陣列

#### Browser Storage (Internal Helper)

- **FR-021**: BrowserStorage MUST 使用 IndexedDB 儲存小於或等於 50MB 的視頻檔案，檔案以 File 物件直接儲存（IndexedDB 支援 Blob/File），同時記錄 savedAt 時間戳和 sessionId
- **FR-022**: BrowserStorage MUST 在初始化時生成或讀取 SessionStorage 中的 sessionId（格式：session_timestamp_random），用於識別當前 Tab 會話
- **FR-023**: Repository 的 findById() 方法 MUST 先查詢記憶體 Map，若未找到則調用 BrowserStorage.restore() 嘗試從 IndexedDB 恢復
- **FR-024**: BrowserStorage.save() MUST 檢查視頻檔案大小，僅當 ≤ 50MB 時才儲存到 IndexedDB；大視頻僅記錄元資料（id, name, size）到 SessionStorage
- **FR-025**: 當 IndexedDB 操作失敗（配額不足、權限錯誤）時，BrowserStorage MUST catch 錯誤並 console.warn，不阻斷 Repository 的主流程
- **FR-026**: BrowserStorage MUST 在 init() 方法中初始化 IndexedDB（建立 'videos'、'transcripts'、'highlights' 物件儲存庫），並調用 cleanupStaleData()
- **FR-027**: BrowserStorage.cleanupStaleData() MUST 刪除所有 sessionId 不等於當前會話 ID 的資料，以及 savedAt 距今超過 24 小時的資料

### Key Entities

- **TranscriptDTO**: 資料傳輸物件，包含完整轉錄文字（fullText）、段落陣列（sections）、段落標題（title）、句子陣列（sentences）、句子文字（text）、時間範圍（startTime, endTime）和高光建議標記（isHighlight）
- **ITranscriptGenerator**: 輸出埠介面（定義在 Application Layer），定義 generate() 方法，由 MockAIService 實作
- **IFileStorage**: 輸出埠介面（定義在 Application Layer），定義 save() 和 delete() 方法，由 FileStorageService 實作
- **IVideoRepository**: Domain Layer 定義的儲存庫介面，由 VideoRepositoryImpl 實作
- **ITranscriptRepository**: Domain Layer 定義的儲存庫介面，由 TranscriptRepositoryImpl 實作
- **IHighlightRepository**: Domain Layer 定義的儲存庫介面，由 HighlightRepositoryImpl 實作
- **BrowserStorage**: Infrastructure Layer 的內部工具類別（非介面），封裝 IndexedDB 和 SessionStorage 操作，由 Repository 透過依賴注入使用。職責包括：初始化資料庫、儲存和恢復資料、清理過期資料、管理會話 ID
- **PersistenceDTO**: 用於 IndexedDB 儲存的 Plain Objects，包含 VideoDTO、TranscriptDTO、HighlightDTO，對應 Domain Entities 的可序列化表示（無方法，僅資料屬性）

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Mock AI Service 能在 2 秒內返回包含至少 5 個段落和 15 個句子的轉錄資料
- **SC-002**: 所有 Repository 操作（save 和 findById）的執行時間少於 10 毫秒（記憶體操作）
- **SC-003**: FileStorageService 能成功為上傳的視頻檔案生成有效的 blob URL，並可用於 HTML5 video 元素播放
- **SC-004**: 開發者能透過單元測試獨立驗證每個 Repository 的 CRUD 操作，測試覆蓋率達到 90% 以上
- **SC-005**: Mock 資料的時間戳合理反映自然說話節奏（平均每個句子 3-5 秒），無時間重疊或異常跳躍
- **SC-006**: 系統能正確處理邊界情況（如查詢不存在的 ID），返回 null 而不拋出未處理的例外
- **SC-007**: blob URL 資源能在不需要時被正確釋放，避免記憶體洩漏（可透過 Chrome DevTools Memory Profiler 驗證）
- **SC-008**: 小視頻（≤ 50MB）在刷新後能在 2 秒內完整恢復（包含視頻檔案、轉錄、選擇狀態），用戶可立即繼續編輯
- **SC-009**: 大視頻（> 50MB）在刷新後能正確提示用戶重新上傳，並在重新上傳後自動恢復轉錄和選擇狀態

## Assumptions

- Mock 資料將以 TypeScript 常數或 JSON 檔案形式存在於 `infrastructure/api/mock-data/` 目錄
- 記憶體 Map 用於運行時資料存取（快速），BrowserStorage + IndexedDB 用於刷新恢復（可靠）
- Repository 負責記憶體 Map 的 CRUD，同時在 save() 時調用 BrowserStorage 儲存，在 findById() 時優先查 Map，找不到才調用 BrowserStorage 恢復
- BrowserStorage 是內部工具類別（非介面），封裝所有 IndexedDB 和 SessionStorage 操作，由 Repository 透過依賴注入使用
- Mock AI 延遲時間設為 1.5 秒，足以模擬真實 API 體驗但不會讓用戶感到明顯卡頓
- 視頻檔案儲存使用瀏覽器原生 URL.createObjectURL()，無需實作上傳至伺服器的功能
- 所有 Repository 使用 Map 作為儲存結構，提供 O(1) 的查詢性能
- 專案採用 Clean Architecture，Infrastructure Layer 僅實作 Domain/Application Layer 定義的介面，不定義新的介面
- 依賴注入將在後續階段（Presentation Layer）配置，Infrastructure Layer 僅提供實作類別和內部工具
- Mock 資料的句子 ID 格式為 "sent_1", "sent_2"，段落 ID 格式為 "sec_1", "sec_2"，確保唯一性
- IndexedDB 的瀏覽器配額至少有 100MB 可用（現代瀏覽器通常提供 GB 級配額）
- 50MB 作為視頻大小閾值，能涵蓋大部分 demo 用途的視頻（2-5 分鐘 1080p 視頻約 30-40MB）
- SessionStorage 僅儲存會話 ID（sessionId），容量需求極小（< 100 bytes）
- 用戶不會在同一瀏覽器的多個 Tab 中同時編輯（不實作跨 Tab 同步）
- 持久化僅用於防止誤刷新，不作為長期儲存方案（BrowserStorage 啟動時清理屬於已關閉 Tab 的資料）
- 使用 `idb` 函式庫（Jake Archibald 的 IndexedDB Promise 包裝）簡化 IndexedDB 操作

## Out of Scope

- 真實 AI API 整合（如 OpenAI Whisper、Google Speech-to-Text）
- 視頻檔案上傳至雲端儲存（AWS S3、Azure Blob Storage）
- 長期持久化（LocalStorage 用於跨會話儲存）
- 跨 Tab 資料同步
- 視頻檔案格式驗證和轉換
- 錯誤日誌和監控系統
- Repository 的分頁查詢功能
- 資料庫遷移和版本控制
- 多租戶支援和資料隔離
- 視頻檔案壓縮和優化
- 離線存取和 Service Worker 快取

## Clarifications

### Session 2025-10-30

- Q: IndexedDB 中的視頻檔案儲存策略（應以何種格式儲存視頻 File 物件以確保刷新後可恢復播放？） → A: 直接儲存 File 物件（IndexedDB 原生支援 Blob/File），包含完整二進位資料和 MIME type
- Q: Tab 關閉時的清理機制（應使用 beforeunload 事件或啟動時檢查時間戳？） → A: 下次啟動時檢查 sessionId 清理（穩健，BrowserStorage.init() 時刪除 sessionId 不匹配的資料及超過 24 小時的資料）
- Q: Repository 記憶體 Map 與 IndexedDB 的協作模式（Repository 應直接寫入 IndexedDB 還是由專門的工具協調？） → A: Repository 僅操作記憶體 Map，BrowserStorage（內部工具類別）協調持久化（符合關注點分離原則，BrowserStorage 不是介面）
- Q: 持久化觸發時機（何時將記憶體資料寫入 IndexedDB？） → A: Repository.save() 時同步調用 BrowserStorage.save()，Repository.findById() 時若記憶體未命中則調用 BrowserStorage.restore()
- Q: BrowserStorage 是否應該定義為介面？ → A: 否，BrowserStorage 是 Infrastructure Layer 的內部工具類別，不對外暴露為 Output Port。Infrastructure Layer 僅實作 Domain/Application Layer 定義的介面，不定義新介面
