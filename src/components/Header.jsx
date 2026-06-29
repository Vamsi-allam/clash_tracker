import styles from './Header.module.css'

export default function Header({ username, onLogout }) {
  return (
    <header className={styles.header}>
      <div className={styles.branding}>
        <span className={styles.icon}>⚔️</span>
        <h1>Clash Tracker</h1>
      </div>
      <div className={styles.rightSection}>
        <div className={styles.profile}>
          <span className={styles.profileIcon}>👤</span>
          <span className={styles.username}>{username}</span>
        </div>
        <button onClick={onLogout} className={styles.logoutBtn}>
          Logout
        </button>
      </div>
    </header>
  )
}
