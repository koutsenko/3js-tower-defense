import { describe, expect, it } from 'vitest';
import { levelConfig } from '../../src/config/levelConfig';
import { createLevelCamera, isLevelInsideFrustum, resizeLevelCamera } from '../../src/rendering/camera';
import { createLevelPlaceholders } from '../../src/rendering/placeholders';

describe('functional placeholder level scene (FR-002, FR-003, AC-015)', () => {
  it('represents every route and buildable cell without external assets', () => {
    const scene = createLevelPlaceholders(levelConfig);
    const route = scene.getObjectByName('route-cells');
    const buildable = scene.getObjectByName('buildable-cells');

    expect(route?.children).toHaveLength(levelConfig.routeCells.length);
    expect(buildable?.children).toHaveLength(levelConfig.buildableCells.length);
    expect(scene.getObjectByName('entrance')).toBeDefined();
    expect(scene.getObjectByName('exit')).toBeDefined();
    expect(scene.getObjectByName('level-boundary')).toBeDefined();
  });

  it('fits the full padded level in a 1280 by 720 orthographic frustum', () => {
    const camera = createLevelCamera(levelConfig);

    resizeLevelCamera(camera, levelConfig, 1280, 720);

    expect(isLevelInsideFrustum(camera, levelConfig)).toBe(true);
  });

  it('recalculates the frustum for portrait resize', () => {
    const camera = createLevelCamera(levelConfig);

    resizeLevelCamera(camera, levelConfig, 720, 1280);

    expect(isLevelInsideFrustum(camera, levelConfig)).toBe(true);
  });
});
