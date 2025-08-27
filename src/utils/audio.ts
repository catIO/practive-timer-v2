export class AudioManager {
  private audioContext: AudioContext | null = null;
  private isInitialized = false;
  private isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  constructor() {
    // Don't initialize immediately - wait for user interaction
  }

  private async initAudioContext() {
    if (this.isInitialized && this.audioContext) return;
    
    try {
      // Create audio context with proper fallback for Safari
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume audio context if suspended (required for Safari)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.isInitialized = true;
      console.log('Audio context initialized successfully, state:', this.audioContext.state);
    } catch (error) {
      console.warn('Failed to initialize audio context:', error);
      this.isInitialized = false;
    }
  }

  setVolume(volume: number) {
    // Volume is handled per sound generation
  }

  async playNotification(soundType: string, volume: number, beepCount: number = 1) {
    console.log('Attempting to play notification:', { soundType, volume, beepCount, isSafari: this.isSafari });
    
    // Ensure audio context is initialized
    if (!this.isInitialized || !this.audioContext) {
      await this.initAudioContext();
    }

    if (!this.audioContext) {
      console.warn('Audio context not available');
      return;
    }

    // Resume audio context if suspended (Safari requirement)
    if (this.audioContext.state === 'suspended') {
      try {
        console.log('Resuming suspended audio context...');
        await this.audioContext.resume();
        console.log('Audio context resumed, state:', this.audioContext.state);
      } catch (error) {
        console.warn('Failed to resume audio context:', error);
        return;
      }
    }

    // For Safari, ensure we're in a running state
    if (this.audioContext.state !== 'running') {
      console.warn('Audio context not running, state:', this.audioContext.state);
      return;
    }

    console.log('Generating notification sound...');
    // Generate the notification sound
    this.generateNotificationSound(soundType, volume, beepCount);
  }

  private generateNotificationSound(type: string, volume: number, beepCount: number) {
    if (!this.audioContext) {
      console.warn('No audio context available for sound generation');
      return;
    }

    const frequencies = {
      bell: [800, 600, 400],
      chime: [523.25, 659.25, 783.99],
      beep: [440],
    };

    const freqs = frequencies[type as keyof typeof frequencies] || frequencies.bell;

    try {
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
      console.log('Sound generated successfully');
    } catch (error) {
      console.error('Error generating sound:', error);
      // Fallback to HTML5 audio for Safari
      this.playHTML5Fallback(type, volume, beepCount);
    }
  }

  private playHTML5Fallback(type: string, volume: number, beepCount: number) {
    console.log('Using HTML5 audio fallback');
    try {
      // Create a simple beep using HTML5 Audio
      const audio = new Audio();
      audio.volume = volume / 100;
      
      // Create a simple beep sound using oscillator
      const tempContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = tempContext.createOscillator();
      const gain = tempContext.createGain();
      
      osc.connect(gain);
      gain.connect(tempContext.destination);
      
      osc.frequency.setValueAtTime(440, tempContext.currentTime);
      osc.type = 'sine';
      
      gain.gain.setValueAtTime(0, tempContext.currentTime);
      gain.gain.linearRampToValueAtTime(volume / 100 * 0.1, tempContext.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, tempContext.currentTime + 0.2);
      
      osc.start(tempContext.currentTime);
      osc.stop(tempContext.currentTime + 0.2);
      
      console.log('HTML5 fallback sound played');
    } catch (error) {
      console.error('HTML5 fallback also failed:', error);
    }
  }
}