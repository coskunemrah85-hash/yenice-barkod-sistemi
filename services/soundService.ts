/**
 * Plays a short, non-intrusive sound to notify the user of an error or important alert.
 * This uses the Web Audio API to generate a sound dynamically, avoiding the need for audio files.
 */
export const playErrorSound = () => {
  try {
    // Create an audio context, checking for browser compatibility.
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    if (!audioContext) {
      // Silently fail if the browser doesn't support the Web Audio API.
      console.warn("Web Audio API is not supported in this browser.");
      return;
    }

    // Create an oscillator for the sound wave and a gain node to control the volume.
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    // Connect the nodes: Oscillator -> Gain -> Speakers
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // --- Configure the sound ---
    // A short, descending "bloop" is a common UX pattern for negative feedback.
    oscillator.type = 'triangle'; // A softer, more pleasant tone than sine or square waves.
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // Set initial volume (0.0 to 1.0).
    
    // Start at a higher pitch (C5 note) and quickly ramp down to a lower one (C4).
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); 
    oscillator.frequency.exponentialRampToValueAtTime(261.63, audioContext.currentTime + 0.15);

    // Fade out the sound quickly to make it a short "bloop".
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.15);
    
    // Start the sound now and stop it after 0.15 seconds.
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch (e) {
    // Catch any unexpected errors during audio playback.
    console.error("Could not play error sound:", e);
  }
};
