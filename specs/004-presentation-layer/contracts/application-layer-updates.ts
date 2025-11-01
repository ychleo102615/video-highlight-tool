/**
 * Application Layer 更新合約
 *
 * 本文件記錄為了支援 Presentation Layer 功能，需要對 Application Layer 進行的更新
 * 這些更新符合 Clean Architecture 原則，透過新增 Port 和 Use Case 實現
 */

import type { TranscriptDTO } from '@/application/dto/TranscriptDTO'

// ============================================================================
// 新增 Port：IMockDataProvider
// ============================================================================

/**
 * Mock 資料提供者介面（Application Layer Port）
 *
 * 用途：允許 Presentation Layer 上傳自訂的 Mock 轉錄 JSON 資料
 * 實作者：MockAIService (Infrastructure Layer)
 *
 * 注意：此介面僅在開發/展示環境使用，生產環境不需要
 */
export interface IMockDataProvider {
  /**
   * 設定指定視頻的 Mock 轉錄資料
   * @param videoId 視頻 ID
   * @param data 轉錄資料（TranscriptDTO 格式）
   */
  setMockTranscript(videoId: string, data: TranscriptDTO): void

  /**
   * 清除指定視頻的 Mock 資料
   * @param videoId 視頻 ID
   */
  clearMockTranscript(videoId: string): void
}

// ============================================================================
// 新增 Use Case：UploadVideoWithMockTranscriptUseCase
// ============================================================================

/**
 * 上傳視頻並設定 Mock 轉錄資料 Use Case
 *
 * 用途：處理使用者同時上傳視頻和轉錄 JSON 檔案的情況
 * 職責：
 *   1. 重用 UploadVideoUseCase 上傳視頻
 *   2. 透過 IMockDataProvider 設定 Mock 轉錄資料
 *
 * 依賴：
 *   - UploadVideoUseCase (重用現有邏輯)
 *   - IMockDataProvider (新增 Port)
 */
export interface IUploadVideoWithMockTranscriptUseCase {
  /**
   * 執行上傳視頻並設定 Mock 轉錄資料
   * @param videoFile 視頻檔案
   * @param transcriptData 轉錄資料（已解析的 TranscriptDTO）
   * @param onProgress 上傳進度回調（0-100）
   * @returns 上傳的 Video Entity
   */
  execute(
    videoFile: File,
    transcriptData: TranscriptDTO,
    onProgress?: (progress: number) => void
  ): Promise<Video>
}

// ============================================================================
// 更新現有 Port：IFileStorage
// ============================================================================

/**
 * 文件儲存介面（更新版本）
 *
 * 變更：新增 onProgress 回調參數，支援上傳進度回報
 */
export interface IFileStorage {
  /**
   * 儲存文件
   * @param file 文件
   * @param onProgress 進度回調（0-100），可選
   * @returns 文件 URL（本地 Blob URL 或雲端 URL）
   */
  save(file: File, onProgress?: (progress: number) => void): Promise<string>

  /**
   * 刪除文件
   * @param url 文件 URL
   */
  delete(url: string): Promise<void>
}

// ============================================================================
// 更新現有 Use Case：UploadVideoUseCase
// ============================================================================

/**
 * 上傳視頻 Use Case（更新版本）
 *
 * 變更：execute 方法新增 onProgress 回調參數
 */
export interface IUploadVideoUseCase {
  /**
   * 執行視頻上傳
   * @param file 視頻檔案
   * @param onProgress 上傳進度回調（0-100），可選
   * @returns 上傳的 Video Entity
   */
  execute(file: File, onProgress?: (progress: number) => void): Promise<Video>
}

// ============================================================================
// 實作建議
// ============================================================================

/**
 * MockAIService 實作範例（Infrastructure Layer）
 */
export class MockAIServiceExample implements ITranscriptGenerator, IMockDataProvider {
  private mockDataMap = new Map<string, TranscriptDTO>()

  // IMockDataProvider 實作
  setMockTranscript(videoId: string, data: TranscriptDTO): void {
    this.mockDataMap.set(videoId, data)
  }

  clearMockTranscript(videoId: string): void {
    this.mockDataMap.delete(videoId)
  }

  // ITranscriptGenerator 實作
  async generate(videoId: string): Promise<TranscriptDTO> {
    // 優先使用使用者上傳的 Mock 資料
    if (this.mockDataMap.has(videoId)) {
      const data = this.mockDataMap.get(videoId)!
      // 使用後清除（避免下次誤用）
      this.mockDataMap.delete(videoId)
      return data
    }

    // 否則返回預設 Mock 資料
    return this.getDefaultMockData()
  }

  private getDefaultMockData(): TranscriptDTO {
    // ... 預設 Mock 資料
  }
}

/**
 * UploadVideoWithMockTranscriptUseCase 實作範例（Application Layer）
 */
export class UploadVideoWithMockTranscriptUseCaseExample
  implements IUploadVideoWithMockTranscriptUseCase {

  constructor(
    private uploadVideoUseCase: IUploadVideoUseCase,
    private mockDataProvider: IMockDataProvider
  ) {}

  async execute(
    videoFile: File,
    transcriptData: TranscriptDTO,
    onProgress?: (progress: number) => void
  ): Promise<Video> {
    // 1. 上傳視頻（重用現有 Use Case）
    const video = await this.uploadVideoUseCase.execute(videoFile, onProgress)

    // 2. 設定 Mock 轉錄資料
    this.mockDataProvider.setMockTranscript(video.id, transcriptData)

    return video
  }
}

/**
 * FileStorageService 實作範例（Infrastructure Layer）- 本地版本
 */
export class FileStorageServiceExample implements IFileStorage {
  async save(file: File, onProgress?: (progress: number) => void): Promise<string> {
    // 本地環境：立即完成
    onProgress?.(100)
    const url = URL.createObjectURL(file)
    return url
  }

  async delete(url: string): Promise<void> {
    URL.revokeObjectURL(url)
  }
}

/**
 * CloudFileStorageService 實作範例（Infrastructure Layer）- 雲端版本
 */
export class CloudFileStorageServiceExample implements IFileStorage {
  async save(file: File, onProgress?: (progress: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      // 監聽上傳進度
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100)
          onProgress?.(progress)
        }
      })

      xhr.addEventListener('load', () => {
        const { url } = JSON.parse(xhr.responseText)
        resolve(url)
      })

      xhr.addEventListener('error', () => reject(new Error('Upload failed')))

      xhr.open('POST', '/api/upload')
      const formData = new FormData()
      formData.append('file', file)
      xhr.send(formData)
    })
  }

  async delete(url: string): Promise<void> {
    await fetch(`/api/delete?url=${encodeURIComponent(url)}`, {
      method: 'DELETE'
    })
  }
}

// ============================================================================
// DI Container 註冊範例
// ============================================================================

/**
 * DI Container 註冊更新
 */
export function registerPresentationLayerDependencies(container: DIContainer) {
  // 註冊 MockAIService（同時實作 ITranscriptGenerator 和 IMockDataProvider）
  const mockAIService = new MockAIService()
  container.register('TranscriptGenerator', mockAIService)
  container.register('MockDataProvider', mockAIService)

  // 註冊 FileStorageService
  container.register('FileStorage', new FileStorageService())

  // 註冊 UploadVideoUseCase
  container.register('UploadVideoUseCase', () => new UploadVideoUseCase(
    container.get('VideoRepository'),
    container.get('FileStorage'),
    container.get('VideoProcessor')
  ))

  // 註冊 UploadVideoWithMockTranscriptUseCase
  container.register('UploadVideoWithMockTranscriptUseCase', () =>
    new UploadVideoWithMockTranscriptUseCase(
      container.get('UploadVideoUseCase'),
      container.get('MockDataProvider')
    )
  )
}
