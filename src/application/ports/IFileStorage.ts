/**
 * File Storage Port Interface
 *
 * 定義文件儲存服務的契約，由 Infrastructure Layer 實作
 */

/**
 * 文件儲存介面
 *
 * 負責文件的儲存和管理
 */
export interface IFileStorage {
  /**
   * 儲存文件並返回可訪問的 URL
   *
   * @param file - 要儲存的文件
   * @param onProgress - 進度回調（0-100），可選
   * @returns Promise<string> - 文件 URL
   * @throws FileStorageError - 當儲存失敗時
   */
  save(file: File, onProgress?: (progress: number) => void): Promise<string>;

  /**
   * 刪除文件
   *
   * @param url - 文件 URL
   * @returns Promise<void>
   * @throws FileStorageError - 當刪除失敗時
   */
  delete(url: string): Promise<void>;
}
