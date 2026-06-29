import styles from './AdminPage.module.css'
import Header from '../components/Header'

export default function AdminPage({ username, onLogout }) {
  const townhalls = Array.from({ length: 17 }, (_, i) => i + 2) // Town halls 2-18

  return (
    <>
      <Header username={username} onLogout={onLogout} />
      <div className={styles.container}>
        <div className={styles.auroraLeft} />
        <div className={styles.auroraRight} />
        <div className={styles.content}>
          <h2>Town Halls</h2>
          <div className={styles.townhallGrid}>
            {townhalls.map((level) => (
              <div key={level} className={styles.townhallCard}>
                <img
                  src={`/src/assets/townhall/1_${level}.png`}
                  alt={`Town Hall ${level}`}
                  className={styles.townhallImage}
                />
                <p className={styles.townhallLabel}>TH {level}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
