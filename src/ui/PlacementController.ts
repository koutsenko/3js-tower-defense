import {
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  Plane,
  PlaneGeometry,
  Raycaster,
  Vector2,
  Vector3,
  type Camera,
} from 'three';
import { levelConfig, type LevelConfig } from '../config/levelConfig';
import { createGridCell, type GridCell } from '../game/grid';
import type {
  BuildRejectionCode,
  BuildValidation,
  CommandResult,
} from '../game/types';
import { getBuildRejectionMessage, type BuildFeedback } from './buildFeedback';

const VALID_COLOR = 0x32d26f;
const INVALID_COLOR = 0xe5484d;

export interface PlacementRuntime {
  validateBuild(cell: GridCell): BuildValidation;
  dispatch(command: {
    readonly type: 'BuildTower';
    readonly cell: GridCell;
  }): CommandResult;
}

export class PlacementController {
  readonly root = new Group();
  private readonly raycaster = new Raycaster();
  private readonly groundPlane = new Plane(new Vector3(0, 1, 0), 0);
  private readonly hitPoint = new Vector3();
  private readonly highlightMaterial = new MeshBasicMaterial({
    color: VALID_COLOR,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    side: DoubleSide,
  });
  private readonly highlight: Mesh;
  private lastCursorPosition = { x: 0, y: 0 };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: Camera,
    private readonly runtime: PlacementRuntime,
    private readonly feedback: BuildFeedback,
    private readonly level: Readonly<LevelConfig> = levelConfig,
  ) {
    this.root.name = 'placement-feedback';
    this.highlight = new Mesh(
      new PlaneGeometry(level.cellSize * 0.92, level.cellSize * 0.92),
      this.highlightMaterial,
    );
    this.highlight.name = 'placement-highlight';
    this.highlight.rotation.x = -Math.PI / 2;
    this.highlight.visible = false;
    this.root.add(this.highlight);

    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerleave', this.handlePointerLeave);
    canvas.addEventListener('click', this.handleClick);
  }

  dispose(): void {
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerleave', this.handlePointerLeave);
    this.canvas.removeEventListener('click', this.handleClick);
    this.highlight.geometry.dispose();
    this.highlightMaterial.dispose();
    this.feedback.dispose();
    this.root.removeFromParent();
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    this.lastCursorPosition = { x: event.clientX, y: event.clientY };
    const cell = this.pickCell(event.clientX, event.clientY);

    if (cell === null) {
      this.clearHover();
      return;
    }

    const validation = this.runtime.validateBuild(cell);
    this.highlight.visible = true;
    this.highlight.position.set(
      cell.x * this.level.cellSize,
      0.04,
      cell.y * this.level.cellSize,
    );
    this.highlightMaterial.color.setHex(
      validation.ok ? VALID_COLOR : INVALID_COLOR,
    );
    this.feedback.showHint(
      validation.ok ? null : getBuildRejectionMessage(validation.code),
      this.lastCursorPosition,
    );
  };

  private readonly handlePointerLeave = (): void => {
    this.clearHover();
  };

  private readonly handleClick = (event: MouseEvent): void => {
    const cell = this.pickCell(event.clientX, event.clientY);
    if (cell === null) {
      return;
    }

    const result = this.runtime.dispatch({ type: 'BuildTower', cell });
    if (!result.ok && isBuildRejectionCode(result.code)) {
      this.feedback.showToast(getBuildRejectionMessage(result.code));
    }

    this.handlePointerMove(event as PointerEvent);
  };

  private pickCell(clientX: number, clientY: number): GridCell | null {
    const bounds = this.canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) {
      return null;
    }

    const pointer = new Vector2(
      ((clientX - bounds.left) / bounds.width) * 2 - 1,
      -((clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    this.camera.updateMatrixWorld(true);
    this.raycaster.setFromCamera(pointer, this.camera);
    const hit = this.raycaster.ray.intersectPlane(
      this.groundPlane,
      this.hitPoint,
    );
    if (hit === null) {
      return null;
    }

    const x = Math.floor(hit.x / this.level.cellSize + 0.5);
    const y = Math.floor(hit.z / this.level.cellSize + 0.5);
    if (x < 0 || y < 0 || x >= this.level.width || y >= this.level.height) {
      return null;
    }

    return createGridCell(x, y);
  }

  private clearHover(): void {
    this.highlight.visible = false;
    this.feedback.clear();
  }
}

function isBuildRejectionCode(code: string): code is BuildRejectionCode {
  return code !== 'INVALID_SESSION_STATE';
}
