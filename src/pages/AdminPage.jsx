import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styles from './AdminPage.module.css'
import Header from '../components/Header'
import { supabase } from '../supabaseClient'
import { buildTownhallSnapshotFromRows } from '../utils/townhallSnapshot'
import { ADMIN_BUILDINGS_BY_CATEGORY, getDefaultBuildingData } from '../data/buildings'

const formatSecondsToTimeDisplay = (seconds) => {
  if (!seconds || seconds === 0) return '0sec'
  
  let remaining = Math.round(seconds)
  const parts = []
  
  const days = Math.floor(remaining / 86400)
  if (days > 0) {
    parts.push(`${days}d`)
    remaining %= 86400
  }
  
  const hours = Math.floor(remaining / 3600)
  if (hours > 0) {
    parts.push(`${hours}hr`)
    remaining %= 3600
  }
  
  const minutes = Math.floor(remaining / 60)
  if (minutes > 0) {
    parts.push(`${minutes}min`)
    remaining %= 60
  }
  
  if (remaining > 0 || parts.length === 0) {
    parts.push(`${remaining}sec`)
  }
  
  return parts.join(' ')
}

const formatCost = (value) => {
  if (!value) return '0'
  if (value >= 1000000) {
    return (value / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'm'
  } else if (value >= 1000) {
    return (value / 1000).toFixed(2).replace(/\.?0+$/, '') + 'k'
  }
  return value.toString()
}

const formatTownhallResourceLabel = (resource) => {
  if (resource === 'elixir') return 'Elixir'
  if (resource === 'dark_elixir') return 'Dark Elixir'
  return 'Gold'
}

const parseTimeStringToSeconds = (timeString) => {
  if (!timeString || typeof timeString !== 'string') return 0

  let totalSeconds = 0
  const timeLower = timeString.toLowerCase().trim()

  const daysMatch = timeLower.match(/(\d+)\s*d(?:ays?)?/) 
  if (daysMatch) totalSeconds += parseInt(daysMatch[1]) * 86400

  const hoursMatch = timeLower.match(/(\d+)\s*h(?:r|ours?)?/)
  if (hoursMatch) totalSeconds += parseInt(hoursMatch[1]) * 3600

  const minutesMatch = timeLower.match(/(\d+)\s*m(?:in|inutes?)?/)
  if (minutesMatch) totalSeconds += parseInt(minutesMatch[1]) * 60

  const secondsMatch = timeLower.match(/(\d+)\s*s(?:ec|econds?)?/)
  if (secondsMatch) totalSeconds += parseInt(secondsMatch[1])

  return totalSeconds
}

const parseSecondsToDropdowns = (seconds) => {
  const totalSeconds = Math.round(seconds || 0)
  let remaining = totalSeconds

  const days = Math.floor(remaining / 86400)
  remaining %= 86400

  const hours = Math.floor(remaining / 3600)
  remaining %= 3600

  const minutes = Math.floor(remaining / 60)
  remaining %= 60

  return { days, hours, minutes, seconds: remaining }
}

export default function AdminPage({ username, onLogout }) {
  const navigate = useNavigate()
  const { townhallLevel } = useParams()
  const showTrapsTab = Number(townhallLevel) >= 3
  const townhalls = Array.from({ length: 17 }, (_, i) => i + 2) // Town halls 2-18
  const [activeTab, setActiveTab] = useState('defenses')
  const [dynamicData, setDynamicData] = useState({})
  const [townhallRecord, setTownhallRecord] = useState(null)
  const [townhallUpgradeCost, setTownhallUpgradeCost] = useState('')
  const [townhallUpgradeResource, setTownhallUpgradeResource] = useState('gold')
  const [townhallUpgradeTimeSeconds, setTownhallUpgradeTimeSeconds] = useState(0)
  const [savingTownhallUpgrade, setSavingTownhallUpgrade] = useState(false)
  const [townhallCostModalOpen, setTownhallCostModalOpen] = useState(false)
  const [townhallCostModalValues, setTownhallCostModalValues] = useState({ cost: '', resource: 'gold' })
  const [townhallTimeModalOpen, setTownhallTimeModalOpen] = useState(false)
  const [townhallTimeModalValues, setTownhallTimeModalValues] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  // Fetch dynamic data from Supabase
  useEffect(() => {
    if (!townhallLevel) return

    const fetchDynamicData = async () => {
      try {
        const selectedTownhall = parseInt(townhallLevel)
        const staticDefaults = getDefaultBuildingData(selectedTownhall)
        const { data: rows, error } = await supabase
          .from('townhall_buildings')
          .select('*')
          .lte('townhall_level', selectedTownhall)
          .order('townhall_level', { ascending: true })

        if (error) throw error

        const selectedTownhallRow = (rows || []).find((row) => Number(row.townhall_level) === selectedTownhall) || null
        const inheritedSnapshot = buildTownhallSnapshotFromRows(rows || [], staticDefaults)
        const merged = {}

        ;[...(inheritedSnapshot.defences || []), ...(inheritedSnapshot.traps || []), ...(inheritedSnapshot.army || []), ...(inheritedSnapshot.resources || []), ...(inheritedSnapshot.troops || [])].forEach((building) => {
          merged[building.id] = building
        })
        if (inheritedSnapshot.walls) {
          merged.walls = inheritedSnapshot.walls
        }

        setTownhallRecord(inheritedSnapshot)
        setTownhallUpgradeCost(selectedTownhallRow?.townhall_upgrade_cost != null ? String(selectedTownhallRow.townhall_upgrade_cost) : '')
        setTownhallUpgradeResource(selectedTownhallRow?.townhall_upgrade_resource || 'gold')
        setTownhallUpgradeTimeSeconds(
          selectedTownhallRow?.townhall_upgrade_time_seconds != null
            ? Number(selectedTownhallRow.townhall_upgrade_time_seconds)
            : parseTimeStringToSeconds(selectedTownhallRow?.townhall_upgrade_time || ''),
        )
        setTownhallCostModalValues({
          cost: selectedTownhallRow?.townhall_upgrade_cost != null ? String(selectedTownhallRow.townhall_upgrade_cost) : '',
          resource: selectedTownhallRow?.townhall_upgrade_resource || 'gold',
        })
        setDynamicData(merged)
      } catch (err) {
        console.error('Error fetching dynamic data:', err)
        setDynamicData(getDefaultBuildingData(townhallLevel))
      }
    }

    fetchDynamicData()
  }, [townhallLevel])

  useEffect(() => {
    if (!showTrapsTab && activeTab === 'traps') {
      setActiveTab('defenses')
    }
  }, [activeTab, showTrapsTab])

  const handleTownhallClick = (level) => {
    navigate(`/admin/${level}`)
  }

  const handleBackClick = () => {
    navigate('/admin')
  }

  const handleBuildingClick = (buildingId) => {
    navigate(`/admin/building/${townhallLevel}/${buildingId}`)
  }

  const openTownhallCostModal = () => {
    setTownhallCostModalValues({
      cost: townhallUpgradeCost,
      resource: townhallUpgradeResource,
    })
    setTownhallCostModalOpen(true)
  }

  const closeTownhallCostModal = () => {
    setTownhallCostModalOpen(false)
  }

  const handleTownhallCostChange = (field, value) => {
    setTownhallCostModalValues({
      ...townhallCostModalValues,
      [field]: value,
    })
  }

  const saveTownhallCostModal = () => {
    setTownhallUpgradeCost(townhallCostModalValues.cost)
    setTownhallUpgradeResource(townhallCostModalValues.resource)
    closeTownhallCostModal()
  }

  const openTownhallTimeModal = () => {
    setTownhallTimeModalValues(parseSecondsToDropdowns(townhallUpgradeTimeSeconds))
    setTownhallTimeModalOpen(true)
  }

  const closeTownhallTimeModal = () => {
    setTownhallTimeModalOpen(false)
  }

  const handleTownhallTimeChange = (timeUnit, value) => {
    setTownhallTimeModalValues({
      ...townhallTimeModalValues,
      [timeUnit]: Math.min(Math.max(0, parseInt(value) || 0), timeUnit === 'days' ? 31 : timeUnit === 'hours' ? 23 : 59),
    })
  }

  const saveTownhallTimeModal = () => {
    const { days, hours, minutes, seconds } = townhallTimeModalValues
    const totalSeconds = days * 86400 + hours * 3600 + minutes * 60 + seconds
    setTownhallUpgradeTimeSeconds(totalSeconds)
    closeTownhallTimeModal()
  }

  const handleSaveTownhallUpgrade = async () => {
    if (!townhallLevel) return

    setSavingTownhallUpgrade(true)
    try {
      const parsedCost = townhallUpgradeCost.trim() === '' ? null : Number(townhallUpgradeCost)
      if (parsedCost != null && Number.isNaN(parsedCost)) {
        throw new Error('Town Hall upgrade cost must be a number.')
      }

      const { error } = await supabase
        .from('townhall_buildings')
        .upsert({
          townhall_level: parseInt(townhallLevel),
          defences: townhallRecord?.defences || {},
          army: townhallRecord?.army || {},
          resources: townhallRecord?.resources || {},
          troops: townhallRecord?.troops || {},
          walls: townhallRecord?.walls || {},
          traps: townhallRecord?.traps || [],
          townhall_upgrade_cost: parsedCost,
          townhall_upgrade_resource: townhallUpgradeResource,
          townhall_upgrade_time_seconds: townhallUpgradeTimeSeconds,
        }, { onConflict: 'townhall_level' })

      if (error) throw error

      setTownhallRecord((current) => ({
        ...(current || {}),
        townhall_level: parseInt(townhallLevel),
        townhall_upgrade_cost: parsedCost,
        townhall_upgrade_resource: townhallUpgradeResource,
        townhall_upgrade_time_seconds: townhallUpgradeTimeSeconds,
      }))
    } catch (err) {
      console.error('Error saving townhall upgrade:', err)
    } finally {
      setSavingTownhallUpgrade(false)
    }
  }

  // Show buildings page if townhallLevel is in URL
  if (townhallLevel) {
    const selectedTownhall = parseInt(townhallLevel)
    return (
      <>
        <Header username={username} onLogout={onLogout} />
        <div className={styles.container}>
          <button className={styles.backBtn} onClick={handleBackClick}>
            ← Back
          </button>

          <div className={styles.buildingsPage}>
            <div className={styles.townhallUpgradeCard}>
              <div className={styles.townhallUpgradeHeader}>
                <div>
                  <p className={styles.townhallUpgradeEyebrow}>Town Hall upgrade data</p>
                  <h2 className={styles.townhallUpgradeTitle}>Town Hall {selectedTownhall} to {selectedTownhall + 1}</h2>
                  <p className={styles.townhallUpgradeText}>
                    Store the upgrade cost and duration here so the user page can read them later.
                  </p>
                </div>
                <img
                  src={`/src/assets/townhall/1_${selectedTownhall}.png`}
                  alt={`Town Hall ${selectedTownhall}`}
                  className={styles.townhallUpgradeImage}
                />
              </div>

              <div className={styles.townhallUpgradeForm}>
                <div className={styles.townhallUpgradeField}>
                  <span className={styles.townhallUpgradeLabel}>Upgrade cost</span>
                  <button
                    type="button"
                    className={styles.townhallUpgradeTimeBtn}
                    onClick={openTownhallCostModal}
                  >
                    {townhallUpgradeCost ? `${formatCost(townhallUpgradeCost)} ${formatTownhallResourceLabel(townhallUpgradeResource)}` : 'Set upgrade cost'}
                  </button>
                </div>

                <div className={styles.townhallUpgradeField}>
                  <span className={styles.townhallUpgradeLabel}>Upgrade time</span>
                  <button
                    type="button"
                    className={styles.townhallUpgradeTimeBtn}
                    onClick={openTownhallTimeModal}
                  >
                    {townhallUpgradeTimeSeconds ? formatSecondsToTimeDisplay(townhallUpgradeTimeSeconds) : 'Set upgrade time'}
                  </button>
                </div>

                <button
                  type="button"
                  className={styles.townhallUpgradeSaveBtn}
                  onClick={handleSaveTownhallUpgrade}
                  disabled={savingTownhallUpgrade}
                >
                  {savingTownhallUpgrade ? 'Saving...' : 'Save town hall upgrade'}
                </button>
              </div>
            </div>

            {townhallCostModalOpen && (
              <div className={styles.townhallModalOverlay} onClick={closeTownhallCostModal}>
                <div className={styles.townhallModal} onClick={(event) => event.stopPropagation()}>
                  <div className={styles.townhallModalHeader}>
                    <h3 className={styles.townhallModalTitle}>Set Town Hall Upgrade Cost</h3>
                    <button type="button" className={styles.townhallModalClose} onClick={closeTownhallCostModal}>✕</button>
                  </div>

                  <div className={styles.townhallModalGrid}>
                    <label className={styles.townhallModalField}>
                      <span>Cost</span>
                      <input type="number" min="0" step="1" value={townhallCostModalValues.cost} onChange={(event) => handleTownhallCostChange('cost', event.target.value)} />
                    </label>

                    <label className={styles.townhallModalField}>
                      <span>Resource</span>
                      <select value={townhallCostModalValues.resource} onChange={(event) => handleTownhallCostChange('resource', event.target.value)}>
                        <option value="gold">Gold</option>
                        <option value="elixir">Elixir</option>
                        <option value="dark_elixir">Dark Elixir</option>
                      </select>
                    </label>
                  </div>

                  <div className={styles.townhallModalTotal}>
                    Total: {townhallCostModalValues.cost ? `${formatCost(townhallCostModalValues.cost)} ${formatTownhallResourceLabel(townhallCostModalValues.resource)}` : 'Not set'}
                  </div>

                  <div className={styles.townhallModalActions}>
                    <button type="button" className={styles.townhallModalSave} onClick={saveTownhallCostModal}>Save</button>
                    <button type="button" className={styles.townhallModalCancel} onClick={closeTownhallCostModal}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            <div className={styles.tabsContainer}>
              {['defenses', ...(showTrapsTab ? ['traps'] : []), 'army', 'resources', 'troops', 'walls'].map((tab) => (
                <button
                  key={tab}
                  className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div className={styles.buildingsList}>
              {ADMIN_BUILDINGS_BY_CATEGORY[activeTab]
                .filter((building) => dynamicData[building.id] || getDefaultBuildingData(townhallLevel)[building.id])
                .map((building) => {
                const staticDefaults = getDefaultBuildingData(townhallLevel)
                const buildingData = dynamicData[building.id] || staticDefaults[building.id]
                const levels = buildingData?.levels || []
                const maxLevel = levels.length > 0 ? Math.max(...levels.map(l => l.level)) : 3
                const barracksLevelNeeded = Number(buildingData?.barracks_level_unlocked ?? staticDefaults[building.id]?.barracks_level_unlocked ?? 1) || 1
                
                const getImagePath = () => {
                  if (building.id === 'archer_tower') return `16_${maxLevel}`
                  if (building.id === 'canon') return `18_${maxLevel}`
                  if (building.id === 'bomb') return `27_${maxLevel}`
                  if (building.id === 'spring_trap') return `30_${maxLevel}`
                  if (building.id === 'mortar') return `23_${maxLevel}`
                  if (building.id === 'lab') return `13_${maxLevel}`
                  if (building.id === 'army_camp') return `10_${maxLevel}`
                  if (building.id === 'barracks') return `8_${maxLevel}`
                  if (building.id === 'clan_castle') return `19_${maxLevel}`
                  if (building.id === 'walls') return `60_${maxLevel}`
                  if (building.id === 'gold_mine') return `2_${maxLevel}`
                  if (building.id === 'elixir_collector') return `3_${maxLevel}`
                  if (building.id === 'gold_storage') return `5_${maxLevel}`
                  if (building.id === 'elixir_storage') return `6_${maxLevel}`
                  if (building.id === 'barbarian') return `31_${maxLevel}`
                  if (building.id === 'archer') return `32_${maxLevel}`
                  if (building.id === 'giant') return `33_${maxLevel}`
                  if (building.id === 'goblin') return `34_${maxLevel}`
                  return '18_3'
                }

                return (
                  <div
                    key={building.id}
                    className={styles.buildingItem}
                    onClick={() => handleBuildingClick(building.id)}
                  >
                    <img
                      src={`${building.image}/${getImagePath()}.png`}
                      alt={building.name}
                      className={`${styles.buildingItemImage} ${activeTab === 'traps' ? styles.trapBuildingItemImage : ''}`}
                    />
                    <div className={styles.buildingItemInfo}>
                      <div className={styles.buildingItemHeader}>
                        <p className={styles.buildingItemName}>{building.name}</p>
                        {buildingData?.buildings_unlocked != null && (
                          <p className={styles.buildingItemCount}>
                            Count: {buildingData.buildings_unlocked}
                          </p>
                        )}
                        {activeTab !== 'troops' && (
                          <p className={styles.buildingItemCount}>
                            Level Count: {levels.length}
                          </p>
                        )}
                        {activeTab === 'troops' && (
                          <p className={styles.buildingItemCount}>
                            Barracks level needed: {barracksLevelNeeded}
                          </p>
                        )}
                      </div>
                      {levels.length > 0 ? (
                        <div className={styles.buildingItemLevels}>
                          {levels.map((level, idx) => {
                            const resourceIcon = {
                              gold: '/src/assets/magic-items/gold.png',
                              elixir: '/src/assets/magic-items/elixir.png',
                              dark_elixir: '/src/assets/magic-items/de.png',
                            }[level.resource] || ''
                            const timeDisplay = typeof level.time === 'number' 
                              ? formatSecondsToTimeDisplay(level.time)
                              : level.time || '—'
                            return (
                              <div key={idx} className={styles.buildingLevelRow}>
                                {resourceIcon && (
                                  <img src={resourceIcon} alt={level.resource} className={styles.levelResourceIcon} />
                                )}
                                <span className={styles.levelNumber}>Lvl: {level.level}</span>
                                <span className={styles.levelCost}>{formatCost(level.cost)}</span>
                                <span className={styles.levelTime}>{timeDisplay}</span>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className={styles.buildingItemAction}>Click to manage</p>
                      )}
                    </div>
                    <div className={styles.buildingItemArrow}>→</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {townhallTimeModalOpen && (
          <div className={styles.townhallModalOverlay} onClick={closeTownhallTimeModal}>
            <div className={styles.townhallModal} onClick={(event) => event.stopPropagation()}>
              <div className={styles.townhallModalHeader}>
                <h3 className={styles.townhallModalTitle}>Set Town Hall Upgrade Time</h3>
                <button type="button" className={styles.townhallModalClose} onClick={closeTownhallTimeModal}>✕</button>
              </div>

              <div className={styles.townhallModalGrid}>
                <label className={styles.townhallModalField}>
                  <span>Days</span>
                  <input type="number" min="0" max="31" value={townhallTimeModalValues.days} onChange={(event) => handleTownhallTimeChange('days', event.target.value)} />
                </label>
                <label className={styles.townhallModalField}>
                  <span>Hours</span>
                  <input type="number" min="0" max="23" value={townhallTimeModalValues.hours} onChange={(event) => handleTownhallTimeChange('hours', event.target.value)} />
                </label>
                <label className={styles.townhallModalField}>
                  <span>Minutes</span>
                  <input type="number" min="0" max="59" value={townhallTimeModalValues.minutes} onChange={(event) => handleTownhallTimeChange('minutes', event.target.value)} />
                </label>
                <label className={styles.townhallModalField}>
                  <span>Seconds</span>
                  <input type="number" min="0" max="59" value={townhallTimeModalValues.seconds} onChange={(event) => handleTownhallTimeChange('seconds', event.target.value)} />
                </label>
              </div>

              <div className={styles.townhallModalTotal}>
                Total: {formatSecondsToTimeDisplay(
                  townhallTimeModalValues.days * 86400 +
                  townhallTimeModalValues.hours * 3600 +
                  townhallTimeModalValues.minutes * 60 +
                  townhallTimeModalValues.seconds
                )}
              </div>

              <div className={styles.townhallModalActions}>
                <button type="button" className={styles.townhallModalSave} onClick={saveTownhallTimeModal}>Save</button>
                <button type="button" className={styles.townhallModalCancel} onClick={closeTownhallTimeModal}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </>
    )
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
