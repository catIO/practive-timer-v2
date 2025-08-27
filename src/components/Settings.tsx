import React from 'react';
import { X, Volume2 } from 'lucide-react';
import { TimerSettings } from '../types';
import { AudioManager } from '../utils/audio';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TimerSettings;
  onUpdateSettings: (settings: Partial<TimerSettings>) => void;
}

export const Settings: React.FC<SettingsProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const audioManager = React.useRef(new AudioManager());

  if (!isOpen) return null;

  const soundOptions = [
    { value: 'bell', label: 'Bell' },
    { value: 'chime', label: 'Chime' },
    { value: 'beep', label: 'Beep' },
  ];

  const playPreviewSound = () => {
    audioManager.current.playNotification(
      settings.notificationSound,
      settings.notificationVolume,
      settings.beepCount
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 border border-gray-600 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-600">
          <h2 className="text-2xl font-bold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-full transition-colors duration-200"
          >
            <X size={24} className="text-gray-300" />
          </button>
        </div>

        {/* Settings content */}
        <div className="p-6 space-y-8">
          {/* Work Duration */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-300 uppercase tracking-wide">
              Work Duration
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="1"
                max="60"
                value={settings.workDuration}
                onChange={(e) => onUpdateSettings({ workDuration: parseInt(e.target.value) })}
                className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider-dark"
              />
              <span className="min-w-[4rem] text-lg font-medium text-white">
                {settings.workDuration} min
              </span>
            </div>
          </div>

          {/* Break Duration */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-300 uppercase tracking-wide">
              Break Duration
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="1"
                max="30"
                value={settings.breakDuration}
                onChange={(e) => onUpdateSettings({ breakDuration: parseInt(e.target.value) })}
                className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider-dark"
              />
              <span className="min-w-[4rem] text-lg font-medium text-white">
                {settings.breakDuration} min
              </span>
            </div>
          </div>

          {/* Intervals */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-300 uppercase tracking-wide">
              Work/Break Intervals
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="1"
                max="10"
                value={settings.intervals}
                onChange={(e) => onUpdateSettings({ intervals: parseInt(e.target.value) })}
                className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider-dark"
              />
              <span className="min-w-[4rem] text-lg font-medium text-white">
                {settings.intervals}
              </span>
            </div>
          </div>

          {/* Notification Volume */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-300 uppercase tracking-wide">
              Notification Volume
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0"
                max="100"
                value={settings.notificationVolume}
                onChange={(e) => {
                  const newVolume = parseInt(e.target.value);
                  onUpdateSettings({ notificationVolume: newVolume });
                  // Play preview sound after a short delay
                  setTimeout(() => {
                    audioManager.current.playNotification(
                      settings.notificationSound,
                      newVolume,
                      1 // Just one beep for volume preview
                    );
                  }, 100);
                }}
                className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider-dark"
              />
              <span className="min-w-[4rem] text-lg font-medium text-white">
                {settings.notificationVolume}%
              </span>
              <button
                onClick={playPreviewSound}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors duration-200"
                title="Preview Sound"
              >
                <Volume2 size={16} className="text-gray-300" />
              </button>
            </div>
          </div>

          {/* Notification Sound */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-300 uppercase tracking-wide">
              Notification Sound
            </label>
            <div className="space-y-2">
              {soundOptions.map((option) => (
                <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="notificationSound"
                    value={option.value}
                    checked={settings.notificationSound === option.value}
                    onChange={(e) => {
                      const newSound = e.target.value;
                      onUpdateSettings({ notificationSound: newSound });
                      // Play preview sound after a short delay
                      setTimeout(() => {
                        audioManager.current.playNotification(
                          newSound,
                          settings.notificationVolume,
                          1 // Just one beep for sound preview
                        );
                      }, 100);
                    }}
                    className="w-4 h-4 text-blue-400 bg-gray-700 border-gray-500 focus:ring-blue-400 focus:ring-2"
                  />
                  <span className="text-white font-medium">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Beep Count */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-300 uppercase tracking-wide">
              Number of Beeps
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="1"
                max="10"
                value={settings.beepCount}
                onChange={(e) => {
                  const newBeepCount = parseInt(e.target.value);
                  onUpdateSettings({ beepCount: newBeepCount });
                  // Play preview sound after a short delay
                  setTimeout(() => {
                    audioManager.current.playNotification(
                      settings.notificationSound,
                      settings.notificationVolume,
                      newBeepCount
                    );
                  }, 100);
                }}
                className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider-dark"
              />
              <span className="min-w-[4rem] text-lg font-medium text-white">
                {settings.beepCount}
              </span>
              <button
                onClick={playPreviewSound}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors duration-200"
                title="Preview Sound"
              >
                <Volume2 size={16} className="text-gray-300" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-600">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200 shadow-lg hover:shadow-xl"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};