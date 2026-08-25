import {
  Group,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PlaneGeometry,
} from 'three';
import { MONSTER_HP } from '../config/gameConfig';

const BAR_WIDTH = 0.7;
const BAR_HEIGHT = 0.09;

export function createHealthBar(): Group {
  const healthBar = new Group();
  healthBar.name = 'health-bar';

  const background = new Mesh(
    new PlaneGeometry(BAR_WIDTH, BAR_HEIGHT),
    new MeshBasicMaterial({ color: 0x2b2b2b }),
  );
  background.name = 'health-bar-background';

  const fill = new Mesh(
    new PlaneGeometry(BAR_WIDTH, BAR_HEIGHT * 0.65),
    new MeshBasicMaterial({ color: 0x4bd16f }),
  );
  fill.name = 'health-bar-fill';
  fill.position.z = 0.001;

  healthBar.add(background, fill);
  updateHealthBar(healthBar, MONSTER_HP);
  return healthBar;
}

export function updateHealthBar(
  healthBar: Group,
  hp: number,
  camera?: OrthographicCamera,
): void {
  const ratio = Math.min(1, Math.max(0, hp / MONSTER_HP));
  const fill = healthBar.getObjectByName('health-bar-fill');

  if (!(fill instanceof Mesh)) {
    throw new Error('Health bar fill is missing');
  }

  fill.scale.x = ratio;
  fill.position.x = (-BAR_WIDTH * (1 - ratio)) / 2;
  healthBar.userData.ratio = ratio;

  if (camera) {
    healthBar.quaternion.copy(camera.quaternion);
  }
}
