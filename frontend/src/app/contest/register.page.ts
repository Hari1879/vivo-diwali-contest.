import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, map, of, startWith, switchMap, tap } from 'rxjs';
import { ContestApi, ContestConfig, errorMessage } from '../core/api';
import { ContestSessionService } from '../core/session';
import { ContestLayout } from './contest-layout';
import { TERMS_HTML } from './contest.config';

const PHONE = /^[6-9]\d{9}$/;
const OTHER_MODEL = '__other__';

type ShopState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'found'; name: string; branch: string }
  | { kind: 'notFound' }
  | { kind: 'error' };

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, ContestLayout],
  templateUrl: './register.page.html',
  styleUrl: './register.page.scss',
})
export class RegisterPage implements OnInit {
  private fb = inject(FormBuilder).nonNullable;
  private api = inject(ContestApi);
  private router = inject(Router);
  private session = inject(ContestSessionService);
  private destroyRef = inject(DestroyRef);

  protected readonly OTHER_MODEL = OTHER_MODEL;
  protected readonly termsHtml = TERMS_HTML;

  protected config = signal<ContestConfig | null>(null);
  protected configError = signal<string | null>(null);
  protected shop = signal<ShopState>({ kind: 'idle' });
  protected submitting = signal(false);
  protected submitError = signal<string | null>(null);
  protected submitted = signal(false);
  protected showTerms = signal(false);
  protected sameNumber = signal(false);

  protected form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^[A-Za-z][A-Za-z .'-]*$/)]],
    contactNumber: ['', [Validators.required, Validators.pattern(PHONE)]],
    branch: ['', Validators.required],
    shopCode: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9]{3,32}$/)]],
    shopName: [{ value: '', disabled: true }],
    mobileNumber: ['', [Validators.required, Validators.pattern(PHONE)]],
    imei: ['', [Validators.required, Validators.pattern(/^\d{15}$/)]],
    mobileModel: ['', Validators.required],
    otherModel: [''],
    mobilePrice: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
    termsAccepted: [false, Validators.requiredTrue],
  });

  private termsValue = toSignal(
    this.form.controls.termsAccepted.valueChanges.pipe(startWith(false)),
    { initialValue: false },
  );
  private modelValue = toSignal(this.form.controls.mobileModel.valueChanges, { initialValue: '' });
  protected isOtherModel = computed(() => this.modelValue() === OTHER_MODEL);
  protected canContinue = computed(() => this.termsValue() && !this.submitting());

  ngOnInit(): void {
    // A fresh visit to Page 1 starts a new registration.
    this.session.clear();

    this.api.config().subscribe({
      next: (c) => {
        this.config.set(c);
        this.form.controls.mobilePrice.addValidators(minPrice(c.minPrice));
      },
      error: (e) => this.configError.set(errorMessage(e, 'Could not load the contest. Please refresh the page.')),
    });

    // Shop Name auto-fill as soon as a full shop code is typed.
    this.form.controls.shopCode.valueChanges
      .pipe(
        map((v) => v.trim().toUpperCase()),
        tap((v) => {
          this.form.controls.shopName.setValue('');
          this.shop.set(v.length >= 6 ? { kind: 'loading' } : { kind: 'idle' });
        }),
        debounceTime(350),
        distinctUntilChanged(),
        switchMap((code) => {
          if (code.length < 6) return of<ShopState>({ kind: 'idle' });
          return this.api.store(code).pipe(
            map((s): ShopState => ({ kind: 'found', name: s.name, branch: s.branch })),
            catchError((e) => of<ShopState>(e?.status === 404 ? { kind: 'notFound' } : { kind: 'error' })),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => {
        this.shop.set(state);
        if (state.kind === 'found') {
          this.form.controls.shopName.setValue(state.name);
          if (!this.form.controls.branch.value) this.form.controls.branch.setValue(state.branch);
        }
      });

    // Keep Mobile Number in sync when "same as contact number" is ticked.
    this.form.controls.contactNumber.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        if (this.sameNumber()) this.form.controls.mobileNumber.setValue(v);
      });
  }

  protected branchMismatch = computed(() => {
    const s = this.shop();
    return s.kind === 'found' && this.branchValue() && s.branch !== this.branchValue() ? s.branch : null;
  });
  private branchValue = toSignal(this.form.controls.branch.valueChanges, { initialValue: '' });

  protected toggleSameNumber(checked: boolean): void {
    this.sameNumber.set(checked);
    const mobile = this.form.controls.mobileNumber;
    if (checked) {
      mobile.setValue(this.form.controls.contactNumber.value);
      mobile.disable();
    } else {
      mobile.enable();
    }
  }

  /** Strips anything that is not a digit as the user types (for numeric fields). */
  protected digitsOnly(control: 'contactNumber' | 'mobileNumber' | 'imei' | 'mobilePrice', max: number): void {
    const c = this.form.controls[control];
    let clean = c.value.replace(/\D/g, '');
    // Pasted "+91 98765 43210" or "098765 43210" -> "9876543210"
    if (max === 10 && clean.length > 10) clean = clean.replace(/^(91|0)/, '');
    clean = clean.slice(0, max);
    if (clean !== c.value) c.setValue(clean);
  }

  protected showError(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  protected submit(): void {
    this.submitted.set(true);
    this.submitError.set(null);
    const v = this.form.getRawValue();
    const model = v.mobileModel === OTHER_MODEL ? v.otherModel.trim() : v.mobileModel;

    if (this.form.invalid || !model || this.shop().kind !== 'found' || this.branchMismatch()) {
      this.form.markAllAsTouched();
      if (this.shop().kind !== 'found' && this.form.controls.shopCode.valid) {
        this.submitError.set('Please enter a valid Shop Code.');
      } else {
        this.submitError.set('Please correct the highlighted fields.');
      }
      setTimeout(() => document.querySelector('.invalid, .alert.error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }

    this.submitting.set(true);
    this.api
      .register({
        name: v.name.trim(),
        contactNumber: v.contactNumber,
        branch: v.branch,
        shopCode: v.shopCode.trim().toUpperCase(),
        mobileNumber: v.mobileNumber,
        imei: v.imei,
        mobileModel: model,
        mobilePrice: Number(v.mobilePrice),
        termsAccepted: v.termsAccepted,
      })
      .subscribe({
        next: (res) => {
          this.session.set({ entryId: res.entryId, playToken: res.playToken, name: v.name.trim() });
          void this.router.navigate(['/play']);
        },
        error: (e) => {
          this.submitting.set(false);
          this.submitError.set(errorMessage(e));
          setTimeout(() => document.querySelector('.alert.error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        },
      });
  }
}

function minPrice(min: number) {
  return (c: AbstractControl): ValidationErrors | null =>
    c.value && Number(c.value) < min ? { minPrice: min } : null;
}
