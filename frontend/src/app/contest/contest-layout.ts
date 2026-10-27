import { Component, input } from '@angular/core';
import { BANNER_URL } from './contest.config';

@Component({
  selector: 'app-contest-layout',
  template: `
    <div class="page"><div class="wrap">
      @if (showBanner()) {
        <img class="banner" [src]="banner" width="1080" height="600" alt="vivo Diwali Contest" fetchpriority="high" />
      }
      <main class="card">
        <ng-content />
      </main>
      <footer>© vivo India · Diwali Contest</footer>
    </div></div>
  `,
  styles: `
    :host { display: block; }
    .page {
      display: flow-root;
      min-height: 100dvh;
      background:
        radial-gradient(circle at 15% 8%, rgba(255, 215, 94, .18) 0 2px, transparent 3px),
        radial-gradient(circle at 85% 20%, rgba(255, 215, 94, .2) 0 2px, transparent 3px),
        radial-gradient(circle at 70% 60%, rgba(255, 215, 94, .12) 0 2px, transparent 3px),
        linear-gradient(180deg, var(--navy-2), var(--navy));
    }
    .wrap { max-width: 520px; margin: 0 auto; padding-bottom: 24px; }
    .banner { display: block; width: 100%; height: auto; aspect-ratio: 1080 / 600; object-fit: cover; }
    .card {
      background: var(--card);
      margin: -24px 16px 0;
      position: relative;
      border-radius: var(--radius);
      padding: 24px 20px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, .25);
      border-top: 4px solid var(--gold);
    }
    .card:first-child { margin-top: 24px; }
    footer { text-align: center; color: rgba(255, 255, 255, .55); font-size: 12px; margin-top: 20px; }
  `,
})
export class ContestLayout {
  showBanner = input(true);
  protected banner = BANNER_URL;
}
