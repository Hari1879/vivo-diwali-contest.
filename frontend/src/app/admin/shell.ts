import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header>
      <div class="brand">vivo Diwali Contest <span>Admin</span></div>
      <nav>
        <a routerLink="dashboard" routerLinkActive="active">Dashboard</a>
        <a routerLink="entries" routerLinkActive="active">Entries</a>
        <a routerLink="imeis" routerLinkActive="active">IMEI List</a>
        <a routerLink="settings" routerLinkActive="active">Settings</a>
      </nav>
      <div class="user">
        <span>{{ auth.username() }}</span>
        <button class="btn small ghost" (click)="logout()">Log out</button>
      </div>
    </header>
    <router-outlet />
  `,
  styles: `
    :host { display: block; min-height: 100dvh; background: #f4f6fc; }
    header {
      display: flex; align-items: center; gap: 24px; flex-wrap: wrap;
      padding: 12px 24px; background: var(--navy); color: #fff;
      position: sticky; top: 0; z-index: 10;
    }
    .brand { font: 700 16px var(--font-head); }
    .brand span { color: var(--gold); font-weight: 600; margin-left: 4px; }
    nav { display: flex; gap: 4px; flex: 1; overflow-x: auto; }
    nav a { color: rgba(255,255,255,.75); text-decoration: none; padding: 8px 12px; border-radius: 8px; font-size: 14px; font-weight: 500; white-space: nowrap; }
    nav a:hover { color: #fff; background: rgba(255,255,255,.08); }
    nav a.active { color: var(--navy); background: var(--gold); }
    .user { display: flex; align-items: center; gap: 10px; font-size: 13px; }
    .user .btn { color: #fff; border-color: rgba(255,255,255,.3); }
    .user .btn:hover { background: rgba(255,255,255,.1); }
    @media (max-width: 640px) { header { padding: 10px 16px; gap: 10px; } nav { order: 3; flex-basis: 100%; } }
  `,
})
export class AdminShell {
  protected auth = inject(AuthService);
  private router = inject(Router);

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/admin/login']);
  }
}
