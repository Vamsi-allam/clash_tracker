import { useState } from 'react'
import styles from './RegisterPage.module.css'

export default function RegisterPage({ onRegister, onSwitchToLogin, loading, errorMessage, infoMessage }) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    await onRegister({ username, email, password })
  }

  return (
    <section className={styles.authLayout}>
      <div className={styles.auroraLeft} />
      <div className={styles.auroraRight} />
      <div className={styles.authShell}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <p className={styles.eyebrow}>Create access</p>
            <h2>Register</h2>
            <p>Pick a username, add your email, and set a strong password.</p>
          </div>

          <form className={styles.stackForm} onSubmit={handleSubmit}>
            <label className={styles.field}>
              Username
              <input
                className={styles.input}
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Your display name"
                autoComplete="nickname"
                required
              />
            </label>

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
                placeholder="Choose a strong password"
                autoComplete="new-password"
                required
              />
            </label>

            {errorMessage ? <p className={styles.errorBanner}>{errorMessage}</p> : null}
            {infoMessage ? <p className={styles.infoBanner}>{infoMessage}</p> : null}

            <button className={styles.primaryButton} type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <button className={styles.ghostButton} type="button" onClick={onSwitchToLogin}>
            Already have an account? Sign in
          </button>
        </div>

        <div className={styles.brandCard}>
          <p className={styles.eyebrow}>What happens next</p>
          <h1>Role-based experience</h1>
          <p>
            Every registration writes a profile row to Supabase. The app then routes admin and users
            to different screens without showing account email on the page.
          </p>
          <div className={styles.highlightList}>
            <div className={styles.highlightTile}>
              <span>Admin route</span>
              <strong>Only for the approved email</strong>
            </div>
            <div className={styles.highlightTile}>
              <span>User route</span>
              <strong>All other registered accounts</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
