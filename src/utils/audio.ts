export class AudioManager {
  private audio: HTMLAudioElement | null = null;

  constructor() {
    this.audio = new Audio();
  }

  setVolume(volume: number) {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume / 100));
    }
  }

  playNotification(soundType: string, volume: number, beepCount: number = 1) {
    if (this.audio) {
      this.setVolume(volume);
      // Using Web Audio API to generate notification sounds
      this.generateNotificationSound(soundType, volume, beepCount);
    }
    
    // Also try to play a simple audio file for better background support
    try {
      const audio = new Audio();
      audio.volume = volume / 100;
      // Create a simple beep using oscillator
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
    } catch (error) {
      console.warn('Audio playback failed:', error);
    }
  }

  private generateNotificationSound(type: string, volume: number, beepCount: number) {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    const frequencies = {
      bell: [800, 600, 400],
      chime: [523.25, 659.25, 783.99],
      beep: [440],
    };

    const freqs = frequencies[type as keyof typeof frequencies] || frequencies.bell;

    // Play the specified number of beeps
    for (let beepIndex = 0; beepIndex < beepCount; beepIndex++) {
      const beepStartTime = audioContext.currentTime + beepIndex * 0.6; // 600ms between beeps
      
      freqs.forEach((freq, index) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(audioContext.destination);
        
        osc.frequency.setValueAtTime(freq, beepStartTime);
        osc.type = 'sine';
        
        const startTime = beepStartTime + index * 0.1;
        const endTime = startTime + 0.2;
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume / 100 * 0.2, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, endTime);
        
        osc.start(startTime);
        osc.stop(endTime);
      });
    }
  }
}