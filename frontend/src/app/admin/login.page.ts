import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminApi, errorMessage } from '../core/api';
import { AuthService } from '../core/auth';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule],
  template: `
    <div class="wrap">
      <form class="box" (ngSubmit)="login()">
        <h1>Admin Login</h1>
        <p class="muted">vivo Diwali Contest</p>
        @if (error()) { <div class="alert error" role="alert">{{ error() }}</div> }
        <div class="field">
          <label for="u">Username</label>
          <input id="u" class="input" name="username" [(ngModel)]="username" autocomplete="username" required />
        </div>
        <div class="field">
          <label for="p">Password</label>
          <input id="p" class="input" name="password" type="password" [(ngModel)]="password" autocomplete="current-password" required />
        </div>
        <button class="btn block" type="submit" [disabled]="loading() || !username || !password">
          @if (loading()) { <span class="spinner"></span> } Log in
        </button>
      </form>
    </div>
  `,
  styles: `
    .wrap { min-height: 100dvh; display: grid; place-items: center; padding: 16px; background: linear-gradient(180deg, var(--navy-2), var(--navy)); }
    .box { width: 100%; max-width: 380px; background: #fff; border-radius: 16px; padding: 28px 24px; border-top: 4px solid var(--gold); }
    h1 { font-size: 22px; }
    .muted { margin: 0 0 20px; font-size: 14px; }
  `,
})
export class LoginPage {
  private api = inject(AdminApi);
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  protected loading = signal(false);
  protected error = signal<string | null>(null);

  login(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.login(this.username, this.password).subscribe({
      next: (res) => {
        this.auth.setSession(res.token, res.username);
        void this.router.navigate(['/admin/dashboard']);
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(errorMessage(e, 'Login failed'));
      },
    });
  }
}
