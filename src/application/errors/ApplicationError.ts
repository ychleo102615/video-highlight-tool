/**
 * Application Error Base Class
 *
 * 所有 Application Layer 錯誤的基礎類別
 */

/**
 * Application Layer 錯誤基礎類別
 *
 * 提供錯誤碼和訊息的標準化結構
 */
export class ApplicationError extends Error {
  /**
   * 建立 Application Error
   *
   * @param message - 錯誤訊息
   * @param code - 錯誤碼（用於國際化和日誌）
   */
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = this.constructor.name;

    // 確保原型鏈正確（TypeScript 繼承 Error 的必要步驟）
    Object.setPrototypeOf(this, ApplicationError.prototype);
  }
}
