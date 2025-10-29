# 需求分析文檔

## 專案概述

建立一個視頻高光編輯工具的展示版本，使用 AI（模擬）幫助用戶從上傳的視頻中建立高光片段，並在這些片段上添加轉錄文字。

## 功能需求拆解

### 1. 視頻上傳模組 (Video Upload Module)

#### 1.1 基本上傳功能
- **功能**: 用戶可以上傳視頻文件
- **技術需求**:
  - 支援常見視頻格式 (MP4, MOV, WEBM)
  - 文件大小限制 (建議 100MB 以內)
  - 上傳進度顯示
  - 上傳錯誤處理
- **驗收標準**:
  - [ ] 可以選擇本地視頻文件
  - [ ] 顯示上傳進度
  - [ ] 上傳完成後可以預覽視頻
  - [ ] 不支援的格式有明確錯誤提示

### 2. 模擬 AI 處理模組 (Mock AI Processing Module)

#### 2.1 Mock API 設計
- **功能**: 模擬 AI 處理並返回結構化數據
- **數據結構**:
  ```json
  {
    "fullTranscript": "完整的視頻轉錄文字",
    "sections": [
      {
        "id": "section_1",
        "title": "段落標題",
        "sentences": [
          {
            "id": "sentence_1",
            "text": "句子內容",
            "startTime": 0.0,
            "endTime": 3.5,
            "isHighlight": true
          }
        ]
      }
    ]
  }
  ```
- **驗收標準**:
  - [ ] Mock API 可以返回完整轉錄
  - [ ] 轉錄文字分段並包含標題
  - [ ] 每個句子包含時間戳資訊
  - [ ] 系統建議的高光句子已標記

### 3. 用戶界面模組 (User Interface Module)

#### 3.1 整體佈局 (Layout)
- **功能**: 分屏設計
- **技術需求**:
  - 響應式設計 (RWD)
  - 左側：編輯區域
  - 右側：預覽區域
  - 支援桌面和移動設備
- **驗收標準**:
  - [ ] 桌面版：左右分屏顯示
  - [ ] 移動版：上下堆疊顯示
  - [ ] 在 Windows/Mac Chrome 上正常運行
  - [ ] 在 iOS/Android Chrome/Safari 上正常運行

#### 3.2 編輯區域 (Editing Area - Left)
- **功能**: 顯示和編輯轉錄內容
- **子功能**:
  - 顯示段落標題
  - 顯示句子和時間戳
  - 選擇/取消選擇句子
  - 時間戳可點擊跳轉
  - 自動滾動跟隨播放
- **驗收標準**:
  - [ ] 轉錄內容按段落組織顯示
  - [ ] 每個句子顯示時間戳 (格式: MM:SS)
  - [ ] 點擊句子可以切換選中狀態
  - [ ] 選中的句子有視覺標示
  - [ ] 點擊時間戳會更新預覽區時間軸
  - [ ] 播放時當前句子高亮顯示
  - [ ] 自動滾動保持當前句子可見

#### 3.3 預覽區域 (Preview Area - Right)
- **功能**: 顯示編輯後的高光片段
- **子功能**:
  - 視頻播放器
  - 標準播放控制
  - 轉錄文字疊加
  - 高光時間軸
  - 片段間平滑過渡
- **驗收標準**:
  - [ ] 只播放選中的片段（非完整視頻）
  - [ ] 播放器有 play, pause, seek 控制
  - [ ] 選中的轉錄文字疊加在視頻上
  - [ ] 文字時間與音頻同步
  - [ ] 時間軸顯示所有選中的高光片段
  - [ ] 片段之間過渡流暢（無明顯卡頓）

#### 3.4 雙向同步機制 (Synchronization)
- **編輯區 → 預覽區**:
  - 點擊時間戳 → 更新預覽時間軸
  - 選擇/取消選擇句子 → 更新預覽內容
- **預覽區 → 編輯區**:
  - 播放期間 → 當前句子在編輯區高亮
  - 播放期間 → 編輯區自動滾動
- **驗收標準**:
  - [ ] 點擊編輯區時間戳，預覽區跳轉到對應時間
  - [ ] 修改句子選擇狀態，預覽區即時更新
  - [ ] 預覽區播放時，編輯區對應句子高亮
  - [ ] 編輯區自動滾動保持當前播放句子可見

### 4. 轉錄文字疊加模組 (Transcript Overlay Module)

#### 4.1 文字疊加功能
- **功能**: 在視頻上顯示同步文字
- **技術需求**:
  - 文字定位（居中、底部等）
  - 文字樣式（字體、大小、顏色、背景）
  - 時間同步
  - 過渡動畫
- **驗收標準**:
  - [ ] 選中的句子在視頻上顯示
  - [ ] 文字時間與視頻音頻同步
  - [ ] 文字清晰易讀（有背景或陰影）
  - [ ] 文字出現/消失有過渡效果

## 非功能需求

### 5.1 性能需求
- 視頻加載時間 < 3 秒（中等大小文件）
- 句子選擇響應時間 < 100ms
- 預覽更新延遲 < 200ms

### 5.2 用戶體驗需求
- 直觀的操作界面
- 清晰的視覺反饋
- 流暢的動畫過渡
- 適當的加載狀態提示

### 5.3 代碼質量需求
- TypeScript 型別覆蓋率 > 90%
- 遵循 Clean Architecture 和 DDD 原則
- 組件可測試性
- 代碼文檔完整

### 5.4 瀏覽器兼容性
- **桌面**:
  - Windows & Mac 最新版 Chrome
- **移動**:
  - iOS 最新版 Chrome & Safari
  - Android 最新版 Chrome & Safari

## 開發任務清單

### Phase 1: 專案設置與基礎架構
- [ ] 初始化 Vue 3 專案（使用 Vite）
- [ ] 設置 TypeScript 配置
- [ ] 設置 Clean Architecture 資料夾結構
- [ ] 配置 Pinia 狀態管理

### Phase 2: Domain Layer 開發
- [ ] 定義 Video Entity
- [ ] 定義 Transcript Entity (Section, Sentence)
- [ ] 定義 Highlight Entity
- [ ] 定義 Value Objects (TimeStamp, TimeRange)
- [ ] 定義 Repository Interfaces

### Phase 3: Application Layer 開發
- [ ] 定義 Port 介面 (ITranscriptGenerator, IFileStorage)
- [ ] 實作 UploadVideo Use Case
- [ ] 實作 ProcessTranscript Use Case
- [ ] 實作 CreateHighlight Use Case
- [ ] 實作 ToggleSentenceInHighlight Use Case
- [ ] 實作 GenerateHighlight Use Case

### Phase 4: Infrastructure Layer 開發
- [ ] 實作 Repository Implementations
- [ ] VideoRepositoryImpl
- [ ] TranscriptRepositoryImpl
- [ ] HighlightRepositoryImpl
- [ ] 實作 MockAIService (ITranscriptGenerator)
- [ ] 實作 FileStorageService (IFileStorage)

### Phase 5: Presentation Layer 開發
- [ ] 設置 Pinia Stores
- [ ] videoStore
- [ ] transcriptStore
- [ ] highlightStore
- [ ] 實作 Composables
- [ ] useVideoPlayer
- [ ] useHighlight
- [ ] useTranscript
- [ ] 實作 UI Components
- [ ] VideoUpload Component
- [ ] Layout Component (分屏佈局)
- [ ] EditingArea Component
- [ ] SectionList Component
- [ ] SentenceItem Component
- [ ] PreviewArea Component
- [ ] VideoPlayer Component
- [ ] TranscriptOverlay Component
- [ ] Timeline Component
- [ ] 實作雙向同步邏輯

### Phase 6: 功能整合與優化
- [ ] 整合所有模組
- [ ] 實作響應式設計 (RWD)
- [ ] 性能優化（懶加載、防抖等）
- [ ] 添加加載狀態和錯誤處理
- [ ] 動畫和過渡效果優化

### Phase 7: 測試與部署
- [ ] 單元測試（關鍵 Use Cases）
- [ ] 組件測試（主要 UI 組件）
- [ ] 跨瀏覽器測試
- [ ] 移動設備測試
- [ ] 部署到 Vercel/Netlify/GitHub Pages
- [ ] 撰寫技術選擇文檔

## Mock 數據設計考慮

### 數據真實性
- 使用合理的視頻時長（2-5 分鐘）
- 轉錄內容應該合理分段（5-10 個段落）
- 每個段落 3-8 個句子
- 句子長度和時間戳應該符合實際說話節奏
- 建議高光佔總內容的 20-30%

### 數據多樣性
- 準備 2-3 組不同主題的 Mock 數據
- 包含不同長度的句子
- 包含不同密度的高光分布

## 評估重點提醒

根據 README.md，評估將基於以下標準：
1. ✅ 必要功能的實現
2. ✅ 代碼質量和組織（Clean Architecture & DDD）
3. ✅ 文檔質量
4. ✅ 用戶體驗設計
5. ✅ 響應式網頁設計
6. ✅ Mock 數據的質量和適當性
7. ✅ 整體效能和完成度
