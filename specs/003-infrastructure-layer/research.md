# Research & Technical Decisions

**Feature**: Infrastructure Layer Implementation
**Date**: 2025-10-30

## Overview

本文件記錄 Infrastructure Layer 實作過程中的技術調研結果與決策依據。

## Research Topics

### 1. IndexedDB 包裝函式庫選擇

**Research Question**: 應使用哪個 IndexedDB 包裝函式庫來簡化非同步操作？

**Options Evaluated**:

| 選項                 | 優點                                         | 缺點                                    | 評估            |
| -------------------- | -------------------------------------------- | --------------------------------------- | --------------- |
| 原生 IndexedDB API   | 無額外依賴                                   | API 複雜，回調地獄，錯誤處理繁瑣        | ❌ 開發效率低   |
| Dexie.js             | 功能豐富，類似 SQL 的查詢語法                | Bundle 大小較大 (15KB gzipped)          | ⚠️ 功能過於豐富 |
| idb (Jake Archibald) | 輕量 (1.5KB gzipped)，Promise 友善，API 簡潔 | 功能較基礎                              | ✅ **採用**     |
| localForage          | 自動降級到 LocalStorage                      | 不支援複雜查詢，API 與 IndexedDB 差異大 | ❌ 不符需求     |

**Decision**: 採用 **idb** (Jake Archibald's IndexedDB Promise wrapper)

**Rationale**:

1. **輕量級**: 僅 1.5KB gzipped，符合 Bundle 大小限制 < 500KB 的要求
2. **Promise 友善**: 完美搭配 async/await，程式碼簡潔易讀
3. **TypeScript 支援**: 原生 TypeScript 定義，型別安全
4. **維護良好**: Google Chrome 團隊成員維護，社群活躍
5. **足夠功能**: 本專案僅需簡單的 CRUD 操作，不需要複雜查詢功能

**Alternatives Considered**:

- Dexie.js 雖然功能強大，但對於本專案的簡單 CRUD 需求過於複雜，會增加不必要的 Bundle 大小
- 原生 API 雖無依賴，但開發體驗差，容易出錯，不符合「快速交付」的專案目標

**References**:

- [idb GitHub](https://github.com/jakearchibald/idb)
- [IndexedDB API MDN](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

---

### 2. JSON 驗證策略

**Research Question**: Mock AI Service 應採用嚴格驗證還是寬鬆補完？

**Options Evaluated**:

| 策略                              | 優點                   | 缺點                                 | 評估        |
| --------------------------------- | ---------------------- | ------------------------------------ | ----------- |
| 嚴格驗證 (所有欄位必須存在)       | 資料一致性高，錯誤明確 | 使用者體驗差，無法容忍非必要欄位缺失 | ❌ 過於嚴格 |
| 寬鬆補完 (缺失非必要欄位自動補完) | 使用者體驗好，容錯性高 | 可能隱藏資料問題                     | ✅ **採用** |
| 無驗證 (直接解析)                 | 實作簡單               | 容易產生執行時錯誤                   | ❌ 不安全   |

**Decision**: 採用 **寬鬆補完策略**

**Rationale**:

1. **必要欄位驗證**: 檢查 `sections`, `sentences`, `text`, `startTime`, `endTime` 等核心欄位是否存在，若缺失則拋出明確錯誤
2. **非必要欄位補完**: 若 `isHighlightSuggestion` 缺失，自動補完為 `false`；若 `fullText` 缺失，由所有句子 `text` 拼接生成
3. **時間戳合理性**: 驗證時間戳是否按順序排列，若異常則發出 `console.warn` 但不阻斷處理（允許使用者測試邊界情況）
4. **錯誤訊息友善**: 拋出的錯誤訊息清楚指出缺失的欄位名稱，方便使用者修正 JSON

**Implementation Details**:

```typescript
// 必要欄位驗證
if (!sections || !Array.isArray(sections)) {
  throw new Error('JSON 格式錯誤：缺少必要欄位 "sections"');
}

// 非必要欄位補完
const isHighlightSuggestion = sentence.isHighlightSuggestion ?? false;
const fullText =
  data.fullText ?? sections.flatMap((s) => s.sentences.map((sen) => sen.text)).join(' ');

// 時間戳合理性警告
if (sentence.endTime > nextSentence.startTime) {
  console.warn(
    `時間戳重疊：句子 ${sentence.id} 的 endTime (${sentence.endTime}) 晚於下一句的 startTime (${nextSentence.startTime})`
  );
}
```

**Alternatives Considered**:

- 嚴格驗證會導致使用者體驗不佳，尤其是手動編寫 JSON 時容易忘記非必要欄位
- 無驗證會導致執行時錯誤，不符合「穩定性」要求

**References**:

- Feature Spec Session 2025-10-30 Q3 決策

---

### 3. 視頻檔案大小閾值選擇

**Research Question**: 應如何決定「小視頻」與「大視頻」的分界線？

**Options Evaluated**:

| 閾值  | 理由                                                   | 評估            |
| ----- | ------------------------------------------------------ | --------------- |
| 10MB  | 適用於短片段 demo，大部分視頻都需重新上傳              | ❌ 閾值過小     |
| 50MB  | 涵蓋 2-5 分鐘 1080p 視頻（約 30-40MB），符合 demo 場景 | ✅ **採用**     |
| 100MB | 更寬容，但接近 IndexedDB 瀏覽器配額下限                | ⚠️ 可能超出配額 |

**Decision**: 採用 **50MB** 作為閾值

**Rationale**:

1. **符合 Demo 場景**: 2-5 分鐘的 1080p 視頻（H.264 編碼，中等碼率）約 30-40MB，50MB 能涵蓋大部分 demo 用途的視頻
2. **IndexedDB 配額考量**: 現代瀏覽器的 IndexedDB 配額通常為可用磁碟空間的 10-50%（至少數百 MB 到數 GB），50MB 視頻加上轉錄資料仍在安全範圍內
3. **避免記憶體問題**: 超過 50MB 的視頻在瀏覽器中載入可能導致記憶體壓力，僅儲存元資料可避免此問題
4. **使用者體驗平衡**: 50MB 以下的視頻可完整恢復（包含視頻檔案），提供最佳體驗；超過 50MB 的視頻雖需重新上傳，但轉錄和選擇狀態保留，減少重複工作

**Edge Cases**:

- 視頻檔案剛好 50MB：統一處理為「小視頻」，儲存到 IndexedDB
- 超過 100MB 的視頻：僅記錄元資料（id, name, size）到 SessionStorage，刷新後提示重新上傳

**Alternatives Considered**:

- 10MB 閾值過小，會導致大部分正常 demo 視頻都無法完整恢復，使用者體驗差
- 100MB 閾值雖更寬容，但可能接近瀏覽器配額下限，且大視頻載入可能導致記憶體問題

**References**:

- [IndexedDB Storage Limits](https://web.dev/storage-for-the-web/)
- [Video File Size Calculator](https://toolstud.io/video/filesize.php)

---

### 4. Session ID 生成與清理策略

**Research Question**: 如何識別和清理屬於已關閉 Tab 的資料？

**Options Evaluated**:

| 策略                               | 優點          | 缺點                              | 評估        |
| ---------------------------------- | ------------- | --------------------------------- | ----------- |
| 使用 localStorage 儲存 sessionId   | 跨 Tab 共享   | 無法區分不同 Tab                  | ❌ 不符需求 |
| 使用 sessionStorage 儲存 sessionId | 每個 Tab 獨立 | 關閉 Tab 時無法主動清理 IndexedDB | ✅ **採用** |
| 使用 beforeunload 事件清理         | 主動清理      | 事件不可靠，可能被瀏覽器阻止      | ❌ 不可靠   |
| 啟動時檢查 sessionId 清理          | 穩健可靠      | 需要下次啟動才清理                | ✅ **採用** |

**Decision**: 採用 **sessionStorage + 啟動時清理** 策略

**Rationale**:

1. **Session ID 生成**: 在 BrowserStorage.init() 時，檢查 SessionStorage 是否有 sessionId，若無則生成（格式：`session_${timestamp}_${random}`）
2. **儲存時記錄**: 每次儲存到 IndexedDB 時，同時記錄當前的 sessionId 和 savedAt 時間戳
3. **啟動時清理**: BrowserStorage.init() 時調用 cleanupStaleData()，刪除所有 sessionId 不等於當前會話 ID 的資料，以及 savedAt 距今超過 24 小時的資料
4. **雙重保險**: sessionId 機制確保跨 Tab 隔離，24 小時時間限制避免累積過多資料

**Implementation Details**:

```typescript
// 生成或讀取 sessionId
private initSessionId(): string {
  const existing = sessionStorage.getItem('sessionId');
  if (existing) return existing;

  const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  sessionStorage.setItem('sessionId', newId);
  return newId;
}

// 清理過期資料
async cleanupStaleData() {
  const currentSessionId = this.sessionId;
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 小時

  // 刪除不屬於當前會話且超過 24 小時的資料
  for (const storeName of ['videos', 'transcripts', 'highlights']) {
    const items = await this.db.getAll(storeName);
    for (const item of items) {
      if (item.sessionId !== currentSessionId || now - item.savedAt > maxAge) {
        await this.db.delete(storeName, item.id);
      }
    }
  }
}
```

**Alternatives Considered**:

- beforeunload 事件不可靠，尤其在移動瀏覽器上可能不觸發
- localStorage 無法區分不同 Tab，不符合「每個 Tab 維護獨立編輯狀態」的需求

**References**:

- [SessionStorage MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)
- [beforeunload 的可靠性問題](https://stackoverflow.com/questions/3239834/window-onbeforeunload-not-working-on-the-ipad)

---

### 5. DTO 與 Domain Entity 轉換模式

**Research Question**: 應採用何種方式轉換 DTO 與 Domain Entity？

**Options Evaluated**:

| 模式                                         | 優點                 | 缺點                     | 評估            |
| -------------------------------------------- | -------------------- | ------------------------ | --------------- |
| Entity 內部靜態方法 (`Video.fromDTO(dto)`)   | 邏輯集中在 Entity    | Entity 依賴於 DTO 結構   | ❌ 違反依賴規則 |
| DTO 類別內部方法 (`dto.toEntity()`)          | DTO 知道如何轉換自己 | DTO 依賴於 Domain Entity | ❌ 違反分層架構 |
| 獨立 Mapper 類別 (`DTOMapper.toEntity(dto)`) | 關注點分離，依賴清晰 | 多一層抽象               | ✅ **採用**     |
| Repository 內部直接轉換                      | 實作簡單             | 轉換邏輯分散，難以重用   | ❌ 不易維護     |

**Decision**: 採用 **獨立 Mapper 類別** (`dto-mapper.ts`)

**Rationale**:

1. **關注點分離**: DTO 專注於資料傳輸和持久化，Entity 專注於業務邏輯，Mapper 專注於轉換邏輯
2. **依賴清晰**: Mapper 依賴於 Domain Layer 和 Application Layer，不違反分層架構原則
3. **可測試性**: Mapper 邏輯可獨立測試，確保轉換正確性
4. **可重用性**: Mapper 可在多個 Repository 中重用，避免重複代碼

**Implementation Details**:

```typescript
// infrastructure/utils/dto-mapper.ts
export class DTOMapper {
  static videoDtoToEntity(dto: VideoDTO): Video {
    return new Video(dto.id, dto.file, new VideoMetadata(dto.metadata));
  }

  static videoEntityToDto(video: Video): VideoDTO {
    return {
      id: video.id,
      file: video.file,
      metadata: video.metadata,
      url: video.url,
      savedAt: Date.now(),
      sessionId: '' // 由 BrowserStorage 填充
    };
  }

  // Transcript, Highlight 的轉換方法...
}
```

**Alternatives Considered**:

- Entity 內部靜態方法會使 Domain Layer 依賴於 Application Layer 的 DTO，違反依賴規則
- DTO 內部方法會使 Application Layer 依賴於 Domain Layer 的 Entity 實例化邏輯，耦合過緊
- Repository 內部直接轉換會導致邏輯分散，難以維護和測試

**References**:

- [Clean Architecture: Data Mappers](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- Martin Fowler - Patterns of Enterprise Application Architecture

---

## Summary of Decisions

| 決策點          | 選擇                        | 主要理由                                           |
| --------------- | --------------------------- | -------------------------------------------------- |
| IndexedDB 包裝  | idb (Jake Archibald)        | 輕量 (1.5KB)、Promise 友善、TypeScript 支援        |
| JSON 驗證策略   | 寬鬆補完                    | 使用者體驗好，必要欄位嚴格驗證，非必要欄位自動補完 |
| 視頻大小閾值    | 50MB                        | 涵蓋 2-5 分鐘 1080p demo 視頻，符合配額限制        |
| Session ID 清理 | sessionStorage + 啟動時清理 | 穩健可靠，支援跨 Tab 隔離                          |
| DTO 轉換模式    | 獨立 Mapper 類別            | 關注點分離，依賴清晰，可測試性高                   |

## Technical Risks

| 風險                           | 影響 | 緩解措施                                           |
| ------------------------------ | ---- | -------------------------------------------------- |
| IndexedDB 配額不足             | 中   | 降級為 SessionStorage 模式，提示用戶清理瀏覽器資料 |
| JSON 格式異常導致解析失敗      | 低   | 寬鬆驗證 + 明確錯誤訊息，引導用戶修正              |
| 大視頻載入導致記憶體壓力       | 低   | 50MB 閾值限制，超過閾值僅儲存元資料                |
| sessionId 清理失敗導致資料累積 | 低   | 24 小時時間限制兜底，定期清理過期資料              |

## Next Steps

1. ✅ Research 完成
2. ⏭️ 進入 Phase 1: Design & Contracts
   - 生成 data-model.md（DTO 與持久化模型設計）
   - 生成 contracts/（Mock AI JSON schema）
   - 生成 quickstart.md（開發者快速開始指南）
