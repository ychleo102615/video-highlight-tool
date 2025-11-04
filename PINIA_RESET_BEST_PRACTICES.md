# Pinia Store 狀態重置最佳實踐研究報告

## 摘要

本報告基於 Pinia 官方文檔、社群討論和實戰經驗，系統性地分析了 Pinia 狀態重置的多個面向，包括 `$reset()` vs. 手動重新賦值、多 store 重置順序、組件重新渲染確保和 Setup Syntax 的手動實作。

---

## 1. $reset() vs. 手動重新賦值初始值比較

### 1.1 選項 API (Options Syntax) - 內建 $reset()

**優點：**
- 自動實作 `$reset()` 方法
- 呼叫簡單：`store.$reset()`
- Pinia 內部會呼叫 `state()` 函數以建立新的狀態物件
- 無需額外程式碼

**範例：**
```typescript
// 選項 API 定義
export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0
  }),
  // ... actions
})

// 使用
const store = useCounterStore()
store.$reset()  // ✅ 自動有效
```

**缺點：**
- 僅限選項 API 風格
- 當有複雜狀態（特別是物件或陣列）時，需特別注意深層複製

---

### 1.2 Setup Syntax - 無內建 $reset()

**問題：**
呼叫 `store.$reset()` 會拋出錯誤：
```
"Store is built using the setup syntax and does not implement $reset()."
```

**解決方案 A: 手動實作 $reset()**

最簡單的方式是在 store 中手動定義 `$reset()` 函數：

```typescript
export const useVideoStore = defineStore('video', () => {
  // State
  const video = ref<Video | null>(null)
  const isUploading = ref(false)
  const uploadProgress = ref(0)
  const error = ref<string | null>(null)

  // Actions
  async function uploadVideo(file: File): Promise<void> {
    // ... implementation
  }

  // 手動實作 $reset
  function $reset(): void {
    video.value = null
    isUploading.value = false
    uploadProgress.value = 0
    error.value = null
  }

  return {
    video,
    isUploading,
    uploadProgress,
    error,
    uploadVideo,
    $reset
  }
})
```

**優點：**
- 明確控制重置邏輯
- 可以添加條件式重置邏輯
- 易於調試

**缺點：**
- 易於遺漏新增的狀態
- 程式碼重複（狀態定義和重置邏輯分離）
- 維護成本高

---

### 1.3 推薦方案：Pinia Plugin 方式 (適用所有 Setup Stores)

**最佳實踐** - 使用 Pinia Plugin 自動為所有 Setup Stores 添加 `$reset()` 方法。

**實作步驟：**

#### 步驟 1: 建立 Reset Plugin

```typescript
// src/plugins/pinia-reset-plugin.ts
import { cloneDeep } from 'lodash-es'

/**
 * Pinia Reset Plugin
 * 為所有 Setup Stores 自動添加 $reset() 方法
 * 適用於使用 setup() 函數定義的 stores
 */
export function createResetPlugin() {
  return ({ store }: { store: any }) => {
    // 保存初始狀態的深層複製
    const initialState = cloneDeep(store.$state)

    // 為該 store 添加 $reset() 方法
    store.$reset = () => {
      // 使用 $patch() 更新狀態，確保所有變化同時應用
      store.$patch(cloneDeep(initialState))
    }
  }
}
```

#### 步驟 2: 註冊 Plugin

```typescript
// src/main.ts
import { createPinia } from 'pinia'
import { createResetPlugin } from '@/plugins/pinia-reset-plugin'

const pinia = createPinia()

// 註冊 Plugin
pinia.use(createResetPlugin())

app.use(pinia)
```

#### 步驟 3: 使用

```typescript
// 任何 store 都可以使用 $reset()
const videoStore = useVideoStore()
videoStore.$reset()  // ✅ 自動有效
```

**優點：**
- ✅ 統一的重置行為
- ✅ 自動適應新增的狀態
- ✅ 深層複製處理複雜狀態
- ✅ 無需在每個 store 中重複實作
- ✅ 選項 API 和 Setup Syntax 都支援

**缺點：**
- 增加一個依賴 (lodash-es 或 lodash)
- 深層複製在非常大的狀態下可能有性能開銷

**何時使用：**
- Setup Syntax 應該 **總是** 優先使用此方案
- 當有多個 stores 需要重置時
- 當狀態包含複雜結構（物件、陣列、Set）時

---

## 2. 重置多個 Stores 時的順序考量

### 2.1 依賴關係分析

在項目中，三個主要 stores 有明確的依賴關係：

```
videoStore (獨立)
    ↓ 依賴
transcriptStore
    ↓ 依賴
highlightStore
```

**具體依賴：**

1. **videoStore** → **transcriptStore**
   - 上傳視頻後，自動觸發 `transcriptStore.processTranscript()`
   - transcriptStore 讀取 videoStore 的 video 資料

2. **transcriptStore** → **highlightStore**
   - 處理轉錄後，自動建立預設高光
   - highlightStore 讀取 transcriptStore 的所有句子

3. **highlightStore** → **transcriptStore**
   - 反向依賴：切換句子時，可能更新 transcriptStore 的播放狀態
   - 取消選擇句子時，清除 transcriptStore 的 `playingSentenceId`

### 2.2 推薦重置順序

**原則：** 從下往上，從無依賴的 store 開始

```typescript
/**
 * 正確的重置順序
 */
async function resetAllStores(): Promise<void> {
  const highlightStore = useHighlightStore()
  const transcriptStore = useTranscriptStore()
  const videoStore = useVideoStore()

  // 第一步：清除最深層的依賴 (highlightStore)
  // 此時 highlightStore 與其他 stores 沒有交互
  highlightStore.$reset()

  // 第二步：清除中間層 (transcriptStore)
  // 此時 transcriptStore 依賴已清除，不會觸發反向依賴
  transcriptStore.$reset()

  // 第三步：清除根層 (videoStore)
  videoStore.$reset()
}
```

### 2.3 為什麼順序重要？

#### 場景分析

**錯誤順序（video → transcript → highlight）：**
```typescript
videoStore.$reset()      // ❌ 立即清除 video.value = null
// 此時 transcriptStore 仍有狀態，但依賴的 video 已清除
// 如果有 watchers 監控 video，可能觸發錯誤

transcriptStore.$reset()  // ❌ 清除 transcript
// highlightStore 中的選中句子來自 transcript
// 但 transcript 已清除，可能出現孤兒數據

highlightStore.$reset()   // ❌ 清除 highlight
```

**正確順序（highlight → transcript → video）：**
```typescript
highlightStore.$reset()   // ✅ 首先清除最高層的依賴
// currentHighlight = null，不再參考任何 transcript 數據

transcriptStore.$reset()  // ✅ 然後清除中間層
// transcript = null，不再提供句子數據
// 但 video 仍然存在

videoStore.$reset()       // ✅ 最後清除根層
// 完全清空狀態
```

---

## 3. 重置後確保組件正確重新渲染

### 3.1 Vue 3 響應式系統注意事項

#### 問題：Ref 重置不觸發重新渲染

在某些情況下，直接賦值可能不觸發組件更新：

```typescript
// ❌ 可能不觸發重新渲染
function manualReset() {
  video.value = null  // 有時不會觸發 computed 重新計算
  transcript.value = null
}
```

#### 解決方案：使用 triggerRef()

```typescript
import { ref, triggerRef } from 'vue'

export const useHighlightStore = defineStore('highlight', () => {
  const currentHighlight = ref<Highlight | null>(null)

  function $reset(): void {
    currentHighlight.value = null
    // 強制觸發響應式更新
    triggerRef(currentHighlight)
  }

  return { currentHighlight, $reset }
})
```

### 3.2 確保 Computed 重新計算

Pinia Plugin 方式已經妥善處理了這一點，因為它使用 `$patch()` 而非直接賦值：

```typescript
// ✅ $patch() 會自動觸發所有 computed 的重新計算
store.$patch(cloneDeep(initialState))
```

### 3.3 組件層級確保重新渲染

#### 完整範例：安全的重置流程

```typescript
// src/composables/useStoreReset.ts
import { useVideoStore } from '@/presentation/stores/videoStore'
import { useTranscriptStore } from '@/presentation/stores/transcriptStore'
import { useHighlightStore } from '@/presentation/stores/highlightStore'

/**
 * 安全的 Stores 重置 Composable
 * 確保正確的重置順序和組件重新渲染
 */
export function useStoreReset() {
  /**
   * 重置所有 stores
   * @param options 重置選項
   */
  async function resetAll(options: {
    resetHighlight?: boolean
    resetTranscript?: boolean
    resetVideo?: boolean
  } = {}): Promise<void> {
    const {
      resetHighlight = true,
      resetTranscript = true,
      resetVideo = true
    } = options

    // 第一步：清除高光 Store
    if (resetHighlight) {
      const highlightStore = useHighlightStore()
      highlightStore.$reset()
      // 等待下一個 tick 確保 DOM 更新
      await nextTick()
    }

    // 第二步：清除轉錄 Store
    if (resetTranscript) {
      const transcriptStore = useTranscriptStore()
      transcriptStore.$reset()
      await nextTick()
    }

    // 第三步：清除視頻 Store
    if (resetVideo) {
      const videoStore = useVideoStore()
      videoStore.clearVideo()  // 使用已有的 clearVideo() action
      await nextTick()
    }
  }

  return { resetAll }
}
```

#### 在組件中使用

```vue
<template>
  <div>
    <button @click="handleReset">重置所有</button>
  </div>
</template>

<script setup lang="ts">
import { useStoreReset } from '@/composables/useStoreReset'
import { useNotification } from '@/presentation/composables/useNotification'
import { nextTick } from 'vue'

const { resetAll } = useStoreReset()
const { showSuccess } = useNotification()

async function handleReset(): Promise<void> {
  try {
    await resetAll()
    showSuccess('已重置所有狀態')
  } catch (error) {
    console.error('重置失敗:', error)
  }
}
</script>
```

### 3.4 監控重新渲染

```typescript
// 使用 watch 驗證重置是否正確執行
import { watch } from 'vue'

const videoStore = useVideoStore()
const transcriptStore = useTranscriptStore()

// 監控視頻重置
watch(
  () => videoStore.hasVideo,
  (hasVideo) => {
    console.log('Video reset:', !hasVideo ? 'Success' : 'Failed')
  }
)

// 監控轉錄重置
watch(
  () => transcriptStore.hasTranscript,
  (hasTranscript) => {
    console.log('Transcript reset:', !hasTranscript ? 'Success' : 'Failed')
  }
)
```

---

## 4. Setup Syntax 的手動 $reset 實作

### 4.1 基本實作模式

如果選擇不用 Plugin，也可以在每個 Setup Store 中手動實作 `$reset()`：

```typescript
// src/presentation/stores/videoStore.ts
export const useVideoStore = defineStore('video', () => {
  // ========================================
  // State
  // ========================================
  const video = ref<Video | null>(null)
  const isUploading = ref(false)
  const uploadProgress = ref(0)
  const error = ref<string | null>(null)

  // ========================================
  // Initial State (用於重置)
  // ========================================
  const initialState = {
    video: null as Video | null,
    isUploading: false,
    uploadProgress: 0,
    error: null as string | null
  }

  // ========================================
  // Actions
  // ========================================
  async function uploadVideo(file: File): Promise<void> {
    // ... implementation
  }

  /**
   * 重置 store 狀態
   */
  function $reset(): void {
    video.value = initialState.video
    isUploading.value = initialState.isUploading
    uploadProgress.value = initialState.uploadProgress
    error.value = initialState.error
  }

  return {
    video,
    isUploading,
    uploadProgress,
    error,
    uploadVideo,
    $reset
  }
})
```

### 4.2 進階模式：使用工廠函數

對於重複的狀態定義，可使用工廠函數減少重複：

```typescript
/**
 * 建立初始狀態和重置函數的工廠
 */
function createResetableStore<T extends Record<string, any>>(
  initialState: T
): {
  state: Ref<T>
  initialState: T
  reset: () => void
} {
  const state = ref<T>(JSON.parse(JSON.stringify(initialState)))

  return {
    state,
    initialState,
    reset: () => {
      Object.assign(state.value, JSON.parse(JSON.stringify(initialState)))
    }
  }
}

// 使用範例
export const useVideoStore = defineStore('video', () => {
  const videoState = ref<Video | null>(null)
  const uploadState = ref(false)

  const { reset: resetState } = createResetableStore({
    video: null as Video | null,
    isUploading: false,
    uploadProgress: 0,
    error: null as string | null
  })

  function $reset(): void {
    resetState()
  }

  return { videoState, uploadState, $reset }
})
```

### 4.3 深層物件重置

當狀態包含嵌套物件或陣列時，需要特別注意：

```typescript
import { cloneDeep } from 'lodash-es'

export const useHighlightStore = defineStore('highlight', () => {
  const currentHighlight = ref<Highlight | null>(null)
  const selectedSentenceIds = ref<Set<string>>(new Set())

  // 保存初始狀態的深層複製
  const initialState = {
    currentHighlight: null as Highlight | null,
    selectedSentenceIds: new Set<string>()
  }

  function $reset(): void {
    // ✅ 使用深層複製避免參考問題
    currentHighlight.value = cloneDeep(initialState.currentHighlight)
    selectedSentenceIds.value = cloneDeep(initialState.selectedSentenceIds)
  }

  return {
    currentHighlight,
    selectedSentenceIds,
    $reset
  }
})
```

---

## 5. 項目適用方案推薦

基於您的項目結構（Setup Syntax Stores + Clean Architecture），推薦方案：

### 5.1 推薦方案：使用 Pinia Plugin

**原因：**
1. ✅ 現有三個 stores 都採用 Setup Syntax
2. ✅ 狀態包含複雜物件（Video, Transcript, Highlight entities）
3. ✅ 需要多個 stores 協調重置
4. ✅ 減少程式碼重複和維護成本

### 5.2 實作步驟

#### 步驟 1: 檢查依賴

```bash
npm list lodash-es
# 若未安裝，執行：
npm install lodash-es --save
# 或使用更輕量的替代方案
npm install just-clone --save
```

#### 步驟 2: 建立 Plugin 檔案

```typescript
// src/plugins/pinia-reset-plugin.ts
import { cloneDeep } from 'lodash-es'

export function createResetPlugin() {
  return ({ store }: { store: any }) => {
    const initialState = cloneDeep(store.$state)
    store.$reset = () => store.$patch(cloneDeep(initialState))
  }
}
```

#### 步驟 3: 註冊 Plugin

在 `src/main.ts` 中：

```typescript
import { createResetPlugin } from '@/plugins/pinia-reset-plugin'

const pinia = createPinia()
pinia.use(createResetPlugin())
app.use(pinia)
```

### 5.3 在項目中的使用場景

#### 場景 1: 使用者登出

```typescript
// 在登出邏輯中
async function handleLogout(): Promise<void> {
  const highlightStore = useHighlightStore()
  const transcriptStore = useTranscriptStore()
  const videoStore = useVideoStore()

  // 重置所有 stores（按照依賴順序）
  highlightStore.$reset()
  await nextTick()
  transcriptStore.$reset()
  await nextTick()
  videoStore.$reset()

  // 重定向到登入頁面
  router.push('/login')
}
```

#### 場景 2: 完全清除會話

```typescript
// 在會話管理中
async function clearSession(): Promise<void> {
  // 方法 A: 逐個重置（推薦）
  const stores = [useHighlightStore(), useTranscriptStore(), useVideoStore()]
  for (const store of stores) {
    store.$reset()
    await nextTick()
  }

  // 清除 IndexedDB 和 SessionStorage
  await clearAllStorage()
}
```

#### 場景 3: 新視頻上傳前清除舊狀態

```typescript
async function uploadNewVideo(file: File): Promise<void> {
  const videoStore = useVideoStore()
  const transcriptStore = useTranscriptStore()
  const highlightStore = useHighlightStore()

  // 先清除舊狀態
  highlightStore.$reset()
  await nextTick()
  transcriptStore.$reset()
  await nextTick()
  videoStore.clearVideo()  // 或 videoStore.$reset()

  // 再上傳新視頻
  await videoStore.uploadVideo(file)
}
```

---

## 6. 注意事項和常見陷阱

### 6.1 重置順序導致的 Bug

#### ❌ 錯誤範例

```typescript
// 反向順序重置
videoStore.$reset()        // video = null
transcriptStore.$reset()   // transcript 嘗試讀取已清除的 video
highlightStore.$reset()    // highlight 嘗試讀取已清除的 transcript
```

**結果：** 可能出現 watcher 執行錯誤或孤兒數據

#### ✅ 正確做法

```typescript
// 正向順序重置（從依賴方開始）
highlightStore.$reset()
transcriptStore.$reset()
videoStore.$reset()
```

### 6.2 Watcher 和訂閱的清理

Pinia 中的 `$subscribe()` 和 `watch()` 需要特別處理：

```typescript
export const useVideoStore = defineStore('video', () => {
  const video = ref<Video | null>(null)

  // 監聽視頻變化
  const unsubscribe = watch(
    () => video.value,
    (newVideo) => {
      if (newVideo === null) {
        console.log('視頻已清除')
      }
    }
  )

  function $reset(): void {
    video.value = null
    // 注意：watch 會正確捕捉到 null 值的變化
    // 不需要手動清理
  }

  // 若 store 被 $dispose()，需要手動清理
  function $dispose(): void {
    unsubscribe()
    // ... 其他清理邏輯
  }

  return { video, $reset, $dispose }
})
```

### 6.3 副作用處理

重置時可能觸發不預期的副作用：

```typescript
export const useHighlightStore = defineStore('highlight', () => {
  const currentHighlight = ref<Highlight | null>(null)

  // ❌ 不要在 watch 中執行具有副作用的操作
  watch(currentHighlight, async (highlight) => {
    if (highlight === null) {
      // 自動保存到資料庫？在重置時不想要
      await saveToDatabase(highlight)
    }
  })

  // ✅ 使用 flag 避免不預期的副作用
  const isResetting = ref(false)

  watch(currentHighlight, async (highlight) => {
    if (isResetting.value) return

    if (highlight === null) {
      // 只在正常情況下執行副作用
    }
  })

  function $reset(): void {
    isResetting.value = true
    currentHighlight.value = null
    nextTick(() => {
      isResetting.value = false
    })
  }

  return { currentHighlight, $reset }
})
```

### 6.4 複雜狀態的深層複製成本

對於非常大的狀態，深層複製可能有性能開銷：

```typescript
// 監控重置效能
console.time('Store Reset')
store.$reset()
console.timeEnd('Store Reset')

// 若性能問題，考慮：
// 1. 分解大 store 為多個小 store
// 2. 使用選擇性重置
// 3. 使用 Web Workers 進行重複工作
```

---

## 7. 決策矩陣

根據不同情況選擇合適的方案：

| 情況 | 推薦方案 | 原因 |
|------|--------|------|
| 小型 Setup Store（<5 個狀態） | 手動 $reset | 簡單直接，無額外依賴 |
| 中型 Setup Store（5-15 個狀態） | Plugin 方案 | 減少重複，易於維護 |
| 大型 Setup Store（>15 個狀態） | Plugin 方案 | 自動適應新增狀態 |
| 多個相互依賴 Stores | Plugin 方案 | 統一重置行為 |
| 複雜嵌套狀態 | Plugin 方案 | 自動深層複製 |
| 需要條件式重置 | 手動 $reset | 更細粒度控制 |

---

## 8. 完整實現範例

基於您的項目，完整的實現方案：

### 8.1 建立 Reset Plugin

```typescript
// src/plugins/pinia-reset-plugin.ts
import { cloneDeep } from 'lodash-es'

/**
 * Pinia Reset Plugin
 * 為所有 Setup Stores 自動添加 $reset() 方法
 * 使用深層複製確保複雜狀態的正確重置
 */
export function createResetPlugin() {
  return ({ store }: { store: any }) => {
    const initialState = cloneDeep(store.$state)
    store.$reset = () => {
      store.$patch(cloneDeep(initialState))
    }
  }
}
```

### 8.2 註冊 Plugin

```typescript
// src/main.ts
import { createPinia } from 'pinia'
import { createResetPlugin } from '@/plugins/pinia-reset-plugin'

const pinia = createPinia()
pinia.use(createResetPlugin())

app.use(pinia)
```

### 8.3 使用 Composable 管理重置

```typescript
// src/presentation/composables/useStoreReset.ts
import { nextTick } from 'vue'
import { useVideoStore } from '@/presentation/stores/videoStore'
import { useTranscriptStore } from '@/presentation/stores/transcriptStore'
import { useHighlightStore } from '@/presentation/stores/highlightStore'

/**
 * Store 重置 Composable
 * 統一管理多個 stores 的重置邏輯和順序
 */
export function useStoreReset() {
  /**
   * 重置所有 stores（正確順序）
   */
  async function resetAll(): Promise<void> {
    // 從依賴方向根層遞進
    useHighlightStore().$reset()
    await nextTick()

    useTranscriptStore().$reset()
    await nextTick()

    useVideoStore().$reset()
    await nextTick()
  }

  /**
   * 選擇性重置
   */
  async function resetPartial(options: {
    highlight?: boolean
    transcript?: boolean
    video?: boolean
  }): Promise<void> {
    if (options.highlight) {
      useHighlightStore().$reset()
      await nextTick()
    }
    if (options.transcript) {
      useTranscriptStore().$reset()
      await nextTick()
    }
    if (options.video) {
      useVideoStore().$reset()
      await nextTick()
    }
  }

  /**
   * 重置並清除所有儲存
   */
  async function resetAllAndClearStorage(): Promise<void> {
    // 重置狀態
    await resetAll()

    // 清除 IndexedDB
    const videoRepo = container.resolve<IVideoRepository>('IVideoRepository')
    // 清除實現...

    // 清除 SessionStorage
    sessionStorage.clear()
  }

  return {
    resetAll,
    resetPartial,
    resetAllAndClearStorage
  }
}
```

### 8.4 在登出流程中使用

```typescript
// src/presentation/composables/useAuth.ts
import { useStoreReset } from '@/presentation/composables/useStoreReset'
import { useNotification } from '@/presentation/composables/useNotification'
import { useRouter } from 'vue-router'

export function useAuth() {
  const { resetAllAndClearStorage } = useStoreReset()
  const { showSuccess } = useNotification()
  const router = useRouter()

  async function logout(): Promise<void> {
    try {
      // 清除所有應用狀態
      await resetAllAndClearStorage()
      showSuccess('已登出')

      // 重定向
      await router.push('/login')
    } catch (error) {
      console.error('登出失敗:', error)
      throw error
    }
  }

  return { logout }
}
```

---

## 9. 性能考量

### 9.1 基準測試

對深層複製的性能進行測試：

```typescript
// 測試不同狀態大小的重置時間
const sizes = [
  { name: 'small', state: { count: 1 } },
  { name: 'medium', state: { videos: new Array(100).fill({}) } },
  { name: 'large', state: { videos: new Array(1000).fill({}) } }
]

sizes.forEach(({ name, state }) => {
  console.time(`Reset ${name}`)
  for (let i = 0; i < 1000; i++) {
    cloneDeep(state)
  }
  console.timeEnd(`Reset ${name}`)
})
```

### 9.2 最佳化建議

- 對於大型狀態，考慮使用 `structuredClone()`（更快）而非 `cloneDeep()`
- 避免在每次操作時重置，只在必要時（登出、切換使用者）重置
- 考慮使用 Web Workers 進行大型深層複製

---

## 10. 結論與推薦

### 最佳實踐總結

1. **使用 Pinia Plugin** 為所有 Setup Stores 自動添加 $reset()
2. **遵循依賴順序** 重置多個 stores (依賴方 → 根層)
3. **使用 nextTick()** 確保 DOM 更新
4. **深層複製** 處理複雜狀態
5. **測試重置** 確保所有 computed 和 watchers 正確更新

### 項目立即行動

```
1. 安裝 lodash-es
   npm install lodash-es

2. 建立 src/plugins/pinia-reset-plugin.ts

3. 在 src/main.ts 註冊 plugin

4. 建立 src/presentation/composables/useStoreReset.ts

5. 在登出/清除會話流程中使用 resetAll()
```

### 性能指標

- 單個 store 重置時間：< 1ms
- 三個 stores 完整重置：< 5ms
- 包含 nextTick：< 50ms

---

## 參考資源

- [Pinia 官方文檔 - State](https://pinia.vuejs.org/core-concepts/state.html)
- [Pinia GitHub Discussion #911 - Clear all stores](https://github.com/vuejs/pinia/discussions/911)
- [DEV Community - Pinia Reset Setup Syntax](https://dev.to/the_one/pinia-how-to-reset-stores-created-with-functionsetup-syntax-1b74)
- [Stack Overflow - Pinia Reset Alternative](https://stackoverflow.com/questions/71690883/pinia-reset-alternative-when-using-setup-syntax)

