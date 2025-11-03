<template>
  <div class="video-player-container relative w-full">
    <!-- 錯誤狀態 -->
    <div
      v-if="hasError"
      class="absolute inset-0 flex flex-col items-center justify-center bg-red-50 z-20 p-6"
    >
      <div class="text-red-600 text-center">
        <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p class="text-lg font-semibold mb-2">視頻播放器錯誤</p>
        <p class="text-sm text-gray-600">{{ errorMessage }}</p>
        <button
          @click="
            hasError = false;
            errorMessage = '';
          "
          class="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          重試
        </button>
      </div>
    </div>

    <!-- Video.js 播放器 -->
    <video v-show="!hasError" ref="videoElement" class="video-js vjs-big-play-centered"></video>

    <!-- 文字疊加層 -->
    <TranscriptOverlay
      v-if="!hasError"
      :current-text="currentTranscriptText"
      :visible="showTranscript"
    />

    <!-- 載入狀態 -->
    <div
      v-if="isLoading && !hasError"
      class="absolute inset-0 flex items-center justify-center bg-black/50 z-10"
    >
      <NSpin size="large" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, onErrorCaptured, computed } from 'vue';
import { NSpin } from 'naive-ui';
import { useVideoPlayer } from '@/presentation/composables/useVideoPlayer';
import { useTranscriptStore } from '@/presentation/stores/transcriptStore';
import TranscriptOverlay from './TranscriptOverlay.vue';
import type { VideoPlayerProps, VideoPlayerEmits } from '@/presentation/types/component-contracts';

// Props
const props = defineProps<VideoPlayerProps>();

// Emits
const emit = defineEmits<VideoPlayerEmits>();

// 錯誤狀態
const hasError = ref(false);
const errorMessage = ref('');

/**
 * 錯誤邊界：捕獲子組件錯誤
 * 防止整個應用崩潰
 */
onErrorCaptured((err: Error) => {
  console.error('[VideoPlayer] Captured error from child component:', err);
  hasError.value = true;
  errorMessage.value = err.message || '視頻播放器發生錯誤';
  // 返回 false 阻止錯誤繼續向上傳播
  return false;
});

// Stores
const transcriptStore = useTranscriptStore();

// 使用 useVideoPlayer composable
const {
  videoElement,
  currentTime,
  isPlaying,
  duration,
  seekTo,
  play,
  pause,
  togglePlay,
  initializePlayer,
  updateSegments,
  disposePlayer
} = useVideoPlayer();

// 載入狀態
const isLoading = ref(true);

// 計算當前播放句子的文字（用於文字疊加）
const currentTranscriptText = computed(() => {
  return transcriptStore.playingSentence?.text ?? '';
});

// 控制文字疊加是否顯示（暫停時也顯示）
const showTranscript = computed(() => {
  return currentTranscriptText.value !== '';
});

/**
 * 事件處理函數：視頻載入完成
 */
function handleLoadedData() {
  isLoading.value = false;
}

/**
 * 事件處理函數：視頻載入錯誤
 */
function handleError(e: Event) {
  console.error('VideoPlayer: video loading error', e);
  isLoading.value = false;
}

/**
 * 初始化播放器（只在 videoUrl 改變或首次掛載時調用）
 */
function setupPlayer() {
  if (!props.videoUrl || props.segments.length === 0) {
    console.warn('VideoPlayer: videoUrl or segments is empty');
    isLoading.value = false;
    return;
  }

  isLoading.value = true;

  // 初始化播放器和片段播放
  initializePlayer(props.videoUrl, props.segments);

  // 監聽 loadeddata 事件（只在初始化時添加一次）
  if (videoElement.value) {
    // 移除舊的監聽器，避免重複添加
    videoElement.value.removeEventListener('loadeddata', handleLoadedData);
    videoElement.value.removeEventListener('error', handleError);

    // 添加新的監聽器
    videoElement.value.addEventListener('loadeddata', handleLoadedData);
    videoElement.value.addEventListener('error', handleError);
  }
}

// 監聽 videoUrl 變化，重新初始化播放器
watch(
  () => props.videoUrl,
  (newUrl, oldUrl) => {
    if (newUrl !== oldUrl) {
      setupPlayer();
    }
  }
);

// 監聽 segments 變化，只更新片段列表
watch(
  () => props.segments,
  (newSegments) => {
    if (newSegments.length === 0) {
      // segments 變為空，清理播放器
      disposePlayer();
      isLoading.value = false;
    } else {
      // segments 有內容，只更新片段列表（不重新初始化播放器）
      updateSegments(newSegments);
    }
  }
);

// 監聽播放時間變化，發送 timeupdate 事件
watch(currentTime, (time) => {
  emit('timeupdate', time);
});

// 監聽播放狀態變化，發送 play-state-change 事件
watch(isPlaying, (playing) => {
  emit('play-state-change', playing);
});

// 組件掛載時設定播放器
onMounted(() => {
  setupPlayer();
});

// 組件卸載時清理播放器
onUnmounted(() => {
  // 移除事件監聽器
  if (videoElement.value) {
    videoElement.value.removeEventListener('loadeddata', handleLoadedData);
    videoElement.value.removeEventListener('error', handleError);
  }

  disposePlayer();
});

// 暴露給父組件的方法
defineExpose({
  seekTo,
  play,
  pause,
  togglePlay,
  currentTime,
  isPlaying,
  duration
});
</script>

<style>
/**
 * Video.js 基礎樣式
 * 注意：不使用 scoped，以便 video.js 動態生成的元素可以正確應用樣式
 */
.video-player-container {
  aspect-ratio: 16 / 9;
  background-color: #000;
}

/**
 * 確保視頻播放器填滿容器
 */
.video-player-container .video-js {
  width: 100%;
  height: 100%;
}

/**
 * 移動端觸控目標優化
 * 增大 video.js 控制按鈕的點擊區域，確保 ≥ 44x44px
 */
@media (max-width: 1024px) {
  .video-player-container .video-js .vjs-control {
    min-width: 44px;
    min-height: 44px;
  }

  .video-player-container .video-js .vjs-play-control,
  .video-player-container .video-js .vjs-fullscreen-control {
    width: 48px;
    height: 48px;
  }

  .video-player-container .video-js .vjs-progress-control {
    min-height: 44px;
  }
}
</style>
