'use client';

/**
 * Client-side field event tracker.
 *
 * Records focus/blur/input/abandon events on form fields and POSTs them
 * to /api/forms/[id]/field-events. Used by the AI drop-off analyzer.
 *
 * Usage:
 *   const tracker = createFieldEventTracker(formId);
 *   tracker.attach(inputElement, fieldId);
 */

const SESSION_ID_KEY = 'reform_session_id';

function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let id = sessionStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = `ss_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

interface FieldEventTracker {
  attach: (input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, fieldId: string) => void;
  trackSubmit: () => void;
  trackAbandon: () => void;
}

export function createFieldEventTracker(formId: string): FieldEventTracker {
  const sessionId = getSessionId();
  const focusTimes = new Map<string, number>();

  async function sendEvent(event: { fieldId: string; eventType: string; valueLength?: number; timeOnFieldMs?: number }) {
    try {
      // Use sendBeacon for abandon events (page unload) to ensure delivery
      if (event.eventType === 'abandon' && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({
          sessionId,
          fieldId: event.fieldId,
          eventType: event.eventType,
          valueLength: event.valueLength ?? 0,
          timeOnFieldMs: event.timeOnFieldMs ?? 0,
        })], { type: 'application/json' });
        navigator.sendBeacon(`/api/forms/${formId}/field-events`, blob);
        return;
      }
      await fetch(`/api/forms/${formId}/field-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          fieldId: event.fieldId,
          eventType: event.eventType,
          valueLength: event.valueLength ?? 0,
          timeOnFieldMs: event.timeOnFieldMs ?? 0,
        }),
        keepalive: true,
      });
    } catch (e) {
      console.warn('[field-event-tracker] failed to send event', e);
    }
  }

  function attach(input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, fieldId: string) {
    input.addEventListener('focus', () => {
      focusTimes.set(fieldId, Date.now());
      sendEvent({ fieldId, eventType: 'focus' });
    });

    input.addEventListener('blur', () => {
      const focusTime = focusTimes.get(fieldId);
      const timeOnField = focusTime ? Date.now() - focusTime : 0;
      focusTimes.delete(fieldId);
      sendEvent({
        fieldId,
        eventType: 'blur',
        valueLength: input.value.length,
        timeOnFieldMs: timeOnField,
      });
    });

    let inputDebounce: ReturnType<typeof setTimeout> | null = null;
    input.addEventListener('input', () => {
      if (inputDebounce) clearTimeout(inputDebounce);
      inputDebounce = setTimeout(() => {
        sendEvent({ fieldId, eventType: 'input', valueLength: input.value.length });
      }, 500);
    });
  }

  function trackSubmit() {
    sendEvent({ fieldId: '_form', eventType: 'submit' });
  }

  function trackAbandon() {
    for (const [fieldId] of focusTimes) {
      sendEvent({ fieldId, eventType: 'abandon' });
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', trackAbandon);
  }

  return { attach, trackSubmit, trackAbandon };
}
