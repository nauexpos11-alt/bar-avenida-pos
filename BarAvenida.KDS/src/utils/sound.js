let ctx = null

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function unlockAudio() {
  getCtx()
}

export function playBeep() {
  try {
    const ac = getCtx()
    const t = ac.currentTime
    const tones = [
      [880, 0,    0.13],
      [880, 0.18, 0.13],
      [1100, 0.38, 0.22],
    ]
    tones.forEach(([freq, delay, dur]) => {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain)
      gain.connect(ac.destination)
      osc.type = 'square'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.12, t + delay)
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + dur)
      osc.start(t + delay)
      osc.stop(t + delay + dur)
    })
  } catch (e) {
    console.warn('Audio no disponible:', e)
  }
}

// Fanfarria triunfal — al llegar a 0 pendientes
export function playFanfarria() {
  try {
    const ac = getCtx()
    const t = ac.currentTime
    // Acorde mayor ascendente C5 -> E5 -> G5 -> C6
    const tones = [
      [523.25, 0.00, 0.18],
      [659.25, 0.16, 0.18],
      [783.99, 0.32, 0.22],
      [1046.50, 0.50, 0.55],
    ]
    tones.forEach(([freq, delay, dur]) => {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain)
      gain.connect(ac.destination)
      osc.type = 'triangle'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t + delay)
      gain.gain.exponentialRampToValueAtTime(0.18, t + delay + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + dur)
      osc.start(t + delay)
      osc.stop(t + delay + dur)
    })
  } catch (e) {
    console.warn('Audio no disponible:', e)
  }
}
