import { useState, useRef } from 'react'
import styles from './Header.module.css'

const formatPlayerTag = (value = '') => {
  const cleanTag = String(value).trim().replace(/^#/, '').toUpperCase()
  return cleanTag ? `#${cleanTag}` : ''
}

export default function Header({ username, onLogout, villages = [], activeVillage, onSelectVillage, onAddVillage }) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const hideTimer = useRef(null)

  const handleMouseEnter = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setDropdownOpen(true)
  }

  const handleMouseLeave = () => {
    hideTimer.current = setTimeout(() => {
      setDropdownOpen(false)
    }, 300)
  }

  return (
    <header className={styles.header}>
      <div className={styles.branding}>
        <span className={styles.icon}>⚔️</span>
        <h1>Clash Tracker</h1>
      </div>
      <div className={styles.rightSection}>
        {(villages.length > 0 || onAddVillage) && (
          <div
            className={styles.villageWrapper}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button className={styles.switchVillageBtn}>
              {activeVillage ? activeVillage.player_name : 'Switch Village'} ▾
            </button>
            {dropdownOpen && (
              <div className={styles.villageDropdown}>
                {villages.map((v) => (
                  <div
                    key={v.id}
                    className={`${styles.villageItem} ${activeVillage?.id === v.id ? styles.villageItemActive : ''}`}
                    onClick={() => { onSelectVillage(v); setDropdownOpen(false) }}
                  >
                    <img
                      src={`/src/assets/townhall/1_${v.townhall_level}.png`}
                      alt={`TH ${v.townhall_level}`}
                      className={styles.villageTHImage}
                    />
                    <div className={styles.villageItemInfo}>
                      <span className={styles.villageItemName}>{v.player_name}</span>
                      <span className={styles.villageItemTH}>TH {v.townhall_level} · {formatPlayerTag(v.player_tag)}</span>
                      {v.clan_name && <span className={styles.villageItemClan}>{v.clan_name}</span>}
                    </div>
                    {activeVillage?.id === v.id && <span className={styles.activeCheck}>✓</span>}
                  </div>
                ))}
                <div
                  className={styles.addVillageItem}
                  onClick={() => { onAddVillage(); setDropdownOpen(false) }}
                >
                  <span className={styles.addIcon}>➕</span>
                  <div className={styles.addVillageInfo}>
                    <span className={styles.addVillageText}>Add Village</span>
                    <span className={styles.addVillageSub}>Add a new village</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
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
