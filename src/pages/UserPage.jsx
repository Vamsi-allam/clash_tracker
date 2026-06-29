import styles from './UserPage.module.css'
import Header from '../components/Header'

export default function UserPage({ username, onLogout, userId }) {
  return (
    <>
      <Header username={username} onLogout={onLogout} />
      <div className={styles.container}>
        <div className={styles.auroraLeft} />
        <div className={styles.auroraRight} />
        <div className={styles.content}>
          <div className={styles.card}>
            <h2>Your Profile</h2>
            <p>User ID: <code>{userId}</code></p>
            <p>This is your user dashboard. More features coming soon!</p>
          </div>
        </div>
      </div>
    </>
  )
}
