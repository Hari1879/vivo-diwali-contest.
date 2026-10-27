import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ContestApi } from '../core/api';
import { ContestSessionService } from '../core/session';
import { ContestLayout } from './contest-layout';
import { SCRATCH_MESSAGE } from './contest.config';
import { ScratchCard } from './scratch-card';

@Component({
  selector: 'app-play-page',
  imports: [ContestLayout, ScratchCard],
  template: `
    <app-contest-layout [showBanner]="false">
      <div class="head">
        <span class="step">Step 2 of 3</span>
        <h1>Hi {{ firstName }}, scratch to celebrate!</h1>
        <p>Scratch the card below to reveal your Diwali wish.</p>
      </div>

      <div class="stage">
        <app-scratch-card (revealed)="onRevealed()">
          <div class="diya" aria-hidden="true"></div>
          <h2>{{ message.title }}</h2>
          <p>{{ message.body }}</p>
        </app-scratch-card>
      </div>

      <button class="btn gold block" [disabled]="!revealed() || saving()" (click)="next()">
        @if (saving()) { <span class="spinner dark"></span> } Continue
      </button>
    </app-contest-layout>
  `,
  styles: `
    .head { text-align: center; margin-bottom: 18px; }
    .step { display: inline-block; font-size: 12px; font-weight: 600; color: var(--vivo-blue);
            background: #eef1ff; padding: 4px 10px; border-radius: 99px; margin-bottom: 10px; }
    h1 { font-size: 22px; color: var(--navy); }
    .head p { color: var(--muted); margin: 0; font-size: 14px; }
    .stage { background: linear-gradient(180deg, var(--navy-2), var(--navy)); border-radius: 18px; padding: 16px 16px 6px; margin-bottom: 20px; }
    h2 { font-size: 28px; margin: 6px 0; }
    p { line-height: 1.5; margin: 0; font-size: 15px; }
    .diya {
      width: 56px; height: 56px; margin-bottom: 4px;
      background: radial-gradient(ellipse 10px 16px at 50% 34%, #fff6c2, #ffb000 70%, transparent 72%),
                  radial-gradient(ellipse 28px 12px at 50% 78%, #c97a00 98%, transparent 100%);
    }
    .spinner.dark { border-color: rgba(11, 20, 64, .3); border-top-color: var(--navy); }
  `,
})
export class PlayPage {
  private session = inject(ContestSessionService);
  private api = inject(ContestApi);
  private router = inject(Router);

  protected message = SCRATCH_MESSAGE;
  protected revealed = signal(false);
  protected saving = signal(false);
  protected firstName = (this.session.value?.name ?? '').split(' ')[0] || 'there';

  protected onRevealed(): void {
    this.revealed.set(true);
  }

  protected next(): void {
    const s = this.session.value;
    if (!s) {
      void this.router.navigate(['/thank-you'], { replaceUrl: true });
      return;
    }
    this.saving.set(true);
    // The entry is already saved; marking "played" is best-effort, so always move on.
    const done = () => {
      this.session.clear();
      void this.router.navigate(['/thank-you'], { replaceUrl: true });
    };
    this.api.markPlayed(s.entryId, s.playToken).subscribe({ next: done, error: done });
  }
}
