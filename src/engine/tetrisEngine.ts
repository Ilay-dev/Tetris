import type {
  ActivePiece,
  CalloutInfo,
  CellValue,
  LockOutcome,
  RotationState,
  TetrominoType,
  TetrisState,
} from './types.ts';

export const BOARD_COLS = 10;
export const BUFFER_ROWS = 2;
export const VISIBLE_ROWS = 20;
export const TOTAL_ROWS = BUFFER_ROWS + VISIBLE_ROWS; // 22
export const NEXT_QUEUE_SIZE = 3;

const ALL_PIECES: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

const BASE_MATRICES: Record<TetrominoType, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

function rotateMatrixCW(matrix: number[][]): number[][] {
  const n = matrix.length;
  const res: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      res[c][n - 1 - r] = matrix[r][c];
    }
  }
  return res;
}

const ROTATED_MATRICES: Record<TetrominoType, Record<RotationState, number[][]>> = (() => {
  const map = {} as Record<TetrominoType, Record<RotationState, number[][]>>;
  for (const type of ALL_PIECES) {
    const r0 = BASE_MATRICES[type];
    const r1 = type === 'O' ? r0 : rotateMatrixCW(r0);
    const r2 = type === 'O' ? r0 : rotateMatrixCW(r1);
    const r3 = type === 'O' ? r0 : rotateMatrixCW(r2);
    map[type] = { 0: r0, 1: r1, 2: r2, 3: r3 };
  }
  return map;
})();

// Official SRS Wall Kick offsets in [dx, dRow] (where positive dRow moves downward)
const JLSTZ_KICKS: Record<string, Array<[number, number]>> = {
  '0->1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '1->0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '1->2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '2->1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '2->3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '3->2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '3->0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '0->3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
};

const I_KICKS: Record<string, Array<[number, number]>> = {
  '0->1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '1->0': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '1->2': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  '2->1': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '2->3': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '3->2': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '3->0': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '0->3': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
};

let nextCalloutId = 1;

export function createEmptyBoard(): CellValue[][] {
  return Array.from({ length: TOTAL_ROWS }, () => Array<CellValue>(BOARD_COLS).fill(null));
}

export function cloneBoard(board: CellValue[][]): CellValue[][] {
  return board.map((row) => [...row]);
}

export function createBag(rng: () => number = Math.random): TetrominoType[] {
  const bag: TetrominoType[] = [...ALL_PIECES];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

export function getPieceMatrix(type: TetrominoType, rotation: RotationState): number[][] {
  return ROTATED_MATRICES[type][rotation];
}

export function getPieceCells(piece: ActivePiece): Array<{ row: number; col: number }> {
  const matrix = getPieceMatrix(piece.type, piece.rotation);
  const cells: Array<{ row: number; col: number }> = [];
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c]) {
        cells.push({ row: piece.row + r, col: piece.col + c });
      }
    }
  }
  return cells;
}

export function canPlacePiece(board: CellValue[][], piece: ActivePiece): boolean {
  const matrix = getPieceMatrix(piece.type, piece.rotation);
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (!matrix[r][c]) continue;
      const targetRow = piece.row + r;
      const targetCol = piece.col + c;
      if (targetCol < 0 || targetCol >= BOARD_COLS || targetRow >= TOTAL_ROWS) {
        return false;
      }
      if (targetRow >= 0 && board[targetRow][targetCol] !== null) {
        return false;
      }
    }
  }
  return true;
}

export function createSpawnPiece(type: TetrominoType): ActivePiece {
  if (type === 'O') {
    return { type, rotation: 0, col: 4, row: BUFFER_ROWS };
  }
  if (type === 'I') {
    // Base I-piece occupies local row 1 -> spawns cleanly at visible row 0 (internal row 2)
    return { type, rotation: 0, col: 3, row: BUFFER_ROWS - 1 };
  }
  return { type, rotation: 0, col: 3, row: BUFFER_ROWS };
}

function drawNextPiece(
  queue: TetrominoType[],
  bag: TetrominoType[],
  rng: () => number
): { nextType: TetrominoType; queue: TetrominoType[]; bag: TetrominoType[] } {
  const nextQueue = [...queue];
  let nextBag = [...bag];

  while (nextQueue.length < NEXT_QUEUE_SIZE + 1) {
    if (nextBag.length === 0) {
      nextBag = createBag(rng);
    }
    nextQueue.push(nextBag.shift()!);
  }

  const nextType = nextQueue.shift()!;
  while (nextQueue.length < NEXT_QUEUE_SIZE) {
    if (nextBag.length === 0) {
      nextBag = createBag(rng);
    }
    nextQueue.push(nextBag.shift()!);
  }

  return { nextType, queue: nextQueue, bag: nextBag };
}

export function getGravityIntervalMs(level: number): number {
  const lvl = Math.max(1, Math.min(20, level));
  // Smooth curve: Lv1 = 800ms, Lv5 = 430ms, Lv10 = 155ms, Lv15+ = 65ms
  return Math.max(60, Math.round(800 * Math.pow(0.84, lvl - 1)));
}

export function createInitialTetrisState(
  startLevel = 1,
  rng: () => number = Math.random
): TetrisState {
  const clampedStart = Math.max(1, Math.min(15, Math.floor(startLevel)));
  const board = createEmptyBoard();
  const bag = createBag(rng);
  const firstType = bag.shift()!;
  const queue: TetrominoType[] = [];
  let remainingBag = [...bag];
  while (queue.length < NEXT_QUEUE_SIZE) {
    if (remainingBag.length === 0) {
      remainingBag = createBag(rng);
    }
    queue.push(remainingBag.shift()!);
  }

  return {
    board,
    active: createSpawnPiece(firstType),
    hold: null,
    canHold: true,
    queue,
    bag: remainingBag,
    status: 'playing',
    score: 0,
    lines: 0,
    level: clampedStart,
    startLevel: clampedStart,
    combo: -1,
    backToBack: false,
    piecesPlaced: 0,
    tetrisCount: 0,
    lastAction: 'none',
    lastKickUsed: false,
    callout: null,
  };
}

export function movePiece(
  state: TetrisState,
  dCol: number,
  dRow: number
): { state: TetrisState; moved: boolean } {
  if (state.status !== 'playing' || !state.active) {
    return { state, moved: false };
  }

  const candidate: ActivePiece = {
    ...state.active,
    col: state.active.col + dCol,
    row: state.active.row + dRow,
  };

  if (!canPlacePiece(state.board, candidate)) {
    return { state, moved: false };
  }

  return {
    moved: true,
    state: {
      ...state,
      active: candidate,
      score: dRow > 0 ? state.score + dRow : state.score,
      lastAction: 'move',
      lastKickUsed: false,
    },
  };
}

export function rotatePiece(
  state: TetrisState,
  dir: 1 | -1
): { state: TetrisState; rotated: boolean } {
  if (state.status !== 'playing' || !state.active) {
    return { state, rotated: false };
  }
  const active = state.active;
  if (active.type === 'O') {
    return { state, rotated: false };
  }

  const nextRot = (((active.rotation + dir) % 4 + 4) % 4) as RotationState;
  const key = `${active.rotation}->${nextRot}`;
  const kicks = (active.type === 'I' ? I_KICKS : JLSTZ_KICKS)[key] ?? [[0, 0]];

  for (let i = 0; i < kicks.length; i++) {
    const [dx, dy] = kicks[i];
    const candidate: ActivePiece = {
      type: active.type,
      rotation: nextRot,
      col: active.col + dx,
      row: active.row + dy,
    };
    if (canPlacePiece(state.board, candidate)) {
      return {
        rotated: true,
        state: {
          ...state,
          active: candidate,
          lastAction: 'rotate',
          lastKickUsed: i > 0,
        },
      };
    }
  }

  return { state, rotated: false };
}

export function getGhostRow(board: CellValue[][], active: ActivePiece): number {
  let row = active.row;
  while (canPlacePiece(board, { ...active, row: row + 1 })) {
    row += 1;
  }
  return row;
}

export function isPieceGrounded(board: CellValue[][], active: ActivePiece): boolean {
  return !canPlacePiece(board, { ...active, row: active.row + 1 });
}

function detectTSpin(board: CellValue[][], piece: ActivePiece, lastAction: TetrisState['lastAction']): boolean {
  if (piece.type !== 'T' || lastAction !== 'rotate') return false;
  const corners: Array<[number, number]> = [
    [piece.row, piece.col],
    [piece.row, piece.col + 2],
    [piece.row + 2, piece.col],
    [piece.row + 2, piece.col + 2],
  ];
  let occupied = 0;
  for (const [r, c] of corners) {
    if (c < 0 || c >= BOARD_COLS || r >= TOTAL_ROWS || (r >= 0 && board[r][c] !== null)) {
      occupied += 1;
    }
  }
  return occupied >= 3;
}

function makeCallout(label: string, sublabel?: string): CalloutInfo {
  nextCalloutId += 1;
  return { id: nextCalloutId, label, sublabel };
}

export function lockActivePiece(
  state: TetrisState,
  rng: () => number = Math.random
): { state: TetrisState; outcome: LockOutcome } {
  if (state.status !== 'playing' || !state.active) {
    return {
      state,
      outcome: {
        locked: false,
        clearedRows: [],
        isTSpin: false,
        isBackToBack: false,
        scoreGained: 0,
        gameOver: false,
      },
    };
  }

  const piece = state.active;
  const board = cloneBoard(state.board);
  const cells = getPieceCells(piece);

  // Check if piece locked completely inside the hidden buffer above visible rows
  const completelyAboveVisible = cells.every((c) => c.row < BUFFER_ROWS);

  for (const cell of cells) {
    if (cell.row >= 0 && cell.row < TOTAL_ROWS && cell.col >= 0 && cell.col < BOARD_COLS) {
      board[cell.row][cell.col] = piece.type;
    }
  }

  const isTSpin = detectTSpin(state.board, piece, state.lastAction);

  // Find full lines
  const clearedRows: number[] = [];
  for (let r = 0; r < TOTAL_ROWS; r++) {
    if (board[r].every((cell) => cell !== null)) {
      clearedRows.push(r);
    }
  }

  const lineCount = clearedRows.length;
  if (lineCount > 0) {
    for (let i = clearedRows.length - 1; i >= 0; i--) {
      board.splice(clearedRows[i], 1);
    }
    for (let i = 0; i < lineCount; i++) {
      board.unshift(Array<CellValue>(BOARD_COLS).fill(null));
    }
  }

  // Score calculation (Guideline style)
  let basePoints = 0;
  if (isTSpin) {
    basePoints = [400, 800, 1200, 1600][lineCount] ?? 1600;
  } else {
    basePoints = [0, 100, 300, 500, 800][lineCount] ?? 800;
  }

  const isDifficultClear = lineCount === 4 || (isTSpin && lineCount > 0);
  const isB2B = isDifficultClear && state.backToBack;
  const nextBackToBack =
    lineCount === 0 ? state.backToBack : isDifficultClear;

  let scoreGained = basePoints * state.level;
  if (isB2B) {
    scoreGained = Math.round(scoreGained * 1.5);
  }

  const nextCombo = lineCount > 0 ? state.combo + 1 : -1;
  if (nextCombo > 0) {
    scoreGained += 50 * nextCombo * state.level;
  }

  const totalLines = state.lines + lineCount;
  const nextLevel = Math.max(state.startLevel, state.startLevel + Math.floor(totalLines / 10));

  let callout: CalloutInfo | null = state.callout;
  if (lineCount > 0 || isTSpin) {
    const parts: string[] = [];
    if (isTSpin) {
      const names = ['T-SPIN', 'T-SPIN SINGLE', 'T-SPIN DOUBLE', 'T-SPIN TRIPLE'];
      parts.push(names[lineCount] ?? 'T-SPIN');
    } else {
      const names = ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'TETRIS'];
      parts.push(names[lineCount] ?? `${lineCount}×`);
    }
    const subParts: string[] = [];
    if (isB2B) subParts.push('B2B');
    if (nextCombo > 0) subParts.push(`${nextCombo}× Combo`);
    if (scoreGained > 0) subParts.push(`+${scoreGained}`);
    callout = makeCallout(parts[0], subParts.join(' · ') || undefined);
  }

  if (completelyAboveVisible) {
    return {
      state: {
        ...state,
        board,
        active: null,
        status: 'gameover',
        score: state.score + scoreGained,
        lines: totalLines,
        level: nextLevel,
        combo: nextCombo,
        backToBack: nextBackToBack,
        piecesPlaced: state.piecesPlaced + 1,
        tetrisCount: state.tetrisCount + (lineCount === 4 ? 1 : 0),
        callout,
      },
      outcome: {
        locked: true,
        clearedRows,
        isTSpin,
        isBackToBack: isB2B,
        scoreGained,
        gameOver: true,
      },
    };
  }

  const drawn = drawNextPiece(state.queue, state.bag, rng);
  const spawned = createSpawnPiece(drawn.nextType);
  const canSpawn = canPlacePiece(board, spawned);

  return {
    state: {
      ...state,
      board,
      active: canSpawn ? spawned : null,
      canHold: true,
      queue: drawn.queue,
      bag: drawn.bag,
      status: canSpawn ? 'playing' : 'gameover',
      score: state.score + scoreGained,
      lines: totalLines,
      level: nextLevel,
      combo: nextCombo,
      backToBack: nextBackToBack,
      piecesPlaced: state.piecesPlaced + 1,
      tetrisCount: state.tetrisCount + (lineCount === 4 ? 1 : 0),
      lastAction: 'none',
      lastKickUsed: false,
      callout,
    },
    outcome: {
      locked: true,
      clearedRows,
      isTSpin,
      isBackToBack: isB2B,
      scoreGained,
      gameOver: !canSpawn,
    },
  };
}

export function hardDrop(
  state: TetrisState,
  rng: () => number = Math.random
): { state: TetrisState; distance: number; outcome: LockOutcome } {
  if (state.status !== 'playing' || !state.active) {
    return {
      state,
      distance: 0,
      outcome: {
        locked: false,
        clearedRows: [],
        isTSpin: false,
        isBackToBack: false,
        scoreGained: 0,
        gameOver: false,
      },
    };
  }

  const targetRow = getGhostRow(state.board, state.active);
  const distance = Math.max(0, targetRow - state.active.row);
  const droppedState: TetrisState = {
    ...state,
    active: { ...state.active, row: targetRow },
    score: state.score + distance * 2,
    lastAction: distance > 0 ? 'move' : state.lastAction,
  };

  const { state: lockedState, outcome } = lockActivePiece(droppedState, rng);
  return {
    state: lockedState,
    distance,
    outcome: {
      ...outcome,
      scoreGained: outcome.scoreGained + distance * 2,
    },
  };
}

export function holdActivePiece(
  state: TetrisState,
  rng: () => number = Math.random
): { state: TetrisState; held: boolean } {
  if (state.status !== 'playing' || !state.active || !state.canHold) {
    return { state, held: false };
  }

  const currentType = state.active.type;
  if (state.hold === null) {
    const drawn = drawNextPiece(state.queue, state.bag, rng);
    const spawned = createSpawnPiece(drawn.nextType);
    if (!canPlacePiece(state.board, spawned)) {
      return {
        held: true,
        state: {
          ...state,
          hold: currentType,
          canHold: false,
          active: null,
          queue: drawn.queue,
          bag: drawn.bag,
          status: 'gameover',
        },
      };
    }
    return {
      held: true,
      state: {
        ...state,
        hold: currentType,
        canHold: false,
        active: spawned,
        queue: drawn.queue,
        bag: drawn.bag,
        lastAction: 'none',
        lastKickUsed: false,
      },
    };
  }

  const swapped = createSpawnPiece(state.hold);
  if (!canPlacePiece(state.board, swapped)) {
    return {
      held: true,
      state: {
        ...state,
        hold: currentType,
        canHold: false,
        active: null,
        status: 'gameover',
      },
    };
  }

  return {
    held: true,
    state: {
      ...state,
      hold: currentType,
      canHold: false,
      active: swapped,
      lastAction: 'none',
      lastKickUsed: false,
    },
  };
}
