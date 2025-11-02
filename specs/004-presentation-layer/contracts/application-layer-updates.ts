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
 * 用途：允許 Use Case 設定自訂的 Mock 轉錄 JSON 資料
 * 實作者：MockAIService (Infrastructure Layer)
 *
 * 注意：此介面僅在開發/展示環境使用，生產環境不需要
 *
 * 設計原則：
 * - 只接受 JSON 字串，確保所有資料都經過 JSONValidator 驗證
 * - Infrastructure Layer (MockAIService) 負責驗證、補完非必要欄位
 * - Mock 資料在 generate() 使用後自動清除（一次性使用）
 */
export interface IMockDataProvider {
  /**
   * 設定指定視頻的 Mock 資料（JSON 字串格式）
   * @param videoId 視頻 ID
   * @param jsonContent JSON 字串內容
   * @throws Error 如果 JSON 格式無效
   */
  setMockData(videoId: string, jsonContent: string): void
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
 *   2. 讀取轉錄 JSON 檔案內容
 *   3. 透過 IMockDataProvider.setMockData 設定 Mock 資料（會進行驗證）
 *
 * 依賴：
 *   - UploadVideoUseCase (重用現有邏輯)
 *   - IMockDataProvider (新增 Port)
 */
export interface IUploadVideoWithMockTranscriptUseCase {
  /**
   * 執行上傳視頻並設定 Mock 轉錄資料
   * @param videoFile 視頻檔案
   * @param transcriptFile 轉錄 JSON 檔案
   * @param onProgress 上傳進度回調（0-100）
   * @returns 上傳的 Video Entity
   */
  execute(
    videoFile: File,
    transcriptFile: File,
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
 *
 * 注意：實際的 MockAIService 已實作完整功能，包含 JSONValidator 驗證
 */
export class MockAIServiceExample implements ITranscriptGenerator, IMockDataProvider {
  private mockDataMap = new Map<string, string>() // 存儲 JSON 字串

  // IMockDataProvider 實作
  setMockData(videoId: string, jsonContent: string): void {
    // 1. 驗證 JSON 格式（使用 JSONValidator）
    // 2. 補完非必要欄位
    // 3. 存儲到 mockDataMap
    this.mockDataMap.set(videoId, jsonContent)
  }

  // ITranscriptGenerator 實作
  async generate(videoId: string): Promise<TranscriptDTO> {
    const jsonContent = this.mockDataMap.get(videoId)
    if (!jsonContent) {
      throw new Error(`找不到 videoId "${videoId}" 的 Mock 資料`)
    }

    // 解析並返回（已驗證過）
    const data = JSON.parse(jsonContent) as TranscriptDTO

    // 使用後自動清除（一次性使用）
    this.mockDataMap.delete(videoId)

    return data
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
    transcriptFile: File,
    onProgress?: (progress: number) => void
  ): Promise<Video> {
    // 1. 上傳視頻（重用現有 Use Case）
    const video = await this.uploadVideoUseCase.execute(videoFile, onProgress)

    // 2. 讀取轉錄 JSON 檔案內容
    const jsonContent = await transcriptFile.text()

    // 3. 設定 Mock 資料（setMockData 會進行驗證、補完非必要欄位、檢查時間戳）
    this.mockDataProvider.setMockData(video.id, jsonContent)

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
