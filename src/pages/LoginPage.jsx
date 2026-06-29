import { useState } from 'react'
import styles from './LoginPage.module.css'

export default function LoginPage({ onLogin, onSwitchToRegister, loading, errorMessage }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    await onLogin({ email, password })
  }

  return (
    <section className={styles.authLayout}>
      <div className={styles.auroraLeft} />
      <div className={styles.auroraRight} />
      <div className={styles.authShell}>
        <div className={styles.brandCard}>
          <p className={styles.eyebrow}>Secure access</p>
          <h1>Clash Tracker</h1>
          <p>
            A polished Supabase login experience with role-based routing for admin and user accounts.
          </p>
          <div className={styles.featureGrid}>
            <div className={styles.featureTile}>
              <span>Role routing</span>
              <strong>Admin / User</strong>
            </div>
            <div className={styles.featureTile}>
              <span>Database ready</span>
              <strong>Profiles table</strong>
            </div>
            <div className={styles.featureTile}>
              <span>Frontend only</span>
              <strong>No backend</strong>
            </div>
          </div>
        </div>

        <form className={styles.formCard} onSubmit={handleSubmit}>
          <div className={styles.formHeader}>
            <p className={styles.eyebrow}>Welcome back</p>
            <h2>Sign in</h2>
            <p>Use your email and password to enter the right dashboard.</p>
          </div>

          <label className={styles.field}>
            Email
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label className={styles.field}>
            Password
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </label>

          {errorMessage ? <p className={styles.errorBanner}>{errorMessage}</p> : null}

          <button className={styles.primaryButton} type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <button className={styles.ghostButton} type="button" onClick={onSwitchToRegister}>
            New here? Create an account
          </button>
        </form>
      </div>
    </section>
  )
}
