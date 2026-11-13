import { describe, expect, it } from 'vitest';
import {
  BOARD_COLS,
  BUFFER_ROWS,
  createBag,
  createEmptyBoard,
  createInitialTetrisState,
  getGhostRow,
  getGravityIntervalMs,
  getPieceCells,
  hardDrop,
  holdActivePiece,
  lockActivePiece,
  movePiece,
  rotatePiece,
  TOTAL_ROWS,
} from '../src/engine/tetrisEngine.ts';
import type { TetrominoType } from '../src/engine/types.ts';

describe('tetrisEngine', () => {
  it('generates a complete 7-piece bag permutation', () => {
    const bag = createBag(() => 0.42);
    expect(bag).toHaveLength(7);
    expect(new Set(bag).size).toBe(7);
  });

  it('spawns initial state preserving all 7 pieces across active + queue + bag', () => {
    const state = createInitialTetrisState(1);
    expect(state.active).not.toBeNull();
    expect(state.queue).toHaveLength(3);
    const firstSeven: TetrominoType[] = [state.active!.type, ...state.queue, ...state.bag];
    expect(firstSeven).toHaveLength(7);
    expect(new Set(firstSeven).size).toBe(7);
  });

  it('moves left/right and stops at board boundaries', () => {
    let state = createInitialTetrisState(1);
    for (let i = 0; i < 10; i++) {
      state = movePiece(state, -1, 0).state;
    }
    const leftMinCol = Math.min(...getPieceCells(state.active!).map((c) => c.col));
    expect(leftMinCol).toBe(0);

    for (let i = 0; i < 15; i++) {
      state = movePiece(state, 1, 0).state;
    }
    const rightMaxCol = Math.max(...getPieceCells(state.active!).map((c) => c.col));
    expect(rightMaxCol).toBe(BOARD_COLS - 1);
  });

  it('performs SRS wall kicks when rotating against a wall', () => {
    const base = createInitialTetrisState(1);
    // Force an I-piece vertically on column 0 (rotation 3), then rotate CW/CCW into horizontal
    const state = {
      ...base,
      active: { type: 'I' as const, rotation: 1 as const, col: 0, row: BUFFER_ROWS + 4 },
    };
    const res = rotatePiece(state, 1);
    expect(res.rotated).toBe(true);
    const cols = getPieceCells(res.state.active!).map((c) => c.col);
    expect(Math.min(...cols)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...cols)).toBeLessThan(BOARD_COLS);
  });

  it('locks active piece cleanly on hard drop and awards distance + line clear points', () => {
    const base = createInitialTetrisState(1);
    const board = createEmptyBoard();
    // Fill bottom row except columns 3..6 so an I-piece clears a single line on hard drop
    for (let c = 0; c < BOARD_COLS; c++) {
      if (c < 3 || c > 6) {
        board[TOTAL_ROWS - 1][c] = 'J';
      }
    }
    const state = {
      ...base,
      board,
      active: { type: 'I' as const, rotation: 0 as const, col: 3, row: BUFFER_ROWS },
    };
    const expectedGhostRow = getGhostRow(board, state.active);
    expect(expectedGhostRow).toBe(TOTAL_ROWS - 2); // I-piece matrix has filled bar at local row 1

    const { state: next, distance, outcome } = hardDrop(state);
    expect(distance).toBe(TOTAL_ROWS - 2 - BUFFER_ROWS);
    expect(outcome.clearedRows).toHaveLength(1);
    expect(next.lines).toBe(1);
    expect(next.score).toBe(distance * 2 + 100);
    // Bottom row should now be empty after clear
    expect(next.board[TOTAL_ROWS - 1].every((c) => c === null)).toBe(true);
  });

  it('clears a 4-line Tetris and awards Back-to-Back bonus on the second consecutive Tetris', () => {
    const base = createInitialTetrisState(2);
    const makeReadyBoard = () => {
      const board = createEmptyBoard();
      for (let r = TOTAL_ROWS - 4; r < TOTAL_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
          if (c !== 0) board[r][c] = 'T';
        }
      }
      return board;
    };

    const firstDrop = hardDrop({
      ...base,
      board: makeReadyBoard(),
      active: { type: 'I', rotation: 1, col: -2, row: BUFFER_ROWS }, // vertical bar at col 0
    });
    expect(firstDrop.outcome.clearedRows).toHaveLength(4);
    expect(firstDrop.state.backToBack).toBe(true);
    expect(firstDrop.state.tetrisCount).toBe(1);

    const secondDrop = hardDrop({
      ...firstDrop.state,
      board: makeReadyBoard(),
      active: { type: 'I', rotation: 1, col: -2, row: BUFFER_ROWS },
    });
    expect(secondDrop.outcome.clearedRows).toHaveLength(4);
    expect(secondDrop.outcome.isBackToBack).toBe(true);
    expect(secondDrop.state.callout?.sublabel).toContain('B2B');
  });

  it('allows holding once per lock and resets hold after locking', () => {
    const start = createInitialTetrisState(1);
    const firstType = start.active!.type;
    const secondType = start.queue[0];

    const heldOnce = holdActivePiece(start);
    expect(heldOnce.held).toBe(true);
    expect(heldOnce.state.hold).toBe(firstType);
    expect(heldOnce.state.active!.type).toBe(secondType);
    expect(heldOnce.state.canHold).toBe(false);

    // Second hold before locking should be rejected
    const heldTwice = holdActivePiece(heldOnce.state);
    expect(heldTwice.held).toBe(false);

    // Locking restores canHold
    const dropped = hardDrop(heldOnce.state);
    expect(dropped.state.canHold).toBe(true);
  });

  it('triggers gameover when spawn cells are blocked and scales gravity smoothly with level', () => {
    const start = createInitialTetrisState(1);
    const board = createEmptyBoard();
    // Block center spawn columns (without filling an entire row that would clear)
    for (let c = 2; c <= 8; c++) {
      board[BUFFER_ROWS][c] = 'O';
      board[BUFFER_ROWS + 1][c] = 'O';
    }
    const res = lockActivePiece({
      ...start,
      board,
      active: { type: 'O', rotation: 0, col: 4, row: BUFFER_ROWS + 2 },
    });
    expect(res.outcome.gameOver).toBe(true);
    expect(res.state.status).toBe('gameover');

    expect(getGravityIntervalMs(1)).toBeGreaterThan(getGravityIntervalMs(5));
    expect(getGravityIntervalMs(10)).toBeGreaterThanOrEqual(60);
  });
});
