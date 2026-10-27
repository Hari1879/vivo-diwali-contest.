import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';

/**
 * Canvas scratch card. The foil is drawn on a canvas over the message; scratching
 * erases it. When ~45% is cleared (or "Reveal" is tapped) the card opens fully and
 * `revealed` fires once.
 */
@Component({
  selector: 'app-scratch-card',
  template: `
    <div class="card" #box>
      <div class="reveal" [class.shown]="done()">
        <ng-content />
      </div>
      <canvas
        #canvas
        [class.gone]="done()"
        aria-label="Scratch card. Scratch with your finger to reveal."
        (pointerdown)="start($event)"
        (pointermove)="move($event)"
        (pointerup)="end()"
        (pointercancel)="end()"
        (pointerleave)="end()"
      ></canvas>
    </div>
    @if (!done()) {
      <button type="button" class="reveal-btn" (click)="revealAll()">Tap here to reveal instead</button>
    }
  `,
  styles: `
    :host { display: block; }
    .card {
      position: relative; width: 100%; aspect-ratio: 4 / 3;
      border-radius: 18px; overflow: hidden;
      box-shadow: 0 10px 30px rgba(11, 20, 64, .3);
      user-select: none; -webkit-user-select: none;
    }
    .reveal {
      position: absolute; inset: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      text-align: center; padding: 20px;
      background: radial-gradient(circle at 50% 35%, #fff6d6, #ffe08a 60%, #f5b700);
      color: var(--navy);
      transition: transform .4s ease;
    }
    .reveal.shown { animation: pop .5s ease; }
    canvas {
      position: absolute; inset: 0; width: 100%; height: 100%;
      touch-action: none; cursor: grab;
      transition: opacity .5s ease;
    }
    canvas.gone { opacity: 0; pointer-events: none; }
    .reveal-btn {
      display: block; margin: 14px auto 0; background: none; border: 0;
      color: rgba(255, 255, 255, .8); text-decoration: underline; font: 14px var(--font-body); cursor: pointer;
    }
    @keyframes pop { 0% { transform: scale(.94); } 60% { transform: scale(1.03); } 100% { transform: scale(1); } }
  `,
})
export class ScratchCard implements AfterViewInit, OnDestroy {
  revealed = output<void>();
  protected done = signal(false);

  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private box = viewChild.required<ElementRef<HTMLDivElement>>('box');
  private ctx!: CanvasRenderingContext2D;
  private drawing = false;
  private last: { x: number; y: number } | null = null;
  private moves = 0;
  private ro?: ResizeObserver;

  ngAfterViewInit(): void {
    this.paintFoil();
    this.ro = new ResizeObserver(() => !this.done() && this.paintFoil());
    this.ro.observe(this.box().nativeElement);
  }

  ngOnDestroy(): void {
    this.ro?.disconnect();
  }

  private paintFoil(): void {
    const canvas = this.canvas().nativeElement;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    this.ctx = ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width;
    const h = rect.height;

    // Foil: vivo blue gradient with gold sparkles
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#2c45d6');
    g.addColorStop(0.5, '#415fff');
    g.addColorStop(1, '#1a2a8a');
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(255, 215, 94, ${0.25 + rnd() * 0.6})`;
      const x = rnd() * w;
      const y = rnd() * h;
      const s = 1 + rnd() * 2.5;
      ctx.beginPath();
      ctx.arc(x, y, s, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#ffd75e';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(w / 12)}px Poppins, sans-serif`;
    ctx.fillText('Scratch Here', w / 2, h / 2 - w / 28);
    ctx.fillStyle = 'rgba(255, 255, 255, .85)';
    ctx.font = `500 ${Math.round(w / 26)}px Inter, sans-serif`;
    ctx.fillText('Use your finger to scratch', w / 2, h / 2 + w / 18);
  }

  private point(e: PointerEvent) {
    const rect = this.canvas().nativeElement.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  protected start(e: PointerEvent): void {
    if (this.done()) return;
    this.drawing = true;
    this.canvas().nativeElement.setPointerCapture?.(e.pointerId);
    this.last = this.point(e);
    this.scratch(this.last, this.last);
  }

  protected move(e: PointerEvent): void {
    if (!this.drawing || this.done()) return;
    const p = this.point(e);
    this.scratch(this.last ?? p, p);
    this.last = p;
    if (++this.moves % 12 === 0) this.checkProgress();
  }

  protected end(): void {
    if (!this.drawing) return;
    this.drawing = false;
    this.last = null;
    this.checkProgress();
  }

  private scratch(from: { x: number; y: number }, to: { x: number; y: number }): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const w = this.canvas().nativeElement.getBoundingClientRect().width;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(28, w / 9);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  private checkProgress(): void {
    const canvas = this.canvas().nativeElement;
    if (!this.ctx || this.done()) return;
    // Sample every 16th pixel for speed.
    const data = this.ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let cleared = 0;
    let total = 0;
    for (let i = 3; i < data.length; i += 4 * 16) {
      total++;
      if (data[i] === 0) cleared++;
    }
    if (total && cleared / total > 0.45) this.revealAll();
  }

  protected revealAll(): void {
    if (this.done()) return;
    this.done.set(true);
    try {
      navigator.vibrate?.(40);
    } catch {
      /* not supported */
    }
    this.revealed.emit();
  }
}
