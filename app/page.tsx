'use client';

import {useEffect, useRef, useState, type FormEvent} from 'react';
import {useRouter} from 'next/navigation';

const FALLBACK_REDIRECT = '/dashboard';
const SIGN_IN_ERROR_MESSAGE = 'Unable to sign in. Please try again.';
const SLOW_STEP_MS = 5000;

function logSlowStep(label: string) {
  return window.setTimeout(() => console.warn('[SolarFX login] ' + label + ' still waiting after 5 seconds'), SLOW_STEP_MS);
}

export default function Login() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const submitLock = useRef(false);
  const navigationFallbackRef = useRef<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const slowSession = logSlowStep('initial session check');
    fetch('/api/auth/session', {cache: 'no-store'})
      .then(res => res.json())
      .then(session => {
        window.clearTimeout(slowSession);
        console.info('[SolarFX login] session loaded', {authenticated: Boolean(session.ok || session.authenticated)});
        if (!cancelled && (session.ok || session.authenticated)) {
          setAuthenticated(true);
          console.info('[SolarFX login] cookie detected');
          router.replace(session.redirectTo || FALLBACK_REDIRECT);
        }
      })
      .catch(error => {
        window.clearTimeout(slowSession);
        console.warn('[SolarFX login] session check failed', error);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(slowSession);
      if (navigationFallbackRef.current) window.clearTimeout(navigationFallbackRef.current);
    };
  }, [router]);

  function updateCode(value: string) {
    setCode(value.replace(/\D/g, '').slice(0, 4));
    if (error) setError('');
  }

  function focusInput() {
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function confirmCookieDetected() {
    const slowCookie = logSlowStep('cookie detection');
    try {
      const response = await fetch('/api/auth/session', {cache: 'no-store'});
      const session = await response.json().catch(() => ({}));
      console.info('[SolarFX login] cookie detected', {authenticated: Boolean(session.ok || session.authenticated)});
    } catch (error) {
      console.warn('[SolarFX login] cookie detection failed', error);
    } finally {
      window.clearTimeout(slowCookie);
    }
  }

  function startNavigation(redirectTo: string) {
    console.info('[SolarFX login] navigating to dashboard', {redirectTo});
    router.replace(redirectTo);
    navigationFallbackRef.current = window.setTimeout(() => {
      console.warn('[SolarFX login] dashboard navigation still waiting after 5 seconds');
      window.location.assign(redirectTo);
    }, SLOW_STEP_MS);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current || code.length !== 4) return;

    submitLock.current = true;
    setBusy(true);
    setError('');
    setStatus('Unlocking...');

    try {
      const slowLogin = logSlowStep('login request');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({code}),
        cache: 'no-store'
      });
      window.clearTimeout(slowLogin);
      const result = await response.json().catch(() => ({}));

      if (response.ok && result.success) {
        const redirectTo = result.redirectTo || FALLBACK_REDIRECT;
        setAuthenticated(true);
        setStatus('Access granted. Opening RAMS Generator.');
        console.info('[SolarFX login] login success', {redirectTo});
        void confirmCookieDetected();
        startNavigation(redirectTo);
        return;
      }

      const message = response.status === 401 ? 'Incorrect access code.' : result.error || SIGN_IN_ERROR_MESSAGE;
      setError(message);
      setStatus(message);
      submitLock.current = false;
      setBusy(false);
      focusInput();
    } catch (error) {
      console.warn('[SolarFX login] login failed', error);
      setError(SIGN_IN_ERROR_MESSAGE);
      setStatus(SIGN_IN_ERROR_MESSAGE);
      submitLock.current = false;
      setBusy(false);
      focusInput();
    }
  }

  return <main className="login-page" data-authenticated={authenticated ? 'true' : 'false'}>
    <section className="login-card" aria-labelledby="login-heading">
      <img className="login-logo" src="/branding/solarfx-logo-horizontal.png" alt="SolarFX" />
      <div className="login-copy">
        <h1 id="login-heading">SOLARFX RAMS ACCESS</h1>
        <p>Enter the team access code.</p>
      </div>
      <form className="login-form" onSubmit={submit} noValidate>
        <label className="sr-only" htmlFor="access-code">Access code</label>
        <input
          ref={inputRef}
          id="access-code"
          name="code"
          className="access-code-input"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          maxLength={4}
          value={code}
          disabled={busy}
          onChange={event => updateCode(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'login-status login-error' : 'login-status'}
          autoFocus
        />
        <p id="login-status" className="sr-only" aria-live="polite">{status}</p>
        {error && <p id="login-error" className="login-error" role="alert">{error}</p>}
        <button className="btn primary login-submit" type="submit" disabled={busy || code.length !== 4} aria-busy={busy}>
          {authenticated ? 'Opening RAMS Generator...' : busy ? 'Unlocking...' : 'Unlock RAMS Generator'}
        </button>
      </form>
    </section>
  </main>;
}
