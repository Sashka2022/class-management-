let audioContext;

// Unlock audio during the click, then play only after the change is saved.
export function prepareFeedbackSound(kind) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return () => {};
    if (!audioContext || audioContext.state === "closed")
      audioContext = new AudioContext();
    const context = audioContext;
    const ready =
      context.state === "running"
        ? Promise.resolve(true)
        : context.resume().then(
            () => true,
            () => false,
          );
    return () => {
      void ready
        .then((unlocked) => {
          if (!unlocked || context.state !== "running") return;
          const notes =
            kind === "heart"
              ? [
                  [659.25, 0, 0.12],
                  [880, 0.12, 0.18],
                ]
              : [
                  [293.66, 0, 0.13],
                  [220, 0.19, 0.17],
                ];
          const start = context.currentTime + 0.01;
          for (const [frequency, delay, duration] of notes) {
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.type = kind === "heart" ? "sine" : "triangle";
            oscillator.frequency.setValueAtTime(frequency, start + delay);
            gain.gain.setValueAtTime(0, start + delay);
            gain.gain.linearRampToValueAtTime(0.12, start + delay + 0.015);
            gain.gain.exponentialRampToValueAtTime(
              0.001,
              start + delay + duration,
            );
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.onended = () => {
              oscillator.disconnect();
              gain.disconnect();
            };
            oscillator.start(start + delay);
            oscillator.stop(start + delay + duration + 0.01);
          }
        })
        .catch(() => {});
    };
  } catch {
    // A muted or unsupported device must not prevent classroom actions.
    return () => {};
  }
}
