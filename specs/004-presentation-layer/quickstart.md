# Quickstart Guide: Presentation Layer Development

**Feature**: 004-presentation-layer
**Date**: 2025-11-01
**Target**: 開發者快速上手指南

## 概述

本指南協助開發者快速設定開發環境並開始 Presentation Layer 開發。

---

## 前置條件檢查

執行以下指令確認環境已就緒：

```bash
# 檢查 Node.js 版本（需要 >= 20.19.0 或 >= 22.12.0）
node --version

# 檢查專案是否已安裝依賴
npm list vue pinia

# 檢查 Domain, Application, Infrastructure Layer 是否已完成
ls src/domain/aggregates/*.ts
ls src/application/use-cases/*.ts
ls src/infrastructure/repositories/*.ts
```

**預期結果**：

- ✅ Node.js 版本符合要求
- ✅ Vue 和 Pinia 已安裝
- ✅ Domain/Application/Infrastructure 層檔案存在

---

## 步驟 1：安裝新依賴

```bash
# 安裝 Tailwind CSS v4
npm install tailwindcss@next @tailwindcss/vite@next

# 安裝 video.js
npm install video.js @types/video.js

# 安裝 Naive UI
npm install naive-ui

# 安裝 Heroicons
npm install @heroicons/vue
```

**驗證安裝**：

```bash
npm list tailwindcss video.js naive-ui @heroicons/vue
```

---

## 步驟 2：設定 Tailwind CSS v4

### 2.1 更新 Vite 配置

**檔案**: `vite.config.ts`

```typescript
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite'; // 新增

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss() // 新增
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
});
```

### 2.2 建立 Tailwind CSS 入口檔

**檔案**: `src/assets/main.css`

```css
@import 'tailwindcss';

/* 自訂樣式（如需要） */
```

### 2.3 在 main.ts 中引入

**檔案**: `src/main.ts`

```typescript
import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import './assets/main.css'; // 新增

const app = createApp(App);

app.use(createPinia());

app.mount('#app');
```

### 2.4 驗證 Tailwind 設定

啟動開發伺服器：

```bash
npm run dev
```

在任一 Vue 組件中測試：

```vue
<template>
  <div class="bg-blue-500 text-white p-4">Tailwind CSS v4 正常運作！</div>
</template>
```

---

## 步驟 3：建立資料夾結構

```bash
# 建立 Presentation Layer 資料夾
mkdir -p src/presentation/components/layout
mkdir -p src/presentation/components/upload
mkdir -p src/presentation/components/editing
mkdir -p src/presentation/components/preview
mkdir -p src/presentation/composables
mkdir -p src/presentation/stores
mkdir -p src/presentation/types
```

**驗證結構**：

```bash
tree src/presentation -L 2
```

**預期輸出**：

```
src/presentation/
├── components/
│   ├── layout/
│   ├── upload/
│   ├── editing/
│   └── preview/
├── composables/
├── stores/
└── types/
```

---

## 步驟 4：複製型別定義

將 `specs/004-presentation-layer/contracts/` 中的型別定義複製到專案：

```bash
# 複製 Store Contracts
cp specs/004-presentation-layer/contracts/store-contracts.ts src/presentation/types/

# 複製 Component Contracts
cp specs/004-presentation-layer/contracts/component-contracts.ts src/presentation/types/

# 建立 index.ts 統一匯出
cat > src/presentation/types/index.ts << 'EOF'
export * from './store-contracts'
export * from './component-contracts'
EOF
```

---

## 步驟 5：更新 Application Layer

根據 `contracts/application-layer-updates.ts`，需要進行以下更新：

### 5.1 新增 IMockDataProvider Port

**檔案**: `src/application/ports/IMockDataProvider.ts`

```typescript
/**
 * Mock 資料提供者介面
 * 注意：此介面僅在開發/展示環境使用
 *
 * 設計原則：
 * - 只接受 JSON 字串，確保所有資料都經過 JSONValidator 驗證
 * - Infrastructure Layer (MockAIService) 負責驗證、補完非必要欄位
 * - Mock 資料在 generate() 使用後自動清除（一次性使用）
 */
export interface IMockDataProvider {
  /**
   * 設定指定視頻的 Mock 資料（JSON 字串格式）
   * @param videoId 視頻 ID
   * @param jsonContent JSON 字串內容
   * @throws Error 如果 JSON 格式無效
   */
  setMockData(videoId: string, jsonContent: string): void;
}
```

**更新**: `src/application/ports/index.ts`

```typescript
export * from './ITranscriptGenerator';
export * from './IFileStorage';
export * from './IVideoProcessor';
export * from './IMockDataProvider'; // 新增
```

### 5.2 更新 IFileStorage Port

**檔案**: `src/application/ports/IFileStorage.ts`

```typescript
export interface IFileStorage {
  /**
   * 儲存文件
   * @param file 文件
   * @param onProgress 進度回調（0-100）
   */
  save(file: File, onProgress?: (progress: number) => void): Promise<string>;

  delete(url: string): Promise<void>;
}
```

### 5.3 更新 UploadVideoUseCase

**檔案**: `src/application/use-cases/UploadVideoUseCase.ts`

在 `execute` 方法簽名中新增 `onProgress` 參數：

```typescript
async execute(
  file: File,
  onProgress?: (progress: number) => void
): Promise<Video> {
  // ... 驗證邏輯

  // 上傳文件（傳遞進度回調）
  const url = await this.fileStorage.save(file, onProgress)

  // ... 其餘邏輯
}
```

### 5.4 新增 UploadVideoWithMockTranscriptUseCase

**檔案**: `src/application/use-cases/UploadVideoWithMockTranscriptUseCase.ts`

```typescript
import type { Video } from '@/domain/aggregates/Video';
import type { UploadVideoUseCase } from './UploadVideoUseCase';
import type { IMockDataProvider } from '@/application/ports/IMockDataProvider';

export class UploadVideoWithMockTranscriptUseCase {
  constructor(
    private uploadVideoUseCase: UploadVideoUseCase,
    private mockDataProvider: IMockDataProvider
  ) {}

  async execute(
    videoFile: File,
    transcriptFile: File,
    onProgress?: (progress: number) => void
  ): Promise<Video> {
    // 1. 上傳視頻（重用現有 Use Case）
    const video = await this.uploadVideoUseCase.execute(videoFile, onProgress);

    // 2. 讀取轉錄 JSON 檔案內容
    const jsonContent = await transcriptFile.text();

    // 3. 設定 Mock 資料（setMockData 會進行驗證、補完非必要欄位、檢查時間戳）
    this.mockDataProvider.setMockData(video.id, jsonContent);

    return video;
  }
}
```

**更新**: `src/application/use-cases/index.ts`

```typescript
export * from './UploadVideoUseCase';
export * from './ProcessTranscriptUseCase';
export * from './CreateHighlightUseCase';
export * from './ToggleSentenceInHighlightUseCase';
export * from './GenerateHighlightUseCase';
export * from './UploadVideoWithMockTranscriptUseCase'; // 新增
```

---

## 步驟 6：更新 Infrastructure Layer

### 6.1 更新 MockAIService

**檔案**: `src/infrastructure/api/MockAIService.ts`

MockAIService 已實作 `ITranscriptGenerator` 和 `IMockDataProvider` 介面，並包含：

- `setMockData(videoId, jsonContent)`: 驗證 JSON 格式、補完欄位並存儲
- `generate(videoId)`: 生成轉錄資料（使用 setMockData 設定的資料，使用後自動清除）

**關鍵實作**：

```typescript
// setMockData 會進行驗證
setMockData(videoId: string, jsonContent: string): void {
  // 1. 驗證 JSON 格式（使用 JSONValidator）
  const validatedData = JSONValidator.validate(jsonContent)

  // 2. 補完非必要欄位
  const completedData = JSONValidator.fillDefaults(validatedData)

  // 3. 存儲補完後的 JSON 字串
  this.mockDataMap.set(videoId, JSON.stringify(completedData))
}

// generate 會讀取並使用驗證後的資料
async generate(videoId: string): Promise<TranscriptDTO> {
  // 優先使用 setMockData 設定的資料
  const jsonContent = this.mockDataMap.get(videoId)
  if (jsonContent) {
    // 解析並返回（已驗證過）
    return JSON.parse(jsonContent) as TranscriptDTO
  }

  // 否則返回預設 Mock 資料
  return this.getDefaultMockData()
}
```

### 6.2 更新 FileStorageService

**檔案**: `src/infrastructure/storage/FileStorageService.ts`

```typescript
import type { IFileStorage } from '@/application/ports/IFileStorage';

export class FileStorageService implements IFileStorage {
  async save(file: File, onProgress?: (progress: number) => void): Promise<string> {
    // 本地環境：立即完成
    onProgress?.(100);
    const url = URL.createObjectURL(file);
    return url;
  }

  async delete(url: string): Promise<void> {
    URL.revokeObjectURL(url);
  }
}
```

---

## 步驟 7：更新 DI Container

**檔案**: `src/di/container.ts`

```typescript
import { MockAIService } from '@/infrastructure/api/MockAIService';
import { FileStorageService } from '@/infrastructure/storage/FileStorageService';
import { UploadVideoUseCase } from '@/application/use-cases/UploadVideoUseCase';
import { UploadVideoWithMockTranscriptUseCase } from '@/application/use-cases/UploadVideoWithMockTranscriptUseCase';
// ... 其他 imports

class DIContainer {
  private services = new Map<string, any>();

  register<T>(key: string, factory: T | (() => T)): void {
    this.services.set(key, factory);
  }

  get<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service not found: ${key}`);
    }
    return typeof service === 'function' ? service() : service;
  }
}

export const container = new DIContainer();

// 註冊 Infrastructure Layer
const mockAIService = new MockAIService();
container.register('TranscriptGenerator', mockAIService);
container.register('MockDataProvider', mockAIService); // 新增

const fileStorageService = new FileStorageService();
container.register('FileStorage', fileStorageService);

// ... 註冊其他 Infrastructure 服務

// 註冊 Use Cases
container.register(
  'UploadVideoUseCase',
  () =>
    new UploadVideoUseCase(
      container.get('VideoRepository'),
      container.get('FileStorage'),
      container.get('VideoProcessor')
    )
);

// 新增：註冊 UploadVideoWithMockTranscriptUseCase
container.register(
  'UploadVideoWithMockTranscriptUseCase',
  () =>
    new UploadVideoWithMockTranscriptUseCase(
      container.get('UploadVideoUseCase'),
      container.get('MockDataProvider')
    )
);

// ... 註冊其他 Use Cases
```

---

## 步驟 8：驗證設定

執行型別檢查：

```bash
npm run type-check
```

**預期結果**：無型別錯誤

執行 ESLint：

```bash
npm run lint
```

**預期結果**：無 linting 錯誤

啟動開發伺服器：

```bash
npm run dev
```

**預期結果**：應用正常啟動，無控制台錯誤

---

## 步驟 9：建立第一個 Store

建立 `videoStore.ts` 作為範例：

**檔案**: `src/presentation/stores/videoStore.ts`

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Video } from '@/domain/aggregates/Video';
import type { UploadVideoUseCase } from '@/application/use-cases/UploadVideoUseCase';
import type { UploadVideoWithMockTranscriptUseCase } from '@/application/use-cases/UploadVideoWithMockTranscriptUseCase';
import { container } from '@/di/container';

export const useVideoStore = defineStore('video', () => {
  // State
  const video = ref<Video | null>(null);
  const isUploading = ref(false);
  const uploadProgress = ref(0);
  const error = ref<string | null>(null);

  // Getters
  const hasVideo = computed(() => video.value !== null);
  const isReady = computed(() => video.value?.isReady ?? false);
  const videoUrl = computed(() => video.value?.url);
  const duration = computed(() => video.value?.duration ?? 0);

  // 注入 Use Cases
  const uploadVideoUseCase = container.resolve<UploadVideoUseCase>('UploadVideoUseCase');
  const uploadWithMockUseCase = container.resolve<UploadVideoWithMockTranscriptUseCase>(
    'UploadVideoWithMockTranscriptUseCase'
  );

  // Actions
  async function uploadVideo(videoFile: File, transcriptFile?: File) {
    try {
      isUploading.value = true;
      uploadProgress.value = 0;
      error.value = null;

      // 根據是否有轉錄檔案選擇不同的 Use Case
      let uploadedVideo: Video;

      if (transcriptFile) {
        // 使用 UploadVideoWithMockTranscriptUseCase
        // Use Case 內部會讀取 JSON 並調用 setMockData 進行驗證
        uploadedVideo = await uploadWithMockUseCase.execute(
          videoFile,
          transcriptFile,
          (progress: number) => {
            uploadProgress.value = progress;
          }
        );
      } else {
        // 使用標準 UploadVideoUseCase
        uploadedVideo = await uploadVideoUseCase.execute(videoFile, (progress: number) => {
          uploadProgress.value = progress;
        });
      }

      video.value = uploadedVideo;
      uploadProgress.value = 100;
    } catch (err) {
      error.value = (err as Error).message;
      throw err;
    } finally {
      isUploading.value = false;
    }
  }

  function clearVideo() {
    video.value = null;
    uploadProgress.value = 0;
    error.value = null;
  }

  return {
    // State
    video,
    isUploading,
    uploadProgress,
    error,
    // Getters
    hasVideo,
    isReady,
    videoUrl,
    duration,
    // Actions
    uploadVideo,
    clearVideo
  };
});
```

**驗證 Store**：
在任一組件中使用：

```vue
<script setup lang="ts">
import { useVideoStore } from '@/presentation/stores/videoStore';

const videoStore = useVideoStore();

async function handleUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    await videoStore.uploadVideo(file);
  }
}
</script>

<template>
  <div>
    <input type="file" @change="handleUpload" accept="video/*" />
    <div v-if="videoStore.isUploading">上傳中：{{ videoStore.uploadProgress }}%</div>
    <div v-if="videoStore.hasVideo">視頻已上傳！</div>
  </div>
</template>
```

---

## 常見問題

### Q1: Tailwind 樣式沒有生效？

- 確認 `vite.config.ts` 已加入 `tailwindcss()` 插件
- 確認 `src/assets/main.css` 已在 `main.ts` 中引入
- 重啟開發伺服器

### Q2: DI Container 找不到服務？

- 確認服務已在 `container.ts` 中註冊
- 確認服務名稱（key）拼寫正確
- 檢查服務的依賴是否已註冊

### Q3: Store 中無法取得 Use Case？

- 確認 Use Case 已在 DI Container 註冊
- 確認在 Store 中使用 `container.get<T>('ServiceName')` 取得實例
- 確認在 `main.ts` 中已設定 Pinia: `app.use(createPinia())`

### Q4: video.js 無法初始化？

- 確認在 `onMounted` 中初始化播放器
- 確認在 `onUnmounted` 中清理播放器（`player.dispose()`）
- 檢查 video element 的 ref 是否正確綁定

---

## 下一步

環境設定完成後，可以開始實作：

1. **建立 Stores**（優先）
   - transcriptStore.ts
   - highlightStore.ts

2. **建立 Composables**
   - useVideoUpload.ts
   - useTranscript.ts
   - useHighlight.ts
   - useVideoPlayer.ts

3. **建立 Components**
   - 從基礎組件開始（SentenceItem, Timeline）
   - 再到容器組件（EditingArea, PreviewArea）
   - 最後整合佈局（SplitLayout, App.vue）

4. **撰寫測試**
   - Store 單元測試
   - Composable 單元測試
   - Component 組件測試

---

## 參考資源

- [Tailwind CSS v4 文檔](https://tailwindcss.com/docs/v4-alpha)
- [video.js 文檔](https://videojs.com/)
- [Naive UI 文檔](https://www.naiveui.com/)
- [Heroicons 圖示列表](https://heroicons.com/)
- [Pinia 文檔](https://pinia.vuejs.org/)
- [Vue 3 文檔](https://vuejs.org/)

---

**問題回報**：如有任何問題，請參考 `specs/004-presentation-layer/plan.md` 或相關文檔。
