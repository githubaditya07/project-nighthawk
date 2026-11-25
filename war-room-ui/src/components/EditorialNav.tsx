import React from 'react';
import { CloudRain, Volume2, VolumeX, Play } from 'lucide-react';
import { playNavWhoosh } from '../utils/soundEngine';

interface EditorialNavProps {
  weatherEnabled: boolean;
  sfxEnabled: boolean;
  onToggleWeather: () => void;
  onToggleSfx: () => void;
  onCinematicDive: () => void;
}

export const EditorialNav: React.FC<EditorialNavProps> = ({
  weatherEnabled,
  sfxEnabled,
  onToggleWeather,
  onToggleSfx,
  onCinematicDive,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 nav-glass">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <a
          href="#hero"
          onClick={() => playNavWhoosh()}
          className="flex items-center gap-2.5 group"
        >
          <span className="w-8 h-8 rounded-full bg-[#1A1A1A] text-[#FAF7F2] flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3L2 12l5 2 5-4 5 4 5-2L12 3z" />
              <path d="M7 14l5 7 5-7" />
            </svg>
          </span>
          <span className="font-semibold tracking-tight text-[#1A1A1A] text-sm sm:text-base">
            NIGHTHAWK
          </span>
          <span className="hidden sm:inline-block text-[11px] font-mono-tech uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#FAF7F2] border border-[#E8E4DC] text-[#6B6B6B]">
            RS(8,4)
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-7 text-sm text-[#2D2D2D]">
          <a
            href="#flight-story"
            onClick={() => playNavWhoosh()}
            className="hover:text-[#4D8FB8] transition-colors"
          >
            The Dive
          </a>
          <a
            href="#topology-lab"
            onClick={() => playNavWhoosh()}
            className="hover:text-[#4D8FB8] transition-colors"
          >
            3D Mesh Lab
          </a>
          <a
            href="#architecture"
            onClick={() => playNavWhoosh()}
            className="hover:text-[#4D8FB8] transition-colors"
          >
            Architecture
          </a>
          <a
            href="#benchmarks"
            onClick={() => playNavWhoosh()}
            className="hover:text-[#4D8FB8] transition-colors"
          >
            Benchmarks
          </a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={onToggleWeather}
            title="Toggle Rain & Lightning"
            className="text-xs font-medium px-3 py-2 rounded-full border border-[#D4D0CA] bg-[#FAF7F2] hover:bg-[#FFFFFF] hover:border-[#7BAFD4] transition-all flex items-center gap-1.5"
          >
            <CloudRain className={`w-3.5 h-3.5 ${weatherEnabled ? 'text-[#4D8FB8]' : 'text-[#6B6B6B]'}`} />
            <span className="hidden sm:inline">{weatherEnabled ? 'Storm' : 'Clear'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleSfx}
            title="Toggle Sound Effects"
            className="text-xs font-medium px-3 py-2 rounded-full border border-[#D4D0CA] bg-[#FAF7F2] hover:bg-[#FFFFFF] hover:border-[#7BAFD4] transition-all flex items-center gap-1.5"
          >
            {sfxEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-[#7A9E7E]" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-[#6B6B6B]" />
            )}
            <span className="hidden sm:inline">{sfxEnabled ? 'SFX On' : 'Muted'}</span>
          </button>

          <button
            type="button"
            onClick={onCinematicDive}
            className="text-xs sm:text-sm font-medium px-3.5 py-2 rounded-full border border-[#D4D0CA] bg-[#FAF7F2] hover:bg-[#FFFFFF] hover:border-[#7BAFD4] transition-all flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 text-[#4D8FB8]" />
            <span>Auto-Dive</span>
          </button>

          <a
            href="#topology-lab"
            onClick={() => playNavWhoosh()}
            className="text-xs sm:text-sm font-medium px-4 py-2 rounded-full bg-[#1A1A1A] text-[#FAF7F2] hover:bg-[#2D2D2D] transition-all"
          >
            War-Room
          </a>
        </div>
      </div>
    </header>
  );
};
