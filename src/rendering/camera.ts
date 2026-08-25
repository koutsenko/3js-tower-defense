import { Box3, OrthographicCamera, Vector3, type Camera } from 'three';
import type { LevelConfig } from '../config/levelConfig';

const CAMERA_DISTANCE = 20;
const LEVEL_PADDING = 1.5;
const MIN_VIEWPORT_SIZE = 1;

export function createLevelCamera(
  level: Readonly<LevelConfig>,
): OrthographicCamera {
  const center = getLevelCenter(level);
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 100);

  camera.position.set(
    center.x + CAMERA_DISTANCE,
    CAMERA_DISTANCE,
    center.z + CAMERA_DISTANCE,
  );
  camera.up.set(0, 1, 0);
  camera.lookAt(center);
  camera.updateMatrixWorld(true);

  return camera;
}

export function resizeLevelCamera(
  camera: OrthographicCamera,
  level: Readonly<LevelConfig>,
  viewportWidth: number,
  viewportHeight: number,
): void {
  const width = Math.max(MIN_VIEWPORT_SIZE, viewportWidth);
  const height = Math.max(MIN_VIEWPORT_SIZE, viewportHeight);
  const projectedBounds = getProjectedLevelBounds(camera, level);
  const projectedCenterX = (projectedBounds.min.x + projectedBounds.max.x) / 2;
  const projectedCenterY = (projectedBounds.min.y + projectedBounds.max.y) / 2;
  const requiredWidth = projectedBounds.max.x - projectedBounds.min.x;
  const requiredHeight = projectedBounds.max.y - projectedBounds.min.y;
  const viewportAspect = width / height;
  const contentAspect = requiredWidth / requiredHeight;
  let halfWidth: number;
  let halfHeight: number;

  if (viewportAspect >= contentAspect) {
    halfHeight = requiredHeight / 2;
    halfWidth = halfHeight * viewportAspect;
  } else {
    halfWidth = requiredWidth / 2;
    halfHeight = halfWidth / viewportAspect;
  }

  camera.left = projectedCenterX - halfWidth;
  camera.right = projectedCenterX + halfWidth;
  camera.top = projectedCenterY + halfHeight;
  camera.bottom = projectedCenterY - halfHeight;
  camera.updateProjectionMatrix();
}

export function isLevelInsideFrustum(
  camera: Camera,
  level: Readonly<LevelConfig>,
): boolean {
  camera.updateMatrixWorld(true);

  return getLevelBounds(level)
    .getCorners()
    .every((corner) => {
      const projected = corner.clone().project(camera);
      return (
        projected.x >= -1 &&
        projected.x <= 1 &&
        projected.y >= -1 &&
        projected.y <= 1 &&
        projected.z >= -1 &&
        projected.z <= 1
      );
    });
}

function getProjectedLevelBounds(
  camera: OrthographicCamera,
  level: Readonly<LevelConfig>,
): Box3 {
  camera.updateMatrixWorld(true);
  const bounds = new Box3();

  for (const corner of getLevelBounds(level).getCorners()) {
    bounds.expandByPoint(corner.applyMatrix4(camera.matrixWorldInverse));
  }

  return bounds;
}

function getLevelBounds(level: Readonly<LevelConfig>): Box3WithCorners {
  const halfCell = level.cellSize / 2;

  return new Box3WithCorners(
    new Vector3(-halfCell - LEVEL_PADDING, 0, -halfCell - LEVEL_PADDING),
    new Vector3(
      (level.width - 1) * level.cellSize + halfCell + LEVEL_PADDING,
      LEVEL_PADDING * 2,
      (level.height - 1) * level.cellSize + halfCell + LEVEL_PADDING,
    ),
  );
}

function getLevelCenter(level: Readonly<LevelConfig>): Vector3 {
  return new Vector3(
    ((level.width - 1) * level.cellSize) / 2,
    0,
    ((level.height - 1) * level.cellSize) / 2,
  );
}

class Box3WithCorners extends Box3 {
  getCorners(): Vector3[] {
    const corners: Vector3[] = [];

    for (const x of [this.min.x, this.max.x]) {
      for (const y of [this.min.y, this.max.y]) {
        for (const z of [this.min.z, this.max.z]) {
          corners.push(new Vector3(x, y, z));
        }
      }
    }

    return corners;
  }
}
