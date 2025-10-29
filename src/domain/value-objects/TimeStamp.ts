/**
 * TimeStamp Value Object
 *
 * 代表一個時間點,提供格式化和解析功能,支援毫秒精度
 *
 * 設計理由:
 * - 視頻播放需要毫秒級精度,秒級精度不足以滿足準確的字幕同步
 * - 內部儲存毫秒,提供 seconds getter 方便使用
 * - toString 支援兩種格式:預設不顯示毫秒(簡潔),可選顯示毫秒(精確)
 */
export class TimeStamp {
  /**
   * 建立 TimeStamp 實例
   * @param milliseconds - 毫秒數(必須 >= 0)
   * @throws Error 如果 milliseconds < 0
   */
  constructor(public readonly milliseconds: number) {
    if (milliseconds < 0) {
      throw new Error('TimeStamp milliseconds cannot be negative');
    }
  }

  /**
   * 獲取秒數
   */
  get seconds(): number {
    return this.milliseconds / 1000;
  }

  /**
   * 獲取分鐘數
   */
  get minutes(): number {
    return Math.floor(this.seconds / 60);
  }

  /**
   * 格式化時間戳
   * @param format - 'MM:SS' (預設) 或 'MM:SS.mmm'(包含毫秒)
   * @returns 格式化的時間字串
   */
  toString(format: 'MM:SS' | 'MM:SS.mmm' = 'MM:SS'): string {
    const totalSeconds = Math.floor(this.seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const ms = this.milliseconds % 1000;

    const base = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    if (format === 'MM:SS.mmm') {
      return `${base}.${ms.toString().padStart(3, '0')}`;
    }

    return base;
  }

  /**
   * 從秒數建立 TimeStamp
   * @param seconds - 秒數
   * @returns TimeStamp 實例
   */
  static fromSeconds(seconds: number): TimeStamp {
    return new TimeStamp(seconds * 1000);
  }

  /**
   * 從毫秒數建立 TimeStamp
   * @param milliseconds - 毫秒數
   * @returns TimeStamp 實例
   */
  static fromMilliseconds(milliseconds: number): TimeStamp {
    return new TimeStamp(milliseconds);
  }

  /**
   * 從字串解析 TimeStamp
   * 支援 "MM:SS" 或 "MM:SS.mmm" 格式
   * @param timeString - 時間字串
   * @returns TimeStamp 實例
   * @throws Error 如果格式不正確
   */
  static fromString(timeString: string): TimeStamp {
    const parts = timeString.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid time format. Expected MM:SS or MM:SS.mmm');
    }

    const minutes = Number(parts[0]);
    const secondsParts = parts[1]!.split('.');
    const seconds = Number(secondsParts[0]);
    const ms = secondsParts.length > 1 ? Number(secondsParts[1]!.padEnd(3, '0')) : 0;

    if (isNaN(minutes) || isNaN(seconds) || isNaN(ms)) {
      throw new Error('Invalid time format. Expected MM:SS or MM:SS.mmm');
    }

    return new TimeStamp((minutes * 60 + seconds) * 1000 + ms);
  }
}
