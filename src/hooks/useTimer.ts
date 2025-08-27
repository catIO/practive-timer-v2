import { useState, useEffect, useCallback, useRef } from 'react';
import { TimerState, TimerSettings } from '../types';
import { AudioManager } from '../utils/audio';

const defaultSettings: TimerSettings = {
  workDuration: 25,
  breakDuration: 5,
  intervals: 4,
  notificationVolume: 50,
  notificationSound: 'bell',
  beepCount: 3,
};

const STORAGE_KEY = 'pomodoro-settings';

export const useTimer = () => {
  const [state, setState] = useState<TimerState>(() => {
    const savedSettings = localStorage.getItem(STORAGE_KEY);
    const settings = savedSettings ? JSON.parse(savedSettings) : defaultSettings;
    
    return {
      timeLeft: settings.workDuration * 60,
      isRunning: false,
      isPaused: false,
      currentInterval: 1,
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

  // Request notification permission on first load
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
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

  // Show notification
  const showNotification = (title: string, body: string) => {
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
    
    // Fallback audio notification
    audioManagerRef.current.playNotification(
      state.settings.notificationSound,
      state.settings.notificationVolume,
      state.settings.beepCount
    );
  };

  const updateSettings = useCallback((newSettings: Partial<TimerSettings>) => {
    setState(prev => {
      const updatedSettings = { ...prev.settings, ...newSettings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));
      
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
    setState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      timeLeft: prev.isWorkSession ? prev.settings.workDuration * 60 : prev.settings.breakDuration * 60,
    }));
  }, []);

  const skipSession = useCallback(() => {
    setState(prev => {
      const isLastWorkSession = prev.isWorkSession && prev.currentInterval === prev.settings.intervals;
      
      if (isLastWorkSession) {
        // All sessions completed
        releaseWakeLock();
        showNotification('Pomodoro Complete!', 'All work sessions completed. Great job!');
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

      return {
        ...prev,
        isWorkSession: nextIsWork,
        currentInterval: nextInterval,
        timeLeft: nextDuration * 60,
      };
    });
  }, []);

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
            const isLastWorkSession = prev.isWorkSession && prev.currentInterval === prev.settings.intervals;
            
            if (isLastWorkSession) {
              // All sessions completed
              releaseWakeLock();
              expectedEndTimeRef.current = null;
              showNotification('Pomodoro Complete!', 'All work sessions completed. Great job!');
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

            showNotification(
              nextIsWork ? 'Work Time!' : 'Break Time!',
              nextIsWork 
                ? `Starting work session ${nextInterval} of ${prev.settings.intervals}`
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