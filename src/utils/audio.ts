export class AudioManager {
  private audioContext: AudioContext | null = null;
  private isInitialized = false;

  constructor() {
    // Initialize audio context on first user interaction
    this.initAudioContext();
  }

  private async initAudioContext() {
    if (this.isInitialized) return;
    
    try {
      // Create audio context with proper fallback for Safari
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume audio context if suspended (required for Safari)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.isInitialized = true;
      console.log('Audio context initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize audio context:', error);
    }
  }

  setVolume(volume: number) {
    // Volume is handled per sound generation
  }

  async playNotification(soundType: string, volume: number, beepCount: number = 1) {
    // Ensure audio context is initialized
    if (!this.isInitialized) {
      await this.initAudioContext();
    }

    if (!this.audioContext) {
      console.warn('Audio context not available');
      return;
    }

    // Resume audio context if suspended (Safari requirement)
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (error) {
        console.warn('Failed to resume audio context:', error);
        return;
      }
    }

    // Generate the notification sound
    this.generateNotificationSound(soundType, volume, beepCount);
  }

  private generateNotificationSound(type: string, volume: number, beepCount: number) {
    if (!this.audioContext) return;

    const frequencies = {
      bell: [800, 600, 400],
      chime: [523.25, 659.25, 783.99],
      beep: [440],
    };

    const freqs = frequencies[type as keyof typeof frequencies] || frequencies.bell;

    // Play the specified number of beeps
    for (let beepIndex = 0; beepIndex < beepCount; beepIndex++) {
      const beepStartTime = this.audioContext.currentTime + beepIndex * 0.6; // 600ms between beeps
      
      freqs.forEach((freq, index) => {
        const osc = this.audioContext!.createOscillator();
        const gain = this.audioContext!.createGain();
        
        osc.connect(gain);
        gain.connect(this.audioContext!.destination);
        
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