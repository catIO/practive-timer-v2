export interface TimerSettings {
  workDuration: number; // in minutes
  breakDuration: number; // in minutes
  intervals: number;
  notificationVolume: number; // 0-100
  notificationSound: string;
  beepCount: number; // number of beeps to play
}

export interface TimerState {
  timeLeft: number; // in seconds
  isRunning: boolean;
  isPaused: boolean;
  currentInterval: number;
  isWorkSession: boolean;
  settings: TimerSettings;
}

export type SessionType = 'work' | 'break';