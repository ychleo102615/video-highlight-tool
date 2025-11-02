<template>
  <div class="video-player-container relative w-full">
    <!-- Video.js 播放器 -->
    <video
      ref="videoElement"
      class="video-js vjs-default-skin w-full"
    ></video>

    <!-- 載入狀態 -->
    <div
      v-if="isLoading"
      class="absolute inset-0 flex items-center justify-center bg-black/50"
    >
      <NSpin size="large" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { NSpin } from 'naive-ui'
import { useVideoPlayer } from '@/presentation/composables/useVideoPlayer'
import type { VideoPlayerProps, VideoPlayerEmits } from '@/presentation/types/component-contracts'

// Props
const props = defineProps<VideoPlayerProps>()

// Emits
const emit = defineEmits<VideoPlayerEmits>()

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
  disposePlayer
} = useVideoPlayer()

// 載入狀態
const isLoading = ref(true)

/**
 * 初始化播放器
 */
function setupPlayer() {
  if (!props.videoUrl || props.segments.length === 0) {
    console.warn('VideoPlayer: videoUrl or segments is empty')
    isLoading.value = false
    return
  }

  isLoading.value = true

  // 初始化播放器和片段播放
  initializePlayer(props.videoUrl, props.segments)

  // 監聽 loadeddata 事件
  if (videoElement.value) {
    videoElement.value.addEventListener('loadeddata', () => {
      isLoading.value = false
    })

    videoElement.value.addEventListener('error', (e) => {
      console.error('VideoPlayer: video loading error', e)
      isLoading.value = false
    })
  }
}

// 監聽 props 變化，重新初始化播放器
watch(
  () => [props.videoUrl, props.segments] as const,
  () => {
    setupPlayer()
  },
  { immediate: false }
)

// 監聽播放時間變化，發送 timeupdate 事件
watch(currentTime, (time) => {
  emit('timeupdate', time)
})

// 監聽播放狀態變化，發送 play-state-change 事件
watch(isPlaying, (playing) => {
  emit('play-state-change', playing)
})

// 組件掛載時設定播放器
onMounted(() => {
  setupPlayer()
})

// 組件卸載時清理播放器
onUnmounted(() => {
  disposePlayer()
})

// 暴露給父組件的方法
defineExpose({
  seekTo,
  play,
  pause,
  togglePlay,
  currentTime,
  isPlaying,
  duration
})
</script>

<style scoped>
/**
 * Video.js 基礎樣式
 * 使用 video.js 提供的預設樣式
 */
.video-player-container {
  aspect-ratio: 16 / 9;
  background-color: #000;
}

/**
 * 確保視頻播放器填滿容器
 */
.video-js {
  width: 100%;
  height: 100%;
}

/**
 * 隱藏原生控制欄（使用 video.js 控制欄）
 */
.video-js .vjs-tech {
  pointer-events: none;
}
</style>
