import { Component } from '@angular/core';
import { ContestLayout } from './contest-layout';

@Component({
  selector: 'app-thank-you-page',
  imports: [ContestLayout],
  template: `
    <app-contest-layout>
      <div class="wrap">
        <div class="badge" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="36" height="36"><path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M5 12.5l4.5 4.5L19 7.5"/></svg>
        </div>
        <h1>Thank you for participating!</h1>
        <p>Your entry for the vivo Diwali Contest has been received.</p>
        <p class="wish">Wishing you and your family a very Happy Diwali.</p>
      </div>
    </app-contest-layout>
  `,
  styles: `
    .wrap { text-align: center; padding: 12px 4px 8px; }
    .badge {
      width: 72px; height: 72px; margin: 0 auto 16px; border-radius: 50%;
      display: grid; place-items: center; color: var(--navy);
      background: radial-gradient(circle at 35% 30%, var(--gold-soft), var(--gold));
      box-shadow: 0 0 0 8px rgba(245, 183, 0, .15);
    }
    h1 { font-size: 24px; color: var(--navy); }
    p { color: var(--muted); line-height: 1.6; margin: 0 0 6px; }
    .wish { color: var(--text); font-weight: 600; margin-top: 14px; }
  `,
})
export class ThankYouPage {}
