<script setup lang="ts">
import { computed, watch, nextTick, ref, onErrorCaptured } from 'vue'
import SectionList from './SectionList.vue'
import { useTranscriptStore } from '@/presentation/stores/transcriptStore'
import { useHighlightStore } from '@/presentation/stores/highlightStore'
import type { EditingAreaProps, EditingAreaEmits } from '@/presentation/types/component-contracts'

/**
 * EditingArea 組件
 *
 * 職責：
 * - 作為編輯區的容器組件
 * - 整合 SectionList 組件
 * - 處理句子選擇事件（呼叫 highlightStore.toggleSentence）
 * - 處理時間跳轉事件（emit 到 App.vue 以同步 PreviewArea）
 * - 監聽當前播放句子變化，自動滾動到該句子
 */

// ========================================
// Props & Emits
// ========================================
defineProps<EditingAreaProps>()
const emit = defineEmits<EditingAreaEmits>()

// ========================================
// 錯誤邊界
// ========================================
const hasError = ref(false)
const errorMessage = ref('')

/**
 * 錯誤邊界：捕獲子組件錯誤
 * 防止整個應用崩潰
 */
onErrorCaptured((err: Error) => {
  console.error('[EditingArea] Captured error from child component:', err)
  hasError.value = true
  errorMessage.value = err.message || '編輯區發生錯誤'
  // 返回 false 阻止錯誤繼續向上傳播
  return false
})

// ========================================
// Stores
// ========================================
const transcriptStore = useTranscriptStore()
const highlightStore = useHighlightStore()

// ========================================
// Refs
// ========================================
const editingAreaRef = ref<HTMLDivElement | null>(null)

// ========================================
// Computed Properties
// ========================================

/**
 * 段落列表（來自 transcriptStore）
 */
const sections = computed(() => transcriptStore.sections)

/**
 * 當前播放的句子 ID（來自 transcriptStore）
 */
const playingSentenceId = computed(() => transcriptStore.playingSentenceId)

/**
 * 選中的句子 ID 集合（來自 highlightStore）
 */
const selectedSentenceIds = computed(() => highlightStore.selectedSentenceIds)

/**
 * 是否有轉錄內容
 */
const hasTranscript = computed(() => transcriptStore.hasTranscript)

/**
 * 是否正在處理轉錄
 */
const isProcessing = computed(() => transcriptStore.isProcessing)

// ========================================
// Event Handlers
// ========================================

/**
 * 處理句子切換事件
 * 呼叫 highlightStore.toggleSentence 切換選中狀態
 * @param sentenceId 句子 ID
 */
async function handleToggleSentence(sentenceId: string) {
  try {
    await highlightStore.toggleSentence(sentenceId)
  } catch (error) {
    console.error('切換句子選中狀態失敗:', error)
  }
}

/**
 * 處理時間跳轉事件
 * emit seek-to-time 事件到 App.vue，由 App.vue 通知 PreviewArea 跳轉
 * @param time 時間（秒數）
 */
function handleSeekToTime(time: number) {
  emit('seek-to-time', time)
}

// ========================================
// Auto Scroll Logic
// ========================================

/**
 * 監聽當前播放句子變化，自動滾動到該句子
 * User Story 6 的需求：當前句子不在可見範圍時，編輯區自動滾動使其可見
 */
watch(playingSentenceId, async (newSentenceId) => {
  if (!newSentenceId || !editingAreaRef.value) return

  await nextTick()

  // 尋找對應的句子元素（使用 data-sentence-id 屬性）
  const sentenceElement = editingAreaRef.value.querySelector(
    `[data-sentence-id="${newSentenceId}"]`
  )

  if (sentenceElement) {
    // 自動滾動到該元素，使其出現在可見區域中央
    sentenceElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    })
  }
})
</script>

<template>
  <div ref="editingAreaRef" class="h-full overflow-auto bg-gray-50 p-4 lg:p-6">
    <!-- 錯誤狀態 -->
    <div
      v-if="hasError"
      class="flex flex-col items-center justify-center py-12 text-center"
    >
      <div class="text-red-600">
        <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-lg font-semibold mb-2">編輯區錯誤</p>
        <p class="text-sm text-gray-600 mb-4">{{ errorMessage }}</p>
        <button
          @click="hasError = false; errorMessage = ''"
          class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          重試
        </button>
      </div>
    </div>

    <!-- 正常內容 -->
    <template v-else>
      <!-- 標題 -->
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-2">轉錄內容</h2>
        <p class="text-sm text-gray-600">點擊句子以選擇/取消選擇，點擊時間戳跳轉到對應位置</p>
      </div>

    <!-- 載入中狀態 -->
    <div
      v-if="isProcessing"
      class="flex flex-col items-center justify-center py-12 text-center"
    >
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
      <p class="text-lg text-gray-700">正在處理轉錄內容...</p>
    </div>

    <!-- 無轉錄內容提示 -->
    <div
      v-else-if="!hasTranscript"
      class="flex flex-col items-center justify-center py-12 text-center text-gray-500"
    >
      <p class="text-lg">尚未上傳視頻</p>
      <p class="text-sm mt-2">請先上傳視頻以生成轉錄內容</p>
    </div>

      <!-- 段落列表 -->
      <SectionList
        v-else
        :sections="sections"
        :playing-sentence-id="playingSentenceId"
        :selected-sentence-ids="selectedSentenceIds"
        @toggle-sentence="handleToggleSentence"
        @seek-to-time="handleSeekToTime"
      />
    </template>
  </div>
</template>
