import { TimeStamp } from './TimeStamp';

/**
 * TimeRange Value Object
 *
 * 代表一個時間範圍,提供時長計算和包含檢查
 */
export class TimeRange {
  /**
   * 建立 TimeRange 實例
   * @param start - 起始時間
   * @param end - 結束時間
   * @throws Error 如果 end 早於 start
   */
  constructor(
    public readonly start: TimeStamp,
    public readonly end: TimeStamp
  ) {
    if (end.milliseconds < start.milliseconds) {
      throw new Error('TimeRange end cannot be earlier than start');
    }
  }

  /**
   * 時長(毫秒)
   */
  get duration(): number {
    return this.end.milliseconds - this.start.milliseconds;
  }

  /**
   * 時長(秒數) - 方便使用
   */
  get durationInSeconds(): number {
    return this.duration / 1000;
  }

  /**
   * 檢查時間是否在範圍內
   * @param timestamp - 要檢查的時間點
   * @returns true 如果時間在範圍內
   */
  contains(timestamp: TimeStamp): boolean {
    return (
      timestamp.milliseconds >= this.start.milliseconds &&
      timestamp.milliseconds <= this.end.milliseconds
    );
  }
}
