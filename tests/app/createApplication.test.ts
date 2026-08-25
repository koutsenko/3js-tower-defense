import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApplication } from '../../src/app/createApplication';

describe('createApplication', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not schedule another frame when rendering stops the application', () => {
    let scheduledFrame: FrameRequestCallback | undefined;
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      scheduledFrame = callback;
      return 1;
    });
    const cancelFrame = vi.fn();
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);

    const application = createApplication({
      renderFrame: () => application.stop(),
    });

    application.start();
    scheduledFrame?.(0);

    expect(cancelFrame).toHaveBeenCalledWith(1);
    expect(requestFrame).toHaveBeenCalledTimes(1);
  });
});
