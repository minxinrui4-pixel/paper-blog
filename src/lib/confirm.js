import { shallowRef } from 'vue'
export const confirmation = shallowRef(null)
export function confirmAction(
  message,
  { title = '确认操作', action = '确定', danger = false } = {},
) {
  return new Promise((resolve) => {
    confirmation.value = { message, title, action, danger, resolve }
  })
}
export function answerConfirmation(answer) {
  const current = confirmation.value
  confirmation.value = null
  current?.resolve(answer)
}
