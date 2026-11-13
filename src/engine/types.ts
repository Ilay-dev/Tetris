export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export type RotationState = 0 | 1 | 2 | 3;

export type CellValue = TetrominoType | null;

export interface ActivePiece {
  type: TetrominoType;
  rotation: RotationState;
  col: number;
  /** Internal board row (0..1 = buffer rows, 2..21 = visible 20 rows) */
  row: number;
}

export type GameStatus = 'playing' | 'paused' | 'gameover';

export type VisualTheme = 'accent' | 'mono';

export interface GameConfig {
  startLevel: number;
  ghostEnabled: boolean;
  theme: VisualTheme;
}

export type LastActionKind = 'none' | 'move' | 'rotate';

export interface CalloutInfo {
  id: number;
  label: string;
  sublabel?: string;
}

export interface TetrisState {
  /** 22 rows (0..1 buffer, 2..21 visible) x 10 cols */
  board: CellValue[][];
  active: ActivePiece | null;
  hold: TetrominoType | null;
  canHold: boolean;
  queue: TetrominoType[];
  bag: TetrominoType[];
  status: GameStatus;
  score: number;
  lines: number;
  level: number;
  startLevel: number;
  combo: number;
  backToBack: boolean;
  piecesPlaced: number;
  tetrisCount: number;
  lastAction: LastActionKind;
  lastKickUsed: boolean;
  callout: CalloutInfo | null;
}

export interface LockOutcome {
  locked: boolean;
  clearedRows: number[];
  isTSpin: boolean;
  isBackToBack: boolean;
  scoreGained: number;
  gameOver: boolean;
}
