/**
 * In-app Ringtone & Chime Sound Synthesizer
 * Plays high-fidelity audio chimes for incoming ride requests and notifications.
 */

export function playIncomingRideRingtone() {
  try {
    const AudioCtx = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Polyphonic incoming ride alert chime (Tri-tone bell sequence repeating twice)
    const notes = [
      { freq: 587.33, start: 0.0, dur: 0.15 },  // D5
      { freq: 739.99, start: 0.18, dur: 0.15 }, // F#5
      { freq: 880.00, start: 0.36, dur: 0.30 }, // A5
      { freq: 587.33, start: 0.8, dur: 0.15 },  // D5
      { freq: 739.99, start: 0.98, dur: 0.15 }, // F#5
      { freq: 880.00, start: 1.16, dur: 0.40 }, // A5
    ];

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.3, now + start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + dur);
    });
  } catch (err) {
    // Graceful fallback
  }
}

export function playSuccessChime() {
  try {
    const AudioCtx = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Upbeat success ding
    const notes = [
      { freq: 523.25, start: 0.0, dur: 0.15 }, // C5
      { freq: 659.25, start: 0.12, dur: 0.15 }, // E5
      { freq: 783.99, start: 0.24, dur: 0.35 }, // G5
      { freq: 1046.50, start: 0.36, dur: 0.50 } // C6
    ];

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.25, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + dur);
    });
  } catch (err) {
    // Graceful fallback
  }
}
