<template>
  <div class="video-player-wrapper">
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
      <video
        v-show="!hasError"
        ref="videoElement"
        class="video-js vjs-big-play-centered"
        playsinline
        webkit-playsinline
        x5-playsinline
      ></video>

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

    <!-- 自定義控制列 -->
    <div
      v-if="!hasError && !isLoading"
      class="custom-controls flex items-center justify-center gap-4 py-3 bg-gray-50 border-t border-gray-200"
    >
      <!-- 上一個片段按鈕 -->
      <NButton
        circle
        size="large"
        @click="goToPreviousSegment"
        title="上一個片段"
        :disabled="!videoElement"
      >
        <template #icon>
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z"
            />
          </svg>
        </template>
      </NButton>

      <!-- 播放/暫停按鈕 -->
      <NButton
        circle
        size="large"
        type="primary"
        @click="togglePlay"
        :title="isPlaying ? '暫停' : '播放'"
        :disabled="!videoElement"
      >
        <template #icon>
          <!-- 播放圖標 -->
          <svg v-if="!isPlaying" class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path
              d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"
            />
          </svg>
          <!-- 暫停圖標 -->
          <svg v-else class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
          </svg>
        </template>
      </NButton>

      <!-- 下一個片段按鈕 -->
      <NButton
        circle
        size="large"
        @click="goToNextSegment"
        title="下一個片段"
        :disabled="!videoElement"
      >
        <template #icon>
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798l-5.445-3.63z"
            />
          </svg>
        </template>
      </NButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, onErrorCaptured, computed } from 'vue';
import { NSpin, NButton } from 'naive-ui';
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
  goToPreviousSegment,
  goToNextSegment,
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
 * 視頻載入完成回調
 * 由 useVideoPlayer 在 video.js player 事件觸發時調用
 */
function handleLoadComplete() {
  isLoading.value = false;
}

/**
 * 視頻載入錯誤回調
 * 由 useVideoPlayer 在 video.js player 錯誤事件觸發時調用
 */
function handleLoadError(error: any) {
  console.error('[VideoPlayer] Load error callback triggered', error);
  isLoading.value = false;
  hasError.value = true;
  errorMessage.value = error?.message || '視頻載入失敗，請檢查視頻格式或網絡連接';
}

/**
 * 初始化播放器（只在 videoUrl 改變或首次掛載時調用）
 */
function setupPlayer() {
  if (!props.videoUrl || props.segments.length === 0) {
    console.warn('[VideoPlayer] videoUrl or segments is empty');
    isLoading.value = false;
    return;
  }

  isLoading.value = true;

  // 初始化播放器和片段播放，傳遞回調函數
  initializePlayer(props.videoUrl, props.segments, {
    onLoadComplete: handleLoadComplete,
    onLoadError: handleLoadError
  });
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
@media (max-width: 767px) {
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

  /**
   * 手機端自定義控制列按鈕優化
   */
  .custom-controls button {
    min-width: 48px;
    min-height: 48px;
  }
}

/**
 * 自定義控制列樣式
 */
.video-player-wrapper {
  width: 100%;
}

.custom-controls {
  background: linear-gradient(to bottom, #f9fafb, #f3f4f6);
  border-top: 1px solid #e5e7eb;
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.05);
}
</style>
