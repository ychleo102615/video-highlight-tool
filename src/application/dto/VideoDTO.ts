/**
 * Video Data Transfer Object
 *
 * 用於在 Application Layer 和 Infrastructure/Presentation Layer 之間傳輸視頻元數據
 */

/**
 * 視頻 DTO
 */
export interface VideoDTO {
  /** 視頻時長（秒） */
  duration: number;

  /** 視頻寬度（像素） */
  width: number;

  /** 視頻高度（像素） */
  height: number;

  /** 視頻格式（MIME type） */
  format: string;
}
