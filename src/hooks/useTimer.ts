import { useState, useEffect, useCallback, useRef } from 'react';
import { TimerState, TimerSettings } from '../types';
import { AudioManager } from '../utils/audio';

const defaultSettings: TimerSettings = {
  workDuration: 20,
  breakDuration: 5,
  intervals: 6,
  notificationVolume: 50,
  notificationSound: 'bell',
  beepCount: 3,
};

const STORAGE_KEY = 'pomodoro-settings';
const PROGRESS_STORAGE_KEY = 'pomodoro-progress';
const SETTINGS_VERSION_KEY = 'pomodoro-settings-version';
const CURRENT_VERSION = '2.0'; // Force update to new defaults

export const useTimer = () => {
  const [state, setState] = useState<TimerState>(() => {
    const savedVersion = localStorage.getItem(SETTINGS_VERSION_KEY);
    const savedSettings = localStorage.getItem(STORAGE_KEY);
    
    // Force update to new defaults if version is old
    let settings = defaultSettings;
    if (savedSettings && savedVersion === CURRENT_VERSION) {
      settings = JSON.parse(savedSettings);
    } else {
      // Clear old settings and save new defaults
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSettings));
      localStorage.setItem(SETTINGS_VERSION_KEY, CURRENT_VERSION);
    }
    
    // Check if it's a new day and load/save progress accordingly
    const today = new Date().toDateString();
    const savedProgress = localStorage.getItem(PROGRESS_STORAGE_KEY);
    let progress = { currentInterval: 1, lastDate: today };
    
    if (savedProgress) {
      const parsedProgress = JSON.parse(savedProgress);
      if (parsedProgress.lastDate === today) {
        progress = parsedProgress;
      }
    }
    
    return {
      timeLeft: settings.workDuration * 60,
      isRunning: false,
      isPaused: false,
      currentInterval: progress.currentInterval,
      isWorkSession: true,
      settings,
    };
  });

  const intervalRef = useRef<number | null>(null);
  const audioManagerRef = useRef(new AudioManager());
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number | null>(null);
  const expectedEndTimeRef = useRef<number | null>(null);

  // Request notification permission and initialize audio on first load
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // Initialize audio context on first user interaction
    const initAudio = () => {
      audioManagerRef.current.playNotification('beep', 10, 1).catch(() => {
        // Silent fail - just initializing audio context
      });
      document.removeEventListener('touchstart', initAudio);
      document.removeEventListener('click', initAudio);
    };
    
    document.addEventListener('touchstart', initAudio, { once: true });
    document.addEventListener('click', initAudio, { once: true });
    
    return () => {
      document.removeEventListener('touchstart', initAudio);
      document.removeEventListener('click', initAudio);
    };
  }, []);

  // Handle page visibility change to maintain timer accuracy
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!state.isRunning || !expectedEndTimeRef.current) {
        return;
      }

      const now = Date.now();
      const timeLeft = Math.max(0, Math.ceil((expectedEndTimeRef.current - now) / 1000));
      
      setState(prev => {
        if (timeLeft <= 0) {
          // Timer should have ended while hidden
          return { ...prev, timeLeft: 0 };
        }
        return { ...prev, timeLeft };
      });

      lastUpdateRef.current = now;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state.isRunning]);

  // Request wake lock when timer starts
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch (err) {
      console.warn('Wake lock request failed:', err);
    }
  };

  // Release wake lock
  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  // Save progress to localStorage
  const saveProgress = useCallback((currentInterval: number) => {
    const today = new Date().toDateString();
    const progress = {
      currentInterval,
      lastDate: today
    };
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  }, []);

  // Show notification
  const showNotification = async (title: string, body: string) => {
    // Try service worker notification first
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'TIMER_NOTIFICATION',
        title,
        body
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/vite.svg',
        badge: '/vite.svg',
      });
    }
    
    // Audio notification (now async for Safari compatibility)
    try {
      await audioManagerRef.current.playNotification(
        state.settings.notificationSound,
        state.settings.notificationVolume,
        state.settings.beepCount
      );
    } catch (error) {
      console.warn('Audio notification failed:', error);
    }
  };

  const updateSettings = useCallback((newSettings: Partial<TimerSettings>) => {
    setState(prev => {
      const updatedSettings = { ...prev.settings, ...newSettings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));
      localStorage.setItem(SETTINGS_VERSION_KEY, CURRENT_VERSION);
      
      const isCurrentlyRunning = prev.isRunning;
      
      return {
        ...prev,
        settings: updatedSettings,
        timeLeft: !isCurrentlyRunning ? 
          (prev.isWorkSession ? updatedSettings.workDuration : updatedSettings.breakDuration) * 60 :
          prev.timeLeft,
      };
    });
  }, []);

  const startTimer = useCallback(() => {
    requestWakeLock();
    const now = Date.now();
    startTimeRef.current = now;
    lastUpdateRef.current = now;
    expectedEndTimeRef.current = now + (state.timeLeft * 1000);
    setState(prev => ({ ...prev, isRunning: true, isPaused: false }));
  }, [state.timeLeft]);

  const pauseTimer = useCallback(() => {
    releaseWakeLock();
    setState(prev => ({ ...prev, isRunning: false, isPaused: true }));
  }, []);

  const resetTimer = useCallback(() => {
    releaseWakeLock();
    startTimeRef.current = null;
    lastUpdateRef.current = null;
    expectedEndTimeRef.current = null;
    // Reset progress for the day
    saveProgress(1);
    setState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      currentInterval: 1,
      timeLeft: prev.isWorkSession ? prev.settings.workDuration * 60 : prev.settings.breakDuration * 60,
    }));
  }, [saveProgress]);

  const skipSession = useCallback(() => {
    setState(prev => {
      const totalSessions = prev.settings.intervals * 2; // work + break sessions
      const isLastSession = prev.currentInterval === totalSessions;
      
      if (isLastSession) {
        // All sessions completed
        releaseWakeLock();
        showNotification('Pomodoro Complete!', 'All work sessions completed. Great job!');
        saveProgress(totalSessions);
        return {
          ...prev,
          isRunning: false,
          isPaused: false,
          currentInterval: 1,
          isWorkSession: true,
          timeLeft: prev.settings.workDuration * 60,
        };
      }

      const nextIsWork = !prev.isWorkSession;
      const nextInterval = nextIsWork ? prev.currentInterval + 1 : prev.currentInterval;
      const nextDuration = nextIsWork ? prev.settings.workDuration : prev.settings.breakDuration;

      // Save progress when skipping to next work session
      if (nextIsWork) {
        const workSessionNumber = Math.ceil(nextInterval / 2);
        saveProgress(nextInterval);
      }

      return {
        ...prev,
        isWorkSession: nextIsWork,
        currentInterval: nextInterval,
        timeLeft: nextDuration * 60,
      };
    });
  }, [saveProgress]);

  // Main timer effect with drift compensation
  useEffect(() => {
    if (state.isRunning) {
      const updateTimer = () => {
        if (!expectedEndTimeRef.current) return;
        
        const now = Date.now();
        const timeLeft = Math.max(0, Math.ceil((expectedEndTimeRef.current - now) / 1000));
        lastUpdateRef.current = now;

        setState(prev => {
          if (timeLeft <= 0) {
            const totalSessions = prev.settings.intervals * 2; // work + break sessions
            const isLastSession = prev.currentInterval === totalSessions;
            
            if (isLastSession) {
              // All sessions completed
              releaseWakeLock();
              expectedEndTimeRef.current = null;
              showNotification('Pomodoro Complete!', 'All work sessions completed. Great job!');
              // Save progress as completed for the day
              saveProgress(totalSessions);
              return {
                ...prev,
                isRunning: false,
                isPaused: false,
                currentInterval: 1,
                isWorkSession: true,
                timeLeft: prev.settings.workDuration * 60,
              };
            }

            // Move to next session
            const nextIsWork = !prev.isWorkSession;
            const nextInterval = nextIsWork ? prev.currentInterval + 1 : prev.currentInterval;
            const nextDuration = nextIsWork ? prev.settings.workDuration : prev.settings.breakDuration;

            // Update expected end time for next session
            expectedEndTimeRef.current = now + (nextDuration * 60 * 1000);

            // Save progress when moving to next work session
            if (nextIsWork) {
              const workSessionNumber = Math.ceil(nextInterval / 2);
              saveProgress(nextInterval);
            }

            showNotification(
              nextIsWork ? 'Work Time!' : 'Break Time!',
              nextIsWork 
                ? `Starting work session ${Math.ceil(nextInterval / 2)} of ${prev.settings.intervals}`
                : `Take a ${prev.settings.breakDuration} minute break`
            );

            return {
              ...prev,
              isWorkSession: nextIsWork,
              currentInterval: nextInterval,
              timeLeft: nextDuration * 60,
            };
          }

          return { ...prev, timeLeft };
        });
      };

      // Initial update
      updateTimer();
      
      // Use setTimeout for more accurate timing
      const scheduleNextUpdate = () => {
        intervalRef.current = setTimeout(() => {
          updateTimer();
          if (state.isRunning) {
            scheduleNextUpdate();
          }
        }, 1000);
      };
      
      scheduleNextUpdate();
    } else {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.isRunning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      releaseWakeLock();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    state,
    updateSettings,
    startTimer,
    pauseTimer,
    resetTimer,
    skipSession,
  };
};