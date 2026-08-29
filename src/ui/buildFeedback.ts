import type { BuildRejectionCode } from '../game/types';

export const BUILD_REJECTION_MESSAGES: Readonly<Record<BuildRejectionCode, string>> = Object.freeze({
  SESSION_ENDED: 'The session has ended',
  GAME_NOT_STARTED: 'Start the game first',
  OUT_OF_BOUNDS: 'Choose a cell inside the grid',
  PATH_CELL: 'Cannot build on the path',
  OCCUPIED: 'This cell is occupied',
  INSUFFICIENT_FUNDS: 'Not enough coins',
});

export interface CursorPosition {
  readonly x: number;
  readonly y: number;
}

export interface BuildFeedback {
  showHint(message: string | null, position: CursorPosition): void;
  showToast(message: string): void;
  clear(): void;
  dispose(): void;
}

const TOAST_DURATION_MS = 1800;

export class BuildFeedbackView implements BuildFeedback {
  private readonly hint: HTMLDivElement;
  private readonly toast: HTMLDivElement;
  private toastTimer: number | undefined;

  constructor(container: HTMLElement = document.body) {
    this.hint = createFeedbackElement('build-hint');
    this.toast = createFeedbackElement('build-toast');
    this.hint.setAttribute('role', 'status');
    this.toast.setAttribute('role', 'alert');
    container.append(this.hint, this.toast);
  }

  showHint(message: string | null, position: CursorPosition): void {
    this.hint.hidden = message === null;
    this.hint.textContent = message ?? '';
    this.hint.style.left = `${position.x + 14}px`;
    this.hint.style.top = `${position.y + 14}px`;
  }

  showToast(message: string): void {
    window.clearTimeout(this.toastTimer);
    this.toast.textContent = message;
    this.toast.hidden = false;
    this.toastTimer = window.setTimeout(() => {
      this.toast.hidden = true;
      this.toast.textContent = '';
      this.toastTimer = undefined;
    }, TOAST_DURATION_MS);
  }

  clear(): void {
    this.hint.hidden = true;
    this.hint.textContent = '';
  }

  dispose(): void {
    window.clearTimeout(this.toastTimer);
    this.hint.remove();
    this.toast.remove();
  }
}

export function getBuildRejectionMessage(code: BuildRejectionCode): string {
  return BUILD_REJECTION_MESSAGES[code];
}

function createFeedbackElement(className: string): HTMLDivElement {
  const element = document.createElement('div');
  element.className = className;
  element.hidden = true;
  return element;
}
