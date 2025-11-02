/**
 * JSON Validator - 驗證 Mock AI JSON 格式
 *
 * 職責:
 * - 驗證必要欄位存在
 * - 檢查時間戳合理性
 * - 提供友善的錯誤訊息
 *
 * 驗證策略:
 * - 必要欄位缺失 → 拋出錯誤
 * - 時間戳異常 → 發出警告但不阻斷
 */

interface SentenceData {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  isHighlightSuggestion?: boolean; // 非必要
}

interface SectionData {
  id: string;
  title: string;
  sentences: SentenceData[];
}

interface TranscriptData {
  sections: SectionData[];
  fullText?: string; // 非必要,可自動補完
}

export class JSONValidator {
  /**
   * 驗證 Mock AI JSON 格式
   *
   * @param jsonContent - JSON 字串
   * @returns 解析後的物件
   * @throws Error 如果 JSON 格式無效或缺少必要欄位
   */
  static validate(jsonContent: string): TranscriptData {
    // 1. 解析 JSON
    let data: Record<string, unknown>;
    try {
      const parsed = JSON.parse(jsonContent);
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('JSON 格式錯誤:根節點必須是物件');
      }
      data = parsed as Record<string, unknown>;
    } catch {
      throw new Error('JSON 格式錯誤:無法解析 JSON 字串');
    }

    // 2. 驗證必要欄位:sections
    if (!data.sections || !Array.isArray(data.sections)) {
      throw new Error('JSON 格式錯誤:缺少必要欄位 "sections"');
    }

    if (data.sections.length === 0) {
      throw new Error('JSON 格式錯誤:"sections" 不可為空陣列');
    }

    // 3. 驗證每個 section
    for (let i = 0; i < data.sections.length; i++) {
      const section = data.sections[i];

      if (!section.id) {
        throw new Error(`JSON 格式錯誤:sections[${i}] 缺少必要欄位 "id"`);
      }

      if (!section.title) {
        throw new Error(`JSON 格式錯誤:sections[${i}] 缺少必要欄位 "title"`);
      }

      if (!section.sentences || !Array.isArray(section.sentences)) {
        throw new Error(`JSON 格式錯誤:sections[${i}] 缺少必要欄位 "sentences"`);
      }

      if (section.sentences.length === 0) {
        throw new Error(`JSON 格式錯誤:sections[${i}].sentences 不可為空陣列`);
      }

      // 4. 驗證每個 sentence
      for (let j = 0; j < section.sentences.length; j++) {
        const sentence = section.sentences[j];

        if (!sentence.id) {
          throw new Error(
            `JSON 格式錯誤:sections[${i}].sentences[${j}] 缺少必要欄位 "id"`
          );
        }

        if (!sentence.text || typeof sentence.text !== 'string') {
          throw new Error(
            `JSON 格式錯誤:sections[${i}].sentences[${j}] 缺少必要欄位 "text"`
          );
        }

        if (typeof sentence.startTime !== 'number') {
          throw new Error(
            `JSON 格式錯誤:sections[${i}].sentences[${j}] 缺少必要欄位 "startTime"`
          );
        }

        if (typeof sentence.endTime !== 'number') {
          throw new Error(
            `JSON 格式錯誤:sections[${i}].sentences[${j}] 缺少必要欄位 "endTime"`
          );
        }

        // 5. 時間戳合理性檢查 (警告但不阻斷)
        if (sentence.endTime <= sentence.startTime) {
          console.warn(
            `時間戳異常:sections[${i}].sentences[${j}] 的 endTime (${sentence.endTime}) 小於或等於 startTime (${sentence.startTime})`
          );
        }

        if (sentence.startTime < 0) {
          console.warn(
            `時間戳異常:sections[${i}].sentences[${j}] 的 startTime (${sentence.startTime}) 為負數`
          );
        }

        // 6. 檢查時間重疊 (與下一個句子比對)
        if (j < section.sentences.length - 1) {
          const nextSentence = section.sentences[j + 1];
          if (sentence.endTime > nextSentence!.startTime) {
            console.warn(
              `時間戳重疊:sections[${i}].sentences[${j}] 的 endTime (${sentence.endTime}) 晚於下一句的 startTime (${nextSentence!.startTime})`
            );
          }
        }
      }
    }

    return data as unknown as TranscriptData;
  }

  /**
   * 補完非必要欄位
   *
   * @param data - 已驗證的 TranscriptData
   * @returns 補完後的 TranscriptData
   */
  static fillDefaults(data: TranscriptData): TranscriptData {
    // 補完 fullText (若缺失)
    if (!data.fullText) {
      data.fullText = data.sections
        .flatMap((section) => section.sentences.map((s) => s.text))
        .join(' ');
    }

    // 補完 isHighlightSuggestion (若缺失)
    for (const section of data.sections) {
      for (const sentence of section.sentences) {
        if (sentence.isHighlightSuggestion === undefined) {
          sentence.isHighlightSuggestion = false;
        }
      }
    }

    return data;
  }
}
