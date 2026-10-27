import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi, MobileModel, errorMessage } from '../core/api';

@Component({
  selector: 'app-settings-page',
  imports: [FormsModule],
  template: `
    <div class="admin-page">
      <h1>Settings</h1>
      <p class="sub">Store list and mobile models shown on the registration form.</p>

      <section class="panel">
        <h2>Mobile models</h2>
        <p class="muted small">These appear in the Mobile Model dropdown. Customers can also pick "Other" and type a model.</p>
        <form class="row" (ngSubmit)="addModel()">
          <div class="field"><input class="input sm" name="model" [(ngModel)]="newModel" maxlength="100" placeholder="e.g. vivo V60" /></div>
          <button class="btn small" type="submit" [disabled]="!newModel.trim()">Add model</button>
        </form>
        <ul class="models">
          @for (m of models(); track m.id) {
            <li>{{ m.name }} <button class="btn small ghost" (click)="removeModel(m)">Remove</button></li>
          } @empty {
            <li class="muted">No models yet</li>
          }
        </ul>
      </section>

      <section class="panel">
        <h2>Update store list</h2>
        <p class="muted small">Upload the store list (.xlsx or .csv) with columns <strong>Store code</strong>, <strong>Store name</strong> and <strong>Zone</strong>. Existing stores are updated and new ones added.</p>
        <div class="row">
          <input #file type="file" accept=".xlsx,.csv" (change)="storeFile = $any($event.target).files?.[0] ?? null" />
          <button class="btn small" [disabled]="!storeFile || uploading()" (click)="uploadStores(file)">
            @if (uploading()) { <span class="spinner"></span> } Upload
          </button>
        </div>
      </section>

      @if (message()) { <div class="alert success">{{ message() }}</div> }
      @if (error()) { <div class="alert error">{{ error() }}</div> }
    </div>
  `,
  styles: `
    .small { font-size: 13px; margin: 0 0 12px; }
    .row { align-items: center; }
    .models { list-style: none; padding: 0; margin: 16px 0 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 8px; }
    .models li { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; }
  `,
})
export class SettingsPage implements OnInit {
  private api = inject(AdminApi);

  protected models = signal<MobileModel[]>([]);
  protected newModel = '';
  protected storeFile: File | null = null;
  protected uploading = signal(false);
  protected message = signal<string | null>(null);
  protected error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadModels();
  }

  private loadModels(): void {
    this.api.models().subscribe((m) => this.models.set(m));
  }

  addModel(): void {
    this.api.addModel(this.newModel.trim()).subscribe({
      next: () => {
        this.newModel = '';
        this.loadModels();
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  removeModel(m: MobileModel): void {
    if (!confirm(`Remove "${m.name}" from the dropdown?`)) return;
    this.api.deleteModel(m.id).subscribe({
      next: () => this.loadModels(),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  uploadStores(input: HTMLInputElement): void {
    if (!this.storeFile) return;
    this.uploading.set(true);
    this.message.set(null);
    this.error.set(null);
    this.api.uploadStores(this.storeFile).subscribe({
      next: (r) => {
        this.message.set(`Store list updated: ${r.imported} stores imported, ${r.invalidRows} invalid rows skipped. Total stores: ${r.totalStores}.`);
        this.uploading.set(false);
        this.storeFile = null;
        input.value = '';
      },
      error: (e) => {
        this.error.set(errorMessage(e, 'Upload failed'));
        this.uploading.set(false);
      },
    });
  }
}
