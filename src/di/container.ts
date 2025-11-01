/**
 * DI Container - 依賴注入容器
 *
 * 提供依賴管理和生命週期控制,支援 Singleton 模式
 */

type Constructor<T = any> = new (...args: any[]) => T;
type Factory<T = any> = () => T;

enum Lifecycle {
  Transient = 'transient', // 每次 resolve 都建立新實例
  Singleton = 'singleton'   // 僅建立一次,後續返回同一個實例
}

interface Registration<T = any> {
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
 */
export async function registerInfrastructureDependencies(): Promise<void> {
  // 動態導入以避免循環依賴
  const { BrowserStorage } = await import('@/infrastructure/storage/BrowserStorage');

  // 建立並初始化 BrowserStorage 實例
  const browserStorage = new BrowserStorage();
  await browserStorage.init();

  // 註冊為 Singleton (所有 Repository 共用同一個實例)
  container.registerSingleton('BrowserStorage', () => browserStorage);
}
