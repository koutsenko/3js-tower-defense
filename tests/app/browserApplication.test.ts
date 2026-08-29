import { Camera, Object3D, Scene } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBrowserApplication, type BrowserApplicationOptions } from '../../src/app/createApplication';
import type { GameEvent } from '../../src/game/events';
import { GameRuntime } from '../../src/game/GameRuntime';
import { createInitialState } from '../../src/game/state';
import type { GameSnapshot } from '../../src/game/types';

describe('browser application composition (FR-001–FR-015; AC-001–AC-012, AC-014, AC-015)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('composes canvas, presentation, placement, resize, and transient events', () => {
    const fixture = createFixture();
    const root = createRoot(1280, 720);
    const application = createBrowserApplication(root, fixture.options);

    expect(root.querySelector('canvas')).toBe(application.canvas);
    expect(fixture.scene.resize).toHaveBeenCalledWith(1280, 720, 2);
    expect(fixture.scene.scene.children).toContain(fixture.placement.root);
    expect(fixture.scene.reconcile).toHaveBeenCalledWith(application.runtime.getSnapshot());
    expect(fixture.scene.presentEvents).toHaveBeenCalledWith([], application.runtime.getSnapshot());
    expect(fixture.hud.render).toHaveBeenCalled();
    expect(fixture.overlay.render).toHaveBeenCalled();
    expect(fixture.scene.render).toHaveBeenCalled();

    application.runtime.dispatch({ type: 'StartGame' });
    application.start();
    fixture.runFrame(0);
    expect(fixture.scene.presentEvents).toHaveBeenLastCalledWith(
      [{ type: 'game-start' }],
      application.runtime.getSnapshot(),
    );
    expect(fixture.onEvents).toHaveBeenCalledWith([{ type: 'game-start' }]);

    application.dispose();
    expect(fixture.placement.dispose).toHaveBeenCalledOnce();
    expect(fixture.hud.dispose).toHaveBeenCalledOnce();
    expect(fixture.overlay.dispose).toHaveBeenCalledOnce();
    expect(fixture.scene.dispose).toHaveBeenCalledOnce();
    expect(root.children).toHaveLength(0);
  });

  it('smoke tests Ready → Preparation → WaveActive → terminal → Ready', () => {
    const fixture = createFixture();
    const application = createBrowserApplication(createRoot(1280, 720), fixture.options);
    application.start();
    fixture.runFrame(0);
    expect(lastSnapshot(fixture.hud).status).toBe('Ready');

    application.runtime.dispatch({ type: 'StartGame' });
    fixture.runFrame(1);
    expect(lastSnapshot(fixture.hud).status).toBe('Preparation');

    for (let time = 251; time <= 20_001; time += 250) {
      fixture.runFrame(time);
    }
    expect(lastSnapshot(fixture.hud).status).toBe('WaveActive');

    let time = 20_251;
    while (application.runtime.getSnapshot().status === 'WaveActive') {
      fixture.runFrame(time);
      time += 250;
    }
    expect(lastSnapshot(fixture.overlay).status).toBe('Defeat');

    application.runtime.dispatch({ type: 'Restart' });
    fixture.runFrame(time);
    expect(lastSnapshot(fixture.hud).status).toBe('Ready');
    expect(lastSnapshot(fixture.hud)).toMatchObject({
      coins: 100,
      baseHp: 3,
      towers: [],
      monsters: [],
      projectiles: [],
    });
    expect(fixture.scene.resetSessionPresentation).toHaveBeenCalledOnce();

    application.dispose();
  });

  it('resets timing and transient effects when Restart and StartGame happen between frames', () => {
    const state = createInitialState();
    state.status = 'Victory';
    state.simulationTime = 42;
    state.phaseStartedAt = 20;
    state.spawnedCount = 10;
    state.killedCount = 10;
    const runtime = new GameRuntime(state);
    const fixture = createFixture();
    const application = createBrowserApplication(createRoot(1280, 720), {
      ...fixture.options,
      runtime,
    });
    application.start();
    fixture.runFrame(0);
    fixture.runFrame(15);

    expect(runtime.dispatch({ type: 'Restart' })).toEqual({ ok: true });
    expect(runtime.dispatch({ type: 'StartGame' })).toEqual({ ok: true });
    fixture.runFrame(18);

    expect(runtime.getSnapshot()).toMatchObject({ status: 'Preparation', simulationTime: 0 });
    expect(fixture.scene.resetSessionPresentation).toHaveBeenCalledOnce();

    fixture.runFrame(26);
    expect(runtime.getSnapshot().simulationTime).toBe(0);
    application.dispose();
  });
});

function createRoot(width: number, height: number): HTMLElement {
  const root = document.createElement('main');
  vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: width,
    bottom: height,
    width,
    height,
    toJSON: () => ({}),
  });
  return root;
}

function createFixture(): {
  options: BrowserApplicationOptions;
  scene: ReturnType<typeof createSceneSpy>;
  hud: ReturnType<typeof createSnapshotViewSpy>;
  overlay: ReturnType<typeof createSnapshotViewSpy>;
  placement: ReturnType<typeof createPlacementSpy>;
  onEvents: ReturnType<typeof vi.fn>;
  runFrame(timestamp: number): void;
} {
  let scheduledFrame: FrameRequestCallback | undefined;
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      scheduledFrame = callback;
      return 1;
    }),
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('devicePixelRatio', 2);

  const scene = createSceneSpy();
  const hud = createSnapshotViewSpy();
  const overlay = createSnapshotViewSpy();
  const placement = createPlacementSpy();
  const onEvents = vi.fn();

  return {
    options: {
      createScene: () => scene,
      createHud: () => hud,
      createFinalOverlay: () => overlay,
      createPlacement: () => placement,
      onEvents,
    },
    scene,
    hud,
    overlay,
    placement,
    onEvents,
    runFrame(timestamp) {
      if (scheduledFrame === undefined) {
        throw new Error('No animation frame scheduled');
      }
      scheduledFrame(timestamp);
    },
  };
}

function createSceneSpy() {
  return {
    scene: new Scene(),
    camera: new Camera(),
    resize: vi.fn(),
    presentEvents: vi.fn<(events: readonly GameEvent[], snapshot: GameSnapshot) => void>(),
    resetSessionPresentation: vi.fn(),
    reconcile: vi.fn<(snapshot: GameSnapshot) => void>(),
    render: vi.fn(),
    dispose: vi.fn(),
  };
}

function createSnapshotViewSpy() {
  return {
    render: vi.fn<(snapshot: GameSnapshot) => void>(),
    dispose: vi.fn(),
  };
}

function createPlacementSpy() {
  return {
    root: new Object3D(),
    dispose: vi.fn(),
  };
}

function lastSnapshot(view: ReturnType<typeof createSnapshotViewSpy>) {
  const calls = view.render.mock.calls;
  const snapshot = calls.at(-1)?.[0];
  if (snapshot === undefined) {
    throw new Error('View has not rendered');
  }
  return snapshot;
}
