<script setup lang="ts">
import { computed } from 'vue'

/**
 * Timeline Props
 * 時間軸視覺化組件，顯示高光片段分布和當前播放進度
 */
 
interface TimelineProps {
  /** 視頻總時長（秒數） */
  totalDuration: number
  /** 高光片段時間範圍列表 */
  segments: TimeSegment[]
  /** 當前播放時間（秒數） */
  currentTime: number
}

interface TimeSegment {
  /** 句子 ID（用於唯一標識） */
  sentenceId: string
  /** 片段起始時間（秒數） */
  startTime: number
  /** 片段結束時間（秒數） */
  endTime: number
  /** 是否被選中 */
  isSelected: boolean
}

const props = defineProps<TimelineProps>()

/**
 * Emits
 * - seek: 使用者點擊時間軸，請求跳轉到指定時間
 */
const emit = defineEmits<{
  seek: [time: number]
}>()

/**
 * 計算播放進度百分比（0-100）
 */
const progressPercent = computed(() => {
  if (props.totalDuration === 0) return 0
  return (props.currentTime / props.totalDuration) * 100
})

/**
 * 計算每個片段的位置和寬度（百分比）
 */
const segmentBlocks = computed(() => {
  if (props.totalDuration === 0) return []

  return props.segments.map((segment) => {
    const startPercent = (segment.startTime / props.totalDuration) * 100
    const endPercent = (segment.endTime / props.totalDuration) * 100
    const widthPercent = endPercent - startPercent

    return {
      sentenceId: segment.sentenceId,
      left: `${startPercent}%`,
      width: `${widthPercent}%`,
      startTime: segment.startTime,
      endTime: segment.endTime,
      isSelected: segment.isSelected
    }
  })
})

/**
 * 處理時間軸點擊事件
 * 點擊時跳轉到該位置的時間
 */
function handleTimelineClick(event: MouseEvent) {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const clickPercent = clickX / rect.width

  const seekTime = clickPercent * props.totalDuration

  // 查找最近的片段起點
  const nearestSegment = findNearestSegment(seekTime)
  if (nearestSegment) {
    emit('seek', nearestSegment.startTime)
  } else {
    // 如果沒有片段，跳轉到點擊位置
    emit('seek', seekTime)
  }
}

/**
 * 處理片段區塊點擊事件
 * 點擊片段時跳轉到該片段起點
 */
function handleSegmentClick(event: MouseEvent, startTime: number) {
  event.stopPropagation()
  emit('seek', startTime)
}

/**
 * 查找最近的片段
 * 優先返回點擊位置所在的片段，否則返回最近的片段
 */
function findNearestSegment(time: number): TimeSegment | undefined {
  // 如果沒有片段，返回 undefined
  if (props.segments.length === 0) return undefined

  // 檢查是否點擊在某個片段內
  const clickedSegment = props.segments.find(
    (seg) => time >= seg.startTime && time <= seg.endTime
  )
  if (clickedSegment) return clickedSegment

  // 如果不在片段內，找最近的片段
  const firstSegment = props.segments[0]
  if (!firstSegment) return undefined

  let nearest = firstSegment
  let minDistance = Math.abs(time - firstSegment.startTime)

  for (const segment of props.segments) {
    const distance = Math.abs(time - segment.startTime)
    if (distance < minDistance) {
      minDistance = distance
      nearest = segment
    }
  }

  return nearest
}

/**
 * 格式化時間顯示（MM:SS）
 */
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="timeline-container">
    <!-- 時間軸標題 -->
    <div class="flex justify-between items-center mb-2 text-sm text-gray-600">
      <span>高光時間軸</span>
      <span>{{ formatTime(currentTime) }} / {{ formatTime(totalDuration) }}</span>
    </div>

    <!-- 時間軸主體 -->
    <div
      class="timeline-track relative h-12 bg-gray-200 rounded-lg cursor-pointer overflow-hidden"
      @click="handleTimelineClick"
    >
      <!-- 高光片段區塊 -->
      <transition-group name="segment-fade">
        <template v-for="block in segmentBlocks" :key="block.sentenceId">
          <div
            v-if="block.isSelected"
            class="segment-block absolute top-0 h-full bg-blue-500 hover:bg-blue-600 transition-colors duration-200 cursor-pointer rounded-sm"
            :style="{ left: block.left, width: block.width }"
            :title="`${formatTime(block.startTime)} - ${formatTime(block.endTime)}`"
            @click="handleSegmentClick($event, block.startTime)"
          >
            <!-- 片段內部視覺效果 -->
            <div class="w-full h-full opacity-50 bg-blue-400 rounded-sm"></div>
          </div>
        </template>
      </transition-group>

      <!-- 播放進度指示器 -->
      <div
        class="progress-indicator absolute top-0 h-full w-1 bg-rose-400 pointer-events-none z-10"
        :style="{ left: `${progressPercent}%` }"
      ></div>
    </div>

    <!-- 時間刻度（可選） -->
    <div class="flex justify-between mt-1 text-xs text-gray-500">
      <span>0:00</span>
      <span>{{ formatTime(totalDuration / 2) }}</span>
      <span>{{ formatTime(totalDuration) }}</span>
    </div>
  </div>
</template>

<style scoped>
.timeline-container {
  padding: 1rem;
  background-color: white;
  border-radius: 0.5rem;
}

.timeline-track {
  position: relative;
  user-select: none;
}

.segment-block {
  border-left: 1px solid rgba(59, 130, 246, 0.3);
  border-right: 1px solid rgba(59, 130, 246, 0.3);
}

.segment-block:hover {
  transform: scaleY(1.05);
  transition: transform 0.2s ease;
}

/* 淡入淡出動畫 - 只使用透明度變化 */
.segment-fade-enter-active,
.segment-fade-leave-active {
  transition: opacity 0.3s ease;
}

.segment-fade-enter-from {
  opacity: 0;
}

.segment-fade-leave-to {
  opacity: 0;
}

.progress-indicator {
  box-shadow: 0 0 6px rgba(251, 113, 133, 0.6);
  /* 使用線性過渡讓移動更順暢，匹配視頻播放速度 */
  transition: left 0.25s linear;
}
</style>
