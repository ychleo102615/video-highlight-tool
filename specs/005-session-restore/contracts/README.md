# Contracts: 會話恢復 (Session Restore)

本目錄包含會話恢復功能的公開介面定義（Contracts）。

## 文件說明

### repositories.ts
定義擴充的 Repository 介面：
- `IVideoRepository.findAll()`: 查詢所有視頻
- `ITranscriptRepository.findByVideoId()`: 根據 videoId 查詢轉錄
- `IHighlightRepository.findByVideoId()`: 根據 videoId 查詢高光

### use-case.ts
定義 RestoreSessionUseCase 的公開介面：
- `IRestoreSessionUseCase.execute()`: 執行會話恢復
- `SessionState`: 會話狀態返回型別

### store.ts
定義擴充的 Store 介面：
- `IVideoStore.restoreSession()`: 恢復會話 action
- `ITranscriptStore.setTranscript()`: 設定轉錄（若不存在需新增）
- `IHighlightStore.setHighlights()`: 設定高光（若不存在需新增）

## 設計原則

1. **不建立新的 Application DTO**: 直接使用 Domain Entity（Video, Transcript, Highlight）
2. **Repository 自動恢復**: findAll() 和 findByVideoId() 在記憶體為空時自動從 BrowserStorage 恢復
3. **錯誤處理策略**:
   - Repository: 返回空結果（優雅降級）
   - Use Case: 拋出錯誤（資料不完整時）
   - Store: 捕獲錯誤並顯示訊息
4. **不暴露 Infrastructure 細節**: Persistence DTO 僅在 Infrastructure Layer 內部使用

## 實作清單

### Repository 介面擴充
- [ ] `@src/domain/repositories/IVideoRepository.ts` 新增 `findAll()`
- [ ] `@src/domain/repositories/ITranscriptRepository.ts` 新增 `findByVideoId()`
- [ ] `@src/domain/repositories/IHighlightRepository.ts` 新增 `findByVideoId()`

### Repository 實作
- [ ] `@src/infrastructure/repositories/VideoRepositoryImpl.ts` 實作 `findAll()`
- [ ] `@src/infrastructure/repositories/TranscriptRepositoryImpl.ts` 實作 `findByVideoId()`
- [ ] `@src/infrastructure/repositories/HighlightRepositoryImpl.ts` 實作 `findByVideoId()`

### BrowserStorage 擴充
- [ ] `@src/infrastructure/storage/BrowserStorage.ts` 新增 `restoreAllVideos()`
- [ ] `@src/infrastructure/storage/BrowserStorage.ts` 新增 `restoreAllTranscripts()`
- [ ] `@src/infrastructure/storage/BrowserStorage.ts` 新增 `restoreAllHighlights()`

### Use Case 實作
- [ ] `@src/application/use-cases/RestoreSessionUseCase.ts` 實作 `execute()`
- [ ] `@src/di/container.ts` 註冊 RestoreSessionUseCase

### Store 擴充
- [ ] `@src/presentation/stores/videoStore.ts` 新增 `restoreSession()`
- [ ] `@src/presentation/stores/transcriptStore.ts` 確認或新增 `setTranscript()`
- [ ] `@src/presentation/stores/highlightStore.ts` 確認或新增 `setHighlights()`

### App 整合
- [ ] `App.vue` onMounted 調用 `videoStore.restoreSession()`

## 測試清單

### 單元測試
- [ ] RestoreSessionUseCase.spec.ts: 測試無會話資料情境
- [ ] RestoreSessionUseCase.spec.ts: 測試小視頻恢復（needsReupload = false）
- [ ] RestoreSessionUseCase.spec.ts: 測試大視頻恢復（needsReupload = true）
- [ ] RestoreSessionUseCase.spec.ts: 測試資料不完整錯誤

### E2E 測試
- [ ] session-restore.spec.ts: 測試小視頻完整恢復流程
- [ ] session-restore.spec.ts: 測試大視頻提示重新上傳流程
- [ ] session-restore.spec.ts: 測試首次訪問無恢復情境
- [ ] session-restore.spec.ts: 測試會話過期清除情境

---

**Note**: 本目錄中的 `.ts` 文件為設計文件，非實際可執行代碼。實際實作請參考 `@src/` 目錄下的對應文件。
