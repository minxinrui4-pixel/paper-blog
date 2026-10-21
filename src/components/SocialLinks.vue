<script setup>
import Icon from './Icon.vue'
import { settings } from '../lib/settings'
</script>
<template>
  <div class="social-links" aria-label="外部链接">
    <a
      :href="settings.github"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="打开 GitHub（新窗口）"
      title="GitHub"
    >
      <Icon name="Github" :size="20" /><span>GitHub</span><Icon name="ArrowUpRight" :size="12" />
    </a>
    <a
      :href="settings.chatgpt"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="打开 ChatGPT（新窗口）"
      title="ChatGPT"
    >
      <Icon name="ChatGPT" :size="20" /><span>ChatGPT</span><Icon name="ArrowUpRight" :size="12" />
    </a>
  </div>
</template>
