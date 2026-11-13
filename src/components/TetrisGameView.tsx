import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  LogOut,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Repeat,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { PIECE_STYLES } from '../engine/pieceMeta.ts';
import {
  BOARD_COLS,
  BUFFER_ROWS,
  createInitialTetrisState,
  getGhostRow,
  getGravityIntervalMs,
  getPieceCells,
  hardDrop,
  holdActivePiece,
  isPieceGrounded,
  lockActivePiece,
  movePiece,
  rotatePiece,
  VISIBLE_ROWS,
} from '../engine/tetrisEngine.ts';
import type { GameConfig, TetrisState, TetrominoType, VisualTheme } from '../engine/types.ts';
import { useTetrisSounds } from '../hooks/useTetrisSounds.ts';
import { PiecePreview } from './PiecePreview.tsx';

interface TetrisGameViewProps {
  config: GameConfig;
  highScore: number;
  onUpdateHighScore: (score: number, lines: number) => void;
  onToggleTheme: (nextTheme: VisualTheme) => void;
  onExit: () => void;
  sounds: ReturnType<typeof useTetrisSounds>;
}

const LOCK_DELAY_MS = 500;
const MAX_LOCK_RESETS = 15;
const DAS_MS = 140;
const ARR_MS = 32;
const SOFT_DROP_MS = 40;

export function TetrisGameView({
  config,
  highScore,
  onUpdateHighScore,
  onToggleTheme,
  onExit,
  sounds,
}: TetrisGameViewProps) {
  const [game, setGame] = useState<TetrisState>(() =>
    createInitialTetrisState(config.startLevel)
  );
  const [flashRowCount, setFlashRowCount] = useState(0);

  const stateRef = useRef(game);
  stateRef.current = game;

  const lockTimerRef = useRef<number>(0);
  const lockResetsRef = useRef<number>(0);
  const gravityElapsedRef = useRef<number>(0);

  const keysHeldRef = useRef<Set<string>>(new Set());
  const horizDirRef = useRef<-1 | 0 | 1>(0);
  const dasElapsedRef = useRef<number>(0);
  const arrElapsedRef = useRef<number>(0);
  const softDropElapsedRef = useRef<number>(0);

  const prevHighReportedRef = useRef(highScore);
  useEffect(() => {
    if (game.score > prevHighReportedRef.current || game.status === 'gameover') {
      prevHighReportedRef.current = Math.max(prevHighReportedRef.current, game.score);
      onUpdateHighScore(game.score, game.lines);
    }
  }, [game.score, game.lines, game.status, onUpdateHighScore]);

  const handleOutcomeAudio = useCallback(
    (clearedRows: number[], gameOver: boolean, dropped = false) => {
      if (clearedRows.length > 0) {
        sounds.playClearSound(clearedRows.length);
        setFlashRowCount((c) => c + 1);
      } else if (dropped) {
        sounds.playDropSound();
      } else {
        sounds.playLockSound();
      }
      if (gameOver) {
        sounds.playGameOverSound();
      }
    },
    [sounds]
  );

  const resetTimersForNewPiece = () => {
    lockTimerRef.current = 0;
    lockResetsRef.current = 0;
    gravityElapsedRef.current = 0;
  };

  const triggerRestart = useCallback(() => {
    resetTimersForNewPiece();
    keysHeldRef.current.clear();
    horizDirRef.current = 0;
    setGame(createInitialTetrisState(config.startLevel));
  }, [config.startLevel]);

  const togglePause = useCallback(() => {
    setGame((prev) => {
      if (prev.status === 'gameover') return prev;
      return {
        ...prev,
        status: prev.status === 'paused' ? 'playing' : 'paused',
      };
    });
  }, []);

  const attemptMove = useCallback(
    (dCol: number, dRow: number, playAudio = true) => {
      const curr = stateRef.current;
      if (curr.status !== 'playing') return false;
      const { state: next, moved } = movePiece(curr, dCol, dRow);
      if (!moved) return false;

      if (next.active && isPieceGrounded(next.board, next.active)) {
        if (lockResetsRef.current < MAX_LOCK_RESETS) {
          lockTimerRef.current = 0;
          lockResetsRef.current += 1;
        }
      } else {
        lockTimerRef.current = 0;
      }

      if (dCol !== 0 && playAudio) {
        sounds.playMoveSound();
      }
      stateRef.current = next;
      setGame(next);
      return true;
    },
    [sounds]
  );

  const attemptRotate = useCallback(
    (dir: 1 | -1) => {
      const curr = stateRef.current;
      if (curr.status !== 'playing') return;
      const { state: next, rotated } = rotatePiece(curr, dir);
      if (!rotated) return;

      if (next.active && isPieceGrounded(next.board, next.active)) {
        if (lockResetsRef.current < MAX_LOCK_RESETS) {
          lockTimerRef.current = 0;
          lockResetsRef.current += 1;
        }
      } else {
        lockTimerRef.current = 0;
      }

      sounds.playRotateSound();
      stateRef.current = next;
      setGame(next);
    },
    [sounds]
  );

  const attemptHardDrop = useCallback(() => {
    const curr = stateRef.current;
    if (curr.status !== 'playing') return;
    const { state: next, outcome } = hardDrop(curr);
    resetTimersForNewPiece();
    handleOutcomeAudio(outcome.clearedRows, outcome.gameOver, true);
    stateRef.current = next;
    setGame(next);
  }, [handleOutcomeAudio]);

  const attemptHold = useCallback(() => {
    const curr = stateRef.current;
    if (curr.status !== 'playing') return;
    const { state: next, held } = holdActivePiece(curr);
    if (!held) return;
    resetTimersForNewPiece();
    sounds.playHoldSound();
    if (next.status === 'gameover') {
      sounds.playGameOverSound();
    }
    stateRef.current = next;
    setGame(next);
  }, [sounds]);

  // Auto-pause cleanly when tab loses visibility
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        keysHeldRef.current.clear();
        horizDirRef.current = 0;
        setGame((prev) => (prev.status === 'playing' ? { ...prev, status: 'paused' } : prev));
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Keyboard bindings with DAS/ARR handling via rAF loop below
  useEffect(() => {
    const isLeftKey = (code: string, key: string) =>
      code === 'ArrowLeft' || key.toLowerCase() === 'a';
    const isRightKey = (code: string, key: string) =>
      code === 'ArrowRight' || key.toLowerCase() === 'd';
    const isDownKey = (code: string, key: string) =>
      code === 'ArrowDown' || key.toLowerCase() === 's';

    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key;
      const lower = key.toLowerCase();

      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space'].includes(code)) {
        e.preventDefault();
      }

      if (lower === 'p' || code === 'Escape') {
        if (!e.repeat) togglePause();
        return;
      }

      if (lower === 'r' && !e.repeat) {
        triggerRestart();
        return;
      }

      if (stateRef.current.status !== 'playing') return;

      if (isLeftKey(code, key)) {
        if (!keysHeldRef.current.has('left')) {
          keysHeldRef.current.add('left');
          horizDirRef.current = -1;
          dasElapsedRef.current = 0;
          arrElapsedRef.current = 0;
          attemptMove(-1, 0);
        }
        return;
      }

      if (isRightKey(code, key)) {
        if (!keysHeldRef.current.has('right')) {
          keysHeldRef.current.add('right');
          horizDirRef.current = 1;
          dasElapsedRef.current = 0;
          arrElapsedRef.current = 0;
          attemptMove(1, 0);
        }
        return;
      }

      if (isDownKey(code, key)) {
        if (!keysHeldRef.current.has('down')) {
          keysHeldRef.current.add('down');
          softDropElapsedRef.current = 0;
          attemptMove(0, 1, false);
        }
        return;
      }

      if (e.repeat) return;

      if (code === 'Space') {
        attemptHardDrop();
      } else if (code === 'ArrowUp' || lower === 'w' || lower === 'x') {
        attemptRotate(1);
      } else if (lower === 'z' || lower === 'y' || lower === 'q') {
        attemptRotate(-1);
      } else if (lower === 'c' || code === 'ShiftLeft' || code === 'ShiftRight') {
        attemptHold();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key;
      if (isLeftKey(code, key)) {
        keysHeldRef.current.delete('left');
        horizDirRef.current = keysHeldRef.current.has('right') ? 1 : 0;
        dasElapsedRef.current = 0;
        arrElapsedRef.current = 0;
      } else if (isRightKey(code, key)) {
        keysHeldRef.current.delete('right');
        horizDirRef.current = keysHeldRef.current.has('left') ? -1 : 0;
        dasElapsedRef.current = 0;
        arrElapsedRef.current = 0;
      } else if (isDownKey(code, key)) {
        keysHeldRef.current.delete('down');
        softDropElapsedRef.current = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [attemptHardDrop, attemptHold, attemptMove, attemptRotate, togglePause, triggerRestart]);

  // Main game loop: gravity + lock delay + smooth DAS/ARR + soft drop
  useEffect(() => {
    let rafId = 0;
    let lastTs = performance.now();

    const step = (now: number) => {
      const dt = Math.min(100, Math.max(0, now - lastTs));
      lastTs = now;

      const curr = stateRef.current;
      if (curr.status === 'playing' && curr.active) {
        // 1. Horizontal DAS / ARR
        const dir = horizDirRef.current;
        if (dir !== 0) {
          dasElapsedRef.current += dt;
          if (dasElapsedRef.current >= DAS_MS) {
            arrElapsedRef.current += dt;
            while (arrElapsedRef.current >= ARR_MS) {
              arrElapsedRef.current -= ARR_MS;
              if (!attemptMove(dir, 0, false)) break;
            }
          }
        }

        // 2. Soft Drop repeat
        if (keysHeldRef.current.has('down')) {
          softDropElapsedRef.current += dt;
          while (softDropElapsedRef.current >= SOFT_DROP_MS) {
            softDropElapsedRef.current -= SOFT_DROP_MS;
            if (!attemptMove(0, 1, false)) break;
          }
        }

        // 3. Gravity & Lock Delay
        const live = stateRef.current;
        if (live.status === 'playing' && live.active) {
          if (isPieceGrounded(live.board, live.active)) {
            gravityElapsedRef.current = 0;
            lockTimerRef.current += dt;
            if (lockTimerRef.current >= LOCK_DELAY_MS) {
              const { state: lockedState, outcome } = lockActivePiece(live);
              resetTimersForNewPiece();
              handleOutcomeAudio(outcome.clearedRows, outcome.gameOver, false);
              stateRef.current = lockedState;
              setGame(lockedState);
            }
          } else {
            lockTimerRef.current = 0;
            gravityElapsedRef.current += dt;
            const interval = getGravityIntervalMs(live.level);
            if (gravityElapsedRef.current >= interval) {
              gravityElapsedRef.current -= interval;
              const { state: movedState, moved } = movePiece(live, 0, 1);
              if (moved) {
                stateRef.current = movedState;
                setGame(movedState);
              }
            }
          }
        }
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [attemptMove, handleOutcomeAudio]);

  // Compute rendered cells (20 visible rows x 10 cols)
  const { activeMap, ghostMap } = useMemo(() => {
    const aMap = new Map<string, TetrominoType>();
    const gMap = new Map<string, TetrominoType>();
    if (!game.active) return { activeMap: aMap, ghostMap: gMap };

    for (const cell of getPieceCells(game.active)) {
      if (cell.row >= BUFFER_ROWS) {
        aMap.set(`${cell.row},${cell.col}`, game.active.type);
      }
    }

    if (config.ghostEnabled) {
      const ghostRow = getGhostRow(game.board, game.active);
      if (ghostRow > game.active.row) {
        const ghostPiece = { ...game.active, row: ghostRow };
        for (const cell of getPieceCells(ghostPiece)) {
          const key = `${cell.row},${cell.col}`;
          if (cell.row >= BUFFER_ROWS && !aMap.has(key)) {
            gMap.set(key, game.active.type);
          }
        }
      }
    }

    return { activeMap: aMap, ghostMap: gMap };
  }, [game.active, game.board, config.ghostEnabled]);

  const effectiveHighScore = Math.max(highScore, game.score);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between overflow-x-hidden select-none">
      {/* Minimalist Top Bar */}
      <header className="border-b border-white/[0.06] px-4 py-2.5 sm:px-6 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="font-bold tracking-[-0.03em] text-sm sm:text-base">TETRIS</span>
            <span className="text-zinc-700">/</span>
            <span className="font-mono-code text-xs text-zinc-500">
              Level {game.level}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                onToggleTheme(config.theme === 'accent' ? 'mono' : 'accent')
              }
              title="Darstellung wechseln (Farbe / Monochrom)"
              className="px-2 py-1 rounded-lg text-[11px] font-medium text-zinc-500 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              {config.theme === 'accent' ? 'Farbe' : 'Mono'}
            </button>

            <button
              type="button"
              onClick={sounds.toggleSound}
              title={sounds.soundEnabled ? 'Ton aus' : 'Ton an'}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              {sounds.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={togglePause}
              disabled={game.status === 'gameover'}
              title={game.status === 'paused' ? 'Fortsetzen (P)' : 'Pause (P)'}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.05] disabled:opacity-30 transition-colors cursor-pointer"
            >
              {game.status === 'paused' ? (
                <Play className="w-4 h-4" />
              ) : (
                <Pause className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={triggerRestart}
              title="Neu starten (R)"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onExit}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white rounded-lg px-2 py-1.5 hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Menü</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Arena */}
      <main className="flex-1 flex flex-col items-center justify-center px-3 py-3 sm:px-6 gap-3">
        {/* Compact Mobile Top HUD (< md) */}
        <div className="md:hidden w-full max-w-[300px] flex items-center justify-between gap-3 px-1">
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-[9px] uppercase tracking-[0.18em] text-zinc-600">Hold</span>
            <PiecePreview type={game.hold} theme={config.theme} size="sm" dimmed={!game.canHold} />
          </div>

          <div className="flex items-center gap-4 text-center">
            <div>
              <div className="text-[9px] uppercase tracking-[0.16em] text-zinc-600">Score</div>
              <div className="font-mono-code text-sm font-bold text-white">
                {game.score.toLocaleString('de-DE')}
              </div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-[0.16em] text-zinc-600">Zeilen</div>
              <div className="font-mono-code text-sm font-semibold text-zinc-300">
                {game.lines}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[9px] uppercase tracking-[0.18em] text-zinc-600">Next</span>
            <PiecePreview type={game.queue[0] ?? null} theme={config.theme} size="sm" />
          </div>
        </div>

        {/* Desktop 3-Column Stage */}
        <div className="flex items-start justify-center gap-6 lg:gap-9">
          {/* Left Panel: Hold + Minimal Stats (Desktop) */}
          <aside className="hidden md:flex flex-col justify-between w-[144px] h-[540px] py-1">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                <span>Hold</span>
                <span className="font-mono-code text-zinc-600">C</span>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-[#08080A] py-3 px-2 flex items-center justify-center">
                <PiecePreview
                  type={game.hold}
                  theme={config.theme}
                  dimmed={!game.canHold}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                  Score
                </div>
                <div className="font-mono-code text-2xl font-bold text-white tracking-tight mt-0.5">
                  {game.score.toLocaleString('de-DE')}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                  Bestwert
                </div>
                <div className="font-mono-code text-sm font-semibold text-zinc-400 mt-0.5">
                  {effectiveHighScore.toLocaleString('de-DE')}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/[0.06]">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                    Zeilen
                  </div>
                  <div className="font-mono-code text-base font-semibold text-zinc-200 mt-0.5">
                    {game.lines}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                    Level
                  </div>
                  <div className="font-mono-code text-base font-semibold text-zinc-200 mt-0.5">
                    {game.level}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Center 10x20 Playfield */}
          <div className="relative rounded-2xl border border-white/[0.12] bg-[#060608] p-1.5 shadow-[0_0_50px_rgba(0,0,0,0.9)]">
            {/* Subtle clear flash pulse border on line clear */}
            {flashRowCount > 0 && (
              <div
                key={flashRowCount}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-2xl border border-white/40 animate-line-flash"
              />
            )}

            <div
              className="grid gap-[1px] bg-white/[0.03] w-[260px] h-[520px] sm:w-[270px] sm:h-[540px]"
              style={{
                gridTemplateColumns: `repeat(${BOARD_COLS}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${VISIBLE_ROWS}, minmax(0, 1fr))`,
              }}
              role="grid"
              aria-label="Tetris Spielfeld"
            >
              {Array.from({ length: VISIBLE_ROWS }).map((_, visR) => {
                const boardR = visR + BUFFER_ROWS;
                return Array.from({ length: BOARD_COLS }).map((__, col) => {
                  const key = `${boardR},${col}`;
                  const lockedType = game.board[boardR][col];
                  const activeType = activeMap.get(key) ?? null;
                  const ghostType = ghostMap.get(key) ?? null;
                  const solidType = activeType ?? lockedType;

                  if (solidType) {
                    const style = PIECE_STYLES[solidType];
                    const fill = config.theme === 'mono' ? style.monoFill : style.fill;
                    const border = config.theme === 'mono' ? style.monoBorder : style.border;
                    return (
                      <div
                        key={key}
                        style={{
                          backgroundColor: fill,
                          borderColor: border,
                          boxShadow:
                            config.theme === 'accent' && activeType
                              ? `0 0 10px ${style.glow}, inset 0 1px 0 rgba(255,255,255,0.28)`
                              : 'inset 0 1px 0 rgba(255,255,255,0.22)',
                        }}
                        className="rounded-[3px] border"
                      />
                    );
                  }

                  if (ghostType) {
                    const style = PIECE_STYLES[ghostType];
                    return (
                      <div
                        key={key}
                        style={{
                          borderColor:
                            config.theme === 'mono'
                              ? 'rgba(255, 255, 255, 0.28)'
                              : style.ghostBorder,
                        }}
                        className="rounded-[3px] border border-dashed bg-white/[0.02]"
                      />
                    );
                  }

                  return <div key={key} className="bg-[#050507]" />;
                });
              })}
            </div>

            {/* Pause Overlay */}
            {game.status === 'paused' && (
              <div className="absolute inset-0 rounded-2xl bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center gap-4 animate-panel-pop z-20">
                <div className="space-y-1">
                  <div className="text-xl font-bold tracking-tight">Pausiert</div>
                  <p className="text-xs text-zinc-500">Drücke P zum Fortsetzen</p>
                </div>

                <div className="w-full max-w-[180px] space-y-2">
                  <button
                    type="button"
                    onClick={togglePause}
                    className="w-full rounded-xl bg-white text-black py-2.5 text-xs font-semibold hover:bg-zinc-200 transition-colors cursor-pointer"
                  >
                    Fortsetzen
                  </button>
                  <button
                    type="button"
                    onClick={triggerRestart}
                    className="w-full rounded-xl border border-white/15 py-2.5 text-xs text-zinc-300 hover:text-white hover:border-white/35 transition-colors cursor-pointer"
                  >
                    Neu starten
                  </button>
                  <button
                    type="button"
                    onClick={onExit}
                    className="w-full py-2 text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer"
                  >
                    Zum Menü
                  </button>
                </div>
              </div>
            )}

            {/* Game Over Overlay */}
            {game.status === 'gameover' && (
              <div className="absolute inset-0 rounded-2xl bg-black/88 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center gap-5 animate-panel-pop z-20">
                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                    Game Over
                  </div>
                  <div className="font-mono-code text-3xl font-bold text-white">
                    {game.score.toLocaleString('de-DE')}
                  </div>
                  {game.score > 0 && game.score >= effectiveHighScore && (
                    <div className="text-[11px] font-medium text-white">
                      Neuer Bestwert
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs border-y border-white/[0.08] py-3 w-full max-w-[190px]">
                  <div>
                    <div className="text-zinc-500">Zeilen</div>
                    <div className="font-mono-code font-semibold text-white mt-0.5">
                      {game.lines}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-500">Level</div>
                    <div className="font-mono-code font-semibold text-white mt-0.5">
                      {game.level}
                    </div>
                  </div>
                </div>

                <div className="w-full max-w-[180px] space-y-2">
                  <button
                    type="button"
                    onClick={triggerRestart}
                    className="w-full rounded-xl bg-white text-black py-2.5 text-xs font-semibold hover:bg-zinc-200 transition-colors cursor-pointer"
                  >
                    Nochmal spielen
                  </button>
                  <button
                    type="button"
                    onClick={onExit}
                    className="w-full py-2 text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer"
                  >
                    Zum Menü
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Next Queue + Callout + Quiet Key Guide (Desktop) */}
          <aside className="hidden md:flex flex-col justify-between w-[144px] h-[540px] py-1">
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                Next
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-[#08080A] py-3 px-2 space-y-3">
                {game.queue.slice(0, 3).map((pieceType, idx) => (
                  <div
                    key={`${idx}-${pieceType}`}
                    className={idx === 0 ? 'opacity-100' : 'opacity-70'}
                  >
                    <PiecePreview type={pieceType} theme={config.theme} />
                  </div>
                ))}
              </div>

              {game.callout && (
                <div
                  key={game.callout.id}
                  className="pt-2 space-y-0.5 animate-panel-pop"
                >
                  <div className="font-mono-code text-xs font-bold tracking-wide text-white">
                    {game.callout.label}
                  </div>
                  {game.callout.sublabel && (
                    <div className="font-mono-code text-[11px] text-zinc-400">
                      {game.callout.sublabel}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5 text-[11px] text-zinc-600 leading-relaxed">
              <div className="flex justify-between">
                <span>Bewegen</span>
                <span className="font-mono-code text-zinc-500">← →</span>
              </div>
              <div className="flex justify-between">
                <span>Drehen</span>
                <span className="font-mono-code text-zinc-500">↑ / Z</span>
              </div>
              <div className="flex justify-between">
                <span>Hard Drop</span>
                <span className="font-mono-code text-zinc-500">Space</span>
              </div>
              <div className="flex justify-between">
                <span>Hold</span>
                <span className="font-mono-code text-zinc-500">C</span>
              </div>
              <div className="flex justify-between">
                <span>Pause</span>
                <span className="font-mono-code text-zinc-500">P</span>
              </div>
            </div>
          </aside>
        </div>

        {/* Touch Controls (Mobile / Tablet) */}
        <div className="md:hidden w-full max-w-[300px] pt-1 space-y-2">
          <div className="grid grid-cols-5 gap-1.5">
            <button
              type="button"
              onClick={() => attemptMove(-1, 0)}
              aria-label="Nach links"
              className="rounded-xl border border-white/10 bg-[#0A0A0D] py-3 flex items-center justify-center text-zinc-200 active:bg-white active:text-black cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => attemptMove(0, 1, false)}
              aria-label="Schneller fallen"
              className="rounded-xl border border-white/10 bg-[#0A0A0D] py-3 flex items-center justify-center text-zinc-200 active:bg-white active:text-black cursor-pointer"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => attemptMove(1, 0)}
              aria-label="Nach rechts"
              className="rounded-xl border border-white/10 bg-[#0A0A0D] py-3 flex items-center justify-center text-zinc-200 active:bg-white active:text-black cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => attemptRotate(1)}
              aria-label="Drehen"
              className="rounded-xl border border-white/10 bg-[#0A0A0D] py-3 flex items-center justify-center text-zinc-200 active:bg-white active:text-black cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={attemptHold}
              aria-label="Hold"
              className="rounded-xl border border-white/10 bg-[#0A0A0D] py-3 flex items-center justify-center text-zinc-300 active:bg-white active:text-black cursor-pointer"
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={attemptHardDrop}
            className="w-full rounded-xl bg-white text-black py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 active:bg-zinc-300 cursor-pointer"
          >
            <ChevronDown className="w-4 h-4" />
            <span>Hard Drop</span>
          </button>
        </div>
      </main>
    </div>
  );
}
