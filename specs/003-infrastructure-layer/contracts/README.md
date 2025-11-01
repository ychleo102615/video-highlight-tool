# API Contracts

本目錄包含 Infrastructure Layer 的 API 合約定義。

## Mock AI Transcript Input Schema

### 檔案

- `mock-transcript-input.schema.json` - 使用者上傳的 JSON 檔案格式規範

### 用途

定義使用者上傳的 JSON 檔案格式，用於 MockAIService 生成轉錄資料。

### 必要欄位

- `sections` (array) - 段落陣列（至少包含一個段落）
  - `id` (string) - 段落 ID（格式：`sec_1`, `sec_2`）
  - `title` (string) - 段落標題
  - `sentences` (array) - 句子陣列（至少包含一個句子）
    - `id` (string) - 句子 ID（格式：`sent_1`, `sent_2`）
    - `text` (string) - 句子內容
    - `startTime` (number) - 起始時間（秒）
    - `endTime` (number) - 結束時間（秒，必須 >= startTime）

### 可選欄位

- `fullText` (string) - 完整轉錄文字（若缺失，由所有句子 text 拼接生成）
- `sentences[].isHighlight` (boolean) - 是否為 AI 建議的高光句子（預設 false）

### 驗證規則

1. **必要欄位驗證**: 若缺少 `sections` 或 `sentences`，MockAIService 應拋出明確錯誤
2. **時間戳合理性**: 若 `endTime < startTime` 或時間戳重疊，發出 `console.warn` 但不阻斷處理
3. **寬鬆補完**: 若缺少 `isHighlight`，自動補完為 `false`；若缺少 `fullText`，由所有句子 text 拼接生成

### 範例

#### 範例 1: 完整的 JSON 檔案

```json
{
  "fullText": "大家好，歡迎來到今天的分享。今天我們要討論的主題是前端架構設計。",
  "sections": [
    {
      "id": "sec_1",
      "title": "開場介紹",
      "sentences": [
        {
          "id": "sent_1",
          "text": "大家好，歡迎來到今天的分享。",
          "startTime": 0.0,
          "endTime": 3.5,
          "isHighlight": true
        },
        {
          "id": "sent_2",
          "text": "今天我們要討論的主題是前端架構設計。",
          "startTime": 3.5,
          "endTime": 7.0,
          "isHighlight": true
        }
      ]
    }
  ]
}
```

#### 範例 2: 缺少可選欄位（會自動補完）

```json
{
  "sections": [
    {
      "id": "sec_1",
      "title": "開場介紹",
      "sentences": [
        {
          "id": "sent_1",
          "text": "大家好，歡迎來到今天的分享。",
          "startTime": 0.0,
          "endTime": 3.5
        }
      ]
    }
  ]
}
```

**補完結果**:
- `fullText` 自動生成為 `"大家好，歡迎來到今天的分享。"`
- `isHighlight` 自動補完為 `false`

#### 範例 3: 缺少必要欄位（會拋出錯誤）

```json
{
  "sections": [
    {
      "id": "sec_1",
      "title": "開場介紹"
      // ❌ 缺少 sentences
    }
  ]
}
```

**錯誤訊息**: `"JSON 格式錯誤：缺少必要欄位 'sentences'"`

### 使用方式

#### 在 MockAIService 中驗證

```typescript
import schema from './contracts/mock-transcript-input.schema.json';
import Ajv from 'ajv';

const ajv = new Ajv();
const validate = ajv.compile(schema);

export class MockAIService implements ITranscriptGenerator {
  async generate(videoId: string): Promise<TranscriptDTO> {
    const jsonContent = this.mockDataMap.get(videoId);
    if (!jsonContent) {
      throw new Error('找不到 videoId 的 Mock 資料，請先上傳 JSON 檔案');
    }

    const data = JSON.parse(jsonContent);

    // 驗證 JSON 格式
    const valid = validate(data);
    if (!valid) {
      throw new Error(`JSON 格式錯誤：${ajv.errorsText(validate.errors)}`);
    }

    // 寬鬆補完缺失欄位
    // ...
  }
}
```

### Schema 版本

- **Version**: 1.0.0
- **Last Updated**: 2025-10-30
- **Compatibility**: MockAIService 1.0.0+

### 未來擴展

若未來需要支援真實 AI API（如 OpenAI Whisper），可以新增：
- `transcript-api-response.schema.json` - 真實 AI API 回應格式
- `transcript-api-request.schema.json` - 真實 AI API 請求格式

當前僅定義 Mock 場景的 JSON 輸入格式。
