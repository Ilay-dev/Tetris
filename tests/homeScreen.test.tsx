import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HomeScreen } from '../src/components/HomeScreen.tsx';

describe('Tetris HomeScreen', () => {
  it('renders a button linking back to the GundiGames dashboard', () => {
    const html = renderToString(
      <HomeScreen
        config={{ startLevel: 1, ghostEnabled: true, theme: 'accent' }}
        highScore={0}
        bestLines={0}
        soundEnabled
        onToggleSound={() => {}}
        onChangeConfig={() => {}}
        onStartGame={() => {}}
      />
    );

    expect(html).toContain('href="https://gundigame.vercel.app"');
    expect(html).toContain('Zurück zum Dashboard');
  });
});
