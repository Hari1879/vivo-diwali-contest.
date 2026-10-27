import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AdminApi, ContestApi, Entry, EntryFilters, EntryStatus, errorMessage } from '../core/api';
import { istDate, saveBlob } from './download';

@Component({
  selector: 'app-entries-page',
  imports: [FormsModule],
  template: `
    <div class="admin-page">
      <h1>Entries</h1>
      <p class="sub">{{ total() }} entries match the filters</p>

      <section class="panel">
        <form class="row" (ngSubmit)="apply()">
          <div class="field">
            <label for="s">Search</label>
            <input id="s" class="input sm" name="search" [(ngModel)]="f.search" placeholder="Name, phone, IMEI, shop" />
          </div>
          <div class="field">
            <label for="b">Branch</label>
            <select id="b" class="input sm" name="branch" [(ngModel)]="f.branch">
              <option value="">All branches</option>
              @for (b of branches(); track b) { <option [value]="b">{{ b }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="st">Status</label>
            <select id="st" class="input sm" name="status" [(ngModel)]="f.status">
              <option value="">All</option>
              <option value="valid">Valid</option>
              <option value="review">Review</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div class="field">
            <label for="from">From</label>
            <input id="from" class="input sm" type="date" name="from" [(ngModel)]="f.from" />
          </div>
          <div class="field">
            <label for="to">To</label>
            <input id="to" class="input sm" type="date" name="to" [(ngModel)]="f.to" />
          </div>
          <button class="btn small" type="submit">Apply</button>
          <button class="btn small ghost" type="button" (click)="reset()">Clear</button>
        </form>
        <div class="exports">
          <span class="muted">Export filtered entries:</span>
          <button class="btn small ghost" (click)="export('xlsx')" [disabled]="exporting()">Excel (.xlsx)</button>
          <button class="btn small ghost" (click)="export('csv')" [disabled]="exporting()">CSV</button>
        </div>
      </section>

      @if (error()) { <div class="alert error">{{ error() }}</div> }

      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Registered</th><th>Status</th><th>Name</th><th>Contact</th><th>Branch</th><th>Shop</th>
              <th>Mobile No.</th><th>IMEI</th><th>Model</th><th>Price</th><th>Played</th>
            </tr>
          </thead>
          <tbody>
            @for (e of items(); track e.id) {
              <tr>
                <td>{{ date(e.createdAt) }}</td>
                <td>
                  <select class="status" [class]="'pill ' + e.status" [ngModel]="e.status" (ngModelChange)="setStatus(e, $event)"
                          [title]="e.reviewReason ?? ''">
                    <option value="valid">valid</option>
                    <option value="review">review</option>
                    <option value="rejected">rejected</option>
                  </select>
                </td>
                <td>{{ e.name }}</td>
                <td>{{ e.contactNumber }}</td>
                <td>{{ e.branch }}</td>
                <td><span class="code">{{ e.shopCode }}</span><br /><span class="muted small">{{ e.shopName }}</span></td>
                <td>{{ e.mobileNumber }}</td>
                <td class="mono">{{ e.imei }}</td>
                <td>{{ e.mobileModel }}</td>
                <td class="num">{{ e.mobilePrice.toLocaleString('en-IN') }}</td>
                <td>{{ e.played ? 'Yes' : 'No' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="11" class="muted center">{{ loading() ? 'Loading…' : 'No entries found' }}</td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pager">
        <button class="btn small ghost" [disabled]="page() <= 1" (click)="go(page() - 1)">Previous</button>
        <span>Page {{ page() }} of {{ pages() }}</span>
        <button class="btn small ghost" [disabled]="page() >= pages()" (click)="go(page() + 1)">Next</button>
      </div>
    </div>
  `,
  styles: `
    .exports { display: flex; gap: 8px; align-items: center; margin-top: 16px; flex-wrap: wrap; font-size: 13px; }
    .code { font-weight: 600; }
    .small { font-size: 12px; }
    .mono { font-variant-numeric: tabular-nums; }
    .center { text-align: center; padding: 24px; }
    .status { border: 0; font: 600 12px var(--font-body); cursor: pointer; }
    .pager { display: flex; justify-content: center; align-items: center; gap: 16px; margin: 16px 0; font-size: 14px; }
  `,
})
export class EntriesPage implements OnInit {
  private api = inject(AdminApi);
  private contest = inject(ContestApi);
  private route = inject(ActivatedRoute);

  protected f: EntryFilters = { search: '', branch: '', status: '', from: '', to: '' };
  protected items = signal<Entry[]>([]);
  protected total = signal(0);
  protected page = signal(1);
  protected limit = 25;
  protected pages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit)));
  protected branches = signal<string[]>([]);
  protected loading = signal(false);
  protected exporting = signal(false);
  protected error = signal<string | null>(null);
  protected date = istDate;

  ngOnInit(): void {
    const status = this.route.snapshot.queryParamMap.get('status');
    if (status) this.f.status = status;
    this.contest.config().subscribe((c) => this.branches.set(c.branches));
    this.load();
  }

  apply(): void {
    this.page.set(1);
    this.load();
  }

  reset(): void {
    this.f = { search: '', branch: '', status: '', from: '', to: '' };
    this.apply();
  }

  go(p: number): void {
    this.page.set(p);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.entries({ ...this.f, page: this.page(), limit: this.limit }).subscribe({
      next: (r) => {
        this.items.set(r.items);
        this.total.set(r.total);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }

  setStatus(e: Entry, status: EntryStatus): void {
    const prev = e.status;
    this.items.update((list) => list.map((x) => (x.id === e.id ? { ...x, status } : x)));
    this.api.setStatus(e.id, status).subscribe({
      error: (err) => {
        this.items.update((list) => list.map((x) => (x.id === e.id ? { ...x, status: prev } : x)));
        this.error.set(errorMessage(err));
      },
    });
  }

  export(format: 'xlsx' | 'csv'): void {
    this.exporting.set(true);
    this.api.exportEntries(this.f, format).subscribe({
      next: (blob) => {
        const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        saveBlob(blob, `diwali-entries-${day}.${format}`);
        this.exporting.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e, 'Export failed'));
        this.exporting.set(false);
      },
    });
  }
}
