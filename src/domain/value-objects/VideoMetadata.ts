/**
 * VideoMetadata Value Object
 *
 * 封裝視頻的元數據(時長、尺寸、格式等)
 */
export class VideoMetadata {
  /**
   * 建立 VideoMetadata 實例
   * @param duration - 視頻時長(秒數,必須 > 0)
   * @param width - 視頻寬度(像素,必須 > 0)
   * @param height - 視頻高度(像素,必須 > 0)
   * @param format - 視頻格式(如 "video/mp4",必須以 "video/" 開頭)
   * @throws Error 如果驗證失敗
   */
  constructor(
    public readonly duration: number,
    public readonly width: number,
    public readonly height: number,
    public readonly format: string
  ) {
    if (duration <= 0) {
      throw new Error('Video duration must be positive');
    }
    if (width <= 0 || height <= 0) {
      throw new Error('Video dimensions must be positive');
    }
    if (!format.startsWith('video/')) {
      throw new Error('Invalid video format');
    }
  }

  /**
   * 獲取視頻的長寬比
   */
  get aspectRatio(): number {
    return this.width / this.height;
  }
}
