<script setup lang="ts">
/**
 * SplitLayout Component
 * User Story 7: 響應式佈局
 *
 * 提供響應式分屏佈局：
 * - 桌面（≥ 1024px）：左右分屏（50/50）
 * - 移動（< 1024px）：上下堆疊（50vh/50vh）
 *
 * Slots:
 * - left: 左側內容（移動端為上方）
 * - right: 右側內容（移動端為下方）
 */

defineOptions({
  name: 'SplitLayout',
})
</script>

<template>
  <div class="split-layout flex flex-col lg:flex-row h-full">
    <!-- 左側/上方區域 -->
    <div
      class="split-panel-left h-1/2 lg:h-full lg:w-1/2 overflow-hidden border-b lg:border-b-0 lg:border-r border-gray-200"
    >
      <slot name="left" />
    </div>

    <!-- 右側/下方區域 -->
    <div class="split-panel-right h-1/2 lg:h-full lg:w-1/2 overflow-hidden">
      <slot name="right" />
    </div>
  </div>
</template>

<style scoped>
/**
 * 響應式佈局樣式
 *
 * Mobile (< 1024px):
 * - flex-col: 垂直堆疊
 * - h-1/2: 各佔 50% 高度
 *
 * Desktop (≥ 1024px):
 * - lg:flex-row: 水平排列
 * - lg:w-1/2: 各佔 50% 寬度
 * - lg:h-full: 佔滿全高
 *
 * 邊框:
 * - Mobile: 上方區域底部有邊框（border-b）
 * - Desktop: 左側區域右側有邊框（lg:border-r），移除底部邊框（lg:border-b-0）
 */
</style>
