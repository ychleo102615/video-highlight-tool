<template>
  <div class="empty-state flex flex-col items-center justify-center h-full p-8 text-center">
    <!-- 圖示 -->
    <component :is="iconComponent" v-if="iconComponent" class="w-16 h-16 text-gray-400 mb-4" />

    <!-- 訊息 -->
    <p class="text-lg text-gray-600 max-w-md">
      {{ message }}
    </p>

    <!-- 插槽：允許父組件添加自訂內容（如操作按鈕） -->
    <div v-if="$slots.default" class="mt-6">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue';
import {
  VideoCameraIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  InformationCircleIcon
} from '@heroicons/vue/24/outline';
import type { EmptyStateProps } from '@/presentation/types/component-contracts';

// Props
const props = withDefaults(defineProps<EmptyStateProps>(), {
  icon: 'information'
});

/**
 * 根據 icon prop 選擇對應的 Heroicons 組件
 */
const iconComponent = computed(() => {
  const iconMap: Record<string, Component> = {
    video: VideoCameraIcon,
    document: DocumentTextIcon,
    exclamation: ExclamationCircleIcon,
    information: InformationCircleIcon
  };

  return iconMap[props.icon || 'information'] || InformationCircleIcon;
});
</script>

<style scoped>
.empty-state {
  min-height: 300px;
}
</style>
