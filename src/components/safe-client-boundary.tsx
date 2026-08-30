'use client';

import { Component, type ReactNode } from 'react';

/**
 * SafeClientBoundary
 *
 * A lightweight client-side error boundary. Wraps a subtree that might
 * crash (e.g. ParticleBackground using WebGL, which can throw in sandboxed
 * preview iframes) so that its failure renders `fallback` instead of
 * blanking the entire page.
 *
 * React error boundaries MUST be class components — there is no hooks API
 * for getDerivedStateFromError / componentDidCatch.
 */
type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = { hasError: boolean };

export class SafeClientBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Log to console so the failure is visible during debugging, but never
    // let it propagate up to the route-level error boundary.
    console.error('[SafeClientBoundary]', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
