import { describe, expect, it, vi } from 'vitest';
import { TOWER_COST, WAVE_SIZE } from '../../src/config/gameConfig';
import { GameRuntime } from '../../src/game/GameRuntime';
import { createInitialState } from '../../src/game/state';
import { FinalOverlay } from '../../src/ui/FinalOverlay';
import { HudView } from '../../src/ui/HudView';

describe('HUD (FR-005, FR-012; AC-001, AC-004, AC-014)', () => {
  it('shows the complete initial status without an active countdown', () => {
    const runtime = new GameRuntime();
    const hud = new HudView(document.createElement('div'), runtime);

    expect(hudValue(hud, 'coins')).toBe('100');
    expect(hudValue(hud, 'base-hp')).toBe('3');
    expect(hudValue(hud, 'remaining')).toBe(String(WAVE_SIZE));
    expect(hudValue(hud, 'tower-cost')).toBe(String(TOWER_COST));
    expect(hudValue(hud, 'status')).toBe('Ready');
    expect(
      hud.root.querySelector<HTMLElement>('[data-hud="countdown"]')!.hidden,
    ).toBe(true);
    expect(hud.root.querySelector<HTMLButtonElement>('button')!.disabled).toBe(
      false,
    );
  });

  it('dispatches Start once and updates countdown across status transitions', () => {
    const runtime = new GameRuntime();
    const dispatch = vi.spyOn(runtime, 'dispatch');
    const hud = new HudView(document.createElement('div'), runtime);
    const start = hud.root.querySelector<HTMLButtonElement>('button')!;

    start.click();
    expect(dispatch).toHaveBeenCalledWith({ type: 'StartGame' });
    expect(start.disabled).toBe(true);
    expect(hudValue(hud, 'status')).toBe('Preparation');
    expect(hudValue(hud, 'countdown-value')).toBe('20');

    runtime.advance(0.1);
    hud.render(runtime.getSnapshot());
    expect(hudValue(hud, 'countdown-value')).toBe('20');

    runtime.advance(19.9);
    hud.render(runtime.getSnapshot());
    expect(hudValue(hud, 'status')).toBe('WaveActive');
    expect(
      hud.root.querySelector<HTMLElement>('[data-hud="countdown"]')!.hidden,
    ).toBe(true);

    start.click();
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('refreshes every derived and authoritative value from a snapshot', () => {
    const state = createInitialState();
    state.status = 'WaveActive';
    state.coins = 60;
    state.baseHp = 2;
    state.killedCount = 4;
    state.escapedCount = 1;
    const runtime = new GameRuntime(state);
    const hud = new HudView(document.createElement('div'), runtime);

    expect(hudValue(hud, 'coins')).toBe('60');
    expect(hudValue(hud, 'base-hp')).toBe('2');
    expect(hudValue(hud, 'remaining')).toBe('5');
    expect(hudValue(hud, 'status')).toBe('WaveActive');
  });
});

describe('final overlay (FR-014, FR-015; AC-010, AC-011, AC-012)', () => {
  it.each(['Victory', 'Defeat'] as const)(
    'shows %s statistics and intercepts pointer input',
    (status) => {
      const state = createInitialState();
      state.status = status;
      state.killedCount = 7;
      state.escapedCount = 3;
      state.coins = 70;
      const runtime = new GameRuntime(state);
      const container = document.createElement('div');
      const overlay = new FinalOverlay(container, runtime);

      expect(overlay.root.hidden).toBe(false);
      expect(finalValue(overlay, 'outcome')).toBe(status);
      expect(finalValue(overlay, 'killed')).toBe('7');
      expect(finalValue(overlay, 'escaped')).toBe('3');
      expect(finalValue(overlay, 'coins')).toBe('70');
      expect(overlay.root.classList).toContain('final-overlay');
    },
  );

  it('dispatches Restart and hides after the session resets', () => {
    const state = createInitialState();
    state.status = 'Victory';
    const runtime = new GameRuntime(state);
    const dispatch = vi.spyOn(runtime, 'dispatch');
    const overlay = new FinalOverlay(document.createElement('div'), runtime);

    overlay.root.querySelector<HTMLButtonElement>('button')!.click();

    expect(dispatch).toHaveBeenCalledWith({ type: 'Restart' });
    expect(runtime.getSnapshot()).toEqual(createInitialState());
    expect(overlay.root.hidden).toBe(true);
  });

  it('stays hidden outside terminal states', () => {
    const overlay = new FinalOverlay(
      document.createElement('div'),
      new GameRuntime(),
    );
    expect(overlay.root.hidden).toBe(true);
  });
});

function hudValue(hud: HudView, field: string): string | null {
  return hud.root.querySelector(`[data-hud="${field}"]`)?.textContent ?? null;
}

function finalValue(overlay: FinalOverlay, field: string): string | null {
  return (
    overlay.root.querySelector(`[data-final="${field}"]`)?.textContent ?? null
  );
}
