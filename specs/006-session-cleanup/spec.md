# Feature Specification: 會話清除功能

**Feature Branch**: `006-session-cleanup`
**Created**: 2025-11-03
**Status**: Draft
**Input**: User description: "新增「移除存檔」的 useCase。應用程式的持久化紀錄會在瀏覽器分頁關閉時刪除，也可以在編輯畫面中點擊「刪除此會話（示意）」功能的按鈕。瀏覽器分頁重整不會觸發。分頁重整時不用顯示提示，但是關閉的時候需要,因為此使用情境會刪除紀錄"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 關閉分頁時自動清除會話資料 (Priority: P1)

使用者完成視頻編輯後關閉瀏覽器分頁，系統會自動清除該會話的所有持久化資料（包括視頻檔案、轉錄內容、編輯狀態等），以保護隱私並釋放儲存空間。

**Why this priority**: 這是核心功能，確保使用者隱私和資料不會無限累積在瀏覽器中。符合「臨時工作區」的設計理念。

**Independent Test**: 可以透過以下方式獨立測試：上傳視頻並編輯，關閉分頁，重新開啟應用程式，確認先前的會話資料已被清除。

**Acceptance Scenarios**:

1. **Given** 使用者正在編輯視頻，**When** 使用者關閉瀏覽器分頁，**Then** 系統顯示確認提示「關閉分頁將刪除此會話的所有資料，確定要繼續嗎？」
2. **Given** 確認提示已顯示，**When** 使用者點擊「確定」，**Then** 系統清除該會話的所有 IndexedDB 資料並關閉分頁
3. **Given** 確認提示已顯示，**When** 使用者點擊「取消」，**Then** 分頁不關閉，資料保留
4. **Given** 會話資料已被清除，**When** 使用者重新開啟應用程式，**Then** 顯示初始上傳畫面，無任何先前的會話記錄

---

### User Story 2 - 手動刪除會話 (Priority: P2)

使用者在編輯畫面中發現不需要繼續當前會話，可以點擊「刪除此會話（示意）」按鈕，立即清除所有資料並返回初始狀態。

**Why this priority**: 提供使用者主動控制權，不必關閉分頁就能清除資料並重新開始。

**Independent Test**: 可以透過以下方式獨立測試：在編輯畫面點擊刪除按鈕，確認資料被清除且應用程式返回初始狀態。

**Acceptance Scenarios**:

1. **Given** 使用者在編輯畫面，**When** 使用者點擊「刪除此會話（示意）」按鈕，**Then** 系統顯示確認對話框「刪除後無法復原，確定要刪除此會話嗎？」
2. **Given** 確認對話框已顯示，**When** 使用者點擊「確定」，**Then** 系統清除該會話的所有資料並導航至初始上傳畫面
3. **Given** 確認對話框已顯示，**When** 使用者點擊「取消」，**Then** 對話框關閉，會話資料保留
4. **Given** 會話已被手動刪除，**When** 使用者在瀏覽器中按「上一頁」，**Then** 系統阻止導航回已刪除的會話，保持在初始畫面

---

### User Story 3 - 分頁重整時保留會話資料 (Priority: P1)

使用者在編輯過程中意外刷新頁面（F5 或 Cmd+R），系統不會清除資料，而是恢復到刷新前的狀態。

**Why this priority**: 防止意外資料丟失，這是 005-session-restore 功能的延續，必須確保清除邏輯不會誤觸發。

**Independent Test**: 可以透過以下方式獨立測試：編輯視頻後重整頁面，確認資料仍存在且可以繼續編輯。

**Acceptance Scenarios**:

1. **Given** 使用者正在編輯視頻，**When** 使用者按下 F5 或 Cmd+R 重整頁面，**Then** 系統不顯示任何確認提示，直接重整
2. **Given** 頁面已重整，**When** 頁面重新載入，**Then** 系統恢復到重整前的編輯狀態（透過 session-restore 功能）
3. **Given** 使用者重整頁面多次，**When** 每次重整完成，**Then** 資料仍保留在 IndexedDB 中，不會被清除

---

### Edge Cases

- **分頁崩潰或瀏覽器異常關閉**：無法顯示確認提示，資料可能保留在 IndexedDB 中。下次開啟時，系統應透過 session ID 機制判斷該會話是否為「孤兒會話」並提示清理。
- **使用者快速關閉多個分頁**：如果同時關閉多個含有會話的分頁，每個分頁都應獨立處理自己的清除邏輯。
- **網路中斷時手動刪除**：刪除操作僅涉及本地 IndexedDB，不依賴網路，應正常執行。
- **使用者取消確認提示後再次嘗試關閉**：應再次顯示確認提示，不應靜默跳過。
- **在不支援 beforeunload 的瀏覽器環境**：系統應 gracefully degrade，記錄警告但不中斷功能。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系統 MUST 在使用者關閉瀏覽器分頁時攔截關閉事件（beforeunload 事件）
- **FR-002**: 系統 MUST 在攔截到關閉事件時顯示瀏覽器原生確認對話框，內容為「關閉分頁將刪除此會話 (Session) 的所有資料，確定要繼續嗎？」
- **FR-003**: 系統 MUST 區分「分頁關閉」和「分頁重整」兩種情境，僅在關閉時觸發清除邏輯（技術實作：使用 `isClosing` flag + `load` event，`beforeunload` 設定 flag，`load` 清除 flag；若應用程式啟動時 flag 仍存在，則判定為分頁關閉並執行延遲清除）
- **FR-004**: 系統 MUST 在使用者確認關閉後，完整刪除該會話 (Session) 在 IndexedDB 中的所有資料（視頻檔案、Transcript Entity、Highlight Entity 等），並刪除 SessionStorage 中的 sessionId，確保無殘留資料（使用 IndexedDB Transaction 確保原子性）
- **FR-005**: 系統 MUST 在編輯畫面提供「刪除此會話 (Session)（示意）」按鈕
- **FR-006**: 系統 MUST 在使用者點擊刪除按鈕時顯示確認對話框（使用 Naive UI 的 Dialog），內容為「刪除後無法復原，確定要刪除此會話 (Session) 嗎？」
- **FR-007**: 系統 MUST 在使用者確認手動刪除後，完整清除該會話 (Session) 的所有資料（IndexedDB + SessionStorage），確保無殘留資料（使用 IndexedDB Transaction 確保原子性）
- **FR-008**: 系統 MUST 在手動刪除完成後，導航至初始上傳畫面（路由：`/`）
- **FR-009**: 系統 MUST 在分頁重整（F5, Cmd+R, 刷新按鈕）時不顯示確認提示，不觸發清除邏輯
- **FR-010**: 系統 MUST 在手動刪除後阻止使用者透過「上一頁」導航回已刪除的會話 (Session)

### Key Entities

- **Session**: 代表一次完整的視頻編輯會話，包含 sessionId（存於 SessionStorage）
- **Persistent Data**: 包含存於 IndexedDB 的所有會話資料：
  - Video Entity（視頻檔案和元數據）
  - Transcript Entity（轉錄內容和高光選擇狀態）
  - 其他相關 Entity DTO
- **Cleanup Event**: 觸發清除邏輯的事件，分為兩種：
  - Tab Close Event（分頁關閉，需確認提示）
  - Manual Delete Event（手動刪除，需確認對話框）

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 使用者關閉分頁時，100% 情況下都能看到確認提示（在支援 beforeunload 的瀏覽器中）
- **SC-002**: 使用者確認關閉後，該會話的所有 IndexedDB 資料在 1 秒內完全清除
- **SC-003**: 使用者重整頁面時，不會看到任何確認提示，且資料恢復成功率達 100%（前提是支援 session-restore 功能）
- **SC-004**: 手動刪除會話後，使用者在 500 毫秒內被導航至初始畫面
- **SC-005**: 系統不會因清除邏輯導致任何殘留資料（可透過 IndexedDB 檢查工具驗證）
- **SC-006**: 100% 的手動刪除操作會顯示確認對話框，防止誤操作

## Assumptions _(document reasonable defaults)_

1. **瀏覽器支援**：假設目標瀏覽器支援 `beforeunload` 事件（現代主流瀏覽器皆支援）
2. **確認對話框樣式**：beforeunload 的確認對話框由瀏覽器控制，無法自定義樣式或完整內容（根據瀏覽器規範）
3. **SessionStorage 生命週期**：SessionStorage 會在分頁關閉時自動清除，但為確保一致性，仍在清除邏輯中明確刪除
4. **路由系統**：假設應用程式使用 Vue Router，手動刪除後可透過 `router.replace('/')` 導航並阻止「上一頁」
5. **延遲清除策略**：由於 `beforeunload` 事件無法完全區分「關閉」與「重整」，系統採用延遲清除策略：在 `beforeunload` 時設定 `pendingCleanup` flag，應用程式啟動時檢查此 flag，若存在則執行清除（這確保重整時不會誤刪資料，因為 `load` event 會在重整時清除 flag）
6. **清除操作的原子性**：IndexedDB 的刪除操作使用 Transaction 確保原子性，所有 Entity（Video, Transcript, Highlight）在同一個 Transaction 中刪除
7. **沒有伺服器端會話 (Session)**：所有會話 (Session) 資料僅存於客戶端，清除操作不需要通知後端

## Dependencies

- **內部依賴**：
  - `005-session-restore` 功能：清除邏輯必須與恢復邏輯協調，確保重整時不觸發清除
  - 現有的 Repository 層（VideoRepository, TranscriptRepository）：需提供刪除整個會話的方法
  - SessionIdManager（假設存在）：用於讀取和刪除 sessionId
- **外部依賴**：
  - 瀏覽器 `beforeunload` 事件支援
  - Naive UI Dialog 組件（用於手動刪除的確認對話框）
  - Vue Router（用於刪除後的導航）

## Out of Scope

- 提供「撤銷刪除」功能（資料刪除後無法恢復）
- 清除其他分頁的會話資料（每個分頁僅負責自己的會話 (Session)）
- 伺服器端的會話 (Session) 管理或同步
- **定期自動清理「孤兒會話 (Orphaned Session)」**：瀏覽器崩潰或異常關閉後留下的殘留資料，目前不提供自動檢測與清理機制。這是 Edge Case 中提及的情境，但因技術複雜度（需判斷會話 (Session) 是否為有效活躍會話），標註為未來增強功能。
- 自定義 beforeunload 確認對話框的樣式或內容（受瀏覽器限制）
