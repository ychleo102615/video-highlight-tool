import { VideoMetadata } from '../value-objects/VideoMetadata';

/**
 * Video Aggregate Root
 *
 * 管理視頻文件的生命週期,提供視頻元數據查詢和播放準備狀態檢查
 *
 * 職責:
 * - 管理視頻文件
 * - 提供視頻元數據查詢
 * - 驗證視頻狀態(是否準備好播放)
 */
export class Video {
  /**
   * 建立 Video 實例
   * @param id - 視頻唯一識別碼(UUID)
   * @param file - 視頻文件(瀏覽器原生 File 型別)
   * @param metadata - 視頻元數據
   * @param url - 視頻 URL(載入後生成,optional)
   */
  constructor(
    public readonly id: string,
    public readonly file: File,
    public readonly metadata: VideoMetadata,
    public url?: string
  ) {}

  /**
   * 獲取視頻時長(秒數)
   */
  get duration(): number {
    return this.metadata.duration;
  }

  /**
   * 檢查視頻是否已準備好播放
   * @returns true 如果 url 存在
   */
  get isReady(): boolean {
    return this.url !== undefined;
  }
}
