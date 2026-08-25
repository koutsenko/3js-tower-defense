import type { GameRuntime } from '../game/GameRuntime';
import type { GameSnapshot } from '../game/types';

export class FinalOverlay {
  readonly root: HTMLElement;

  private readonly outcome: HTMLElement;
  private readonly killedValue: HTMLElement;
  private readonly escapedValue: HTMLElement;
  private readonly coinsValue: HTMLElement;
  private readonly restartButton: HTMLButtonElement;
  private readonly onRestart = (): void => {
    this.runtime.dispatch({ type: 'Restart' });
    this.render(this.runtime.getSnapshot());
  };

  constructor(
    container: HTMLElement,
    private readonly runtime: GameRuntime,
  ) {
    this.root = document.createElement('section');
    this.root.className = 'final-overlay';
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('role', 'dialog');
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="final-panel">
        <h2 data-final="outcome"></h2>
        <dl>
          <div><dt>Killed</dt><dd data-final="killed"></dd></div>
          <div><dt>Escaped</dt><dd data-final="escaped"></dd></div>
          <div><dt>Coins remaining</dt><dd data-final="coins"></dd></div>
        </dl>
        <button type="button">Restart</button>
      </div>
    `;

    this.outcome = getElement(this.root, '[data-final="outcome"]');
    this.killedValue = getElement(this.root, '[data-final="killed"]');
    this.escapedValue = getElement(this.root, '[data-final="escaped"]');
    this.coinsValue = getElement(this.root, '[data-final="coins"]');
    this.restartButton = getElement<HTMLButtonElement>(this.root, 'button');
    this.restartButton.addEventListener('click', this.onRestart);
    container.append(this.root);
    this.render(runtime.getSnapshot());
  }

  render(snapshot: GameSnapshot): void {
    const isTerminal =
      snapshot.status === 'Victory' || snapshot.status === 'Defeat';
    this.root.hidden = !isTerminal;

    if (!isTerminal) {
      return;
    }

    this.outcome.textContent = snapshot.status;
    this.killedValue.textContent = String(snapshot.killedCount);
    this.escapedValue.textContent = String(snapshot.escapedCount);
    this.coinsValue.textContent = String(snapshot.coins);
  }

  dispose(): void {
    this.restartButton.removeEventListener('click', this.onRestart);
    this.root.remove();
  }
}

function getElement<ElementType extends HTMLElement = HTMLElement>(
  root: HTMLElement,
  selector: string,
): ElementType {
  const element = root.querySelector<ElementType>(selector);
  if (element === null) {
    throw new Error(`Missing final overlay element: ${selector}`);
  }
  return element;
}
