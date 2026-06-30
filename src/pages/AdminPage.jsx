import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styles from './AdminPage.module.css'
import Header from '../components/Header'
import { supabase } from '../supabaseClient'

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

const getDefaultBuildingData = (townhallLevel) => {
  if (parseInt(townhallLevel) === 2) {
    return {
      canon: { id: 'canon', image_path: '/src/assets/Defences/canon/18_', buildings_unlocked: 2, copy_unlocks: [true, false], levels: [{ level: 1, cost: 250, resource: 'gold', time: '5sec' }, { level: 2, cost: 1000, resource: 'gold', time: '30sec' }, { level: 3, cost: 4000, resource: 'gold', time: '2min' }] },
      archer_tower: { id: 'archer_tower', image_path: '/src/assets/Defences/Archer_Tower/16_', buildings_unlocked: 1, copy_unlocks: [true], levels: [{ level: 1, cost: 1000, resource: 'gold', time: '15sec' }, { level: 2, cost: 2000, resource: 'gold', time: '2min' }] },
      army_camp: { id: 'army_camp', image_path: '/src/assets/Army/Army_Camp/10_', buildings_unlocked: 1, copy_unlocks: [true], levels: [{ level: 1, cost: 200, resource: 'elixir', time: '1min' }, { level: 2, cost: 2000, resource: 'elixir', time: '5min' }] },
      barracks: { id: 'barracks', image_path: '/src/assets/Army/Barracks/8_', buildings_unlocked: 1, copy_unlocks: [true], levels: [{ level: 1, cost: 100, resource: 'elixir', time: '10sec' }, { level: 2, cost: 500, resource: 'elixir', time: '15sec' }, { level: 3, cost: 2500, resource: 'elixir', time: '2min' }, { level: 4, cost: 5000, resource: 'elixir', time: '30min' }] },
      clan_castle: { id: 'clan_castle', image_path: '/src/assets/Army/clan_castle/19_', buildings_unlocked: 1, copy_unlocks: [true], levels: [{ level: 1, cost: 10000, resource: 'elixir', time: '0sec' }] },
      gold_mine: { id: 'gold_mine', image_path: '/src/assets/Resources/goldmine/2_', buildings_unlocked: 2, copy_unlocks: [true, false], levels: [{ level: 1, cost: 150, resource: 'elixir', time: '5sec' }, { level: 2, cost: 300, resource: 'elixir', time: '15sec' }, { level: 3, cost: 700, resource: 'elixir', time: '1min' }, { level: 4, cost: 1400, resource: 'elixir', time: '2min' }] },
      elixir_collector: { id: 'elixir_collector', image_path: '/src/assets/Resources/elixir_collector/3_', buildings_unlocked: 2, copy_unlocks: [true, false], levels: [{ level: 1, cost: 150, resource: 'gold', time: '5sec' }, { level: 2, cost: 300, resource: 'gold', time: '15sec' }, { level: 3, cost: 700, resource: 'gold', time: '1min' }, { level: 4, cost: 1400, resource: 'gold', time: '2min' }] },
      gold_storage: { id: 'gold_storage', image_path: '/src/assets/Resources/gold_storage/5_', buildings_unlocked: 1, copy_unlocks: [true], levels: [{ level: 1, cost: 300, resource: 'elixir', time: '10sec' }, { level: 2, cost: 750, resource: 'elixir', time: '2min' }, { level: 3, cost: 1500, resource: 'elixir', time: '5min' }] },
      elixir_storage: { id: 'elixir_storage', image_path: '/src/assets/Resources/elixi_storage/6_', buildings_unlocked: 1, copy_unlocks: [true], levels: [{ level: 1, cost: 300, resource: 'gold', time: '10sec' }, { level: 2, cost: 750, resource: 'gold', time: '2min' }, { level: 3, cost: 1500, resource: 'gold', time: '5min' }] },
      walls: { id: 'walls', image_path: '/src/assets/Walls/60_', buildings_unlocked: 25, copy_unlocks: Array.from({ length: 25 }, (_, index) => index === 0), levels: [{ level: 1, cost: 0, resource: 'gold', time: '0sec' }, { level: 2, cost: 1000, resource: 'gold', time: '0sec' }] },
      barbarian: { id: 'barbarian', image_path: '/src/assets/Troops/Barbarian/31_', copy_unlocks: [true], levels: [{ level: 1, cost: 0, resource: 'elixir', time: '0sec' }] },
      archer: { id: 'archer', image_path: '/src/assets/Troops/Archer/32_', copy_unlocks: [true], levels: [{ level: 1, cost: 0, resource: 'elixir', time: '0sec' }] },
      giant: { id: 'giant', image_path: '/src/assets/Troops/Giant/33_', copy_unlocks: [true], levels: [{ level: 1, cost: 0, resource: 'elixir', time: '0sec' }] },
      goblin: { id: 'goblin', image_path: '/src/assets/Troops/Goblin/34_', copy_unlocks: [true], levels: [{ level: 1, cost: 0, resource: 'elixir', time: '0sec' }] },
    }
  }
  return {}
}

const BUILDINGS_BY_CATEGORY = {
  defenses: [
    { id: 'canon', name: 'Canon', image: '/src/assets/Defences/canon' },
    { id: 'archer_tower', name: 'Archer Tower', image: '/src/assets/Defences/Archer_Tower' },
  ],
  army: [
    { id: 'army_camp', name: 'Army Camp', image: '/src/assets/Army/Army_Camp' },
    { id: 'barracks', name: 'Barracks', image: '/src/assets/Army/Barracks' },
    { id: 'clan_castle', name: 'Clan Castle', image: '/src/assets/Army/clan_castle' },
  ],
  resources: [
    { id: 'gold_mine', name: 'Gold Mine', image: '/src/assets/Resources/goldmine' },
    { id: 'elixir_collector', name: 'Elixir Collector', image: '/src/assets/Resources/elixir_collector' },
    { id: 'gold_storage', name: 'Gold Storage', image: '/src/assets/Resources/gold_storage' },
    { id: 'elixir_storage', name: 'Elixir Storage', image: '/src/assets/Resources/elixi_storage' },
  ],
  troops: [
    { id: 'barbarian', name: 'Barbarian', image: '/src/assets/Troops/Barbarian' },
    { id: 'archer', name: 'Archer', image: '/src/assets/Troops/Archer' },
    { id: 'giant', name: 'Giant', image: '/src/assets/Troops/Giant' },
    { id: 'goblin', name: 'Goblin', image: '/src/assets/Troops/Goblin' },
  ],
  walls: [
    { id: 'walls', name: 'Walls', image: '/src/assets/Walls' },
  ],
}

export default function AdminPage({ username, onLogout }) {
  const navigate = useNavigate()
  const { townhallLevel } = useParams()
  const townhalls = Array.from({ length: 17 }, (_, i) => i + 2) // Town halls 2-18
  const [activeTab, setActiveTab] = useState('defenses')
  const [dynamicData, setDynamicData] = useState({})

  // Fetch dynamic data from Supabase
  useEffect(() => {
    if (!townhallLevel) return

    const fetchDynamicData = async () => {
      try {
        const staticDefaults = getDefaultBuildingData(townhallLevel)
        const { data, error } = await supabase
          .from('townhall_buildings')
          .select('*')
          .eq('townhall_level', parseInt(townhallLevel))
          .single()

        if (data) {
          const merged = {}

          const normalizeCategory = (category) => {
            if (!category) return []
            if (Array.isArray(category)) return category
            return Object.entries(category).map(([key, value]) => ({ id: key, ...(value || {}) }))
          }
          
          // Merge all building categories into one object
          ;[...normalizeCategory(data.defences), ...normalizeCategory(data.army), ...normalizeCategory(data.resources), ...normalizeCategory(data.troops)].forEach((building) => {
            merged[building.id] = building
          })
          if (data.walls) {
            merged.walls = data.walls
          }
          
          setDynamicData(merged)
        } else {
          setDynamicData(staticDefaults)
        }
      } catch (err) {
        console.error('Error fetching dynamic data:', err)
        setDynamicData(getDefaultBuildingData(townhallLevel))
      }
    }

    fetchDynamicData()
  }, [townhallLevel])

  const handleTownhallClick = (level) => {
    navigate(`/admin/${level}`)
  }

  const handleBackClick = () => {
    navigate('/admin')
    const createCopyUnlocks = (count, unlockedCount = 1) =>
      Array.from({ length: count }, (_, index) => index < unlockedCount)
  }

  const handleBuildingClick = (buildingId) => {
    navigate(`/admin/building/${townhallLevel}/${buildingId}`)
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
            <div className={styles.tabsContainer}>
              {['defenses', 'army', 'resources', 'troops', 'walls'].map((tab) => (
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
              {BUILDINGS_BY_CATEGORY[activeTab].map((building) => {
                const staticDefaults = getDefaultBuildingData(townhallLevel)
                const buildingData = dynamicData[building.id] || staticDefaults[building.id]
                const levels = buildingData?.levels || []
                const maxLevel = levels.length > 0 ? Math.max(...levels.map(l => l.level)) : 3
                
                const getImagePath = () => {
                  if (building.id === 'archer_tower') return `16_${maxLevel}`
                  if (building.id === 'canon') return `18_${maxLevel}`
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
                      className={styles.buildingItemImage}
                    />
                    <div className={styles.buildingItemInfo}>
                      <div className={styles.buildingItemHeader}>
                        <p className={styles.buildingItemName}>{building.name}</p>
                        {buildingData?.buildings_unlocked != null && (
                          <p className={styles.buildingItemCount}>
                            Count: {buildingData.buildings_unlocked}
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
