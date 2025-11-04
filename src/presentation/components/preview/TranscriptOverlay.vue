<template>
  <div
    class="absolute bottom-0 left-0 right-0 z-20 pointer-events-none flex justify-center px-4"
  >
    <!-- 文字疊加層 -->
    <Transition name="fade" mode="out-in">
      <div
        v-if="visible && currentText"
        key="text-overlay"
        class="overlay-text mb-2 px-3 py-1.5 bg-black/80 rounded inline-block max-w-full"
      >
        <p class="text-white text-sm md:text-base text-center leading-snug whitespace-pre-wrap">
          {{ currentText }}
        </p>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { TranscriptOverlayProps } from '@/presentation/types/component-contracts';

// Props
defineProps<TranscriptOverlayProps>();
</script>

<style scoped>
/**
 * 淡入淡出過渡效果（300ms）
 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}

/**
 * 文字疊加層樣式
 */
.overlay-text {
  /* 陰影效果，提升文字可讀性 */
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);

  /* 平滑的邊角 */
  backdrop-filter: blur(8px);
}

/**
 * 響應式調整
 */
@media (max-width: 768px) {
  .overlay-text {
    /* 移動端：進一步減少內邊距 */
    padding: 0.5rem 0.75rem;
  }

  .overlay-text p {
    /* 移動端：使用更小的文字 */
    font-size: 0.875rem;
    line-height: 1.375;
  }
}
</style>
