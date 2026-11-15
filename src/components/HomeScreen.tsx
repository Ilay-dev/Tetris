import { type CSSProperties, useState } from 'react';
import { ArrowLeft, Keyboard, Play, Trophy, Volume2, VolumeX } from 'lucide-react';
import type { GameConfig, VisualTheme } from '../engine/types.ts';

interface HomeScreenProps {
  config: GameConfig;
  highScore: number;
  bestLines: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onChangeConfig: (next: GameConfig) => void;
  onStartGame: () => void;
}

const LEVEL_PRESETS = [
  { label: 'Lv 1', value: 1 },
  { label: 'Lv 3', value: 3 },
  { label: 'Lv 5', value: 5 },
  { label: 'Lv 8', value: 8 },
  { label: 'Lv 10', value: 10 },
];

export function HomeScreen({
  config,
  highScore,
  bestLines,
  soundEnabled,
  onToggleSound,
  onChangeConfig,
  onStartGame,
}: HomeScreenProps) {
  const [showControls, setShowControls] = useState(false);

  const sliderPct = ((config.startLevel - 1) / 9) * 100;

  const setTheme = (theme: VisualTheme) => {
    onChangeConfig({ ...config, theme });
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between px-4 py-8 sm:px-6">
      {/* Top Bar */}
      <header className="max-w-xl w-full mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="https://gundigame.vercel.app"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white hover:text-black hover:border-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Zurück zum Dashboard</span>
          </a>

          <div className="inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span>Singleplayer · Lokal</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSound}
            title={soundEnabled ? 'Ton aus' : 'Ton an'}
            className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setShowControls((v) => !v)}
            className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors cursor-pointer"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>{showControls ? 'Steuerung schließen' : 'Steuerung'}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md w-full mx-auto my-auto py-8">
        {/* Wordmark */}
        <div className="mb-10">
          <div className="flex items-center gap-3.5 mb-3">
            <h1 className="text-5xl font-bold tracking-[-0.04em] text-white">TETRIS</h1>
            {/* Subtle minimalist T-tetromino emblem */}
            <div className="grid grid-cols-3 gap-[2px] pt-1" aria-hidden="true">
              <span className="w-2.5 h-2.5" />
              <span className="w-2.5 h-2.5 rounded-[2px] bg-white/85" />
              <span className="w-2.5 h-2.5" />
              <span className="w-2.5 h-2.5 rounded-[2px] bg-white/85" />
              <span className="w-2.5 h-2.5 rounded-[2px] bg-white/85" />
              <span className="w-2.5 h-2.5 rounded-[2px] bg-white/85" />
            </div>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Minimalistisches Singleplayer-Tetris im Fokus-Modus. Präzise SRS-Rotation, Hold-Slot, Ghost-Vorschau und progressives Tempo.
          </p>
        </div>

        {showControls && (
          <div className="mb-6 rounded-2xl border border-white/[0.08] bg-[#08080A] p-4 text-xs text-zinc-300 space-y-2.5 animate-panel-pop">
            <div className="font-semibold text-white">Tastatursteuerung</div>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-zinc-400">
              <span>Bewegen</span>
              <span className="font-mono-code text-right text-zinc-200">← → / A D</span>
              <span>Soft Drop</span>
              <span className="font-mono-code text-right text-zinc-200">↓ / S</span>
              <span>Hard Drop</span>
              <span className="font-mono-code text-right text-zinc-200">Leertaste</span>
              <span>Drehen (Rechts)</span>
              <span className="font-mono-code text-right text-zinc-200">↑ / W / X</span>
              <span>Drehen (Links)</span>
              <span className="font-mono-code text-right text-zinc-200">Z / Y / Q</span>
              <span>Hold</span>
              <span className="font-mono-code text-right text-zinc-200">C / Shift</span>
              <span>Pause / Neustart</span>
              <span className="font-mono-code text-right text-zinc-200">P / R</span>
            </div>
          </div>
        )}

        <div className="space-y-5">
          {/* Highscore Banner */}
          {highScore > 0 && (
            <div className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[#08080A] px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Trophy className="w-3.5 h-3.5 text-white" />
                <span>Dein Bestwert</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="font-mono-code text-base font-bold text-white">
                  {highScore.toLocaleString('de-DE')}
                </span>
                <span className="font-mono-code text-[11px] text-zinc-500">
                  {bestLines} Zeilen
                </span>
              </div>
            </div>
          )}

          {/* Setup Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#08080A] p-4 space-y-4">
            {/* Start Level */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Start-Level
                </span>
                <span className="font-mono-code text-sm font-semibold text-white">
                  Level {config.startLevel}
                </span>
              </div>

              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={config.startLevel}
                onChange={(e) =>
                  onChangeConfig({ ...config, startLevel: Number(e.target.value) })
                }
                aria-label="Start-Level wählen"
                style={{ '--slider-pct': `${sliderPct}%` } as CSSProperties}
                className="minimal-slider"
              />

              <div className="flex flex-wrap gap-1.5">
                {LEVEL_PRESETS.map((preset) => {
                  const active = config.startLevel === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => onChangeConfig({ ...config, startLevel: preset.value })}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-mono-code transition-colors cursor-pointer ${
                        active
                          ? 'bg-white text-black font-semibold'
                          : 'bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.09]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
              {/* Theme Switch */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-500 mr-1">Stil:</span>
                {(['accent', 'mono'] as VisualTheme[]).map((mode) => {
                  const active = config.theme === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setTheme(mode)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? 'bg-white text-black font-semibold'
                          : 'bg-white/[0.04] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {mode === 'accent' ? 'Farbe' : 'Monochrom'}
                    </button>
                  );
                })}
              </div>

              {/* Ghost Piece Toggle */}
              <button
                type="button"
                onClick={() =>
                  onChangeConfig({ ...config, ghostEnabled: !config.ghostEnabled })
                }
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  config.ghostEnabled
                    ? 'bg-white/[0.12] text-white'
                    : 'bg-white/[0.03] text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Ghost: {config.ghostEnabled ? 'An' : 'Aus'}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onStartGame}
            className="w-full rounded-xl bg-white text-black font-semibold py-3.5 px-5 text-sm flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Spiel starten</span>
          </button>
        </div>
      </main>

      <footer className="max-w-xl w-full mx-auto flex items-center justify-between text-xs text-zinc-600">
        <span>Pure Client · 7-Bag SRS</span>
        <span className="font-mono-code">10 × 20</span>
      </footer>
    </div>
  );
}

