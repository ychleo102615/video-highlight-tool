/**
 * DI Container - 依賴注入容器
 *
 * 提供依賴管理和生命週期控制,支援 Singleton 模式
 */

type Factory<T = unknown> = () => T;

enum Lifecycle {
  Transient = 'transient', // 每次 resolve 都建立新實例
  Singleton = 'singleton', // 僅建立一次,後續返回同一個實例
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
      lifecycle: Lifecycle.Transient,
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
      lifecycle: Lifecycle.Singleton,
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
  const { VideoRepositoryImpl } = await import(
    '@/infrastructure/repositories/VideoRepositoryImpl'
  );
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
  // MockAIService: 實作 ITranscriptGenerator 介面
  container.registerSingleton('ITranscriptGenerator', () => new MockAIService());

  // FileStorageService: 實作 IFileStorage 介面
  container.registerSingleton('IFileStorage', () => new FileStorageService());

  // ==================== 3. Repositories ====================
  // VideoRepositoryImpl: 實作 IVideoRepository 介面
  container.registerSingleton(
    'IVideoRepository',
    () => new VideoRepositoryImpl(container.resolve('BrowserStorage'))
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
}
