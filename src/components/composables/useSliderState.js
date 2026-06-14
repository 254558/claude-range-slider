import { ref, computed, watch, onBeforeUnmount } from 'vue'

export function useSliderState(threshold = 100) {
  const sliderValue = ref(70)
  const isAnimating = ref(false)
  let timer = null

  /* ── derived state ────────────────────────── */
  const isActive = computed(() => sliderValue.value >= threshold)
  const isFull = computed(() => sliderValue.value === 100)

  const statusLabel = computed(() => {
    const v = sliderValue.value
    if (v < 33) return 'Low'
    if (v < 66) return 'Medium'
    if (v < threshold) return 'High'
    return 'Ultracode'
  })

  /* ── flip-up animation ────────────────────── */
  function clearAnimation() {
    if (timer != null) {
      clearTimeout(timer)
      timer = null
    }
    isAnimating.value = false
  }

  function playFlipUp() {
    clearAnimation()
    isAnimating.value = true
    timer = setTimeout(() => {
      isAnimating.value = false
      timer = null
    }, 460)
  }

  watch(statusLabel, (n, o) => {
    if (n === 'Ultracode' && o !== 'Ultracode') playFlipUp()
    else if (n !== 'Ultracode' && o === 'Ultracode') clearAnimation()
  })

  /* ── input handler ────────────────────────── */
  function onInput(e) {
    sliderValue.value = parseInt(e.target.value, 10)
  }

  onBeforeUnmount(clearAnimation)

  return {
    sliderValue,
    isActive,
    isFull,
    isAnimating,
    statusLabel,
    onInput,
  }
}
