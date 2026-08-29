import { Mesh, MeshBasicMaterial, OrthographicCamera } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { GameRuntime } from '../../src/game/GameRuntime';
import { createInitialState } from '../../src/game/state';
import { PlacementController } from '../../src/ui/PlacementController';
import {
  BUILD_REJECTION_MESSAGES,
  BuildFeedbackView,
  getBuildRejectionMessage,
  type BuildFeedback,
} from '../../src/ui/buildFeedback';

describe('placement feedback (FR-003, FR-004, FR-011; AC-002, AC-003, AC-009, AC-015)', () => {
  it('maps every rejection reason to readable English feedback', () => {
    expect(BUILD_REJECTION_MESSAGES).toEqual({
      SESSION_ENDED: 'The session has ended',
      GAME_NOT_STARTED: 'Start the game first',
      OUT_OF_BOUNDS: 'Choose a cell inside the grid',
      PATH_CELL: 'Cannot build on the path',
      OCCUPIED: 'This cell is occupied',
      INSUFFICIENT_FUNDS: 'Not enough coins',
    });
  });

  it('shows DOM hint and temporary rejection toast', () => {
    vi.useFakeTimers();
    const container = document.createElement('div');
    const feedback = new BuildFeedbackView(container);

    feedback.showHint('Cannot build on the path', { x: 20, y: 30 });
    const hint = container.querySelector<HTMLDivElement>('.build-hint')!;
    expect(hint.hidden).toBe(false);
    expect(hint.textContent).toBe('Cannot build on the path');
    expect(hint.style.left).toBe('34px');
    expect(hint.style.top).toBe('44px');

    feedback.showToast('Not enough coins');
    const toast = container.querySelector<HTMLDivElement>('.build-toast')!;
    expect(toast.hidden).toBe(false);
    vi.runAllTimers();
    expect(toast.hidden).toBe(true);

    feedback.dispose();
    expect(container.children).toHaveLength(0);
    vi.useRealTimers();
  });

  it('raycasts a grid cell and colors hover from runtime validation', () => {
    const runtime = new GameRuntime();
    const feedback = createFeedbackSpy();
    const { canvas, camera } = createPickingFixture();
    const controller = new PlacementController(canvas, camera, runtime, feedback);
    const highlight = controller.root.getObjectByName('placement-highlight') as Mesh;

    moveToCell(canvas, camera, 2, 3);

    expect(highlight.visible).toBe(true);
    expect((highlight.material as MeshBasicMaterial).color.getHex()).toBe(0xe5484d);
    expect(feedback.showHint).toHaveBeenLastCalledWith(
      getBuildRejectionMessage('GAME_NOT_STARTED'),
      expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
    );

    runtime.dispatch({ type: 'StartGame' });
    moveToCell(canvas, camera, 2, 3);
    expect((highlight.material as MeshBasicMaterial).color.getHex()).toBe(0x32d26f);
    expect(feedback.showHint).toHaveBeenLastCalledWith(
      null,
      expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
    );

    controller.dispose();
  });

  it('clears feedback outside the grid and when the pointer leaves', () => {
    const feedback = createFeedbackSpy();
    const { canvas, camera } = createPickingFixture();
    const controller = new PlacementController(canvas, camera, new GameRuntime(), feedback);
    const highlight = controller.root.getObjectByName('placement-highlight') as Mesh;

    moveToCell(canvas, camera, 2, 3);
    canvas.dispatchEvent(new MouseEvent('pointermove', { clientX: 1201, clientY: 400 }));
    expect(highlight.visible).toBe(false);
    expect(feedback.clear).toHaveBeenCalled();

    moveToCell(canvas, camera, 2, 3);
    canvas.dispatchEvent(new MouseEvent('pointerleave'));
    expect(highlight.visible).toBe(false);

    controller.dispose();
  });

  it('sends clicks only through the command boundary and preserves rejected state', () => {
    const runtime = new GameRuntime();
    const dispatch = vi.spyOn(runtime, 'dispatch');
    const feedback = createFeedbackSpy();
    const { canvas, camera } = createPickingFixture();
    const controller = new PlacementController(canvas, camera, runtime, feedback);
    const initialSnapshot = runtime.getSnapshot();

    clickCell(canvas, camera, 2, 3);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'BuildTower',
      cell: { x: 2, y: 3 },
    });
    expect(runtime.getSnapshot()).toEqual(initialSnapshot);
    expect(feedback.showToast).toHaveBeenCalledWith('Start the game first');

    runtime.dispatch({ type: 'StartGame' });
    clickCell(canvas, camera, 2, 3);
    expect(runtime.getSnapshot().towers).toHaveLength(1);
    expect(runtime.getSnapshot().coins).toBe(50);

    controller.dispose();
  });

  it('does not mutate terminal gameplay state on placement click', () => {
    const state = createInitialState();
    state.status = 'Victory';
    const runtime = new GameRuntime(state);
    const feedback = createFeedbackSpy();
    const { canvas, camera } = createPickingFixture();
    const controller = new PlacementController(canvas, camera, runtime, feedback);
    const snapshot = runtime.getSnapshot();

    clickCell(canvas, camera, 2, 3);

    expect(runtime.getSnapshot()).toEqual(snapshot);
    expect(feedback.showToast).toHaveBeenCalledWith('The session has ended');
    controller.dispose();
  });
});

function createFeedbackSpy(): BuildFeedback {
  return {
    showHint: vi.fn(),
    showToast: vi.fn(),
    clear: vi.fn(),
    dispose: vi.fn(),
  };
}

function createPickingFixture(): {
  canvas: HTMLCanvasElement;
  camera: OrthographicCamera;
} {
  const canvas = document.createElement('canvas');
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 1200,
    bottom: 800,
    width: 1200,
    height: 800,
    toJSON: () => ({}),
  });
  const camera = new OrthographicCamera(-0.5, 11.5, 7.5, -0.5, 0.1, 20);
  camera.position.set(5.5, 10, 3.5);
  camera.up.set(0, 0, 1);
  camera.lookAt(5.5, 0, 3.5);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return { canvas, camera };
}

function moveToCell(canvas: HTMLCanvasElement, camera: OrthographicCamera, x: number, y: number): void {
  const pointer = projectCell(camera, x, y);
  canvas.dispatchEvent(
    new MouseEvent('pointermove', {
      clientX: pointer.x,
      clientY: pointer.y,
    }),
  );
}

function clickCell(canvas: HTMLCanvasElement, camera: OrthographicCamera, x: number, y: number): void {
  const pointer = projectCell(camera, x, y);
  canvas.dispatchEvent(
    new MouseEvent('click', {
      clientX: pointer.x,
      clientY: pointer.y,
    }),
  );
}

function projectCell(camera: OrthographicCamera, x: number, y: number): { x: number; y: number } {
  const projected = new Mesh().position.set(x, 0, y).project(camera);
  return {
    x: ((projected.x + 1) / 2) * 1200,
    y: ((1 - projected.y) / 2) * 800,
  };
}
