import { Group, Mesh, MeshBasicMaterial, OrthographicCamera, PlaneGeometry } from 'three';
import { MONSTER_HP } from '../config/gameConfig';

const BAR_WIDTH_IN_CELLS = 0.7;
const BAR_HEIGHT_IN_CELLS = 0.09;

export function createHealthBar(cellSize = 1): Group {
  const healthBar = new Group();
  healthBar.name = 'health-bar';
  const barWidth = BAR_WIDTH_IN_CELLS * cellSize;
  const barHeight = BAR_HEIGHT_IN_CELLS * cellSize;
  healthBar.userData.width = barWidth;

  const background = new Mesh(new PlaneGeometry(barWidth, barHeight), new MeshBasicMaterial({ color: 0x2b2b2b }));
  background.name = 'health-bar-background';

  const fill = new Mesh(new PlaneGeometry(barWidth, barHeight * 0.65), new MeshBasicMaterial({ color: 0x4bd16f }));
  fill.name = 'health-bar-fill';
  fill.position.z = 0.001 * cellSize;

  healthBar.add(background, fill);
  updateHealthBar(healthBar, MONSTER_HP);
  return healthBar;
}

export function updateHealthBar(healthBar: Group, hp: number, camera?: OrthographicCamera): void {
  const ratio = Math.min(1, Math.max(0, hp / MONSTER_HP));
  const barWidth: unknown = healthBar.userData.width;
  const fill = healthBar.getObjectByName('health-bar-fill');

  if (!(fill instanceof Mesh) || typeof barWidth !== 'number') {
    throw new Error('Health bar geometry is missing');
  }

  fill.scale.x = ratio;
  fill.position.x = (-barWidth * (1 - ratio)) / 2;
  healthBar.userData.ratio = ratio;

  if (camera) {
    healthBar.quaternion.copy(camera.quaternion);
  }
}
