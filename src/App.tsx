import React, { useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { useTimer } from './hooks/useTimer';
import { TimerDisplay } from './components/TimerDisplay';
import { Settings } from './components/Settings';

function App() {
  const { state, updateSettings, startTimer, pauseTimer, resetTimer, skipSession } = useTimer();
  const [showSettings, setShowSettings] = useState(false);

  const totalTime = state.isWorkSession 
    ? state.settings.workDuration * 60 
    : state.settings.breakDuration * 60;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="relative p-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Practice Timer
            </h1>
            <p className="text-gray-300 text-lg">
              Focus. Work. Break. Repeat.
            </p>
          </div>
          
          <button
            onClick={() => setShowSettings(true)}
            className="p-4 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            title="Settings"
          >
            <SettingsIcon size={24} className="text-gray-200" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="px-6 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800 border border-gray-700 rounded-3xl shadow-2xl p-8 md:p-12">
            <TimerDisplay
              timeLeft={state.timeLeft}
              totalTime={totalTime}
              isRunning={state.isRunning}
              isPaused={state.isPaused}
              isWorkSession={state.isWorkSession}
              currentInterval={state.currentInterval}
              totalIntervals={state.settings.intervals}
              onStart={startTimer}
              onPause={pauseTimer}
              onReset={resetTimer}
              onSkip={skipSession}
            />
          </div>

          {/* Additional info */}
          <div className="mt-8 text-center">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">
                Today's Progress
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400">
                    {Math.max(0, Math.ceil(state.currentInterval / 2) - 1)}
                  </div>
                  <div className="text-sm text-gray-400 font-medium uppercase tracking-wide">
                    Completed
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-400">
                    {Math.ceil(state.currentInterval / 2)}
                  </div>
                  <div className="text-sm text-gray-400 font-medium uppercase tracking-wide">
                    Current
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-500">
                    {state.settings.intervals}
                  </div>
                  <div className="text-sm text-gray-400 font-medium uppercase tracking-wide">
                    Goal
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Settings modal */}
      <Settings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={state.settings}
        onUpdateSettings={updateSettings}
      />
    </div>
  );
}

export default App;