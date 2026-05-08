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
