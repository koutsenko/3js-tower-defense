import { describe, expect, it } from 'vitest';
import { REVISION } from 'three';

describe('project toolchain', () => {
  it('runs tests in the DOM environment', () => {
    const element = document.createElement('div');

    element.textContent = 'ready';

    expect(element.textContent).toBe('ready');
  });

  it('loads Three.js through the application toolchain', () => {
    expect(Number(REVISION)).toBeGreaterThan(0);
  });
});
