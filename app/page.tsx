'use client';

import {useEffect, useRef, useState, type FormEvent} from 'react';
import {useRouter} from 'next/navigation';

const FALLBACK_REDIRECT = '/dashboard';
const SIGN_IN_ERROR_MESSAGE = 'Unable to sign in. Please try again.';

export default function Login() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const submitLock = useRef(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/session', {cache: 'no-store'})
      .then(res => res.json())
      .then(session => {
        if (!cancelled && (session.ok || session.authenticated)) {
          router.replace(session.redirectTo || FALLBACK_REDIRECT);
          router.refresh();
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [router]);

  function updateCode(value: string) {
    setCode(value.replace(/D/g, '').slice(0, 4));
    if (error) setError('');
  }

  function focusInput() {
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current || code.length !== 4) return;

    submitLock.current = true;
    setBusy(true);
    setError('');
    setStatus('Unlocking...');
    let completed = false;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({code}),
        cache: 'no-store'
      });
      const result = await response.json().catch(() => ({}));

      if (response.ok && result.success) {
        completed = true;
        setStatus('Access granted. Opening RAMS Generator.');
        router.replace(result.redirectTo || FALLBACK_REDIRECT);
        router.refresh();
        return;
      }

      const message = response.status === 401 ? 'Incorrect access code.' : result.error || SIGN_IN_ERROR_MESSAGE;
      setError(message);
      setStatus(message);
      focusInput();
    } catch {
      setError(SIGN_IN_ERROR_MESSAGE);
      setStatus(SIGN_IN_ERROR_MESSAGE);
      focusInput();
    } finally {
      if (!completed) {
        submitLock.current = false;
        setBusy(false);
      }
    }
  }

  return <main className="login-page">
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
          {busy ? 'Unlocking...' : 'Unlock RAMS Generator'}
        </button>
      </form>
    </section>
  </main>;
}
