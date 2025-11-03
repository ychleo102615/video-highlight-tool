# Feature Specification: Application Layer Development

**Feature Branch**: `002-application-layer`
**Created**: 2025-10-29
**Status**: Draft
**Input**: User description: "實作 Application Layer 開發：定義 Port 介面、實作 5 個 Use Cases"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 上傳視頻並儲存 (Priority: P1)

開發者需要能夠透過應用層服務處理視頻上傳請求，驗證視頻文件格式和大小，並將視頻儲存到系統中。

**Why this priority**: 這是整個應用的基礎功能，沒有視頻上傳就無法進行後續的轉錄和高光編輯。這是最核心的 MVP 功能。

**Independent Test**: 可以透過建立 UploadVideoUseCase 並注入 mock repositories 和 file storage 來獨立測試，驗證文件驗證邏輯、儲存流程和錯誤處理。

**Acceptance Scenarios**:

1. **Given** 使用者選擇了一個有效的 MP4 視頻文件（小於 100MB），**When** 執行 UploadVideoUseCase，**Then** 視頻被成功儲存並返回 Video 實體，包含有效的 ID 和元數據
2. **Given** 使用者選擇了一個不支援的文件格式（如 .avi），**When** 執行 UploadVideoUseCase，**Then** 系統拋出驗證錯誤，明確指出不支援的格式
3. **Given** 使用者選擇了一個超過 100MB 的視頻文件，**When** 執行 UploadVideoUseCase，**Then** 系統拋出驗證錯誤，明確指出文件過大
4. **Given** 文件儲存服務暫時無法使用，**When** 執行 UploadVideoUseCase，**Then** 系統拋出儲存錯誤並提供適當的錯誤訊息

---

### User Story 2 - 處理視頻轉錄 (Priority: P1)

開發者需要能夠透過應用層服務請求視頻轉錄處理，調用 AI 服務生成轉錄內容，並將結構化的轉錄數據儲存到系統中。

**Why this priority**: 轉錄是高光編輯的前置需求，與視頻上傳同樣重要。這兩個功能構成了基本的工作流程。

**Independent Test**: 可以透過建立 ProcessTranscriptUseCase 並注入 mock transcript generator 和 repository 來獨立測試，驗證轉錄生成、DTO 轉換和儲存邏輯。

**Acceptance Scenarios**:

1. **Given** 系統中存在一個已上傳的視頻，**When** 執行 ProcessTranscriptUseCase，**Then** 成功調用 AI 服務生成轉錄，並將 Transcript 實體儲存到 repository
2. **Given** 視頻 ID 不存在，**When** 執行 ProcessTranscriptUseCase，**Then** 系統拋出 VideoNotFoundError
3. **Given** AI 服務返回的轉錄數據包含多個段落和句子，**When** 執行 ProcessTranscriptUseCase，**Then** 正確將 DTO 轉換為 Domain Entity（包含 Section 和 Sentence 結構）
4. **Given** AI 服務暫時無法使用，**When** 執行 ProcessTranscriptUseCase，**Then** 系統拋出服務錯誤並提供適當的錯誤訊息

---

### User Story 3 - 建立高光版本 (Priority: P2)

開發者需要能夠透過應用層服務為指定的視頻建立新的高光版本，驗證視頻存在性，並初始化一個空的高光實體。

**Why this priority**: 這是高光編輯功能的入口點,但可以在有視頻和轉錄後再實作。用戶可以先看到轉錄內容，再建立高光。

**Independent Test**: 可以透過建立 CreateHighlightUseCase 並注入 mock repositories 來獨立測試，驗證視頻驗證邏輯和高光實體建立。

**Acceptance Scenarios**:

1. **Given** 系統中存在一個視頻，**When** 執行 CreateHighlightUseCase 並提供視頻 ID 和高光名稱，**Then** 成功建立一個新的 Highlight 實體（初始狀態：無選中句子）
2. **Given** 提供的視頻 ID 不存在，**When** 執行 CreateHighlightUseCase，**Then** 系統拋出 VideoNotFoundError
3. **Given** 提供的高光名稱為空字串，**When** 執行 CreateHighlightUseCase，**Then** 系統拋出驗證錯誤
4. **Given** 同一個視頻已經有一個高光版本，**When** 執行 CreateHighlightUseCase 建立第二個高光，**Then** 成功建立，兩個高光獨立存在

---

### User Story 4 - 切換句子選中狀態 (Priority: P2)

開發者需要能夠透過應用層服務切換指定句子在高光中的選中狀態，確保聚合一致性並持久化變更。

**Why this priority**: 這是高光編輯的核心交互，但需要先有高光版本才能進行。用戶可以透過這個功能逐步建立高光內容。

**Independent Test**: 可以透過建立 ToggleSentenceInHighlightUseCase 並注入 mock repository 來獨立測試，驗證狀態切換邏輯和持久化。

**Acceptance Scenarios**:

1. **Given** 存在一個高光且某句子未被選中，**When** 執行 ToggleSentenceInHighlightUseCase，**Then** 該句子被標記為選中並儲存
2. **Given** 存在一個高光且某句子已被選中，**When** 執行 ToggleSentenceInHighlightUseCase，**Then** 該句子被取消選中並儲存
3. **Given** 提供的高光 ID 不存在，**When** 執行 ToggleSentenceInHighlightUseCase，**Then** 系統拋出 HighlightNotFoundError
4. **Given** 多次切換同一句子的狀態，**When** 執行 ToggleSentenceInHighlightUseCase，**Then** 狀態正確切換且 selectionOrder 正確記錄

---

### User Story 5 - 生成高光預覽 (Priority: P3)

開發者需要能夠透過應用層服務生成高光預覽數據，協調 Highlight 和 Transcript 兩個聚合，並提供排序選項。

**Why this priority**: 這是最終的輸出功能，用於生成預覽。雖然重要，但用戶可以先完成句子選擇，最後再生成預覽。

**Independent Test**: 可以透過建立 GenerateHighlightUseCase 並注入 mock repositories 來獨立測試，驗證跨聚合協調、排序邏輯和時長計算。

**Acceptance Scenarios**:

1. **Given** 存在一個高光（已選中 3 個句子）和對應的轉錄，**When** 執行 GenerateHighlightUseCase（sortBy: 'time'），**Then** 返回按時間順序排序的句子列表、時間範圍和總時長
2. **Given** 存在一個高光（已選中 3 個句子），**When** 執行 GenerateHighlightUseCase（sortBy: 'selection'），**Then** 返回按選擇順序排序的句子列表
3. **Given** 提供的高光 ID 不存在，**When** 執行 GenerateHighlightUseCase，**Then** 系統拋出 HighlightNotFoundError
4. **Given** 高光存在但對應的轉錄不存在，**When** 執行 GenerateHighlightUseCase，**Then** 系統拋出 TranscriptNotFoundError
5. **Given** 高光存在但沒有選中任何句子，**When** 執行 GenerateHighlightUseCase，**Then** 返回空的句子列表和零時長

---

### Edge Cases

- 當 UploadVideoUseCase 執行期間文件儲存服務中斷時，如何確保系統狀態一致性？
- 當 ProcessTranscriptUseCase 執行期間 AI 服務返回格式錯誤的數據時，如何處理？
- 當 GenerateHighlightUseCase 請求的句子 ID 在轉錄中不存在時（數據不一致），如何處理？
- 當並發執行多個 ToggleSentenceInHighlightUseCase 時，如何確保狀態一致性？
- 當視頻文件元數據提取失敗時（如損壞的視頻），UploadVideoUseCase 應該如何處理？

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系統 MUST 提供 ITranscriptGenerator Port 介面，定義 `generate(videoId: string): Promise<TranscriptDTO>` 方法
- **FR-002**: 系統 MUST 提供 IFileStorage Port 介面，定義 `save(file: File): Promise<string>` 和 `delete(url: string): Promise<void>` 方法
- **FR-003**: 系統 MUST 提供 IVideoProcessor Port 介面，定義 `extractMetadata(file: File): Promise<VideoMetadataDTO>` 方法，用於提取視頻元數據（時長、寬度、高度、格式）
- **FR-004**: UploadVideoUseCase MUST 驗證視頻文件格式（僅允許 video/mp4, video/mov, video/webm）
- **FR-005**: UploadVideoUseCase MUST 驗證視頻文件大小（最大 100MB）
- **FR-006**: UploadVideoUseCase MUST 透過 IFileStorage 儲存視頻文件並獲取 URL
- **FR-007**: UploadVideoUseCase MUST 透過 IVideoProcessor 提取視頻元數據（時長、寬度、高度、格式）並建立 Video Entity
- **FR-008**: ProcessTranscriptUseCase MUST 調用 ITranscriptGenerator 生成轉錄
- **FR-009**: ProcessTranscriptUseCase MUST 將 TranscriptDTO 轉換為 Transcript Domain Entity（包含 Section 和 Sentence）
- **FR-010**: ProcessTranscriptUseCase MUST 驗證視頻存在性，不存在時拋出 VideoNotFoundError
- **FR-011**: CreateHighlightUseCase MUST 驗證視頻存在性，不存在時拋出 VideoNotFoundError
- **FR-012**: CreateHighlightUseCase MUST 驗證高光名稱不為空
- **FR-013**: CreateHighlightUseCase MUST 建立初始狀態的 Highlight Entity（selectedSentenceIds 為空）
- **FR-014**: ToggleSentenceInHighlightUseCase MUST 從 repository 獲取 Highlight 實體
- **FR-015**: ToggleSentenceInHighlightUseCase MUST 調用 `highlight.toggleSentence(sentenceId)` 方法切換狀態
- **FR-016**: ToggleSentenceInHighlightUseCase MUST 將變更持久化至 repository
- **FR-017**: ToggleSentenceInHighlightUseCase MUST 在 Highlight 不存在時拋出 HighlightNotFoundError
- **FR-018**: GenerateHighlightUseCase MUST 從 repository 獲取 Highlight 和對應的 Transcript
- **FR-019**: GenerateHighlightUseCase MUST 調用 `highlight.getSelectedSentences(transcript, sortBy)` 獲取選中的句子
- **FR-020**: GenerateHighlightUseCase MUST 支援兩種排序方式：'selection'（選擇順序）和 'time'（時間順序）
- **FR-021**: GenerateHighlightUseCase MUST 計算時間範圍（TimeRange[]）和總時長（number）
- **FR-022**: GenerateHighlightUseCase MUST 在 Highlight 不存在時拋出 HighlightNotFoundError
- **FR-023**: GenerateHighlightUseCase MUST 在 Transcript 不存在時拋出 TranscriptNotFoundError
- **FR-024**: 所有 Use Cases MUST 透過依賴注入接收 repositories 和 ports

### Key Entities

- **TranscriptDTO**: 數據傳輸物件，包含 fullText（完整文字）、sections（段落陣列，包含 id, title, sentences）
- **VideoDTO**: 數據傳輸物件，包含視頻元數據（duration, width, height, format）
- **VideoMetadataDTO**: 數據傳輸物件，包含視頻元數據（duration, width, height, format）
- **Port Interfaces**: ITranscriptGenerator（轉錄生成服務）、IFileStorage（文件儲存服務）、IVideoProcessor（視頻處理服務）
- **Use Cases**: UploadVideoUseCase, ProcessTranscriptUseCase, CreateHighlightUseCase, ToggleSentenceInHighlightUseCase, GenerateHighlightUseCase

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 開發者能夠在 5 分鐘內透過 Use Cases 完成從視頻上傳到高光生成的完整流程測試
- **SC-002**: 每個 Use Case 都有明確的單一職責，平均程式碼行數不超過 100 行
- **SC-003**: 所有 Use Cases 都能透過 mock dependencies 進行獨立單元測試，測試覆蓋率達 90% 以上
- **SC-004**: Port 介面設計清晰，Infrastructure 和 Presentation 層能夠獨立實作而不影響 Application Layer
- **SC-005**: 錯誤處理完整，所有異常情況都有明確的錯誤類型（如 VideoNotFoundError, HighlightNotFoundError）
- **SC-006**: DTO 與 Domain Entity 之間的轉換邏輯清晰且可重用

## Assumptions

- 視頻元數據提取透過 IVideoProcessor Port 介面完成，Infrastructure Layer 實作可使用瀏覽器原生 API（HTMLVideoElement）
- 文件格式驗證透過 MIME type 檢查即可，不需要深度檔案內容驗證
- Mock AI Service 的延遲時間設定為 1.5 秒，模擬真實 API 回應時間
- Use Cases 執行期間不考慮並發控制（由 Infrastructure Layer 處理）
- DTO 結構與 Domain Entity 結構相似，轉換邏輯相對簡單
- 錯誤處理採用異常拋出機制，由外層（Presentation Layer）統一處理

## Dependencies

- **Domain Layer**: 必須已完成 Video, Transcript, Highlight 等 Entity 和 Repository 介面的定義
- **TypeScript**: 版本 ^5.0.0
- 不依賴任何 UI 框架或外部 API（Port 介面由 Infrastructure Layer 實作）

## Out of Scope

- UI 組件和使用者介面設計（屬於 Presentation Layer）
- Repository 的具體實作（屬於 Infrastructure Layer）
- Mock AI Service 的具體實作（屬於 Infrastructure Layer）
- File Storage Service 的具體實作（屬於 Infrastructure Layer）
- 視頻播放器和預覽功能（屬於 Presentation Layer）
- 狀態管理（Pinia Stores 屬於 Presentation Layer）
- 並發控制和交易管理
- 真實 AI API 整合

## Constraints

- Application Layer 不得依賴 Infrastructure 或 Presentation Layer 的具體實作
- 所有外部依賴必須透過 Port 介面（interface）定義
- Use Cases 必須保持單一職責原則（Single Responsibility Principle）
- DTO 僅用於跨層數據傳輸，不包含業務邏輯
- 遵循 Clean Architecture 依賴規則：Application Layer 只依賴 Domain Layer
