import { describe, expect, it } from 'vitest';

describe('project toolchain', () => {
  it('runs tests in the DOM environment', () => {
    const element = document.createElement('div');

    element.textContent = 'ready';

    expect(element.textContent).toBe('ready');
  });
});
