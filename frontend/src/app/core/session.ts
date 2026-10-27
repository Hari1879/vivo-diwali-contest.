import { Injectable, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/** Safe wrappers: storage can be blocked in private mode or in-app browsers. */
export function readStore(storage: 'local' | 'session', key: string): string | null {
  try {
    return (storage === 'local' ? localStorage : sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

export function writeStore(storage: 'local' | 'session', key: string, value: string | null): void {
  try {
    const s = storage === 'local' ? localStorage : sessionStorage;
    if (value === null) s.removeItem(key);
    else s.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export interface ContestSession {
  entryId: string;
  playToken: string;
  name: string;
}

const KEY = 'vivo-diwali-entry';

/** Holds the participant's registration between Page 1 -> Page 2 -> Page 3. */
@Injectable({ providedIn: 'root' })
export class ContestSessionService {
  private current = signal<ContestSession | null>(this.load());

  get value(): ContestSession | null {
    return this.current();
  }

  set(s: ContestSession): void {
    this.current.set(s);
    writeStore('session', KEY, JSON.stringify(s));
  }

  clear(): void {
    this.current.set(null);
    writeStore('session', KEY, null);
  }

  private load(): ContestSession | null {
    const raw = readStore('session', KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ContestSession;
    } catch {
      return null;
    }
  }
}

/** Page 2 is only reachable right after a successful registration. */
export const registeredGuard: CanActivateFn = () => {
  const session = inject(ContestSessionService);
  return session.value ? true : inject(Router).createUrlTree(['/']);
};
