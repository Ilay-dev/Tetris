import type { TetrominoType } from './types.ts';

export interface PieceStyle {
  type: TetrominoType;
  fill: string;
  border: string;
  glow: string;
  ghostBorder: string;
  monoFill: string;
  monoBorder: string;
}

export const PIECE_STYLES: Record<TetrominoType, PieceStyle> = {
  I: {
    type: 'I',
    fill: '#0ea5e9',
    border: 'rgba(186, 230, 253, 0.55)',
    glow: 'rgba(14, 165, 233, 0.25)',
    ghostBorder: 'rgba(56, 189, 248, 0.45)',
    monoFill: '#f4f4f5',
    monoBorder: 'rgba(255, 255, 255, 0.7)',
  },
  O: {
    type: 'O',
    fill: '#eab308',
    border: 'rgba(254, 240, 138, 0.5)',
    glow: 'rgba(234, 179, 8, 0.22)',
    ghostBorder: 'rgba(250, 204, 21, 0.45)',
    monoFill: '#d4d4d8',
    monoBorder: 'rgba(255, 255, 255, 0.55)',
  },
  T: {
    type: 'T',
    fill: '#a855f7',
    border: 'rgba(233, 213, 255, 0.5)',
    glow: 'rgba(168, 85, 247, 0.24)',
    ghostBorder: 'rgba(192, 132, 252, 0.45)',
    monoFill: '#a1a1aa',
    monoBorder: 'rgba(255, 255, 255, 0.45)',
  },
  S: {
    type: 'S',
    fill: '#22c55e',
    border: 'rgba(187, 247, 208, 0.5)',
    glow: 'rgba(34, 197, 94, 0.22)',
    ghostBorder: 'rgba(74, 222, 128, 0.45)',
    monoFill: '#71717a',
    monoBorder: 'rgba(228, 228, 231, 0.4)',
  },
  Z: {
    type: 'Z',
    fill: '#dc2626',
    border: 'rgba(254, 202, 202, 0.48)',
    glow: 'rgba(220, 38, 38, 0.24)',
    ghostBorder: 'rgba(248, 113, 113, 0.45)',
    monoFill: '#e4e4e7',
    monoBorder: 'rgba(255, 255, 255, 0.6)',
  },
  J: {
    type: 'J',
    fill: '#3b82f6',
    border: 'rgba(191, 219, 254, 0.5)',
    glow: 'rgba(59, 130, 246, 0.24)',
    ghostBorder: 'rgba(96, 165, 250, 0.45)',
    monoFill: '#52525b',
    monoBorder: 'rgba(212, 212, 216, 0.45)',
  },
  L: {
    type: 'L',
    fill: '#f97316',
    border: 'rgba(254, 215, 170, 0.5)',
    glow: 'rgba(249, 115, 22, 0.24)',
    ghostBorder: 'rgba(251, 146, 60, 0.45)',
    monoFill: '#3f3f46',
    monoBorder: 'rgba(212, 212, 216, 0.4)',
  },
};

export const PREVIEW_SHAPES: Record<TetrominoType, number[][]> = {
  I: [
    [1, 1, 1, 1],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
};
