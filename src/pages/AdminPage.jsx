import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './AdminPage.module.css'
import Header from '../components/Header'

export default function AdminPage({ username, onLogout }) {
  const navigate = useNavigate()
  const townhalls = Array.from({ length: 17 }, (_, i) => i + 2) // Town halls 2-18

  const handleTownhallClick = (level) => {
    // Navigate to Canon editor for now (can expand to building selection later)
    navigate(`/admin/building/${level}/canon`)
  }

  return (
    <>
      <Header username={username} onLogout={onLogout} />
      <div className={styles.container}>
        <div className={styles.auroraLeft} />
        <div className={styles.auroraRight} />
        <div className={styles.content}>
          <div className={styles.townhallGrid}>
            {townhalls.map((level) => (
              <div
                key={level}
                className={styles.townhallCard}
                onClick={() => handleTownhallClick(level)}
              >
                <div className={styles.townhallLeft}>
                  <img
                    src={`/src/assets/townhall/1_${level}.png`}
                    alt={`Town Hall ${level}`}
                    className={styles.townhallImage}
                  />
                  <p className={styles.townhallLabel}>Town Hall {level}</p>
                </div>
                <div className={styles.divider} />
                <div className={styles.townhallRight}>
                  <p className={styles.townhallDesc}>Click to manage buildings</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
