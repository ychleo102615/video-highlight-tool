/**
 * Video Processor Service - 視頻元數據提取服務
 *
 * 職責：
 * - 使用瀏覽器原生 API 提取視頻元數據（時長、尺寸等）
 * - 實作 Application Layer 的 IVideoProcessor 介面
 */

import type { IVideoProcessor } from '@/application/ports/IVideoProcessor'
import { VideoMetadata } from '@/domain/value-objects'
import { VideoMetadataExtractionError } from '@/application/errors'

/**
 * VideoProcessor 實作
 *
 * 使用 HTML5 Video Element API 提取視頻元數據
 */
export class VideoProcessor implements IVideoProcessor {
  /**
   * 提取視頻元數據
   *
   * @param file - 視頻檔案
   * @returns Promise<VideoMetadata> - 視頻元數據
   * @throws VideoMetadataExtractionError - 當提取失敗時
   *
   * 實作細節：
   * 1. 建立臨時 video element
   * 2. 載入視頻檔案
   * 3. 等待 loadedmetadata 事件
   * 4. 提取元數據並返回
   * 5. 清理資源
   */
  async extractMetadata(file: File): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      try {
        // 建立臨時 video element
        const video = document.createElement('video')
        video.preload = 'metadata'

        // 錯誤處理
        video.onerror = () => {
          URL.revokeObjectURL(video.src)
          reject(new VideoMetadataExtractionError())
        }

        // 元數據載入完成
        video.onloadedmetadata = () => {
          try {
            // 提取元數據並建立 VideoMetadata 實例
            const metadata = new VideoMetadata(
              video.duration,
              video.videoWidth,
              video.videoHeight,
              file.type
            )

            // 清理資源
            URL.revokeObjectURL(video.src)

            // 返回結果
            resolve(metadata)
          } catch (error) {
            URL.revokeObjectURL(video.src)
            reject(new VideoMetadataExtractionError())
          }
        }

        // 載入視頻
        video.src = URL.createObjectURL(file)
      } catch (error) {
        reject(new VideoMetadataExtractionError())
      }
    })
  }
}
