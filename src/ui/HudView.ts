import { TOWER_COST } from '../config/gameConfig';
import type { GameRuntime } from '../game/GameRuntime';
import { getPreparationCountdown, getRemainingCount } from '../game/selectors';
import type { GameSnapshot } from '../game/types';

export class HudView {
  readonly root: HTMLElement;

  private readonly coinsValue: HTMLElement;
  private readonly baseHpValue: HTMLElement;
  private readonly remainingValue: HTMLElement;
  private readonly towerCostValue: HTMLElement;
  private readonly statusValue: HTMLElement;
  private readonly countdown: HTMLElement;
  private readonly countdownValue: HTMLElement;
  private readonly startButton: HTMLButtonElement;
  private readonly onStart = (): void => {
    this.runtime.dispatch({ type: 'StartGame' });
    this.render(this.runtime.getSnapshot());
  };

  constructor(
    container: HTMLElement,
    private readonly runtime: GameRuntime,
  ) {
    this.root = document.createElement('section');
    this.root.className = 'hud';
    this.root.setAttribute('aria-label', 'Game status');
    this.root.innerHTML = `
      <dl class="hud-stats">
        <div><dt>Coins</dt><dd data-hud="coins"></dd></div>
        <div><dt>Base HP</dt><dd data-hud="base-hp"></dd></div>
        <div><dt>Remaining</dt><dd data-hud="remaining"></dd></div>
        <div><dt>Tower cost</dt><dd data-hud="tower-cost"></dd></div>
        <div><dt>Status</dt><dd data-hud="status"></dd></div>
      </dl>
      <p class="hud-countdown" data-hud="countdown" hidden>
        Wave starts in <strong data-hud="countdown-value"></strong>
      </p>
      <button class="hud-start" type="button">Start</button>
    `;

    this.coinsValue = getElement(this.root, '[data-hud="coins"]');
    this.baseHpValue = getElement(this.root, '[data-hud="base-hp"]');
    this.remainingValue = getElement(this.root, '[data-hud="remaining"]');
    this.towerCostValue = getElement(this.root, '[data-hud="tower-cost"]');
    this.statusValue = getElement(this.root, '[data-hud="status"]');
    this.countdown = getElement(this.root, '[data-hud="countdown"]');
    this.countdownValue = getElement(this.root, '[data-hud="countdown-value"]');
    this.startButton = getElement<HTMLButtonElement>(this.root, '.hud-start');
    this.startButton.addEventListener('click', this.onStart);
    container.append(this.root);
    this.render(runtime.getSnapshot());
  }

  render(snapshot: GameSnapshot): void {
    this.coinsValue.textContent = String(snapshot.coins);
    this.baseHpValue.textContent = String(snapshot.baseHp);
    this.remainingValue.textContent = String(getRemainingCount(snapshot));
    this.towerCostValue.textContent = String(TOWER_COST);
    this.statusValue.textContent = snapshot.status;
    this.startButton.disabled = snapshot.status !== 'Ready';

    const countdown = getPreparationCountdown(snapshot);
    this.countdown.hidden = countdown === null;
    this.countdownValue.textContent = countdown === null ? '' : String(Math.ceil(countdown));
  }

  dispose(): void {
    this.startButton.removeEventListener('click', this.onStart);
    this.root.remove();
  }
}

function getElement<ElementType extends HTMLElement = HTMLElement>(root: HTMLElement, selector: string): ElementType {
  const element = root.querySelector<ElementType>(selector);
  if (element === null) {
    throw new Error(`Missing HUD element: ${selector}`);
  }
  return element;
}
