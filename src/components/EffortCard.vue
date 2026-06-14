<template>
  <svg class="squircle-clip" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <clipPath :id="clipId" clipPathUnits="objectBoundingBox">
        <path
          d="M 0.053,0
             C 0.029,0 0.012,0.008 0.005,0.02
             C 0.002,0.028 0,0.038 0,0.053
             L 0,0.947
             C 0,0.962 0.002,0.972 0.005,0.98
             C 0.012,0.992 0.029,1 0.053,1
             L 0.947,1
             C 0.971,1 0.988,0.992 0.995,0.98
             C 0.998,0.972 1,0.962 1,0.947
             L 1,0.053
             C 1,0.038 0.998,0.028 0.995,0.02
             C 0.988,0.008 0.971,0 0.947,0
             Z"
        />
      </clipPath>
      <clipPath :id="clipTrackId" clipPathUnits="objectBoundingBox">
        <path
          d="M 0.033,0
             C 0.018,0 0.007,0.012 0.003,0.035
             C 0.001,0.055 0,0.1 0,0.15
             L 0,0.85
             C 0,0.9 0.001,0.945 0.003,0.965
             C 0.007,0.988 0.018,1 0.033,1
             L 0.967,1
             C 0.982,1 0.993,0.988 0.997,0.965
             C 0.999,0.945 1,0.9 1,0.85
             L 1,0.15
             C 1,0.1 0.999,0.055 0.997,0.035
             C 0.993,0.012 0.982,0 0.967,0
             Z"
        />
      </clipPath>
    </defs>
  </svg>

  <div class="card-shadow">
    <div class="card" :style="cardClip">
      <div class="header">
        <div class="header-left">
          <span class="label-text">Effort</span>
          <span
            class="status-text"
            :class="{ glowing: isActive, 'animate-up': isAnimating }"
          >
            {{ statusLabel }}
          </span>
        </div>
        <div class="help-btn">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
               stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
            />
          </svg>
        </div>
      </div>

      <div class="scale-labels">
        <span>Faster</span>
        <span>Smarter</span>
      </div>

      <div class="track-wrapper"
           :class="{ active: isActive, full: isFull }"
           :style="trackClip">
        <div class="track-bg"></div>
        <div class="dots-layer">
          <span class="dot" v-for="i in 5" :key="i"></span>
        </div>
        <canvas ref="canvasRef" :style="canvasMask"></canvas>
        <input
          type="range" min="0" max="100"
          :value="sliderValue"
          :class="{ glowing: isActive }"
          @input="onInput"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSliderState } from './composables/useSliderState'
import { useWebglFire } from './composables/useWebglFire'

/* ── slider state ─────────────────────────── */
const { sliderValue, isActive, isFull, isAnimating, statusLabel, onInput } =
  useSliderState()

/* ── clip-path IDs ────────────────────────── */
const uid = Math.random().toString(36).slice(2, 8)
const clipId = `squircle-${uid}`
const clipTrackId = `squircle-track-${uid}`

const cardClip = computed(() => ({ clipPath: `url(#${clipId})` }))
const trackClip = computed(() => ({ clipPath: `url(#${clipTrackId})` }))

const canvasMask = computed(() => {
  const p = Math.min(sliderValue.value + 2, 100)
  return {
    maskImage: `linear-gradient(to right, black 0%, black ${p}%, transparent ${p}%)`,
    WebkitMaskImage: `linear-gradient(to right, black 0%, black ${p}%, transparent ${p}%)`,
  }
})

/* ── webgl engine ─────────────────────────── */
const canvasRef = ref(null)
useWebglFire(canvasRef, sliderValue, isActive)
</script>

<style scoped>
.squircle-clip {
  position: absolute;
  width: 0;
  height: 0;
  pointer-events: none;
}

.card-shadow {
  filter: drop-shadow(0 12px 28px rgba(0, 0, 0, 0.2))
    drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1));
  transition: filter 0.2s ease;
}

.card {
  background: #000000;
  width: 376px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  padding: 18px 20px 16px;
  user-select: none;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 16px;
  font-weight: 500;
  perspective: 280px;
  perspective-origin: center 120%;
}

.label-text {
  color: #b0b0c7;
  font-weight: 700;
  line-height: 1.3;
}

.status-text {
  display: inline-block;
  color: #a1a1aa;
  transition: color 0.3s, text-shadow 0.3s;
  will-change: transform, opacity, filter;
  vertical-align: middle;
  transform-origin: center bottom;
  transform: rotateX(0deg) translateY(0);
}

.status-text.glowing {
  color: #c084fc;
  text-shadow: 0 0 12px rgba(168, 85, 247, 0.6);
  font-weight: 600;
}

@keyframes flipUpFromBottom {
  0% {
    opacity: 0;
    transform: translateY(18px) rotateX(-80deg);
    filter: blur(4px);
  }
  100% {
    opacity: 1;
    transform: translateY(0) rotateX(0deg);
    filter: blur(0);
  }
}

.status-text.animate-up {
  animation: flipUpFromBottom 0.42s cubic-bezier(0.33, 1, 0.68, 1) forwards;
}

.help-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #a1a1aa;
  transition: color 0.2s;
  line-height: 1;
  padding: 0;
}

.help-btn:hover { color: #d4d4d8; }

.help-btn svg {
  height: 18px;
  width: auto;
  display: block;
  flex-shrink: 0;
  shape-rendering: geometricPrecision;
}

.scale-labels {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 800;
  color: #b0b0b8;
  margin-bottom: 7px;
  letter-spacing: 0.04em;
}

/* ── track ─────────────────────────────────── */
.track-wrapper {
  position: relative;
  height: 30px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #1a1a1e;
  background: #0c0c0c;
  isolation: isolate;
}

.track-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #111113, #0a0a0b);
  z-index: 0;
}

/* FIX: opacity 代替 display:none，保证 canvas 始终有布局尺寸 */
canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: 0;
  mix-blend-mode: screen;
  z-index: 2;
  transition: opacity 0.3s;
}

.track-wrapper.active canvas {
  opacity: 1;
  z-index: 4;
}

.dots-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.dot {
  position: absolute;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #222225;
  top: 50%;
  transform: translateY(-50%);
  transition: opacity 0.6s;
}

.track-wrapper.active .dot { opacity: 0.25; }
.track-wrapper.full .dot { opacity: 0; }

.dot:nth-child(1) { left: 10%; }
.dot:nth-child(2) { left: 30%; }
.dot:nth-child(3) { left: 50%; }
.dot:nth-child(4) { left: 70%; }
.dot:nth-child(5) { left: 90%; }

/* ── range input ───────────────────────────── */
input[type='range'] {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background: transparent;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
  z-index: 5;
  outline: none;
  margin: 0;
  padding: 0;
}

input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 29px;
  height: 29px;
  border-radius: 10px;
  background: linear-gradient(170deg, #ffffff 0%, #f0f0f2 40%, #e4e4e6 100%);
  border: 0.5px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 0.5px 1px rgba(0, 0, 0, 0.18),
    0 2px 6px rgba(0, 0, 0, 0.25), 0 6px 16px rgba(0, 0, 0, 0.12),
    inset 0 0.5px 0 rgba(255, 255, 255, 0.85),
    inset 0 -0.5px 0 rgba(0, 0, 0, 0.06);
  cursor: grab;
  transition: box-shadow 0.4s ease, transform 0.15s ease;
}

input[type='range']::-webkit-slider-thumb:active {
  cursor: grabbing;
  transform: scale(0.95);
  box-shadow: 0 0.5px 1px rgba(0, 0, 0, 0.2),
    0 1px 3px rgba(0, 0, 0, 0.3), 0 3px 8px rgba(0, 0, 0, 0.15),
    inset 0 0.5px 0 rgba(255, 255, 255, 0.7),
    inset 0 -1px 0 rgba(0, 0, 0, 0.08);
}

input[type='range'].glowing::-webkit-slider-thumb {
  box-shadow: 0 0.5px 1px rgba(0, 0, 0, 0.18),
    0 2px 6px rgba(0, 0, 0, 0.25), 0 6px 16px rgba(0, 0, 0, 0.12),
    0 0 28px rgba(168, 85, 247, 0.5),
    0 0 50px rgba(168, 85, 247, 0.25),
    inset 0 0.5px 0 rgba(255, 255, 255, 0.85),
    inset 0 -0.5px 0 rgba(0, 0, 0, 0.06);
}

input[type='range'].glowing::-webkit-slider-thumb:active {
  box-shadow: 0 0.5px 1px rgba(0, 0, 0, 0.2),
    0 1px 3px rgba(0, 0, 0, 0.3), 0 3px 8px rgba(0, 0, 0, 0.15),
    0 0 32px rgba(168, 85, 247, 0.55),
    0 0 56px rgba(168, 85, 247, 0.3),
    inset 0 0.5px 0 rgba(255, 255, 255, 0.7),
    inset 0 -1px 0 rgba(0, 0, 0, 0.08);
}

input[type='range']::-moz-range-thumb {
  width: 26px;
  height: 26px;
  border-radius: 9px;
  background: linear-gradient(170deg, #ffffff 0%, #f0f0f2 40%, #e4e4e6 100%);
  border: 0.5px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 0.5px 1px rgba(0, 0, 0, 0.18),
    0 2px 6px rgba(0, 0, 0, 0.25), 0 6px 16px rgba(0, 0, 0, 0.12);
  cursor: grab;
  transition: box-shadow 0.4s ease;
}

input[type='range']::-moz-range-thumb:active {
  cursor: grabbing;
  transform: scale(0.95);
}

/* FIX: Firefox 也加上 glow 和 active 态 */
input[type='range'].glowing::-moz-range-thumb {
  box-shadow: 0 0.5px 1px rgba(0, 0, 0, 0.18),
    0 2px 6px rgba(0, 0, 0, 0.25), 0 6px 16px rgba(0, 0, 0, 0.12),
    0 0 28px rgba(168, 85, 247, 0.5),
    0 0 50px rgba(168, 85, 247, 0.25);
}

input[type='range'].glowing::-moz-range-thumb:active {
  box-shadow: 0 0.5px 1px rgba(0, 0, 0, 0.2),
    0 1px 3px rgba(0, 0, 0, 0.3), 0 3px 8px rgba(0, 0, 0, 0.15),
    0 0 32px rgba(168, 85, 247, 0.55),
    0 0 56px rgba(168, 85, 247, 0.3);
}

input[type='range']::-moz-range-track {
  background: transparent;
  border: none;
  height: 30px;
}
</style>
