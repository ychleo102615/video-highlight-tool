<script setup lang="ts">
/**
 * SplitLayout Component
 * User Story 7: 響應式佈局
 *
 * 提供響應式分屏佈局：
 * - 平板/桌面（≥ 768px）：左右分屏（50/50）
 *   - left slot: 左側（編輯區）
 *   - right slot: 右側（預覽區）
 * - 手機（< 768px）：上下堆疊（自動高度）
 *   - right slot: 上方（預覽區）- 高度隨內容，使用 CSS order: 1
 *   - left slot: 下方（編輯區）- 填滿剩餘空間，使用 CSS order: 2
 *
 * Slots:
 * - left: 編輯區內容（平板/桌面：左側，手機：下方填滿）
 * - right: 預覽區內容（平板/桌面：右側，手機：上方自適應）
 */

defineOptions({
  name: 'SplitLayout'
});
</script>

<template>
  <div class="split-layout flex flex-col md:flex-row h-full">
    <!-- 左側/下方區域（平板/桌面：左側，手機：下方填滿） -->
    <div
      class="split-panel-left flex-1 md:h-full md:w-1/2 overflow-hidden md:border-r border-gray-200"
    >
      <slot name="left" />
    </div>

    <!-- 右側/上方區域（平板/桌面：右側，手機：上方自適應） -->
    <div class="split-panel-right md:h-full md:w-1/2 overflow-hidden border-b md:border-b-0">
      <slot name="right" />
    </div>
  </div>
</template>

<style scoped>
/**
 * 響應式佈局樣式
 *
 * Mobile (< 768px):
 * - flex-col: 垂直堆疊
 * - 高度分配:
 *   - split-panel-right (預覽區): 高度隨內容自適應（無固定高度）
 *   - split-panel-left (編輯區): flex-1 填滿剩餘空間
 * - order: 使用 CSS order 屬性調整順序
 *   - split-panel-right (預覽區) order: 1 → 上方
 *   - split-panel-left (編輯區) order: 2 → 下方
 *
 * Tablet/Desktop (≥ 768px):
 * - md:flex-row: 水平排列
 * - md:w-1/2: 各佔 50% 寬度
 * - md:h-full: 佔滿全高
 * - order: 0 (預設順序)
 *
 * 邊框:
 * - Mobile: 上方區域（預覽區）底部有邊框（border-b）
 * - Tablet/Desktop: 左側區域（編輯區）右側有邊框（md:border-r）
 */

/* 手機版：調整順序 */
@media (max-width: 767px) {
  .split-panel-left {
    order: 2; /* 編輯區在下方，填滿剩餘空間 */
  }

  .split-panel-right {
    order: 1; /* 預覽區在上方，高度隨內容 */
  }
}

/* 平板/桌面版：預設順序 */
@media (min-width: 768px) {
  .split-panel-left {
    order: 0;
  }

  .split-panel-right {
    order: 0;
  }
}
</style>
