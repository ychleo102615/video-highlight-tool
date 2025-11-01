import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { registerInfrastructureDependencies } from './di/container'

/**
 * 應用啟動函式
 *
 * 流程:
 * 1. 註冊 Infrastructure Layer 依賴 (DI Container 初始化)
 * 2. 建立 Vue 應用實例
 * 3. 註冊 Pinia 狀態管理
 * 4. 掛載應用到 DOM
 */
async function bootstrap() {
  try {
    // 1. 註冊 Infrastructure Layer 依賴
    // 包含: BrowserStorage, MockAIService, FileStorageService, Repositories
    await registerInfrastructureDependencies()

    // 2. 建立 Vue 應用
    const app = createApp(App)

    // 3. 註冊 Pinia
    app.use(createPinia())

    // 4. 掛載應用
    app.mount('#app')

    console.log('✅ 應用啟動成功 - Infrastructure Layer 已初始化')
  } catch (error) {
    console.error('❌ 應用啟動失敗:', error)
  }
}

// 啟動應用
bootstrap()
