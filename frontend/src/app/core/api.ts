import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export const API = '/api';

export interface ContestConfig {
  contestOpen: boolean;
  minPrice: number;
  branches: string[];
  models: string[];
}

export interface StoreInfo {
  code: string;
  name: string;
  branch: string;
}

export interface EntryPayload {
  name: string;
  contactNumber: string;
  branch: string;
  shopCode: string;
  mobileNumber: string;
  imei: string;
  mobileModel: string;
  mobilePrice: number;
  termsAccepted: boolean;
}

export type EntryStatus = 'valid' | 'review' | 'rejected';

export interface Entry extends Omit<EntryPayload, 'termsAccepted'> {
  id: string;
  shopName: string;
  status: EntryStatus;
  reviewReason: string | null;
  played: boolean;
  playedAt: string | null;
  createdAt: string;
}

export interface EntryFilters {
  page?: number;
  limit?: number;
  search?: string;
  branch?: string;
  status?: string;
  from?: string;
  to?: string;
}

export interface Stats {
  total: number;
  valid: number;
  review: number;
  rejected: number;
  played: number;
  today: number;
  eligibleImeis: number;
  stores: number;
  byBranch: { branch: string; count: number }[];
  daily: { day: string; count: number }[];
}

export interface ImeiUploadResult {
  id: number;
  fileName: string;
  totalFound: number;
  added: number;
  alreadyPresent: number;
  invalidRows: number;
  uploadedBy: string;
  createdAt: string;
  totalEligible?: number;
}

export interface MobileModel {
  id: number;
  name: string;
}

/** Turns a Nest error response into one readable sentence. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'No internet connection. Please check your network and try again.';
    if (err.status === 429) return 'Too many attempts. Please wait a minute and try again.';
    const msg = err.error?.message;
    if (Array.isArray(msg)) return msg[0];
    if (typeof msg === 'string') return msg;
  }
  return fallback;
}

function toParams(f: object): HttpParams {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(f)) {
    if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
  }
  return p;
}

@Injectable({ providedIn: 'root' })
export class ContestApi {
  private http = inject(HttpClient);

  config(): Observable<ContestConfig> {
    return this.http.get<ContestConfig>(`${API}/config`);
  }

  store(code: string): Observable<StoreInfo> {
    return this.http.get<StoreInfo>(`${API}/stores/${encodeURIComponent(code)}`);
  }

  register(body: EntryPayload): Observable<{ entryId: string; playToken: string }> {
    return this.http.post<{ entryId: string; playToken: string }>(`${API}/entries`, body);
  }

  markPlayed(entryId: string, playToken: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${API}/entries/${entryId}/played`, { playToken });
  }
}

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private http = inject(HttpClient);

  login(username: string, password: string) {
    return this.http.post<{ token: string; username: string }>(`${API}/admin/login`, { username, password });
  }

  stats() {
    return this.http.get<Stats>(`${API}/admin/stats`);
  }

  entries(f: EntryFilters) {
    return this.http.get<{ items: Entry[]; total: number; page: number; limit: number }>(
      `${API}/admin/entries`,
      { params: toParams(f) },
    );
  }

  exportEntries(f: EntryFilters, format: 'xlsx' | 'csv') {
    const { page: _p, limit: _l, ...rest } = f;
    return this.http.get(`${API}/admin/entries/export`, {
      params: toParams({ ...rest, format }),
      responseType: 'blob',
    });
  }

  setStatus(id: string, status: EntryStatus) {
    return this.http.patch<{ ok: boolean }>(`${API}/admin/entries/${id}/status`, { status });
  }

  uploadImeis(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<ImeiUploadResult>(`${API}/admin/imeis/upload`, fd);
  }

  imeiUploads() {
    return this.http.get<ImeiUploadResult[]>(`${API}/admin/imeis/uploads`);
  }

  checkImei(imei: string) {
    return this.http.get<{ imei: string; eligible: boolean; addedAt: string | null; entry: Entry | null }>(
      `${API}/admin/imeis/${imei}`,
    );
  }

  uploadStores(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ imported: number; invalidRows: number; totalStores: number }>(
      `${API}/admin/stores/upload`,
      fd,
    );
  }

  models() {
    return this.http.get<MobileModel[]>(`${API}/admin/models`);
  }

  addModel(name: string) {
    return this.http.post<MobileModel>(`${API}/admin/models`, { name });
  }

  deleteModel(id: number) {
    return this.http.delete<{ ok: boolean }>(`${API}/admin/models/${id}`);
  }
}
