# Research Report: Presentation Layer Technologies

**Feature**: 004-presentation-layer
**Date**: 2025-11-01
**Status**: Complete

## Overview

本文件記錄 Presentation Layer 開發所需的技術研究結果，解決所有 Technical Context 中標註為 NEEDS CLARIFICATION 的項目。

## Research Topics

### 1. Tailwind CSS v4 設定與使用

#### Decision
使用 Tailwind CSS v4 作為樣式系統

#### Rationale
- **CSS-first 架構**: v4 採用全新的 CSS-first 設計，使用原生 CSS 變數和 `@import` 語法，更貼近 Web 標準
- **零配置啟動**: 預設配置已優化，無需複雜的 `tailwind.config.js`（除非需要自訂）
- **更快的建置速度**: Oxide 引擎提供更快的 JIT 編譯
- **與 Vue 3 兼容**: 完全支援 Vue 3 SFC 的 `<style>` 區塊

#### Key Implementation Details

**安裝**:
```bash
npm install tailwindcss@next @tailwindcss/vite@next
```

**Vite 配置** (`vite.config.ts`):
```typescript
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()]
})
```

**CSS 入口檔** (`src/assets/main.css`):
```css
@import "tailwindcss";
```

**主要變更（相較於 v3）**:
- 不再需要 `@tailwind base/components/utilities` 指令
- 使用 `@import "tailwindcss"` 替代
- 配置檔改為 CSS 變數（`@theme`）而非 JS 物件
- 顏色系統更新：預設使用 CSS Color Level 4 語法

**響應式斷點**（與 v3 相同）:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

**本專案使用的斷點策略**:
- Mobile: < 768px（預設，無前綴）
- Desktop: ≥ 1024px（使用 `lg:` 前綴）

#### Alternatives Considered
- **Tailwind v3**: 較穩定但缺乏 v4 的效能提升
- **UnoCSS**: 更快但生態系統較小，不適合生產環境
- **純 CSS Modules**: 開發速度慢，不符合快速原型需求

---

### 2. video.js 整合與片段播放

#### Decision
使用 video.js ^8.0.0 作為視頻播放器，並實作基於 `timeupdate` 事件的片段播放機制

#### Rationale
- **跨瀏覽器兼容性**: video.js 處理了各平台的視頻播放差異（特別是 iOS Safari）
- **豐富的 API**: 提供完整的播放控制、事件監聽、插件系統
- **社群活躍**: 成熟的開源專案，文檔完整
- **TypeScript 支援**: 官方提供型別定義

#### Key Implementation Details

**安裝**:
```bash
npm install video.js @types/video.js
```

**Vue 組件整合模式**:
```typescript
import { onMounted, onUnmounted, ref } from 'vue'
import videojs from 'video.js'
import type Player from 'video.js/dist/types/player'

export default {
  setup() {
    const videoElement = ref<HTMLVideoElement>()
    let player: Player | null = null

    onMounted(() => {
      if (videoElement.value) {
        player = videojs(videoElement.value, {
          controls: true,
          fluid: true,
          preload: 'metadata'
        })
      }
    })

    onUnmounted(() => {
      if (player) {
        player.dispose()
        player = null
      }
    })

    return { videoElement }
  }
}
```

**片段播放實作方案**:

**方案比較**:
| 方案 | 優點 | 缺點 | 評估 |
|------|------|------|------|
| Media Source Extensions (MSE) | 無縫切換，無卡頓 | 實作複雜，開發成本高 | ❌ 不適合此專案 |
| timeupdate + seek | 實作簡單，易於理解 | 可能有輕微卡頓 | ✅ 採用此方案 |
| video.js Playlist 插件 | 功能完整 | 需額外插件，增加 bundle 大小 | ⚠️ 備選方案 |

**採用方案：timeupdate + seek**

核心邏輯：
```typescript
let currentSegmentIndex = 0
const segments = computed(() => highlightStore.timeRanges) // TimeRange[]

player.on('timeupdate', () => {
  const currentTime = player.currentTime()
  const currentSegment = segments.value[currentSegmentIndex]

  if (!currentSegment) return

  // 檢查是否超出當前片段結束時間
  if (currentTime >= currentSegment.end.seconds) {
    currentSegmentIndex++

    // 檢查是否還有下一個片段
    if (currentSegmentIndex < segments.value.length) {
      const nextSegment = segments.value[currentSegmentIndex]
      player.currentTime(nextSegment.start.seconds)
    } else {
      // 所有片段播放完畢，暫停並重置
      player.pause()
      currentSegmentIndex = 0
    }
  }

  // 檢查使用者是否手動拖動到非片段區域
  const isInAnySegment = segments.value.some(seg =>
    currentTime >= seg.start.seconds && currentTime < seg.end.seconds
  )

  if (!isInAnySegment && !player.paused()) {
    // 跳轉到最近的片段起點
    const nearestSegment = findNearestSegment(currentTime, segments.value)
    if (nearestSegment) {
      player.currentTime(nearestSegment.start.seconds)
    }
  }
})
```

**優化要點**:
- 使用防抖（debounce）避免過於頻繁的 seek 操作
- 考慮添加短暫的淡入淡出過渡效果（使用 CSS opacity transition）
- 在片段切換時顯示 loading 狀態（如果 seek 延遲 > 100ms）

#### Alternatives Considered
- **原生 HTMLVideoElement**: 缺乏跨瀏覽器一致性，需自行處理各種邊緣情況
- **Plyr**: 較輕量但功能不如 video.js 豐富，不支援複雜的片段播放邏輯
- **Shaka Player**: 專注於串流媒體（HLS, DASH），對本專案過於複雜

---

### 3. Naive UI 組件庫使用

#### Decision
使用 Naive UI ^2.40.0 提供基礎 UI 組件（按鈕、進度條、通知、載入狀態等）

#### Rationale
- **TypeScript 原生支援**: 使用 TypeScript 編寫，型別定義完整
- **Vue 3 Composition API**: 完全基於 Composition API，與專案技術棧一致
- **設計現代**: 預設樣式現代簡潔，適合視頻工具的專業感
- **Tree-shakable**: 支援按需引入，減少 bundle 大小
- **無需額外配置**: 開箱即用，不需要全局 CSS 注入

#### Key Implementation Details

**安裝**:
```bash
npm install naive-ui
```

**按需引入** (推薦方式):
```typescript
// 在需要的組件中直接引入
import { NButton, NProgress, NNotificationProvider, useNotification } from 'naive-ui'
```

**主要使用的組件**:
- `NButton`: 上傳按鈕、播放控制按鈕
- `NProgress`: 視頻上傳進度條
- `NNotificationProvider` + `useNotification`: 錯誤提示和成功通知
- `NSpin`: 載入狀態指示器（AI 處理時）
- `NEmpty`: 空狀態提示（無選中句子時）

**與 Tailwind 協作**:
Naive UI 組件可以透過 `class` prop 添加 Tailwind 樣式類別：
```vue
<NButton class="lg:w-auto w-full" type="primary">
  上傳視頻
</NButton>
```

**主題自訂**（如需要）:
```typescript
import { NConfigProvider } from 'naive-ui'
import type { GlobalThemeOverrides } from 'naive-ui'

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#3B82F6', // Tailwind blue-500
    primaryColorHover: '#2563EB', // blue-600
  }
}
```

#### Alternatives Considered
- **Element Plus**: 功能豐富但設計較傳統，不符合現代簡潔風格
- **Ant Design Vue**: 企業級但過於複雜，增加學習成本
- **Headless UI**: 需自行編寫所有樣式，開發速度慢

---

### 4. Heroicons 圖示系統

#### Decision
使用 @heroicons/vue 作為圖示庫

#### Rationale
- **Tailwind 官方圖示庫**: 由 Tailwind CSS 團隊開發，風格一致
- **Vue 3 原生套件**: 提供 Vue 組件形式的圖示，直接作為組件使用
- **兩種風格**: Outline（輪廓）和 Solid（實心），適合不同場景
- **Tree-shakable**: 按需引入，不會增加不必要的 bundle 大小
- **MIT 授權**: 可自由使用於商業專案

#### Key Implementation Details

**安裝**:
```bash
npm install @heroicons/vue
```

**使用方式**:
```vue
<script setup lang="ts">
import { PlayIcon, PauseIcon, CloudArrowUpIcon } from '@heroicons/vue/24/solid'
import { ClockIcon } from '@heroicons/vue/24/outline'
</script>

<template>
  <!-- Solid 風格（實心），用於主要操作 -->
  <PlayIcon class="w-6 h-6 text-blue-500" />

  <!-- Outline 風格（輪廓），用於次要資訊 -->
  <ClockIcon class="w-4 h-4 text-gray-500" />
</template>
```

**本專案使用的圖示與尺寸規範**:
| 用途 | 圖示 | 風格 | 尺寸 |
|------|------|------|------|
| 上傳按鈕 | CloudArrowUpIcon | Solid | w-6 h-6 (24px) |
| 播放按鈕 | PlayIcon | Solid | w-6 h-6 (24px) |
| 暫停按鈕 | PauseIcon | Solid | w-6 h-6 (24px) |
| 時間戳 | ClockIcon | Outline | w-4 h-4 (16px) |
| 選中狀態 | CheckIcon | Solid | w-5 h-5 (20px) |

**顏色規範**:
- 主要操作圖示：`text-blue-500`（與主色調一致）
- 次要資訊圖示：`text-gray-500`
- Hover 狀態：`hover:text-blue-600`

#### Alternatives Considered
- **Font Awesome**: 過於龐大，需載入整個字體檔
- **Material Icons**: Google 風格，與 Tailwind 設計語言不一致
- **Lucide Icons**: 較新但生態系統不如 Heroicons 成熟

---

### 5. Pinia Stores 架構設計

#### Decision
建立三個獨立的 Pinia Store（videoStore, transcriptStore, highlightStore），通過 DI Container 注入 Use Case

#### Rationale
- **職責分離**: 每個 Store 負責一個 Aggregate 的狀態管理
- **單向數據流**: 組件只能透過 Store actions 修改狀態
- **Use Case 注入**: Store 呼叫 Use Case 執行業務邏輯，符合 Clean Architecture
- **TypeScript 支援**: Pinia 提供完整的型別推斷

#### Key Implementation Details

**Store 結構模板**:
```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Video } from '@/domain/aggregates/Video'
import type { UploadVideoUseCase } from '@/application/use-cases/UploadVideoUseCase'
import { container } from '@/di/container'

export const useVideoStore = defineStore('video', () => {
  // State
  const video = ref<Video | null>(null)
  const isUploading = ref(false)
  const uploadProgress = ref(0)
  const error = ref<string | null>(null)

  // Getters
  const hasVideo = computed(() => video.value !== null)
  const isReady = computed(() => video.value?.isReady ?? false)

  // Actions（使用 Use Case）
  const uploadVideoUseCase = container.get<UploadVideoUseCase>('UploadVideoUseCase')

  async function uploadVideo(file: File) {
    try {
      isUploading.value = true
      error.value = null

      // 呼叫 Use Case
      const uploadedVideo = await uploadVideoUseCase.execute(file)

      video.value = uploadedVideo
    } catch (err) {
      error.value = (err as Error).message
      throw err
    } finally {
      isUploading.value = false
    }
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
    // Actions
    uploadVideo
  }
})
```

**DI Container 整合**:
在 `src/di/container.ts` 中註冊 Use Case:
```typescript
container.register('UploadVideoUseCase', () => new UploadVideoUseCase(
  container.get('VideoRepository'),
  container.get('FileStorage')
))
```

**跨 Store 通訊**:
當需要跨 Store 協作時，透過 actions 呼叫：
```typescript
// highlightStore 中
import { useTranscriptStore } from './transcriptStore'

async function generatePreview() {
  const transcriptStore = useTranscriptStore()
  const transcript = transcriptStore.transcript

  if (!transcript) {
    throw new Error('Transcript not found')
  }

  // 使用 transcript 資料
}
```

#### Alternatives Considered
- **Vuex**: 較複雜，不如 Pinia 簡潔，且 Vue 3 官方推薦 Pinia
- **直接在組件中管理狀態**: 無法跨組件共享，會導致 props drilling
- **單一大型 Store**: 違反單一職責原則，難以維護

---

### 6. 響應式設計策略

#### Decision
使用 Tailwind 的 Mobile-First 響應式工具類別，以 768px 為分界線

#### Rationale
- **Mobile-First**: 預設樣式針對移動端，再使用 `lg:` 前綴覆寫桌面樣式
- **簡化佈局切換**: 移動端上下堆疊（flex-col），桌面端左右分屏（lg:flex-row）
- **一致的斷點**: 使用 Tailwind 預設斷點，易於理解和維護

#### Key Implementation Details

**佈局切換模式**:
```vue
<div class="flex flex-col lg:flex-row h-screen">
  <!-- 編輯區：移動端 50vh，桌面端 50% 寬度 -->
  <div class="h-1/2 lg:h-full lg:w-1/2 overflow-auto">
    <EditingArea />
  </div>

  <!-- 預覽區：移動端 50vh，桌面端 50% 寬度 -->
  <div class="h-1/2 lg:h-full lg:w-1/2">
    <PreviewArea />
  </div>
</div>
```

**觸控目標優化**:
```vue
<!-- 移動端增大點擊區域 -->
<button class="p-3 lg:p-2 min-h-[44px] min-w-[44px]">
  選擇
</button>
```

**字體大小調整**:
```vue
<!-- 移動端使用較大字級 -->
<p class="text-lg lg:text-base">
  句子內容
</p>
```

#### Alternatives Considered
- **Desktop-First**: 需要額外的 `sm:` 前綴，增加程式碼複雜度
- **CSS Media Queries**: 不如 Tailwind 工具類別直觀和可維護

---

## Summary Table

| 技術 | 決策 | 版本 | 安裝指令 |
|------|------|------|----------|
| 樣式系統 | Tailwind CSS | v4 (next) | `npm install tailwindcss@next @tailwindcss/vite@next` |
| 視頻播放器 | video.js | ^8.0.0 | `npm install video.js @types/video.js` |
| UI 組件庫 | Naive UI | ^2.40.0 | `npm install naive-ui` |
| 圖示系統 | Heroicons | latest | `npm install @heroicons/vue` |
| 狀態管理 | Pinia | ^3.0.3（已安裝） | - |

## Next Steps

1. **Phase 1: Design & Contracts**
   - 建立 `data-model.md`（定義組件 Props 型別）
   - 建立 `contracts/` 資料夾（定義 Store API 型別）
   - 建立 `quickstart.md`（開發環境設定指南）
   - 更新 agent context（執行 `.specify/scripts/bash/update-agent-context.sh`）

2. **Phase 2: Implementation（在 /speckit.tasks 中執行）**
   - 安裝依賴套件
   - 設定 Tailwind v4
   - 建立 Pinia Stores
   - 實作 Composables
   - 開發 Vue 組件
   - 撰寫測試

## References

- [Tailwind CSS v4 Alpha Documentation](https://tailwindcss.com/docs/v4-alpha)
- [video.js Documentation](https://videojs.com/)
- [Naive UI Documentation](https://www.naiveui.com/)
- [Heroicons Documentation](https://heroicons.com/)
- [Pinia Documentation](https://pinia.vuejs.org/)
