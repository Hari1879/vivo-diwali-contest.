import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API } from './api';
import { readStore, writeStore } from './session';

const TOKEN_KEY = 'vivo-diwali-admin-token';
const USER_KEY = 'vivo-diwali-admin-user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private token = signal<string | null>(readStore('local', TOKEN_KEY));
  readonly username = signal<string | null>(readStore('local', USER_KEY));
  readonly loggedIn = computed(() => !!this.token());

  get accessToken(): string | null {
    return this.token();
  }

  setSession(token: string, username: string): void {
    this.token.set(token);
    this.username.set(username);
    writeStore('local', TOKEN_KEY, token);
    writeStore('local', USER_KEY, username);
  }

  logout(): void {
    this.token.set(null);
    this.username.set(null);
    writeStore('local', TOKEN_KEY, null);
    writeStore('local', USER_KEY, null);
  }
}

/** Adds the admin token to admin API calls; sends the user to login when it expires. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(`${API}/admin`) || req.url.endsWith('/admin/login')) return next(req);
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.accessToken;
  const authed = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(authed).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        auth.logout();
        void router.navigate(['/admin/login']);
      }
      return throwError(() => err);
    }),
  );
};

export const adminGuard: CanActivateFn = () =>
  inject(AuthService).loggedIn() ? true : inject(Router).createUrlTree(['/admin/login']);
