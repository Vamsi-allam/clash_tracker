import { useMemo, useState } from 'react'
import styles from './AdminPage.module.css'

const DATA_ID_NAME_MAP = {
  1000097: 'Crafted Defense',
  1000008: 'Cannon',
  1000009: 'Archer Tower',
  1000013: 'Mortar',
  1000012: 'Air Defense',
  1000011: 'Wizard Tower',
  1000028: 'Air Sweeper',
  1000019: 'Hidden Tesla',
  1000032: 'Bomb Tower',
  1000021: 'X-Bow',
  1000027: 'Inferno Tower',
  1000031: 'Eagle Artillery',
  1000067: 'Scattershot',
  1000015: 'Builders Hut',
  1000072: 'Spell Tower',
  1000077: 'Monolith',
  1000089: 'Firespitter',
  1000010: 'Wall',
  1000084: 'Multi-Archer Tower',
  1000085: 'Ricochet Cannon',
  1000079: 'Multi-Gear Tower',
  12000000: 'Bomb',
  12000001: 'Spring Trap',
  12000002: 'Giant Bomb',
  12000005: 'Air Bomb',
  12000006: 'Seeking Air Mine',
  12000008: 'Skeleton Trap',
  12000016: 'Tornado Trap',
  12000020: 'Giga Bomb',
  1000004: 'Gold Mine',
  1000002: 'Elixir Collector',
  1000005: 'Gold Storage',
  1000003: 'Elixir Storage',
  1000023: 'Dark Elixir Drill',
  1000024: 'Dark Elixir Storage',
  1000014: 'Clan Castle',
  1000000: 'Army Camp',
  1000006: 'Barracks',
  1000026: 'Dark Barracks',
  1000007: 'Laboratory',
  1000020: 'Spell Factory',
  1000071: 'Hero Hall',
  1000029: 'Dark Spell Factory',
  1000070: 'Blacksmith',
  1000059: 'Workshop',
  1000068: 'Pet House',
  1000001: 'Town Hall',
  28000000: 'Barbarian King',
  28000001: 'Archer Queen',
  28000006: 'Minion Prince',
  28000002: 'Grand Warden',
  28000004: 'Royal Champion',
  4000051: 'Wall Wrecker',
  4000052: 'Battle Blimp',
  4000062: 'Stone Slammer',
  4000075: 'Siege Barracks',
  4000087: 'Log Launcher',
  4000091: 'Flame Flinger',
  4000092: 'Battle Drill',
  4000135: 'Troop Launcher',
  73000000: 'L.A.S.S.I',
  73000001: 'Electro Owl',
  73000002: 'Mighty Yak',
  73000003: 'Unicorn',
  73000004: 'Phoenix',
  73000007: 'Poison Lizard',
  73000008: 'Diggy',
  73000009: 'Frosty',
  73000010: 'Spirit Fox',
  73000011: 'Angry Jelly',
  73000016: 'Sneezy',
  4000000: 'Barbarian',
  4000001: 'Archer',
  4000002: 'Goblin',
  4000003: 'Giant',
  4000004: 'Wall Breaker',
  4000005: 'Balloon',
  4000006: 'Wizard',
  4000007: 'Healer',
  4000008: 'Dragon',
  4000009: 'P.E.K.K.A',
  4000010: 'Minion',
  4000011: 'Hog Rider',
  4000012: 'Valkyrie',
  4000013: 'Golem',
  4000015: 'Witch',
  4000017: 'Lava Hound',
  4000022: 'Bowler',
  4000023: 'Baby Dragon',
  4000024: 'Miner',
  4000053: 'Yeti',
  4000058: 'Ice Golem',
  4000059: 'Electro Dragon',
  4000065: 'Dragon Rider',
  4000082: 'Headhunter',
  4000095: 'Electro Titan',
  4000097: 'Apprentice Warden',
  4000110: 'Root Rider',
  4000123: 'Druid',
  4000132: 'Thrower',
  4000150: 'Furnace',
  26000000: 'Lightning Spell',
  26000001: 'Healing Spell',
  26000002: 'Rage Spell',
  26000003: 'Jump Spell',
  26000005: 'Freeze Spell',
  26000009: 'Poison Spell',
  26000010: 'Earthquake Spell',
  26000011: 'Haste Spell',
  26000016: 'Clone Spell',
  26000017: 'Skeleton Spell',
  26000028: 'Bat Spell',
  26000035: 'Invisibility Spell',
  26000053: 'Recall Spell',
  26000070: 'Overgrowth Spell',
  26000098: 'Revive Spell',
  26000109: 'Ice Block Spell',
}

const TIMER_KEYS = ['buildings', 'traps', 'units', 'siege_machines', 'heroes', 'spells', 'pets', 'equipment', 'buildings2', 'traps2', 'units2', 'heroes2']

function formatRemaining(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const days = Math.floor(safeSeconds / 86400)
  const hours = Math.floor((safeSeconds % 86400) / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const secs = safeSeconds % 60

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  }

  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }

  return `${secs}s`
}

function extractTimerEntries(payload) {
  const exportTimestamp = Number(payload?.timestamp)
  const now = Math.floor(Date.now() / 1000)
  const elapsed = Number.isFinite(exportTimestamp) ? Math.max(0, now - exportTimestamp) : 0

  const entries = []

  for (const key of TIMER_KEYS) {
    const items = payload?.[key]
    if (!Array.isArray(items)) {
      continue
    }

    for (const item of items) {
      const timer = Number(item?.timer)
      if (!Number.isFinite(timer) || timer <= 0) {
        continue
      }

      const remaining = Math.max(0, timer - elapsed)
      const name = DATA_ID_NAME_MAP[item.data] || `Unknown ID ${item.data}`

      entries.push({
        name,
        dataId: item.data,
        source: key,
        level: item?.lvl ?? null,
        remaining,
        remainingText: formatRemaining(remaining),
      })
    }
  }

  entries.sort((a, b) => b.remaining - a.remaining)
  return entries
}

export default function AdminPage({ username, onLogout }) {
  const profileInitial = (username?.[0] || 'A').toUpperCase()
  const [exportText, setExportText] = useState('')
  const [exportError, setExportError] = useState('')
  const [parsedExport, setParsedExport] = useState(null)

  const upgradeEntries = useMemo(() => {
    if (!parsedExport) {
      return []
    }

    return extractTimerEntries(parsedExport)
  }, [parsedExport])

  const handleParseExport = () => {
    setExportError('')

    try {
      const parsed = JSON.parse(exportText)
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
        throw new Error('Invalid export format')
      }

      setParsedExport(parsed)
    } catch {
      setExportError('Paste a valid JSON export before uploading.')
    }
  }

  return (
    <section className={styles.dashboardLayout}>
      <div className={styles.dashboardOrbOne} />
      <div className={styles.dashboardOrbTwo} />

      <div className={styles.dashboardShell}>
        <header className={styles.dashboardHeader}>
          <div className={styles.titleWrap}>
            <p className={styles.eyebrow}>Admin</p>
            <h1>Clash Tracker</h1>
          </div>

          <div className={styles.headerActions}>
            <div className={styles.profilePill}>
              <span className={styles.profileIcon}>{profileInitial}</span>
              <span className={styles.profileName}>{username || 'Admin'}</span>
            </div>
            <button className={styles.ghostButton} type="button" onClick={onLogout}>
              Logout
            </button>
          </div>
        </header>

        <div className={styles.adminSetupPanel}>
          <div className={styles.adminSetupIntro}>
            <p className={styles.adminSetupEyebrow}>JSON Upgrade Tracker</p>
            <h2>Upload export JSON only</h2>
            <p>Paste the export text and this page will show only upgrades/construction with remaining time.</p>
          </div>

          <div className={styles.exportPanel}>
            <label className={styles.exportLabel} htmlFor="export-json">
              Export JSON
            </label>
            <textarea
              id="export-json"
              className={styles.exportTextarea}
              value={exportText}
              onChange={(event) => setExportText(event.target.value)}
              placeholder='{"tag":"#R2R9UQCJU","timestamp":1782565484,"buildings":[...]}'
              rows={10}
            />

            <div className={styles.exportActions}>
              <button className={styles.primaryActionButton} type="button" onClick={handleParseExport}>
                Upload JSON
              </button>
            </div>

            {exportError ? <p className={styles.exportError}>{exportError}</p> : null}
            {parsedExport?.tag ? <p className={styles.exportMeta}>Player tag: {parsedExport.tag}</p> : null}
          </div>

          {parsedExport ? (
            <section className={styles.upgradeSection}>
              <h2>Upgrading / Construction</h2>
              <p className={styles.upgradeMeta}>Found {upgradeEntries.length} active timer item(s).</p>

              {upgradeEntries.length ? (
                <div className={styles.upgradeList}>
                  {upgradeEntries.map((entry, index) => (
                    <article key={`${entry.dataId}-${entry.source}-${index}`} className={styles.upgradeItem}>
                      <div>
                        <h3>{entry.name}</h3>
                        <p>
                          ID: {entry.dataId} | Group: {entry.source}
                          {entry.level !== null ? ` | Level: ${entry.level}` : ''}
                        </p>
                      </div>
                      <strong>{entry.remainingText} left</strong>
                    </article>
                  ))}
                </div>
              ) : (
                <p className={styles.exportMeta}>No active timer upgrades found in the pasted JSON.</p>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </section>
  )
}
