import { watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { VERT, FRAG_SIM, FRAG_BLUR, FRAG_COMP } from '../shaders/index.js'

export function useWebglFire(canvasRef, sliderValue, isActive) {
  /* ── internal state ───────────────────────── */
  let gl = null
  let canvasEl = null
  let rafId = null
  let resizeObserver = null
  let resizeDebounce = null

  let loopRunning = false
  let idleFrames = 0
  let wasActive = false
  let ultraStart = null

  const MAX_IDLE = 180

  let simProg = null, blurProg = null, compProg = null
  let vao = null, vbo = null
  let programsReady = false

  let simA = null, simB = null, blurH = null, blurV = null

  const U = {
    simTime: null, simSlider: null, simElapsed: null, simBack: null,
    blurDir: null, blurExt: null, blurTex: null, blurRes: null,
    compScene: null, compGlow: null,
  }

  /* ── cached reactive values (no per-frame tracking) ─── */
  let cachedActive = false
  let cachedSlider = 0.7

  watch(isActive, v => { cachedActive = v }, { immediate: true })
  watch(sliderValue, v => { cachedSlider = v / 100 }, { immediate: true })

  watch(isActive, now => {
    if (now && ultraStart == null) ultraStart = performance.now()
    else if (!now) ultraStart = null
    if (now) ensureLoop()
  }, { flush: 'post' })

  /* ── lifecycle ────────────────────────────── */
  onMounted(() => nextTick(init))

  onBeforeUnmount(() => {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null }
    if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null }
    if (resizeDebounce) { clearTimeout(resizeDebounce); resizeDebounce = null }
    loopRunning = false
    destroyFBOs()
    destroyPrograms()
    if (canvasEl) {
      canvasEl.removeEventListener('webglcontextlost', onContextLost)
      canvasEl.removeEventListener('webglcontextrestored', onContextRestored)
    }
    gl = null
    canvasEl = null
  })

  /* ── context event handlers ───────────────── */
  function onContextLost(e) { e.preventDefault() }
  function onContextRestored() {
    programsReady = false
    compilePrograms()
    if (programsReady) {
      resize()
      if (cachedActive) ensureLoop()
    }
  }

  /* ── initialization ───────────────────────── */
  function init() {
    const canvas = canvasRef.value
    if (!canvas) return

    const ctx = canvas.getContext('webgl2', {
      preserveDrawingBuffer: false,
      antialias: false,
    })
    if (!ctx) { console.warn('WebGL2 not supported'); return }

    gl = ctx
    canvasEl = canvas
    canvas.addEventListener('webglcontextlost', onContextLost)
    canvas.addEventListener('webglcontextrestored', onContextRestored)

    compilePrograms()
    if (!programsReady) return

    resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeDebounce)
      resizeDebounce = setTimeout(resize, 80)
    })
    resizeObserver.observe(canvas)

    // initial size
    resize()
  }

  function resize() {
    if (!gl || !canvasEl) return
    const rect = canvasEl.getBoundingClientRect()
    if (!rect.width || !rect.height) return

    const dpr = window.devicePixelRatio
    canvasEl.width = Math.round(rect.width * dpr)
    canvasEl.height = Math.round(rect.height * dpr)

    destroyFBOs()
    createFBOs()
  }

  /* ── program compilation ──────────────────── */
  function compileShader(type, src) {
    const sh = gl.createShader(type)
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(sh))
      gl.deleteShader(sh)
      return null
    }
    return sh
  }

  function linkProgram(vsSrc, fsSrc) {
    const v = compileShader(gl.VERTEX_SHADER, vsSrc)
    const f = compileShader(gl.FRAGMENT_SHADER, fsSrc)
    if (!v || !f) return null
    const p = gl.createProgram()
    gl.attachShader(p, v)
    gl.attachShader(p, f)
    gl.bindAttribLocation(p, 0, 'a_pos')
    gl.linkProgram(p)
    gl.deleteShader(v)
    gl.deleteShader(f)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(p))
      return null
    }
    return p
  }

  function compilePrograms() {
    if (!gl) return

    simProg = linkProgram(VERT, FRAG_SIM)
    blurProg = linkProgram(VERT, FRAG_BLUR)
    compProg = linkProgram(VERT, FRAG_COMP)
    if (!simProg || !blurProg || !compProg) return

    vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    vbo = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
    ]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

    U.simTime = gl.getUniformLocation(simProg, 'u_time')
    U.simSlider = gl.getUniformLocation(simProg, 'u_slider')
    U.simElapsed = gl.getUniformLocation(simProg, 'u_elapsed')
    U.simBack = gl.getUniformLocation(simProg, 'u_back')
    U.blurDir = gl.getUniformLocation(blurProg, 'u_dir')
    U.blurExt = gl.getUniformLocation(blurProg, 'u_ext')
    U.blurTex = gl.getUniformLocation(blurProg, 'u_tex')
    U.blurRes = gl.getUniformLocation(blurProg, 'u_res')
    U.compScene = gl.getUniformLocation(compProg, 'u_scene')
    U.compGlow = gl.getUniformLocation(compProg, 'u_glow')

    programsReady = true
  }

  /* ── FBO helpers ──────────────────────────── */
  function makeFBO() {
    const fbo = gl.createFramebuffer()
    const tex = gl.createTexture()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
      canvasEl.width, canvasEl.height, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D, tex, 0)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    return { fbo, tex }
  }

  function createFBOs() {
    if (!gl || !canvasEl) return
    simA = makeFBO()
    simB = makeFBO()
    blurH = makeFBO()
    blurV = makeFBO()
  }

  function destroyFBO(entry) {
    if (!gl || !entry) return
    gl.deleteFramebuffer(entry.fbo)
    gl.deleteTexture(entry.tex)
  }

  function destroyFBOs() {
    destroyFBO(simA); simA = null
    destroyFBO(simB); simB = null
    destroyFBO(blurH); blurH = null
    destroyFBO(blurV); blurV = null
  }

  function destroyPrograms() {
    if (!gl) return
    if (simProg) { gl.deleteProgram(simProg); simProg = null }
    if (blurProg) { gl.deleteProgram(blurProg); blurProg = null }
    if (compProg) { gl.deleteProgram(compProg); compProg = null }
    if (vao) { gl.deleteVertexArray(vao); vao = null }
    if (vbo) { gl.deleteBuffer(vbo); vbo = null }
    programsReady = false
  }

  /* ── render loop ──────────────────────────── */
  function ensureLoop() {
    if (!simA || !simB) {
      resize()
      if (!simA || !simB) return
    }
    if (loopRunning) { idleFrames = 0; return }

    loopRunning = true
    idleFrames = 0
    wasActive = false

    gl.bindFramebuffer(gl.FRAMEBUFFER, simA.fbo)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.bindFramebuffer(gl.FRAMEBUFFER, simB.fbo)
    gl.clear(gl.COLOR_BUFFER_BIT)

    rafId = requestAnimationFrame(render)
  }

  function render(t) {
    const active = cachedActive

    if (!active && !wasActive) {
      if (++idleFrames > MAX_IDLE) {
        loopRunning = false
        rafId = null
        return
      }
      rafId = requestAnimationFrame(render)
      return
    }

    idleFrames = 0

    if (active && !wasActive) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, simA.fbo)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.bindFramebuffer(gl.FRAMEBUFFER, simB.fbo)
      gl.clear(gl.COLOR_BUFFER_BIT)
    }
    wasActive = active

    const elapsed = active
      ? (performance.now() - (ultraStart || 0)) / 1000
      : -1.0
    const sv = cachedSlider

    gl.viewport(0, 0, canvasEl.width, canvasEl.height)

    // ── pass 1: simulation ──
    gl.bindFramebuffer(gl.FRAMEBUFFER, simB.fbo)
    gl.useProgram(simProg)
    gl.uniform1f(U.simTime, t * 0.001)
    gl.uniform1f(U.simSlider, sv)
    gl.uniform1f(U.simElapsed, elapsed)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, simA.tex)
    gl.uniform1i(U.simBack, 0)
    gl.drawArrays(gl.TRIANGLES, 0, 6)

    // ── pass 2: horizontal blur ──
    gl.useProgram(blurProg)
    gl.uniform2f(U.blurRes, canvasEl.width, canvasEl.height)
    gl.bindFramebuffer(gl.FRAMEBUFFER, blurH.fbo)
    gl.uniform2f(U.blurDir, 1.0, 0.0)
    gl.uniform1f(U.blurExt, 1.0)
    gl.bindTexture(gl.TEXTURE_2D, simB.tex)
    gl.uniform1i(U.blurTex, 0)
    gl.drawArrays(gl.TRIANGLES, 0, 6)

    // ── pass 3: vertical blur ──
    gl.bindFramebuffer(gl.FRAMEBUFFER, blurV.fbo)
    gl.uniform2f(U.blurDir, 0.0, 1.0)
    gl.uniform1f(U.blurExt, 0.0)
    gl.bindTexture(gl.TEXTURE_2D, blurH.tex)
    gl.drawArrays(gl.TRIANGLES, 0, 6)

    // ── pass 4: composite ──
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.useProgram(compProg)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, simB.tex)
    gl.uniform1i(U.compScene, 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, blurV.tex)
    gl.uniform1i(U.compGlow, 1)
    gl.drawArrays(gl.TRIANGLES, 0, 6)

    // ping-pong swap
    const tmp = simA; simA = simB; simB = tmp

    rafId = requestAnimationFrame(render)
  }
}
