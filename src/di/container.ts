/**
 * DI Container - 依賴注入容器
 *
 * 提供依賴管理和生命週期控制,支援 Singleton 模式
 */

type Factory<T = unknown> = () => T;

enum Lifecycle {
  Transient = 'transient', // 每次 resolve 都建立新實例
  Singleton = 'singleton' // 僅建立一次,後續返回同一個實例
}

interface Registration<T = unknown> {
  factory: Factory<T>;
  lifecycle: Lifecycle;
  instance?: T; // Singleton 實例快取
}

/**
 * DI Container 類別
 *
 * 負責管理依賴的註冊和解析
 */
export class Container {
  private registrations = new Map<string, Registration>();

  /**
   * 註冊依賴 (Transient 生命週期)
   *
   * @param key - 依賴的唯一識別 key
   * @param factory - 建立實例的工廠函式
   */
  register<T>(key: string, factory: Factory<T>): void {
    this.registrations.set(key, {
      factory,
      lifecycle: Lifecycle.Transient
    });
  }

  /**
   * 註冊依賴 (Singleton 生命週期)
   *
   * @param key - 依賴的唯一識別 key
   * @param factory - 建立實例的工廠函式
   */
  registerSingleton<T>(key: string, factory: Factory<T>): void {
    this.registrations.set(key, {
      factory,
      lifecycle: Lifecycle.Singleton
    });
  }

  /**
   * 解析依賴,返回實例
   *
   * @param key - 依賴的唯一識別 key
   * @returns 依賴實例
   * @throws 如果 key 未註冊,拋出錯誤
   */
  resolve<T>(key: string): T {
    const registration = this.registrations.get(key);

    if (!registration) {
      throw new Error(`Dependency "${key}" is not registered in the container`);
    }

    // Singleton: 返回快取的實例,若不存在則建立並快取
    if (registration.lifecycle === Lifecycle.Singleton) {
      if (!registration.instance) {
        registration.instance = registration.factory();
      }
      return registration.instance as T;
    }

    // Transient: 每次建立新實例
    return registration.factory() as T;
  }

  /**
   * 檢查 key 是否已註冊
   *
   * @param key - 依賴的唯一識別 key
   * @returns 是否已註冊
   */
  has(key: string): boolean {
    return this.registrations.has(key);
  }

  /**
   * 清除所有註冊 (主要用於測試)
   */
  clear(): void {
    this.registrations.clear();
  }
}

// 匯出全域 Container 實例 (單例)
export const container = new Container();

// ==================== Infrastructure Dependencies ====================
// 這些依賴應在應用啟動時註冊

/**
 * 註冊 Infrastructure Layer 依賴
 *
 * 應在應用啟動時調用此函式,確保所有依賴都已正確註冊
 *
 * 註冊順序:
 * 1. BrowserStorage (基礎設施,被 Repository 依賴)
 * 2. Services (MockAIService, FileStorageService)
 * 3. Repositories (VideoRepositoryImpl, TranscriptRepositoryImpl, HighlightRepositoryImpl)
 */
export async function registerInfrastructureDependencies(): Promise<void> {
  // 動態導入以避免循環依賴
  const { BrowserStorage } = await import('@/infrastructure/storage/BrowserStorage');
  const { MockAIService } = await import('@/infrastructure/api/MockAIService');
  const { FileStorageService } = await import('@/infrastructure/storage/FileStorageService');
  const { VideoRepositoryImpl } = await import('@/infrastructure/repositories/VideoRepositoryImpl');
  const { TranscriptRepositoryImpl } = await import(
    '@/infrastructure/repositories/TranscriptRepositoryImpl'
  );
  const { HighlightRepositoryImpl } = await import(
    '@/infrastructure/repositories/HighlightRepositoryImpl'
  );

  // ==================== 1. BrowserStorage ====================
  // 建立並初始化 BrowserStorage 實例
  const browserStorage = new BrowserStorage();
  await browserStorage.init();

  // 註冊為 Singleton (所有 Repository 共用同一個實例)
  container.registerSingleton('BrowserStorage', () => browserStorage);

  // ==================== 2. Services ====================
  // MockAIService: 實作 ITranscriptGenerator 和 IMockDataProvider 介面
  // 建立單一實例,同時註冊為兩個介面
  const mockAIService = new MockAIService();
  container.registerSingleton('ITranscriptGenerator', () => mockAIService);
  container.registerSingleton('IMockDataProvider', () => mockAIService);

  // FileStorageService: 實作 IFileStorage 介面
  container.registerSingleton('IFileStorage', () => new FileStorageService());

  // ==================== 3. Repositories ====================
  // VideoRepositoryImpl: 實作 IVideoRepository 介面
  // 注入 BrowserStorage 和 IFileStorage（用於恢復時重新創建 blob URL）
  container.registerSingleton(
    'IVideoRepository',
    () =>
      new VideoRepositoryImpl(
        container.resolve('BrowserStorage'),
        container.resolve('IFileStorage')
      )
  );

  // TranscriptRepositoryImpl: 實作 ITranscriptRepository 介面
  container.registerSingleton(
    'ITranscriptRepository',
    () => new TranscriptRepositoryImpl(container.resolve('BrowserStorage'))
  );

  // HighlightRepositoryImpl: 實作 IHighlightRepository 介面
  container.registerSingleton(
    'IHighlightRepository',
    () => new HighlightRepositoryImpl(container.resolve('BrowserStorage'))
  );

  // SessionRepositoryImpl: 實作 ISessionRepository 介面
  const { SessionRepositoryImpl } = await import(
    '@/infrastructure/repositories/SessionRepositoryImpl'
  );
  container.registerSingleton(
    'ISessionRepository',
    () => new SessionRepositoryImpl(container.resolve('BrowserStorage'))
  );

  // ==================== 4. Use Cases ====================
  // 註冊 Application Layer Use Cases（按需載入）
  // 註冊為 Transient，每次使用都是新實例

  // VideoProcessor: 用於提取視頻元數據（使用動態導入）
  const { VideoProcessor } = await import('@/infrastructure/services/VideoProcessor');
  container.registerSingleton('IVideoProcessor', () => new VideoProcessor());

  // UploadVideoUseCase: 上傳視頻
  const { UploadVideoUseCase } = await import('@/application/use-cases/UploadVideoUseCase');
  container.register(
    'UploadVideoUseCase',
    () =>
      new UploadVideoUseCase(
        container.resolve('IVideoRepository'),
        container.resolve('IFileStorage'),
        container.resolve('IVideoProcessor')
      )
  );

  // UploadVideoWithMockTranscriptUseCase: 上傳視頻並設定 Mock 轉錄資料
  const { UploadVideoWithMockTranscriptUseCase } = await import(
    '@/application/use-cases/UploadVideoWithMockTranscriptUseCase'
  );
  container.register(
    'UploadVideoWithMockTranscriptUseCase',
    () =>
      new UploadVideoWithMockTranscriptUseCase(
        container.resolve('UploadVideoUseCase'),
        container.resolve('IMockDataProvider')
      )
  );

  // ProcessTranscriptUseCase: 處理視頻轉錄
  const { ProcessTranscriptUseCase } = await import(
    '@/application/use-cases/ProcessTranscriptUseCase'
  );
  container.register(
    'ProcessTranscriptUseCase',
    () =>
      new ProcessTranscriptUseCase(
        container.resolve('ITranscriptGenerator'),
        container.resolve('ITranscriptRepository'),
        container.resolve('IVideoRepository')
      )
  );

  // CreateHighlightUseCase: 建立高光
  const { CreateHighlightUseCase } = await import('@/application/use-cases/CreateHighlightUseCase');
  container.register(
    'CreateHighlightUseCase',
    () =>
      new CreateHighlightUseCase(
        container.resolve('IHighlightRepository'),
        container.resolve('IVideoRepository')
      )
  );

  // ToggleSentenceInHighlightUseCase: 切換句子選中狀態
  const { ToggleSentenceInHighlightUseCase } = await import(
    '@/application/use-cases/ToggleSentenceInHighlightUseCase'
  );
  container.register(
    'ToggleSentenceInHighlightUseCase',
    () => new ToggleSentenceInHighlightUseCase(container.resolve('IHighlightRepository'))
  );

  // RestoreSessionUseCase: 恢復會話
  const { RestoreSessionUseCase } = await import('@/application/use-cases/RestoreSessionUseCase');
  container.register(
    'RestoreSessionUseCase',
    () =>
      new RestoreSessionUseCase(
        container.resolve('IVideoRepository'),
        container.resolve('ITranscriptRepository'),
        container.resolve('IHighlightRepository')
      )
  );

  // CleanupSessionUseCase: 清除會話
  const { CleanupSessionUseCase } = await import(
    '@/application/use-cases/CleanupSessionUseCase'
  );
  container.register(
    'CleanupSessionUseCase',
    () => new CleanupSessionUseCase(container.resolve('ISessionRepository'))
  );
}
