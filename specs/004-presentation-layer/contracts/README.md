# Contracts Documentation

本資料夾包含 Presentation Layer 的所有型別合約定義。

## 檔案說明

### 1. `store-contracts.ts`
定義所有 Pinia Store 的 State、Getters、Actions 型別介面。

**包含**：
- `VideoStoreState`, `VideoStoreGetters`, `VideoStoreActions`
- `TranscriptStoreState`, `TranscriptStoreGetters`, `TranscriptStoreActions`
- `HighlightStoreState`, `HighlightStoreGetters`, `HighlightStoreActions`
- 通用型別：`SectionDisplayData`, `SentenceDisplayData`, `TimeSegment`

### 2. `component-contracts.ts`
定義所有 Vue 組件的 Props 和 Emits 型別介面。

**包含**：
- Layout 組件：`SplitLayoutProps`
- Upload 組件：`VideoUploadProps`, `VideoUploadEmits`
- Editing 組件：`EditingAreaProps`, `SectionListProps`, `SentenceItemProps` 及其 Emits
- Preview 組件：`VideoPlayerProps`, `TranscriptOverlayProps`, `TimelineProps` 及其 Emits

### 3. `application-layer-updates.ts`
記錄為支援 Presentation Layer 功能，需要對 Application Layer 進行的更新。

**包含**：
- 新增 Port：`IMockDataProvider`
- 新增 Use Case：`UploadVideoWithMockTranscriptUseCase`
- 更新現有 Port：`IFileStorage`（新增 onProgress 參數）
- 更新現有 Use Case：`UploadVideoUseCase`（新增 onProgress 參數）
- 實作範例和 DI Container 註冊指南

## 使用方式

### 在 Presentation Layer 中使用

將這些型別定義複製到專案的 `src/presentation/types/` 資料夾：

```bash
cp contracts/store-contracts.ts src/presentation/types/
cp contracts/component-contracts.ts src/presentation/types/
```

然後在組件或 Store 中引用：

```typescript
import type { VideoStoreState } from '@/presentation/types/store-contracts'
import type { SentenceItemProps } from '@/presentation/types/component-contracts'
```

### 在 Application Layer 中使用

根據 `application-layer-updates.ts` 的指引更新 Application Layer：

1. 新增 `src/application/ports/IMockDataProvider.ts`
2. 更新 `src/application/ports/IFileStorage.ts`
3. 新增 `src/application/use-cases/UploadVideoWithMockTranscriptUseCase.ts`
4. 更新 `src/application/use-cases/UploadVideoUseCase.ts`

## 架構原則

所有型別定義遵循 Clean Architecture 原則：

- **Presentation Layer 型別**（store-contracts, component-contracts）：只依賴 Domain Layer 的 Entity 和 Value Object
- **Application Layer 更新**：通過 Port（介面）解耦，確保層次清晰
- **型別安全**：所有公開 API 都有明確的型別定義，避免使用 `any`

## 相關文件

- [data-model.md](../data-model.md) - 資料模型詳細說明
- [quickstart.md](../quickstart.md) - 開發環境設定指南
- [plan.md](../plan.md) - 實作計劃總覽
