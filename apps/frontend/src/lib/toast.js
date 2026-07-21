/**
 * Minimal toast store.
 *
 * Deliberately a module-level singleton rather than React Context: this app has
 * no Context anywhere and toasts are fired from 20+ files, so a context would
 * mean threading a provider value through every one of them. Import and call:
 *
 *   import { toast } from '../lib/toast';
 *   toast.success('Saved');
 *   toast.error('Could not save');
 *
 * <Toaster /> subscribes once in App.jsx and renders the stack.
 */

let listeners = [];
let toasts = [];
let nextId = 1;

const DEFAULT_DURATION = { success: 3200, info: 3600, error: 5200 };

function emit() {
    listeners.forEach((fn) => fn(toasts));
}

export function subscribe(fn) {
    listeners.push(fn);
    fn(toasts);
    return () => { listeners = listeners.filter((l) => l !== fn); };
}

export function dismiss(id) {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
}

function push(message, tone = 'info', options = {}) {
    if (message === undefined || message === null || message === '') return null;

    const text = typeof message === 'string' ? message : String(message);
    const id = nextId++;
    const duration = options.duration ?? DEFAULT_DURATION[tone] ?? 3600;

    // Collapse duplicates fired in quick succession (e.g. double-click submits)
    const duplicate = toasts.find((t) => t.message === text && t.tone === tone);
    if (duplicate) return duplicate.id;

    toasts = [...toasts, { id, message: text, tone, title: options.title }];
    emit();

    if (duration > 0) setTimeout(() => dismiss(id), duration);
    return id;
}

export const toast = Object.assign(
    (message, options) => push(message, 'info', options),
    {
        success: (message, options) => push(message, 'success', options),
        error: (message, options) => push(message, 'error', options),
        info: (message, options) => push(message, 'info', options),
        dismiss,
    }
);

export default toast;
