import React from 'react';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';
import { CircularProgress } from './CircularProgress';

interface TimerDisplayProps {
  timeLeft: number;
  totalTime: number;
  isRunning: boolean;
  isPaused: boolean;
  isWorkSession: boolean;
  currentInterval: number;
  totalIntervals: number;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSkip: () => void;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  timeLeft,
  totalTime,
  isRunning,
  isPaused,
  isWorkSession,
  currentInterval,
  totalIntervals,
  onStart,
  onPause,
  onReset,
  onSkip,
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
  const sessionType = isWorkSession ? 'Work' : 'Break';
  const sessionColor = isWorkSession ? 'text-red-400' : 'text-emerald-400';

  return (
    <div className="flex flex-col items-center space-y-8">
      {/* Session info */}
      <div className="text-center space-y-2">
        <h2 className={`text-2xl md:text-3xl font-bold ${sessionColor} transition-colors duration-300`}>
          {sessionType} Session
        </h2>
        <p className="text-gray-300 text-lg">
          {currentInterval} of {totalIntervals} intervals
        </p>
      </div>

      {/* Circular timer */}
      <div className="relative">
        <CircularProgress
          progress={progress}
          isWorkSession={isWorkSession}
          className="drop-shadow-lg"
        />
        
        {/* Time display overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl md:text-6xl font-mono font-bold text-white mb-2">
              {formatTime(timeLeft)}
            </div>
            <div className={`text-sm font-medium uppercase tracking-wide ${sessionColor}`}>
              {isRunning ? 'Running' : isPaused ? 'Paused' : 'Ready'}
            </div>
          </div>
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onReset}
          className="p-4 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-full transition-colors duration-200 shadow-md hover:shadow-lg"
          title="Reset"
        >
          <RotateCcw size={24} className="text-gray-200" />
        </button>

        <button
          onClick={isRunning ? onPause : onStart}
          className={`p-6 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 ${
            isRunning
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
          title={isRunning ? 'Pause' : 'Start'}
        >
          {isRunning ? <Pause size={32} /> : <Play size={32} />}
        </button>

        <button
          onClick={onSkip}
          className="p-4 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-full transition-colors duration-200 shadow-md hover:shadow-lg"
          title="Skip Session"
        >
          <SkipForward size={24} className="text-gray-200" />
        </button>
      </div>
    </div>
  );
};