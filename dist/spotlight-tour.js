/**
 * Dependency-free spotlight tour. The host supplies targets and copy only.
 * Targets can be CSS selectors or functions returning an HTMLElement.
 * All tour styling is namespaced; no app-specific selectors are used here.
 */
export class SpotlightTour {
  constructor({ steps, appRoot, storageKey = null, onClose = () => {} }) {
    this.steps = steps;
    this.appRoot = typeof appRoot === 'string' ? document.querySelector(appRoot) : appRoot;
    this.storageKey = storageKey;
    this.onClose = onClose;
    this.index = 0;
    this.active = false;
    this.complete = false;
    this.frame = null;
    this.moveToken = 0;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.focusRect = null;
    this.isMoving = false;
    this.onKey = this.handleKey.bind(this);
    this.onLayout = () => {
      cancelAnimationFrame(this.frame);
      this.frame = requestAnimationFrame(() => this.position());
    };
  }

  // Start is also the public restart API. Capture focus only on the first mount.
  async start(index = 0) {
    if (this.closing) await this.closing;
    if (!this.steps.length) return;
    if (!this.active) {
      this.previousFocus = document.activeElement;
      this.previousInert = this.appRoot?.inert ?? false;
      this.previousOverflow = document.body.style.overflow;
      this.previousGutter = document.documentElement.style.scrollbarGutter;
      document.documentElement.style.scrollbarGutter = 'stable';
      this.focusRect = null;
      this.active = true;
      this.mount();
      if (this.appRoot) this.appRoot.inert = true;
      document.addEventListener('keydown', this.onKey, true);
      window.addEventListener('resize', this.onLayout);
      window.addEventListener('scroll', this.onLayout, true);
    }
    this.complete = false;
    this.card.classList.remove('eli-tour-complete');
    this.hint.hidden = false;
    await this.goTo(Math.max(0, Math.min(index, this.steps.length - 1)));
  }

  mount() {
    this.root = document.createElement('div');
    this.root.className = 'eli-tour';
    this.root.innerHTML = `
      <div class="eli-tour-backdrop" aria-hidden="true"></div>
      <div class="eli-tour-ring" aria-hidden="true"></div>
      <section class="eli-tour-card" role="dialog" aria-modal="true" aria-labelledby="eli-tour-title" aria-describedby="eli-tour-description" tabindex="-1"></section>
      <div class="eli-tour-keyboard"><kbd>←</kbd><kbd>→</kbd> para avanzar · <kbd>Esc</kbd> para salir</div>`;
    document.body.append(this.root);
    this.card = this.root.querySelector('.eli-tour-card');
    this.backdrop = this.root.querySelector('.eli-tour-backdrop');
    this.ring = this.root.querySelector('.eli-tour-ring');
    this.hint = this.root.querySelector('.eli-tour-keyboard');
    this.card.classList.add('eli-tour-changing');
  }

  resolveTarget(step) {
    return typeof step.target === 'function' ? step.target() : document.querySelector(step.target);
  }

  async goTo(index) {
    if (!this.active) return;
    if (index >= this.steps.length) return this.finish();
    if (index < 0) return;
    this.index = index;
    this.target = this.resolveTarget(this.steps[index]);
    // A missing or hidden feature never leaves the user trapped in the overlay.
    if (!this.target || !this.target.getClientRects().length) {
      const nextVisible = this.steps.findIndex((step, i) => i > index && this.resolveTarget(step)?.getClientRects().length);
      return nextVisible >= 0 ? this.goTo(nextVisible) : this.finish();
    }
    const token = ++this.moveToken;
    this.card.classList.add('eli-tour-changing');
    this.card.setAttribute('aria-busy', 'true');
    if (this.focusRect) await this.pause(130);
    if (!this.active || token !== this.moveToken) return;
    document.body.style.overflow = this.previousOverflow;
    this.target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: this.reducedMotion ? 'instant' : 'smooth' });
    await this.animateFocus(() => this.getTargetRect(), token, 620);
    if (!this.active || token !== this.moveToken) return;
    document.body.style.overflow = 'hidden';
    this.renderStep();
    this.position();
    this.card.removeAttribute('aria-busy');
    this.card.classList.remove('eli-tour-changing');
    this.card.focus({ preventScroll: true });
  }

  pause(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, this.reducedMotion ? 0 : milliseconds));
  }

  getTargetRect() {
    const bounds = this.target.getBoundingClientRect();
    const padding = 17;
    return {
      left: Math.max(2, bounds.left - padding),
      top: Math.max(2, bounds.top - padding),
      right: Math.min(this.root.clientWidth - 2, bounds.right + padding),
      bottom: Math.min(this.root.clientHeight - 2, bounds.bottom + padding),
    };
  }

  // A Gaussian mask feathers both the dark layer and its backdrop blur.
  paintFocus(rect) {
    this.focusRect = rect;
    this.ring.hidden = false;
    const width = Math.max(0, rect.right - rect.left);
    const height = Math.max(0, rect.bottom - rect.top);
    const viewportWidth = this.backdrop.clientWidth;
    const viewportHeight = this.backdrop.clientHeight;
    // A self-contained alpha mask avoids browser differences with HTML-to-SVG references.
    const mask = `<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" width="${viewportWidth}" height="${viewportHeight}" viewBox="0 0 ${viewportWidth} ${viewportHeight}"><defs><filter id="feather" x="-100%" y="-100%" width="300%" height="300%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="13"/></filter><mask id="focus" maskUnits="userSpaceOnUse" x="0" y="0" width="${viewportWidth}" height="${viewportHeight}"><rect width="${viewportWidth}" height="${viewportHeight}" fill="white"/><rect x="${rect.left.toFixed(2)}" y="${rect.top.toFixed(2)}" width="${width.toFixed(2)}" height="${height.toFixed(2)}" rx="20" fill="black" filter="url(#feather)"/></mask></defs><rect width="${viewportWidth}" height="${viewportHeight}" fill="white" mask="url(#focus)"/></svg>`;
    const image = `url("data:image/svg+xml,${encodeURIComponent(mask)}")`;
    this.backdrop.style.maskImage = image;
    this.backdrop.style.webkitMaskImage = image;
    Object.assign(this.ring.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${width}px`, height: `${height}px` });
  }

  // Interpolate the aperture itself instead of replacing one cutout with another.
  animateFocus(destination, token, milliseconds) {
    const origin = this.focusRect ?? destination();
    const duration = this.reducedMotion ? 0 : milliseconds;
    this.isMoving = true;
    return new Promise(resolve => {
      let started;
      const tick = now => {
        if (!this.active || token !== this.moveToken) return resolve();
        started ??= now;
        const progress = duration ? Math.min(1, (now - started) / duration) : 1;
        const eased = 1 - Math.pow(1 - progress, 4);
        const end = destination();
        const rect = Object.fromEntries(Object.keys(origin).map(key => [key, origin[key] + (end[key] - origin[key]) * eased]));
        this.paintFocus(rect);
        this.root.classList.add('eli-tour-visible');
        if (progress < 1) requestAnimationFrame(tick);
        else { this.isMoving = false; resolve(); }
      };
      requestAnimationFrame(tick);
    });
  }

  renderStep() {
    const step = this.steps[this.index];
    this.card.innerHTML = `
      <div class="eli-tour-top"><span class="eli-tour-label">CONOCÉ TU ESCRITORIO</span><button class="eli-tour-close" aria-label="Salir del recorrido" title="Salir (Esc)"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M6 18 18 6"/></svg></button></div>
      <div class="eli-tour-step">PASO ${this.index + 1} DE ${this.steps.length}</div>
      <h2 id="eli-tour-title" class="eli-tour-title"></h2>
      <p id="eli-tour-description" class="eli-tour-description"></p>
      <div class="eli-tour-progress" aria-label="Pasos del recorrido">${this.steps.map((_, i) => `<button aria-label="Ir al paso ${i + 1}" ${i === this.index ? 'aria-current="step"' : ''} class="${i < this.index ? 'is-past' : ''}" data-step="${i}"></button>`).join('')}</div>
      <div class="eli-tour-actions"><button class="eli-tour-prev" ${this.index === 0 ? 'disabled' : ''}>← Anterior</button><button class="eli-tour-next">${this.index === this.steps.length - 1 ? 'Terminar recorrido' : 'Siguiente →'}</button></div>
      <div class="eli-tour-footer"><button class="eli-tour-text-button" data-action="restart">↻ Reiniciar</button><button class="eli-tour-text-button" data-action="skip">Saltar recorrido</button></div>`;
    this.card.querySelector('h2').textContent = step.title;
    this.card.querySelector('.eli-tour-description').textContent = step.description;
    this.card.querySelector('.eli-tour-close').onclick = () => this.close('exited');
    this.card.querySelector('.eli-tour-prev').onclick = () => this.goTo(this.index - 1);
    this.card.querySelector('.eli-tour-next').onclick = () => this.goTo(this.index + 1);
    this.card.querySelector('[data-action="restart"]').onclick = () => this.start();
    this.card.querySelector('[data-action="skip"]').onclick = () => this.close('skipped');
    this.card.querySelectorAll('[data-step]').forEach(button => {
      button.onclick = () => this.goTo(Number(button.dataset.step));
    });
  }

  // Recalculate the spotlight and choose a card placement that fits the viewport.
  position() {
    if (!this.active || this.complete || !this.target) return;
    const viewport = { width: this.root.clientWidth, height: this.root.clientHeight };
    const rect = this.getTargetRect();
    if (!this.isMoving) this.paintFocus(rect);
    const gap = 20;
    // Fit next to wide features on smaller desktop viewports.
    this.card.style.width = '';
    const preferredSide = this.steps[this.index].placement;
    const sideSpace = preferredSide === 'right' ? viewport.width - rect.right - gap - 16 : rect.left - gap - 16;
    if (['right', 'left'].includes(preferredSide) && sideSpace >= 270) {
      this.card.style.width = `${Math.min(334, sideSpace)}px`;
    }
    const { width, height } = this.card.getBoundingClientRect();
    const candidates = {
      right: { left: rect.right + gap, top: (rect.top + rect.bottom - height) / 2 },
      bottom: { left: (rect.left + rect.right - width) / 2, top: rect.bottom + gap },
      top: { left: (rect.left + rect.right - width) / 2, top: rect.top - height - gap },
      left: { left: rect.left - width - gap, top: (rect.top + rect.bottom - height) / 2 },
    };
    const preferred = this.steps[this.index].placement ?? 'bottom';
    const order = [preferred, ...Object.keys(candidates).filter(key => key !== preferred)];
    const margin = 16;
    const fits = (point, side) => {
      if (side === 'left' || side === 'right') return point.left >= margin && point.left + width <= viewport.width - margin;
      return point.top >= margin && point.top + height <= viewport.height - margin - 16;
    };
    const selected = order.find(side => fits(candidates[side], side)) ?? 'bottom';
    const point = candidates[selected];
    const left = Math.min(Math.max(margin, point.left), Math.max(margin, viewport.width - width - margin));
    const top = Math.min(Math.max(margin, point.top), Math.max(margin, viewport.height - height - 34));
    Object.assign(this.card.style, { left: `${left}px`, top: `${top}px` });
  }

  async finish() {
    this.complete = true;
    const token = ++this.moveToken;
    this.card.classList.add('eli-tour-changing');
    await this.pause(130);
    if (!this.active || token !== this.moveToken) return;
    const rect = this.focusRect;
    if (rect) {
      const center = { left: (rect.left + rect.right) / 2, right: (rect.left + rect.right) / 2, top: (rect.top + rect.bottom) / 2, bottom: (rect.top + rect.bottom) / 2 };
      await this.animateFocus(() => center, token, 380);
    }
    if (!this.active || token !== this.moveToken) return;

    this.ring.hidden = true;
    this.hint.hidden = true;
    this.card.classList.add('eli-tour-complete');
    this.card.style.width = '';
    this.card.innerHTML = `
      <div class="eli-tour-top"><span class="eli-tour-label">RECORRIDO COMPLETADO</span><button class="eli-tour-close" aria-label="Cerrar recorrido"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M6 18 18 6"/></svg></button></div>
      <div class="eli-tour-success"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></div>
      <h2 id="eli-tour-title" class="eli-tour-title">Listo. Ya estás en casa.</h2>
      <p id="eli-tour-description" class="eli-tour-description">Tus edificios, tus reclamos y tu equipo, en el mismo lugar. El próximo paso lo das vos.</p>
      <div class="eli-tour-actions"><button class="eli-tour-next">Volver al escritorio →</button><button class="eli-tour-text-button">↻ Repetir recorrido</button></div>`;
    this.card.querySelector('.eli-tour-close').onclick = () => this.close('completed');
    this.card.querySelector('.eli-tour-next').onclick = () => this.close('completed');
    this.card.querySelector('.eli-tour-text-button').onclick = () => this.start();
    this.card.classList.remove('eli-tour-changing');
    this.card.focus({ preventScroll: true });
  }

  // Escape, arrows, and a focus trap make every control available by keyboard.
  handleKey(event) {
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); this.close(this.complete ? 'completed' : 'exited'); }
    if (!this.complete && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
      event.preventDefault();
      this.goTo(this.index + (event.key === 'ArrowRight' ? 1 : -1));
    }
    if (event.key !== 'Tab') return;
    const buttons = [...this.card.querySelectorAll('button:not(:disabled)')];
    const first = buttons[0], last = buttons.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === this.card)) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && (document.activeElement === last || document.activeElement === this.card)) { event.preventDefault(); first?.focus(); }
  }

  close(reason = 'exited') {
    if (!this.active) return this.closing;
    this.active = false;
    this.moveToken++;
    cancelAnimationFrame(this.frame);
    document.removeEventListener('keydown', this.onKey, true);
    window.removeEventListener('resize', this.onLayout);
    window.removeEventListener('scroll', this.onLayout, true);
    this.root.classList.remove('eli-tour-visible');
    this.closing = this.pause(240).then(() => {
      this.root.remove();
      if (this.appRoot) this.appRoot.inert = this.previousInert;
      document.body.style.overflow = this.previousOverflow;
      document.documentElement.style.scrollbarGutter = this.previousGutter;
      if (this.storageKey) {
        try { localStorage.setItem(this.storageKey, JSON.stringify({ status: reason, step: this.index + 1 })); } catch { /* Storage may be disabled; the tour still works. */ }
      }
      if (this.previousFocus?.isConnected) this.previousFocus.focus({ preventScroll: true });
      this.onClose({ reason, step: this.index + 1 });
      this.closing = null;
    });
    return this.closing;
  }
}
