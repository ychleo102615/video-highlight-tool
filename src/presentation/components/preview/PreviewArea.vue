<template>
  <div class="preview-area flex flex-col h-full bg-gray-50">
    <!-- 標題區 -->
    <div class="preview-header px-6 py-4 bg-white border-b border-gray-200">
      <h2 class="text-xl font-semibold text-gray-800">
        預覽區
      </h2>
      <p class="text-sm text-gray-500 mt-1">
        <span v-if="hasSelectedSentences">
          已選擇 {{ selectedSentenceCount }} 個句子
        </span>
        <span v-else>
          請在編輯區選擇至少一個句子
        </span>
      </p>
    </div>

    <!-- 內容區 -->
    <div class="preview-content flex-1 overflow-auto p-6">
      <!-- 空狀態：無視頻 -->
      <EmptyState
        v-if="!hasVideo"
        key="empty-no-video"
        message="請先上傳視頻檔案"
        icon="video"
      />

      <!-- 空狀態：無選中句子 -->
      <EmptyState
        v-else-if="!hasSelectedSentences"
        key="empty-no-sentences"
        message="請在編輯區選擇至少一個句子來建立高光片段"
        icon="information"
      />

      <!-- 視頻播放器 -->
      <VideoPlayer
        v-else-if="hasSelectedSentences && hasVideo"
        key="video-player"
        :video-url="videoUrl!"
        :segments="timeSegments"
        @timeupdate="handleTimeUpdate"
        @play-state-change="handlePlayStateChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import VideoPlayer from './VideoPlayer.vue'
import EmptyState from '@/presentation/components/common/EmptyState.vue'
import { useVideoStore } from '@/presentation/stores/videoStore'
import { useHighlightStore } from '@/presentation/stores/highlightStore'
import { useTranscriptStore } from '@/presentation/stores/transcriptStore'

// Stores
const videoStore = useVideoStore()
const highlightStore = useHighlightStore()
const transcriptStore = useTranscriptStore()

// Computed - 是否有視頻
const hasVideo = computed(() => videoStore.hasVideo)

// Computed - 視頻 URL
const videoUrl = computed(() => videoStore.videoUrl)

// Computed - 是否有選中的句子
const hasSelectedSentences = computed(() => highlightStore.selectedSentenceIds.size > 0)

// Computed - 選中句子數量
const selectedSentenceCount = computed(() => highlightStore.selectedSentenceIds.size)

// Computed - 高光片段時間範圍（用於播放器）
const timeSegments = computed(() => highlightStore.timeSegments)

/**
 * 處理播放時間更新
 * 更新 transcriptStore 的 playingSentenceId，用於編輯區同步高亮
 */
function handleTimeUpdate(time: number) {
  const sentence = transcriptStore.getSentenceAtTime(time)
  transcriptStore.setPlayingSentenceId(sentence?.id ?? null)
}

/**
 * 處理播放狀態變化
 */
function handlePlayStateChange(isPlaying: boolean) {
  // 可在此處添加額外的狀態管理邏輯
}

// 監聽選中句子數量變化，用於調試和清除播放狀態
watch(
  () => highlightStore.selectedSentenceIds.size,
  (newSize, oldSize) => {
    if (newSize === 0) {
      // Edge case: 清除播放狀態，避免編輯區仍顯示「播放中」的提示
      transcriptStore.setPlayingSentenceId(null)
    }
  }
)

</script>

<style scoped>
.preview-area {
  /* 響應式高度 */
  @media (max-width: 768px) {
    /* 移動端：佔據 50vh */
    height: 50vh;
  }

  @media (min-width: 1024px) {
    /* 桌面端：佔據 50% 寬度 */
    height: 100vh;
  }
}

.preview-header {
  flex-shrink: 0;
}

.preview-content {
  flex-grow: 1;
}
</style>
