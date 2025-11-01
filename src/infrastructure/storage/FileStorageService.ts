/**
 * File Storage Service - 視頻檔案儲存服務
 *
 * 職責:
 * - 使用瀏覽器原生 URL.createObjectURL() 生成 blob URL
 * - 使用 URL.revokeObjectURL() 釋放資源
 * - 提供檔案儲存和刪除功能
 *
 * 實作 Application Layer 的 IFileStorage 介面
 */

import type { IFileStorage } from '@/application/ports/IFileStorage';
import { FileStorageError } from '@/application/errors/FileStorageError';

/**
 * 檔案儲存服務實作
 *
 * 使用瀏覽器原生 Blob URL API 管理視頻檔案
 *
 * 注意事項:
 * - Blob URL 僅在當前頁面會話中有效
 * - 頁面刷新後 Blob URL 會失效,需重新生成
 * - 應在不需要時主動調用 delete() 釋放記憶體
 */
export class FileStorageService implements IFileStorage {
  /**
   * 儲存檔案並返回 Blob URL
   *
   * @param file - File 物件
   * @param onProgress - 進度回調（0-100），可選
   * @returns Promise<string> - Blob URL (格式: blob:http://...)
   * @throws FileStorageError - 當 Blob URL 生成失敗時
   *
   * 實作細節:
   * - 使用 URL.createObjectURL() 生成 blob URL
   * - Blob URL 指向瀏覽器記憶體中的 File 物件
   * - 返回的 URL 可直接用於 <video> 標籤的 src 屬性
   * - 本地環境：立即完成,進度直接設為 100%
   *
   * 錯誤處理:
   * - 驗證 file 參數有效性,無效時拋出 FileStorageError
   * - 捕獲 URL.createObjectURL() 失敗,拋出 FileStorageError
   */
  async save(file: File, onProgress?: (progress: number) => void): Promise<string> {
    try {
      // 驗證文件是否存在
      if (!file) {
        throw new FileStorageError('File is null or undefined');
      }

      // 生成 Blob URL（本地環境立即完成）
      const url = URL.createObjectURL(file);

      // 驗證 URL 是否成功生成
      if (!url) {
        throw new FileStorageError('Failed to create blob URL');
      }

      // 本地環境：立即完成,進度設為 100%
      onProgress?.(100);

      return url;
    } catch (error) {
      // 若錯誤已是 FileStorageError，直接重新拋出
      if (error instanceof FileStorageError) {
        throw error;
      }

      // 其他錯誤轉換為 FileStorageError
      const message = error instanceof Error ? error.message : String(error);
      console.warn('FileStorageService: 無法生成 Blob URL', {
        fileName: file?.name,
        fileSize: file?.size,
        error: message,
      });
      throw new FileStorageError(`Failed to create blob URL: ${message}`);
    }
  }

  /**
   * 刪除檔案並釋放資源
   *
   * @param url - Blob URL
   * @returns Promise<void>
   *
   * 實作細節:
   * - 使用 URL.revokeObjectURL() 釋放瀏覽器記憶體
   * - 釋放後 Blob URL 將不再有效
   * - 應在視頻播放結束或組件卸載時調用
   *
   * 錯誤處理:
   * - 捕獲 URL.revokeObjectURL() 失敗,發出 console.warn 但不拋出例外
   * - 即使失敗也不影響主流程 (瀏覽器會在頁面關閉時自動清理)
   */
  async delete(url: string): Promise<void> {
    try {
      // 釋放 Blob URL 資源
      URL.revokeObjectURL(url);
    } catch (error) {
      console.warn('FileStorageService: 無法釋放 Blob URL', {
        url,
        error: error instanceof Error ? error.message : String(error),
      });
      // 不拋出例外,優雅降級
    }
  }

  /**
   * 批次刪除多個檔案
   *
   * @param urls - Blob URL 陣列
   * @returns Promise<void>
   *
   * 使用場景:
   * - 清理多個視頻檔案的 Blob URL
   * - 組件卸載時批次釋放資源
   */
  async deleteAll(urls: string[]): Promise<void> {
    for (const url of urls) {
      await this.delete(url);
    }
  }

  /**
   * 驗證 URL 是否為有效的 Blob URL
   *
   * @param url - 要驗證的 URL
   * @returns boolean - 是否為 Blob URL
   *
   * 用途:
   * - 在刪除前檢查 URL 是否為 Blob URL
   * - 避免誤刪其他類型的 URL (如 http://, https://)
   */
  isBlobUrl(url: string): boolean {
    return url.startsWith('blob:');
  }
}
