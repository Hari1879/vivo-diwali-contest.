import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminApi, Stats, errorMessage } from '../core/api';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink],
  template: `
    <div class="admin-page">
      <div class="top">
        <div>
          <h1>Dashboard</h1>
          <p class="sub">Live contest summary (IST)</p>
        </div>
        <button class="btn small ghost" (click)="load()">Refresh</button>
      </div>

      @if (error()) { <div class="alert error">{{ error() }}</div> }

      @if (stats(); as s) {
        <div class="tiles">
          <a class="tile" routerLink="../entries"><span>Total entries</span><strong>{{ s.total }}</strong></a>
          <div class="tile"><span>Today</span><strong>{{ s.today }}</strong></div>
          <a class="tile" routerLink="../entries" [queryParams]="{ status: 'review' }"><span>Needs review</span><strong>{{ s.review }}</strong></a>
          <div class="tile"><span>Played scratch card</span><strong>{{ s.played }}</strong></div>
          <a class="tile" routerLink="../imeis"><span>Eligible IMEIs uploaded</span><strong>{{ s.eligibleImeis }}</strong></a>
          <div class="tile"><span>Stores loaded</span><strong>{{ s.stores }}</strong></div>
        </div>

        <div class="grid">
          <section class="panel">
            <h2>Entries by branch</h2>
            @if (!s.byBranch.length) { <p class="muted">No entries yet.</p> }
            @for (b of s.byBranch; track b.branch) {
              <div class="bar-row">
                <span class="label">{{ b.branch }}</span>
                <span class="bar"><span [style.width.%]="(b.count / maxBranch()) * 100"></span></span>
                <span class="val">{{ b.count }}</span>
              </div>
            }
          </section>
          <section class="panel">
            <h2>Entries by day</h2>
            @if (!s.daily.length) { <p class="muted">No entries yet.</p> }
            @for (d of dailyDesc(); track d.day) {
              <div class="bar-row">
                <span class="label">{{ d.day }}</span>
                <span class="bar"><span [style.width.%]="(d.count / maxDaily()) * 100"></span></span>
                <span class="val">{{ d.count }}</span>
              </div>
            }
          </section>
        </div>
      } @else if (!error()) {
        <p class="muted">Loading…</p>
      }
    </div>
  `,
  styles: `
    .top { display: flex; justify-content: space-between; align-items: flex-start; }
    .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .tile { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 16px; text-decoration: none; color: inherit; display: flex; flex-direction: column; gap: 6px; }
    a.tile:hover { border-color: var(--vivo-blue); }
    .tile span { font-size: 13px; color: var(--muted); }
    .tile strong { font: 700 28px var(--font-head); color: var(--navy); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; }
    .bar-row { display: grid; grid-template-columns: 130px 1fr 48px; gap: 10px; align-items: center; margin-bottom: 8px; font-size: 13px; }
    .label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bar { height: 10px; background: #eef1ff; border-radius: 99px; overflow: hidden; }
    .bar span { display: block; height: 100%; background: var(--vivo-blue); border-radius: 99px; }
    .val { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
  `,
})
export class DashboardPage implements OnInit {
  private api = inject(AdminApi);
  protected stats = signal<Stats | null>(null);
  protected error = signal<string | null>(null);
  protected maxBranch = computed(() => Math.max(1, ...(this.stats()?.byBranch.map((b) => b.count) ?? [1])));
  protected maxDaily = computed(() => Math.max(1, ...(this.stats()?.daily.map((d) => d.count) ?? [1])));
  protected dailyDesc = computed(() => [...(this.stats()?.daily ?? [])].reverse());

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.error.set(null);
    this.api.stats().subscribe({
      next: (s) => this.stats.set(s),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
}
