import { useCallback, useEffect, useState } from 'react';
import { HomeScreen } from './components/HomeScreen.tsx';
import { TetrisGameView } from './components/TetrisGameView.tsx';
import type { GameConfig } from './engine/types.ts';
import { useTetrisSounds } from './hooks/useTetrisSounds.ts';

const HIGHSCORE_KEY = 'tetris_high_score';
const BEST_LINES_KEY = 'tetris_best_lines';
const CONFIG_KEY = 'tetris_config';

const DEFAULT_CONFIG: GameConfig = {
  startLevel: 1,
  ghostEnabled: true,
  theme: 'accent',
};

function readStoredInt(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    const num = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(num) && num > 0 ? num : 0;
  } catch {
    return 0;
  }
}

function readStoredConfig(): GameConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<GameConfig>;
    return {
      startLevel:
        typeof parsed.startLevel === 'number' && parsed.startLevel >= 1 && parsed.startLevel <= 10
          ? Math.floor(parsed.startLevel)
          : 1,
      ghostEnabled: typeof parsed.ghostEnabled === 'boolean' ? parsed.ghostEnabled : true,
      theme: parsed.theme === 'mono' ? 'mono' : 'accent',
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export default function App() {
  const [screen, setScreen] = useState<'home' | 'playing'>('home');
  const [config, setConfig] = useState<GameConfig>(readStoredConfig);
  const [highScore, setHighScore] = useState<number>(() => readStoredInt(HIGHSCORE_KEY));
  const [bestLines, setBestLines] = useState<number>(() => readStoredInt(BEST_LINES_KEY));
  const sounds = useTetrisSounds();

  useEffect(() => {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch {
      // ignore storage errors
    }
  }, [config]);

  const handleUpdateHighScore = useCallback((score: number, lines: number) => {
    setHighScore((prev) => {
      const next = Math.max(prev, score);
      if (next > prev) {
        try {
          localStorage.setItem(HIGHSCORE_KEY, String(next));
        } catch {
          // ignore
        }
      }
      return next;
    });
    setBestLines((prev) => {
      const next = Math.max(prev, lines);
      if (next > prev) {
        try {
          localStorage.setItem(BEST_LINES_KEY, String(next));
        } catch {
          // ignore
        }
      }
      return next;
    });
  }, []);

  if (screen === 'playing') {
    return (
      <TetrisGameView
        config={config}
        highScore={highScore}
        onUpdateHighScore={handleUpdateHighScore}
        onToggleTheme={(theme) => setConfig((prev) => ({ ...prev, theme }))}
        onExit={() => setScreen('home')}
        sounds={sounds}
      />
    );
  }

  return (
    <HomeScreen
      config={config}
      highScore={highScore}
      bestLines={bestLines}
      soundEnabled={sounds.soundEnabled}
      onToggleSound={sounds.toggleSound}
      onChangeConfig={setConfig}
      onStartGame={() => setScreen('playing')}
    />
  );
}
