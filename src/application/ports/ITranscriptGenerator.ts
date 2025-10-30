/**
 * Transcript Generator Port Interface
 *
 * 定義轉錄生成服務的契約，由 Infrastructure Layer 實作
 */

import type { TranscriptDTO } from '../dto';

/**
 * 轉錄生成器介面
 *
 * 負責調用 AI 服務生成視頻轉錄
 */
export interface ITranscriptGenerator {
  /**
   * 生成視頻轉錄
   *
   * @param videoId - 視頻 ID
   * @returns Promise<TranscriptDTO> - 轉錄數據
   * @throws TranscriptGenerationError - 當生成失敗時
   */
  generate(videoId: string): Promise<TranscriptDTO>;
}
