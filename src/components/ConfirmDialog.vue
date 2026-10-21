<script setup>
import { nextTick, ref, watch, onBeforeUnmount } from 'vue'
import { confirmation, answerConfirmation } from '../lib/confirm'
const cancel = ref(null)
const approve = ref(null)
let previous
watch(confirmation, async (value) => {
  if (value) {
    previous = document.activeElement
    await nextTick()
    cancel.value?.focus()
  } else previous?.focus()
})
function keyboard(event) {
  if (!confirmation.value) return
  if (event.key === 'Escape') answerConfirmation(false)
  if (event.key === 'Tab') {
    event.preventDefault()
    ;(document.activeElement === cancel.value ? approve.value : cancel.value)?.focus()
  }
}
window.addEventListener('keydown', keyboard)
onBeforeUnmount(() => window.removeEventListener('keydown', keyboard))
</script>
<template>
  <Teleport to="body"
    ><div v-if="confirmation" class="dialog-overlay" @click.self="answerConfirmation(false)">
      <section
        class="confirm-dialog card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <h2 id="confirm-title">{{ confirmation.title }}</h2>
        <p id="confirm-message">{{ confirmation.message }}</p>
        <div class="button-row">
          <button ref="cancel" class="button secondary" @click="answerConfirmation(false)">
            继续保留</button
          ><button
            ref="approve"
            class="button primary"
            :class="{ 'danger-confirm': confirmation.danger }"
            @click="answerConfirmation(true)"
          >
            {{ confirmation.action }}
          </button>
        </div>
      </section>
    </div></Teleport
  >
</template>
