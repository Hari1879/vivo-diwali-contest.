import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi, Entry, ImeiUploadResult, errorMessage } from '../core/api';
import { istDate } from './download';

@Component({
  selector: 'app-imeis-page',
  imports: [FormsModule],
  template: `
    <div class="admin-page">
      <h1>IMEI List</h1>
      <p class="sub">Upload the daily IMEI list shared by vivo. New IMEIs are added to the existing list; nothing is removed.</p>

      <section class="panel">
        <h2>Upload daily list</h2>
        <p class="muted small">Excel (.xlsx) or CSV. Every column with "IMEI" in its header is read (IMEI 1 and IMEI 2 both work). Without such a header, the first column is used.</p>
        <div class="row">
          <input #file type="file" accept=".xlsx,.csv" (change)="pick($any($event.target).files)" />
          <button class="btn small" [disabled]="!selected() || uploading()" (click)="upload(file)">
            @if (uploading()) { <span class="spinner"></span> } Upload
          </button>
        </div>
        @if (result(); as r) {
          <div class="alert success">
            <strong>{{ r.fileName }}</strong>: {{ r.totalFound }} IMEIs found · {{ r.added }} added ·
            {{ r.alreadyPresent }} already in list · {{ r.invalidRows }} invalid values skipped.
            Total eligible now: <strong>{{ r.totalEligible }}</strong>
          </div>
        }
        @if (uploadError()) { <div class="alert error">{{ uploadError() }}</div> }
      </section>

      <section class="panel">
        <h2>Check one IMEI</h2>
        <form class="row" (ngSubmit)="check()">
          <div class="field">
            <input class="input sm" name="imei" [(ngModel)]="imei" maxlength="15" inputmode="numeric" placeholder="15-digit IMEI" />
          </div>
          <button class="btn small" type="submit" [disabled]="imei.length !== 15">Check</button>
        </form>
        @if (checkResult(); as c) {
          <div class="alert" [class.success]="c.eligible" [class.error]="!c.eligible">
            {{ c.imei }} is {{ c.eligible ? 'in the eligible list' : 'NOT in the eligible list' }}.
            @if (c.entry) {
              Registered by {{ c.entry.name }} ({{ c.entry.contactNumber }}) on {{ date(c.entry.createdAt) }}.
            } @else {
              Not registered yet.
            }
          </div>
        }
      </section>

      <section class="panel">
        <h2>Upload history</h2>
        <div class="table-wrap">
          <table class="data">
            <thead><tr><th>Uploaded</th><th>File</th><th>Found</th><th>Added</th><th>Already present</th><th>Invalid</th><th>By</th></tr></thead>
            <tbody>
              @for (u of uploads(); track u.id) {
                <tr>
                  <td>{{ date(u.createdAt) }}</td><td>{{ u.fileName }}</td>
                  <td class="num">{{ u.totalFound }}</td><td class="num">{{ u.added }}</td>
                  <td class="num">{{ u.alreadyPresent }}</td><td class="num">{{ u.invalidRows }}</td><td>{{ u.uploadedBy }}</td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="muted">No uploads yet</td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  styles: `
    .small { font-size: 13px; margin: 0 0 12px; }
    .row { align-items: center; }
    .alert { margin: 16px 0 0; }
  `,
})
export class ImeisPage implements OnInit {
  private api = inject(AdminApi);

  protected selected = signal<File | null>(null);
  protected uploading = signal(false);
  protected result = signal<ImeiUploadResult | null>(null);
  protected uploadError = signal<string | null>(null);
  protected uploads = signal<ImeiUploadResult[]>([]);
  protected imei = '';
  protected checkResult = signal<{ imei: string; eligible: boolean; entry: Entry | null } | null>(null);
  protected date = istDate;

  ngOnInit(): void {
    this.loadHistory();
  }

  pick(files: FileList | null): void {
    this.selected.set(files?.[0] ?? null);
    this.result.set(null);
    this.uploadError.set(null);
  }

  upload(input: HTMLInputElement): void {
    const file = this.selected();
    if (!file) return;
    this.uploading.set(true);
    this.api.uploadImeis(file).subscribe({
      next: (r) => {
        this.result.set(r);
        this.uploading.set(false);
        this.selected.set(null);
        input.value = '';
        this.loadHistory();
      },
      error: (e) => {
        this.uploadError.set(errorMessage(e, 'Upload failed'));
        this.uploading.set(false);
      },
    });
  }

  check(): void {
    this.api.checkImei(this.imei.trim()).subscribe({
      next: (r) => this.checkResult.set(r),
      error: (e) => this.uploadError.set(errorMessage(e)),
    });
  }

  private loadHistory(): void {
    this.api.imeiUploads().subscribe((u) => this.uploads.set(u));
  }
}
