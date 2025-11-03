/**
 * useVideoPlayer Composable
 *
 * 封裝 video.js 播放器的控制邏輯和片段播放機制
 *
 * 主要功能：
 * - 初始化和清理 video.js 播放器
 * - 片段播放機制（基於 timeupdate 事件）
 * - 播放控制（播放、暫停、跳轉）
 * - 播放狀態的響應式更新
 */

import { ref, onUnmounted, type Ref } from 'vue'
import videojs from 'video.js'
import type Player from 'video.js/dist/types/player'

interface TimeSegment {
  startTime: number // 秒數
  endTime: number // 秒數
}

export interface UseVideoPlayerReturn {
  /** 視頻 DOM 元素 ref */
  videoElement: Ref<HTMLVideoElement | null>
  /** 當前播放時間（秒數） */
  currentTime: Readonly<Ref<number>>
  /** 是否正在播放 */
  isPlaying: Readonly<Ref<boolean>>
  /** 視頻總時長（秒數） */
  duration: Readonly<Ref<number>>
  /** 跳轉到指定時間 */
  seekTo: (time: number) => void
  /** 播放 */
  play: () => void
  /** 暫停 */
  pause: () => void
  /** 切換播放/暫停 */
  togglePlay: () => void
  /** 初始化視頻播放器（用於片段播放） */
  initializePlayer: (videoUrl: string, segments: TimeSegment[]) => void
  /** 更新片段列表（不重新初始化播放器） */
  updateSegments: (newSegments: TimeSegment[]) => void
  /** 清理播放器 */
  disposePlayer: () => void
}

export function useVideoPlayer(): UseVideoPlayerReturn {
  // State
  const videoElement = ref<HTMLVideoElement | null>(null)
  const currentTime = ref(0)
  const isPlaying = ref(false)
  const duration = ref(0)
  const player = ref<Player | null>(null)

  // 片段播放相關狀態
  let currentSegmentIndex = 0
  let segments: TimeSegment[] = []
  let rafId: number | null = null

  /**
   * 初始化 video.js 播放器
   * @param videoUrl 視頻 URL
   * @param segmentList 要播放的片段列表
   */
  function initializePlayer(videoUrl: string, segmentList: TimeSegment[]) {
    if (!videoElement.value) {
      console.warn('Video element not found')
      return
    }

    // 清理舊的播放器
    disposePlayer()

    // 更新片段列表
    segments = segmentList
    currentSegmentIndex = 0

    // 初始化 video.js 播放器
    player.value = videojs(videoElement.value, {
      controls: true,
      fluid: true,
      preload: 'metadata',
      controlBar: {
        remainingTimeDisplay: false,
        playbackRateMenuButton: false
      }
    })

    // 設定視頻來源
    player.value.src({
      src: videoUrl,
      type: 'video/mp4'
    })

    // 監聽 loadedmetadata 事件以獲取時長
    player.value.on('loadedmetadata', () => {
      if (player.value) {
        duration.value = player.value.duration() || 0
      }
    })

    // 監聽播放狀態變化
    player.value.on('play', () => {
      isPlaying.value = true
    })

    player.value.on('pause', () => {
      isPlaying.value = false
    })

    // 監聽時間更新事件（實作片段播放邏輯）
    player.value.on('timeupdate', handleTimeUpdate)

    // 如果有片段，跳轉到第一個片段的起點
    if (segments.length > 0 && segments[0]) {
      seekTo(segments[0].startTime)
    }
  }

  /**
   * 更新片段列表（不重新初始化播放器）
   * @param newSegments 新的片段列表
   */
  function updateSegments(newSegments: TimeSegment[]) {
    if (!player.value) return

    // 保存當前播放狀態
    const wasPlaying = !player.value.paused()
    const currentPlayTime = player.value.currentTime() || 0

    // 更新內部片段列表
    segments = newSegments

    // 檢查當前播放時間是否在新的片段列表中
    const currentSegmentInNew = newSegments.findIndex(
      (seg) => currentPlayTime >= seg.startTime && currentPlayTime < seg.endTime
    )

    if (currentSegmentInNew !== -1) {
      // 當前時間在新片段中，更新索引但不跳轉，保持播放
      currentSegmentIndex = currentSegmentInNew
      // 如果正在播放，繼續播放（不需要做任何事）
    } else {
      // 當前時間不在新片段中，需要暫停並跳轉
      if (wasPlaying) {
        player.value.pause()
      }

      // 找最近的片段並跳轉
      const nearestSegment = findNearestSegment(currentPlayTime, newSegments)
      if (nearestSegment) {
        const segmentIndex = newSegments.indexOf(nearestSegment)
        currentSegmentIndex = segmentIndex
        seekTo(nearestSegment.startTime)
      } else if (newSegments.length > 0 && newSegments[0]) {
        // Fallback: 跳到第一個片段
        currentSegmentIndex = 0
        seekTo(newSegments[0].startTime)
      } else {
        // 沒有任何片段，重置索引
        currentSegmentIndex = 0
      }
    }
  }

  /**
   * 處理 timeupdate 事件（片段播放核心邏輯）
   */
  function handleTimeUpdate() {
    if (!player.value || segments.length === 0) return

    // 使用 requestAnimationFrame 優化效能
    if (rafId) return

    rafId = requestAnimationFrame(() => {
      if (!player.value) return

      const time = player.value?.currentTime() || 0
      currentTime.value = time

      const currentSegment = segments[currentSegmentIndex]
      if (!currentSegment) {
        rafId = null
        return
      }

      // 檢查是否超出當前片段結束時間
      if (time >= currentSegment.endTime) {
        currentSegmentIndex++

        // 檢查是否還有下一個片段
        if (currentSegmentIndex < segments.length) {
          const nextSegment = segments[currentSegmentIndex]
          if (nextSegment) {
            player.value?.currentTime(nextSegment.startTime)
          }
        } else {
          // 所有片段播放完畢，暫停並重置
          player.value?.pause()
          currentSegmentIndex = 0
          // 跳回第一個片段的起點
          if (segments.length > 0 && segments[0]) {
            player.value?.currentTime(segments[0].startTime)
          }
        }
      } else {
        // 檢查使用者是否手動拖動到非片段區域
        const isInAnySegment = segments.some(
          (seg) => time >= seg.startTime && time < seg.endTime
        )

        if (!isInAnySegment && !player.value?.paused()) {
          // 跳轉到最近的片段起點
          const nearestSegment = findNearestSegment(time, segments)
          if (nearestSegment) {
            player.value?.currentTime(nearestSegment.startTime)
            currentSegmentIndex = segments.indexOf(nearestSegment)
          }
        }
      }

      rafId = null
    })
  }

  /**
   * 尋找最近的片段
   * @param time 當前時間
   * @param segmentList 片段列表
   * @returns 最近的片段，如果沒有則返回 null
   */
  function findNearestSegment(
    time: number,
    segmentList: TimeSegment[]
  ): TimeSegment | null {
    if (segmentList.length === 0) return null

    // 找出時間在當前時間之後的第一個片段
    const nextSegment = segmentList.find((seg) => seg.startTime >= time)
    if (nextSegment) return nextSegment

    // 如果沒有找到，返回第一個片段（循環播放）
    return segmentList[0] ?? null
  }

  /**
   * 跳轉到指定時間
   * @param time 目標時間（秒數）
   */
  function seekTo(time: number) {
    if (!player.value) return

    player.value?.currentTime(time)

    // 更新當前片段索引
    const segmentIndex = segments.findIndex(
      (seg) => time >= seg.startTime && time < seg.endTime
    )
    if (segmentIndex !== -1) {
      currentSegmentIndex = segmentIndex
    }
  }

  /**
   * 播放視頻
   */
  function play() {
    if (!player.value) return

    player.value?.play()?.catch((error) => {
      console.error('播放失敗:', error)
    })
  }

  /**
   * 暫停視頻
   */
  function pause() {
    if (!player.value) return

    player.value?.pause()
  }

  /**
   * 切換播放/暫停
   */
  function togglePlay() {
    if (isPlaying.value) {
      pause()
    } else {
      play()
    }
  }

  /**
   * 清理播放器
   */
  function disposePlayer() {
    if (player.value) {
      // 移除事件監聽器（避免記憶體洩漏）
      player.value.off('timeupdate', handleTimeUpdate)
      player.value.off('play')
      player.value.off('pause')
      player.value.off('loadedmetadata')

      // 清理播放器實例
      player.value.dispose()
      player.value = null
    }

    // 清理 RAF
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = null
    }

    // 重置狀態
    currentTime.value = 0
    isPlaying.value = false
    duration.value = 0
    currentSegmentIndex = 0
    segments = []
  }

  // 組件卸載時清理播放器
  onUnmounted(() => {
    disposePlayer()
  })

  return {
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
  }
}
