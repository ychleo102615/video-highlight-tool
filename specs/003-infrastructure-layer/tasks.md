# Tasks: Infrastructure Layer Implementation

**Input**: Design documents from `/specs/003-infrastructure-layer/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 本功能規格中未明確要求測試，但建議在實作過程中撰寫單元測試以確保品質。本任務清單不包含測試任務，開發者可自行決定是否添加。

**Organization**: 任務依據 User Story (P1, P2, P3) 組織,每個 Story 可獨立實作和驗證。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可平行執行(不同檔案,無依賴)
- **[Story]**: 所屬 User Story (US1, US2, US3, US4, US5, US6)
- 所有任務包含明確檔案路徑

## Path Conventions

本專案為單一 Vue 3 TypeScript 專案:
- **Source**: `src/` (repository root)
- **Tests**: `tests/` (repository root)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 專案初始化和基礎結構建立

- [ ] T001 安裝 idb 套件依賴 (執行 `npm install idb`)
- [ ] T002 [P] 建立 Infrastructure Layer 目錄結構 (src/infrastructure/{api,repositories,storage,utils})
- [ ] T003 [P] 建立測試目錄結構 (tests/unit/infrastructure/)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 核心基礎設施,必須在任何 User Story 實作前完成

**⚠️ CRITICAL**: 所有 User Story 工作都依賴此階段完成

- [ ] T004 建立 Persistence DTO 定義 (src/infrastructure/storage/dto/VideoPersistenceDTO.ts)
- [ ] T005 [P] 建立 Persistence DTO 定義 (src/infrastructure/storage/dto/TranscriptPersistenceDTO.ts)
- [ ] T006 [P] 建立 Persistence DTO 定義 (src/infrastructure/storage/dto/HighlightPersistenceDTO.ts)
- [ ] T007 建立 DTO Mapper 工具類別 (src/infrastructure/utils/dto-mapper.ts) - 包含 Entity ↔ PersistenceDTO 雙向轉換
- [ ] T008 [P] 建立 JSON Validator 工具類別 (src/infrastructure/utils/json-validator.ts) - 驗證 Mock AI JSON 格式
- [ ] T009 實作 BrowserStorage 內部工具類別 (src/infrastructure/storage/BrowserStorage.ts) - 封裝 IndexedDB + SessionStorage 操作,包含 init(), save/restore 方法, cleanupStaleData()

**Checkpoint**: 基礎設施就緒 - User Story 實作可開始進行

---

## Phase 3: User Story 1 - Mock AI Transcript Generation from Cached JSON (Priority: P1) 🎯 MVP

**Goal**: 實作 Mock AI Service,從記憶體快取讀取 JSON 並轉換為 TranscriptDTO

**Independent Test**: 單元測試可獨立驗證 - 調用 setMockData() 暫存 JSON,再調用 generate() 驗證返回正確的 TranscriptDTO 結構

### Implementation for User Story 1

- [ ] T010 [US1] 實作 MockAIService 類別基本結構 (src/infrastructure/api/MockAIService.ts) - 實作 ITranscriptGenerator 介面,建立 mockDataMap: Map<string, string>
- [ ] T011 [US1] 實作 setMockData(videoId, jsonContent) 公開方法 - 暫存 JSON 字串到記憶體 Map
- [ ] T012 [US1] 實作 generate(videoId) 方法 - 從 Map 讀取 JSON,若不存在則拋出錯誤「找不到 videoId 的 Mock 資料,請先上傳 JSON 檔案」
- [ ] T013 [US1] 在 generate() 中整合 JSONValidator - 驗證必要欄位 (sections, sentences),缺失則拋出明確錯誤訊息
- [ ] T014 [US1] 在 generate() 中實作寬鬆補完邏輯 - isHighlight 預設 false, fullText 由句子 text 拼接生成
- [ ] T015 [US1] 在 generate() 中實作時間戳合理性檢查 - 時間重疊或順序錯誤發出 console.warn 但不阻斷
- [ ] T016 [US1] 在 generate() 中添加 1.5 秒模擬延遲 (使用 setTimeout/Promise.delay)
- [ ] T017 [US1] 在 generate() 中使用 DTOMapper 將解析結果轉換為 TranscriptDTO (Application Layer DTO)

**Checkpoint**: MockAIService 完整功能可獨立測試 - setMockData() → generate() → 返回正確 TranscriptDTO

---

## Phase 4: User Story 2 - Video File Storage Management (Priority: P1)

**Goal**: 實作 FileStorageService,管理視頻檔案的 blob URL 生成和釋放

**Independent Test**: 單元測試可獨立驗證 - 創建 File 物件,調用 save() 驗證返回有效 blob URL,調用 delete() 確認資源釋放

### Implementation for User Story 2

- [ ] T018 [US2] 實作 FileStorageService 類別 (src/infrastructure/storage/FileStorageService.ts) - 實作 IFileStorage 介面
- [ ] T019 [US2] 實作 save(file: File) 方法 - 使用 URL.createObjectURL() 生成 blob URL,返回 URL 字串
- [ ] T020 [US2] 實作 delete(url: string) 方法 - 使用 URL.revokeObjectURL() 釋放資源
- [ ] T021 [US2] 添加錯誤處理 - 捕獲 URL 操作失敗,發出 console.warn 但不拋出例外

**Checkpoint**: FileStorageService 完整功能可獨立測試 - save() 生成有效 URL, delete() 釋放資源

---

## Phase 5: User Story 3 - Video Repository Data Persistence (Priority: P2)

**Goal**: 實作 VideoRepositoryImpl,在記憶體中持久化 Video Entity 並整合 BrowserStorage

**Independent Test**: 單元測試可獨立驗證 - 創建 Video Entity,調用 save(),再調用 findById() 驗證返回相同 Entity

### Implementation for User Story 3

- [ ] T022 [US3] 實作 VideoRepositoryImpl 類別 (src/infrastructure/repositories/VideoRepositoryImpl.ts) - 實作 IVideoRepository 介面,建立 videos: Map<string, Video>
- [ ] T023 [US3] 在建構函式注入 BrowserStorage 依賴 - private browserStorage: BrowserStorage
- [ ] T024 [US3] 實作 save(video: Video) 方法 - 儲存到記憶體 Map,並調用 browserStorage.saveVideo(persistenceDto)
- [ ] T025 [US3] 在 save() 中使用 DTOMapper 轉換 Entity → VideoPersistenceDTO (包含 savedAt, sessionId)
- [ ] T026 [US3] 實作 findById(id: string) 方法 - 先查記憶體 Map,找不到則調用 browserStorage.restoreVideo()
- [ ] T027 [US3] 在 findById() 中使用 DTOMapper 轉換 VideoPersistenceDTO → Entity (若從 IndexedDB 恢復)
- [ ] T028 [US3] 確保 findById() 查詢不存在 ID 時返回 null (不拋出例外)
- [ ] T029 [US3] 添加錯誤處理 - 捕獲 BrowserStorage 錯誤,記錄 console.warn 但不阻斷主流程

**Checkpoint**: VideoRepositoryImpl 完整功能可獨立測試 - save() → findById() → 返回正確 Entity,刷新後可從 IndexedDB 恢復

---

## Phase 6: User Story 4 - Transcript Repository Data Persistence (Priority: P2)

**Goal**: 實作 TranscriptRepositoryImpl,在記憶體中持久化 Transcript Entity 並整合 BrowserStorage

**Independent Test**: 單元測試可獨立驗證 - 創建 Transcript Entity,調用 save(),再調用 findByVideoId() 驗證返回完整 Transcript

### Implementation for User Story 4

- [ ] T030 [US4] 實作 TranscriptRepositoryImpl 類別 (src/infrastructure/repositories/TranscriptRepositoryImpl.ts) - 實作 ITranscriptRepository 介面,建立 transcripts: Map<string, Transcript>
- [ ] T031 [US4] 在建構函式注入 BrowserStorage 依賴 - private browserStorage: BrowserStorage
- [ ] T032 [US4] 實作 save(transcript: Transcript) 方法 - 儲存到記憶體 Map,並調用 browserStorage.saveTranscript(persistenceDto)
- [ ] T033 [US4] 在 save() 中使用 DTOMapper 轉換 Entity → TranscriptPersistenceDTO (包含 savedAt, sessionId)
- [ ] T034 [US4] 實作 findById(id: string) 方法 - 先查記憶體 Map,找不到則調用 browserStorage.restoreTranscript()
- [ ] T035 [US4] 實作 findByVideoId(videoId: string) 方法 - 先查記憶體 Map (遍歷比對 videoId),找不到則調用 browserStorage.restoreTranscriptByVideoId()
- [ ] T036 [US4] 在 findById() 和 findByVideoId() 中使用 DTOMapper 轉換 TranscriptPersistenceDTO → Entity
- [ ] T037 [US4] 確保查詢方法返回 null (而非拋出例外) 當資料不存在時
- [ ] T038 [US4] 添加錯誤處理 - 捕獲 BrowserStorage 錯誤,記錄 console.warn 但不阻斷主流程

**Checkpoint**: TranscriptRepositoryImpl 完整功能可獨立測試 - save() → findByVideoId() → 返回正確 Transcript

---

## Phase 7: User Story 5 - Highlight Repository Data Persistence (Priority: P3)

**Goal**: 實作 HighlightRepositoryImpl,在記憶體中持久化 Highlight Entity 並支援按視頻 ID 查詢多個版本

**Independent Test**: 單元測試可獨立驗證 - 創建多個 Highlight Entity,調用 save(),再調用 findByVideoId() 驗證返回所有相關 Highlight

### Implementation for User Story 5

- [ ] T039 [US5] 實作 HighlightRepositoryImpl 類別 (src/infrastructure/repositories/HighlightRepositoryImpl.ts) - 實作 IHighlightRepository 介面,建立 highlights: Map<string, Highlight>
- [ ] T040 [US5] 在建構函式注入 BrowserStorage 依賴 - private browserStorage: BrowserStorage
- [ ] T041 [US5] 實作 save(highlight: Highlight) 方法 - 儲存到記憶體 Map,並調用 browserStorage.saveHighlight(persistenceDto)
- [ ] T042 [US5] 在 save() 中使用 DTOMapper 轉換 Entity → HighlightPersistenceDTO (selectedSentenceIds Set → Array)
- [ ] T043 [US5] 實作 findById(id: string) 方法 - 先查記憶體 Map,找不到則調用 browserStorage.restoreHighlight()
- [ ] T044 [US5] 實作 findByVideoId(videoId: string) 方法 - 先查記憶體 Map (遍歷比對 videoId),找不到則調用 browserStorage.restoreHighlightsByVideoId()
- [ ] T045 [US5] 在 findById() 和 findByVideoId() 中使用 DTOMapper 轉換 HighlightPersistenceDTO → Entity
- [ ] T046 [US5] 在 DTOMapper 中處理 Highlight 恢復邏輯 - 逐一調用 addSentence() 重建內部狀態
- [ ] T047 [US5] 確保 findByVideoId() 返回空陣列 (而非 null) 當沒有資料時
- [ ] T048 [US5] 添加錯誤處理 - 捕獲 BrowserStorage 錯誤,記錄 console.warn 但不阻斷主流程

**Checkpoint**: HighlightRepositoryImpl 完整功能可獨立測試 - save() → findByVideoId() → 返回所有相關 Highlight Entity

---

## Phase 8: User Story 6 - Basic Persistence for Accidental Refresh (Priority: P2)

**Goal**: 完善 BrowserStorage 的持久化機制,支援小視頻完整恢復和大視頻元資料恢復

**Independent Test**: 整合測試可獨立驗證 - 上傳視頻編輯高光,模擬頁面刷新,驗證狀態正確恢復

### Implementation for User Story 6

- [ ] T049 [US6] 在 BrowserStorage.init() 中實作 sessionId 生成或讀取邏輯 - 格式 `session_${timestamp}_${random}`,儲存到 SessionStorage
- [ ] T050 [US6] 在 BrowserStorage.saveVideo() 中實作視頻大小檢查 - ≤ 50MB 儲存到 IndexedDB (包含 File 物件),> 50MB 僅儲存元資料到 SessionStorage
- [ ] T051 [US6] 在 BrowserStorage.saveVideo() 中為所有 PersistenceDTO 添加 savedAt 和 sessionId
- [ ] T052 [US6] 實作 BrowserStorage.cleanupStaleData() 方法 - 刪除 sessionId 不匹配的資料 (屬於已關閉 Tab)
- [ ] T053 [US6] 在 cleanupStaleData() 中實作 24 小時過期檢查 - 刪除 savedAt 距今超過 24 小時的資料
- [ ] T054 [US6] 在 BrowserStorage.init() 啟動時調用 cleanupStaleData() - 確保啟動時清理過期資料
- [ ] T055 [US6] 在 BrowserStorage.restoreVideo() 中處理大視頻恢復邏輯 - 從 SessionStorage 讀取元資料,file 為 null
- [ ] T056 [US6] 添加 IndexedDB 錯誤處理 - 配額不足時降級為 SessionStorage 模式,發出 console.warn 並提示用戶清理瀏覽器資料
- [ ] T057 [US6] 確保所有 BrowserStorage 方法的錯誤處理一致 - catch 錯誤後 console.warn,返回 null/空陣列,不拋出例外

**Checkpoint**: BrowserStorage 完整持久化功能可獨立測試 - 小視頻刷新後完整恢復,大視頻刷新後元資料恢復

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: 跨多個 User Story 的改進和最終整合

- [ ] T058 [P] 程式碼審查與重構 - 確保符合 Clean Architecture 分層原則,無違反依賴規則
- [ ] T059 [P] 添加 TypeScript 型別完整性檢查 - 確保型別覆蓋率 > 90%
- [ ] T060 整合所有 Repository 到 DI Container (src/infrastructure/di/container.ts) - 註冊 Repository 和 Service 實例
- [ ] T061 驗證 quickstart.md 中的所有使用範例 - 確保程式碼範例可執行且正確
- [ ] T062 [P] 效能驗證 - 確保 Repository CRUD < 10ms, MockAI generate() ≈ 1.5s, IndexedDB 讀寫 < 100ms
- [ ] T063 [P] 安全性檢查 - 確保無 XSS, 注入等漏洞,blob URL 生命週期正確管理
- [ ] T064 文件更新 - 更新 TECHNICAL_DESIGN.md 的 Infrastructure Layer 章節,記錄實作細節

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無依賴 - 可立即開始
- **Foundational (Phase 2)**: 依賴 Setup 完成 - **阻擋所有 User Story**
- **User Stories (Phase 3-8)**: 全部依賴 Foundational 完成
  - US1 (P1) 和 US2 (P1): 可平行開發 (不同檔案)
  - US3 (P2) 和 US4 (P2): 可在 US1/US2 後平行開發
  - US5 (P3): 可在 US3/US4 後開發
  - US6 (P2): 依賴 BrowserStorage 基礎 (T009),可在 US3/US4/US5 實作中同步完善
- **Polish (Phase 9)**: 依賴所有 User Story 完成

### User Story Dependencies

- **US1 (Mock AI)**: 僅依賴 Foundational (T004-T009) - 可獨立測試
- **US2 (File Storage)**: 僅依賴 Foundational - 可獨立測試
- **US3 (Video Repo)**: 依賴 Foundational + BrowserStorage - 可獨立測試
- **US4 (Transcript Repo)**: 依賴 Foundational + BrowserStorage - 可獨立測試
- **US5 (Highlight Repo)**: 依賴 Foundational + BrowserStorage - 可獨立測試
- **US6 (Persistence)**: 完善 BrowserStorage (T009),與 US3/US4/US5 整合測試

### Within Each User Story

- US1: T010 → T011/T012 → T013 → T014/T015/T016 → T017 (線性依賴)
- US2: T018 → T019/T020/T021 (可平行)
- US3: T022 → T023 → T024/T025 → T026/T027/T028/T029 (部分平行)
- US4: T030 → T031 → T032/T033 → T034/T035/T036/T037/T038 (部分平行)
- US5: T039 → T040 → T041/T042 → T043/T044/T045/T046/T047/T048 (部分平行)
- US6: T049 → T050/T051 → T052/T053/T054 → T055/T056/T057 (部分平行)

### Parallel Opportunities

- **Setup 階段**: T002, T003 可平行
- **Foundational 階段**: T005/T006/T008 可平行 (不同檔案)
- **User Story 階段**: US1 和 US2 可完全平行,US3/US4/US5 可在 Foundational 完成後平行開始
- **Polish 階段**: T058/T059/T062/T063 可平行

---

## Parallel Example: Foundational Phase

```bash
# 平行建立 Persistence DTO:
Task: "建立 TranscriptPersistenceDTO.ts"
Task: "建立 HighlightPersistenceDTO.ts"
Task: "建立 JSON Validator"

# 順序依賴:
Task: "建立所有 Persistence DTO" → Task: "建立 DTO Mapper (依賴 DTO 定義)"
```

---

## Parallel Example: User Story 1 & 2

```bash
# US1 和 US2 可完全平行開發:
Task: "[US1] 實作 MockAIService" (src/infrastructure/api/MockAIService.ts)
Task: "[US2] 實作 FileStorageService" (src/infrastructure/storage/FileStorageService.ts)

# 兩者操作不同檔案,無依賴關係
```

---

## Implementation Strategy

### MVP First (User Story 1 & 2 Only)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational (CRITICAL - 阻擋所有 Story)
3. 完成 Phase 3: User Story 1 (Mock AI)
4. 完成 Phase 4: User Story 2 (File Storage)
5. **STOP and VALIDATE**: 獨立測試 US1/US2 - MockAI 可生成 TranscriptDTO, FileStorage 可管理 blob URL
6. 部署/Demo (基礎資料來源就緒)

### Incremental Delivery

1. Setup + Foundational → 基礎就緒
2. Add US1 + US2 → 測試獨立 → 部署/Demo (MVP! 資料來源和檔案管理)
3. Add US3 + US4 → 測試獨立 → 部署/Demo (加上持久化,基本可用)
4. Add US5 → 測試獨立 → 部署/Demo (高光管理完整)
5. Add US6 → 測試獨立 → 部署/Demo (刷新恢復,用戶體驗提升)
6. Polish → 最終整合測試 → 生產部署

### Parallel Team Strategy

多位開發者:

1. 團隊一起完成 Setup + Foundational
2. Foundational 完成後:
   - Developer A: User Story 1 (Mock AI)
   - Developer B: User Story 2 (File Storage)
   - Developer C: User Story 3 (Video Repo) + User Story 6 (BrowserStorage 完善)
   - Developer D: User Story 4 (Transcript Repo)
   - Developer E: User Story 5 (Highlight Repo)
3. 各 Story 獨立完成並整合

---

## Notes

- [P] 任務 = 不同檔案,無依賴,可平行執行
- [Story] 標籤對應 spec.md 中的 User Story (US1-US6)
- 每個 User Story 應可獨立完成和測試
- BrowserStorage (T009) 是所有 Repository 的共享依賴,應優先完成
- 確保所有 Repository 的錯誤處理一致 (返回 null/空陣列,不拋出例外)
- 每完成一個 User Story 後,進行獨立驗證 (Checkpoint)
- 避免: 模糊任務, 同檔案衝突, 跨 Story 依賴破壞獨立性
- 提交策略: 每完成一個任務或邏輯組後提交
- 參考 quickstart.md 中的使用範例確保實作正確性
