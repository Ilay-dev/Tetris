import { PIECE_STYLES, PREVIEW_SHAPES } from '../engine/pieceMeta.ts';
import type { TetrominoType, VisualTheme } from '../engine/types.ts';

interface PiecePreviewProps {
  type: TetrominoType | null;
  theme: VisualTheme;
  size?: 'sm' | 'md';
  dimmed?: boolean;
}

export function PiecePreview({
  type,
  theme,
  size = 'md',
  dimmed = false,
}: PiecePreviewProps) {
  const cellPx = size === 'sm' ? 10 : 14;
  const gapPx = size === 'sm' ? 1.5 : 2;
  const boxHeight = size === 'sm' ? 28 : 40;

  if (!type) {
    return (
      <div
        style={{ height: boxHeight }}
        className="flex items-center justify-center text-zinc-700 font-mono-code text-[11px]"
      >
        —
      </div>
    );
  }

  const shape = PREVIEW_SHAPES[type];
  const style = PIECE_STYLES[type];
  const fill = theme === 'mono' ? style.monoFill : style.fill;
  const border = theme === 'mono' ? style.monoBorder : style.border;

  return (
    <div
      style={{ height: boxHeight }}
      className={`flex items-center justify-center transition-opacity duration-150 ${
        dimmed ? 'opacity-35' : 'opacity-100'
      }`}
    >
      <div
        className="flex flex-col"
        style={{ gap: `${gapPx}px` }}
      >
        {shape.map((row, rIdx) => (
          <div
            key={rIdx}
            className="flex"
            style={{ gap: `${gapPx}px` }}
          >
            {row.map((filled, cIdx) => (
              <div
                key={cIdx}
                style={{
                  width: cellPx,
                  height: cellPx,
                  backgroundColor: filled ? fill : 'transparent',
                  borderColor: filled ? border : 'transparent',
                }}
                className={
                  filled
                    ? 'rounded-[3px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]'
                    : ''
                }
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
