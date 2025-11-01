<!--
Sync Impact Report:
Version Change: 1.0.0 → 1.1.0
Modified Principles:
  - Core Principle I: 架構調整為 Domain → Application → Infrastructure/Presentation
  - Architecture Constraints: 資料夾結構更新
  - Governance: 合規審查項目更新
Reason: Infrastructure 和 Presentation 同層，職責分離，通過 Port 解耦
Impact:
  - 新增 IFileStorage Port
  - Infrastructure 負責技術基礎設施（Repository、API、Storage）
  - Presentation 負責 UI 展示（Components、State、Composables）
Templates Status:
  ✅ plan-template.md - Compatible with new architecture
  ✅ spec-template.md - Compatible with new architecture
  ✅ tasks-template.md - Compatible with new architecture
Related Updates:
  ✅ CLAUDE.md - Updated
  ✅ TECHNICAL_DESIGN.md - Updated
  ✅ REQUIREMENTS.md - Updated
Follow-up TODOs: None
-->

# Video Highlight Tool Constitution

## Core Principles

### I. Clean Architecture (NON-NEGOTIABLE)

採用嚴格的分層架構組織程式碼：
- **Domain Layer**: 核心業務邏輯
- **Application Layer**: 應用服務層，定義 Use Case 和 Port（介面）
- **Infrastructure Layer**: 技術基礎設施（Repository 實作、API 服務、檔案儲存）
- **Presentation Layer**: UI 展示層（組件、狀態管理、Composables）

**依賴規則**:
- 內層不得依賴外層
- Infrastructure 和 Presentation 同層，職責不同，彼此不應直接依賴
- 通過 Application Layer 定義的 Port（介面）解耦
- Domain Layer 不得引用 UI 框架、狀態管理或 HTTP 客戶端

**理由**: 確保業務邏輯獨立於框架，提高可測試性、可維護性與可擴展性。Infrastructure 和 Presentation 分離使技術基礎設施與 UI 層各自演進，互不影響。

### II. Domain-Driven Development (DDD)

業務邏輯必須以 Entity、Value Object、Repository Pattern、Use Case 等 DDD 模式組織。每個 Use Case 代表一個完整的用戶操作流程，包含輸入驗證、業務邏輯執行與結果返回。

**理由**: DDD 模式提供清晰的業務邏輯表達方式，使代碼結構與業務需求對齊，降低溝通成本，提高代碼可讀性。

### III. 反幻覺指示：事實檢查思考 (NON-NEGOTIABLE)

開發過程中必須進行「事實檢查思考」。不得假設、推測或創造未明確提供的內容。若資訊不足，必須明確標註「NEEDS CLARIFICATION」或「TODO」，並說明原因。引用資料時必須附上依據來源。

**理由**: 避免因假設或臆測導致的錯誤實作，確保代碼與需求的準確對應，減少返工成本。

### IV. TypeScript 型別安全

TypeScript 型別覆蓋率必須 > 90%。禁止使用 `any` 型別（除非有充分理由並註明）。所有公開 API、函數參數、返回值必須明確定義型別。

**理由**: 強型別系統在編譯時捕獲錯誤，減少執行時 bug，提高代碼可維護性與重構信心。

### V. 響應式網頁設計 (RWD)

所有 UI 組件必須支援桌面（Windows/Mac Chrome）與移動（iOS/Android Chrome/Safari）平台。斷點設計：Desktop (>1024px)、Tablet (768px-1024px)、Mobile (<768px)。移動版採用上下堆疊佈局，桌面版採用左右分屏佈局。

**理由**: 滿足作業評估標準中的跨平台需求，確保所有目標用戶都能獲得良好體驗。

### VI. 單向數據流與狀態管理

使用 Pinia 作為單一數據源（Single Source of Truth）。組件不得直接修改狀態，必須透過 Store 的 actions。Store 呼叫 Use Case 執行業務邏輯，Use Case 不知道 Store 的存在。

**理由**: 單向數據流使狀態變化可預測、可追蹤，降低 debug 難度，避免狀態不一致問題。

### VII. 依賴注入 (DI)

所有跨層依賴（如 Repository、Service）必須透過依賴注入配置。在 `di-container.ts` 中集中管理所有依賴關係。Use Case 透過建構函式接收依賴，不得直接 new 實例。

**理由**: 依賴注入使代碼易於測試（可注入 mock）、易於替換實作（符合開放封閉原則），降低耦合度。

## Architecture Constraints

### 資料夾結構規範

```
src/
├── domain/              # 🔴 核心業務邏輯，不依賴任何外層
├── application/         # 🟡 應用服務層，定義 Use Case 和 Port
├── infrastructure/      # 🟢 技術基礎設施層
│   ├── api/            # API 服務（實作 Port）
│   ├── repositories/   # Repository 實作
│   └── storage/        # 檔案儲存服務
└── presentation/        # 🔵 UI 展示層
    ├── components/     # Vue 組件
    ├── composables/    # Composables
    └── stores/         # Pinia Stores
```

**依賴方向**:
```
Infrastructure Layer          Presentation Layer
      ↓                             ↓
      └─────────→ Application Layer ←────────┘
                        ↓
                   Domain Layer
```

**強制規則**:
- **Domain Layer**: 只能使用 TypeScript 標準庫與純函式工具庫（需最小化）
- **Application Layer**: 可依賴 Domain，定義 Use Case、DTO 和 Port（介面）
- **Infrastructure Layer**: 可依賴 Application 與 Domain，實作 Repository、API 服務、檔案儲存等 Port
- **Presentation Layer**: 可依賴 Application 與 Domain，包含 Vue 組件、Composables、Pinia Stores
- **Infrastructure 和 Presentation 不得相互依賴**

### 命名規範 (MUST FOLLOW)

| 類型 | 規範 | 範例 |
|------|------|------|
| Entity | PascalCase, 名詞 | `Video`, `Transcript` |
| Value Object | PascalCase, 名詞 | `TimeStamp`, `TimeRange` |
| Use Case | PascalCase + UseCase 後綴 | `UploadVideoUseCase` |
| Repository | PascalCase + Repository 後綴 | `VideoRepository` |
| Store | camelCase + Store 後綴 | `videoStore`, `transcriptStore` |
| Component | PascalCase | `VideoPlayer.vue` |
| Composable | camelCase, use 前綴 | `useVideoPlayer`, `useHighlight` |

### 性能基準目標

| 指標 | 目標值 | 違反時必須說明 |
|------|--------|----------------|
| 首次內容繪製 (FCP) | < 1.5s | 需提供優化計劃 |
| 最大內容繪製 (LCP) | < 2.5s | 需提供優化計劃 |
| 視頻上傳回應 | < 100ms | 需說明延遲原因 |
| 句子選擇回應 | < 50ms | 需說明延遲原因 |
| 預覽更新延遲 | < 200ms | 需說明延遲原因 |
| Bundle 大小 | < 500KB (gzip) | 需說明大小合理性 |

## Development Workflow

### 開發流程 (MUST FOLLOW)

1. **建立新功能**: 從 Domain Layer 開始 → Use Case → Repository/Adapter → UI 組件
2. **依賴方向檢查**: 執行 `npm run type-check` 確保無循環依賴
3. **代碼質量**: 執行 `npm run lint` 確保無 ESLint 錯誤
4. **測試**: 關鍵 Use Case 必須有單元測試，主要 UI 組件必須有組件測試

### Use Case 建立時機

當符合以下任一條件時，必須建立新的 Use Case：
1. 用戶的一個完整操作流程（如「上傳視頻」）
2. 需要協調多個 Entity 的操作
3. 包含業務規則驗證
4. 需要在多處重用的邏輯

### Repository Pattern 實作要求

每個 Repository 必須：
1. 在 Domain Layer 定義介面（`IVideoRepository`）
2. 在 Adapter Layer 提供實作（`VideoRepositoryImpl`）
3. 透過 DI Container 注入到 Use Case

### Mock 數據品質標準

Mock 數據必須滿足：
- 視頻時長: 2-5 分鐘
- 段落數: 5-10 個
- 每段句子數: 3-8 個
- 句子長度: 10-30 字
- 高光比例: 20-30%
- 時間戳: 符合自然說話節奏（避免不合理的時間間隔）

## Governance

### 憲法地位

本憲法優先於所有其他開發實踐。所有 PR 與代碼審查必須驗證符合本憲法。任何違反核心原則的代碼不得合併。

### 修正程序

修正憲法需要：
1. 提出修正提案，說明理由與影響範圍
2. 更新相關模板（plan-template.md、spec-template.md、tasks-template.md）
3. 更新 CLAUDE.md 中的相關指示
4. 提供遷移計劃（如影響現有代碼）
5. 更新版本號（遵循語義化版本規則）

### 複雜度豁免

若必須違反某原則（如性能基準），必須：
1. 在 `plan.md` 的 Complexity Tracking 表格中記錄
2. 說明為何需要違反
3. 說明為何更簡單的替代方案不可行
4. 獲得明確批准後方可實施

### 版本規則

- **MAJOR**: 移除或重新定義核心原則（向後不兼容）
- **MINOR**: 新增原則或實質擴展指導方針
- **PATCH**: 澄清、措辭修正、非語義修正

### 合規審查

每個 feature 的 `/speckit.plan` 輸出必須包含 Constitution Check 區塊，驗證：
- ✅ 遵循 Clean Architecture 分層架構（Domain → Application → Infrastructure/Presentation）
- ✅ Infrastructure 和 Presentation 職責分離，不相互依賴
- ✅ 通過 Application Layer 的 Port（介面）解耦
- ✅ 使用 DDD 模式組織業務邏輯
- ✅ TypeScript 型別覆蓋率 > 90%
- ✅ 支援 RWD（Desktop & Mobile）
- ✅ 使用 Pinia 單向數據流
- ✅ 透過 DI Container 管理依賴
- ✅ Mock 數據符合品質標準

### 執行時開發指導

執行時開發指導請參考 `CLAUDE.md`，其中包含：
- 反幻覺指示的具體執行規則
- 架構原則的實作範例
- 常見問題 (FAQ)
- Mock 數據範例
- 除錯與部署檢查清單

**Version**: 1.1.0 | **Ratified**: 2025-10-29 | **Last Amended**: 2025-10-29
