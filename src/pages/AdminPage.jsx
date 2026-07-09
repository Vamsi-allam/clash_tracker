import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styles from './AdminPage.module.css'
import Header from '../components/Header'
import { supabase } from '../supabaseClient'
import { getTownhallSnapshotForLevel } from '../utils/townhallSnapshot'
import { ADMIN_BUILDINGS_BY_CATEGORY, getDefaultBuildingData } from '../data/buildings'
import { formatResourceCostBreakdown, getLevelResourceOptions } from '../utils/resourceCosts'

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

const equipmentResourceIcons = {
  shiny_ore: '/src/assets/magic-items/ore-shiny.png',
  glowy_ore: '/src/assets/magic-items/ore-glowy.png',
  starry_ore: '/src/assets/magic-items/ore-starry.png',
}

const formatEquipmentResourceLabel = (resource) => {
  if (resource === 'glowy_ore') return 'Glowy Ore'
  if (resource === 'shiny_ore') return 'Shiny Ore'
  if (resource === 'starry_ore') return 'Starry Ore'
  return formatTownhallResourceLabel(resource)
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

const normalizeEquipmentType = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  return normalized === 'passive' ? 'passive' : 'active'
}

const normalizeEquipmentRarity = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  return normalized === 'epic' ? 'epic' : 'common'
}

export default function AdminPage({ username, onLogout }) {
  const navigate = useNavigate()
  const { townhallLevel } = useParams()
  const showTrapsTab = Number(townhallLevel) >= 3
  const showSpellsTab = Number(townhallLevel) >= 5
  const showDarkTroopsTab = Number(townhallLevel) >= 7
  const showHeroesTab = Number(townhallLevel) >= 4
  const showEquipmentTab = Number(townhallLevel) >= 8
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
        const inheritedSnapshot = getTownhallSnapshotForLevel(rows || [], selectedTownhall, staticDefaults)
        const merged = {}

        ;[...(inheritedSnapshot.defences || []), ...(inheritedSnapshot.traps || []), ...(inheritedSnapshot.army || []), ...(inheritedSnapshot.resources || []), ...(inheritedSnapshot.troops || []), ...(inheritedSnapshot.spells || []), ...(inheritedSnapshot.dark_troops || []), ...(inheritedSnapshot.heroes || []), ...(inheritedSnapshot.equipment || [])].forEach((building) => {
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

  useEffect(() => {
    if (!showHeroesTab && activeTab === 'heroes') {
      setActiveTab('defenses')
    }
  }, [activeTab, showHeroesTab])

  useEffect(() => {
    if (!showEquipmentTab && activeTab === 'equipment') {
      setActiveTab('defenses')
    }
  }, [activeTab, showEquipmentTab])

  useEffect(() => {
    if (!showSpellsTab && activeTab === 'spells') {
      setActiveTab('defenses')
    }
  }, [activeTab, showSpellsTab])

  useEffect(() => {
    if (!showDarkTroopsTab && activeTab === 'dark_troops') {
      setActiveTab('defenses')
    }
  }, [activeTab, showDarkTroopsTab])

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
          spells: townhallRecord?.spells || {},
          dark_troops: townhallRecord?.dark_troops || {},
          heroes: townhallRecord?.heroes || {},
          equipment: townhallRecord?.equipment || {},
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
              {['defenses', ...(showTrapsTab ? ['traps'] : []), 'army', 'resources', 'troops', ...(showSpellsTab ? ['spells'] : []), ...(showDarkTroopsTab ? ['dark_troops'] : []), ...(showHeroesTab ? ['heroes'] : []), ...(showEquipmentTab ? ['equipment'] : []), 'walls'].map((tab) => (
                <button
                  key={tab}
                  className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}
                </button>
              ))}
            </div>

            <div className={styles.buildingsList}>
              {(ADMIN_BUILDINGS_BY_CATEGORY[activeTab] || [])
                .filter((building) => dynamicData[building.id] || getDefaultBuildingData(townhallLevel)[building.id])
                .map((building) => {
                const staticDefaults = getDefaultBuildingData(townhallLevel)
                const buildingData = dynamicData[building.id] || staticDefaults[building.id]
                const levels = buildingData?.levels || []
                const maxLevel = levels.length > 0 ? Math.max(...levels.map(l => l.level)) : 3
                const levelCountValue = Number(buildingData?.buildings_unlocked ?? levels.length ?? 0)
                const barracksLevelNeeded = Number(buildingData?.barracks_level_unlocked ?? staticDefaults[building.id]?.barracks_level_unlocked ?? 1) || 1
                const darkBarracksLevelNeeded = Number(buildingData?.dark_barracks_level_unlocked ?? staticDefaults[building.id]?.dark_barracks_level_unlocked ?? 1) || 1
                const spellFactoryLevelNeeded = Number(buildingData?.spell_factory_level_unlocked ?? staticDefaults[building.id]?.spell_factory_level_unlocked ?? 1) || 1
                const heroHallLevelNeeded = Number(buildingData?.hero_hall_level_unlocked ?? staticDefaults[building.id]?.hero_hall_level_unlocked ?? 1) || 1
                const equipmentUnlockSource = String(buildingData?.unlock_source || staticDefaults[building.id]?.unlock_source || 'blacksmith').trim().toLowerCase()
                const equipmentUnlockLevel = Number(buildingData?.blacksmith_level_unlocked ?? staticDefaults[building.id]?.blacksmith_level_unlocked ?? 0) || 0
                const equipmentUnlockLabel = equipmentUnlockSource === 'blacksmith'
                  ? `Blacksmith Lvl: ${equipmentUnlockLevel}`
                  : 'Gems'
                const equipmentType = normalizeEquipmentType(buildingData?.equipment_type ?? staticDefaults[building.id]?.equipment_type)
                const equipmentRarity = normalizeEquipmentRarity(buildingData?.equipment_rarity ?? staticDefaults[building.id]?.equipment_rarity)
                
                const getImagePath = () => {
                  if (activeTab === 'equipment') return ''
                  if (building.id === 'archer_tower') return `16_${maxLevel}`
                  if (building.id === 'canon') return `18_${maxLevel}`
                  if (building.id === 'bomb') return `27_${maxLevel}`
                  if (building.id === 'giant_bomb') return `28_${maxLevel}`
                  if (building.id === 'air_bomb') return `26_${maxLevel}`
                  if (building.id === 'seeking_air_mine') return `29_${maxLevel}`
                  if (building.id === 'spring_trap') return `30_${maxLevel}`
                  if (building.id === 'mortar') return `23_${maxLevel}`
                  if (building.id === 'wizard_tower') return `24_${maxLevel}`
                  if (building.id === 'air_defense') return `14_${maxLevel}`
                  if (building.id === 'air_sweeper') return `15_${maxLevel}`
                  if (building.id === 'hidden_tesla') return `21_${maxLevel}`
                  if (building.id === 'lab') return `13_${maxLevel}`
                  if (building.id === 'hero_hall') return `202_${maxLevel}`
                  if (building.id === 'blacksmith') return `152_${maxLevel}`
                  if (building.id === 'army_camp') return `10_${maxLevel}`
                  if (building.id === 'spell_factory') return `11_${maxLevel}`
                  if (building.id === 'barracks') return `8_${maxLevel}`
                  if (building.id === 'dark_barracks') return `9_${maxLevel}`
                  if (building.id === 'clan_castle') return `19_${maxLevel}`
                  if (building.id === 'walls') return `60_${maxLevel}`
                  if (building.id === 'gold_mine') return `2_${maxLevel}`
                  if (building.id === 'elixir_collector') return `3_${maxLevel}`
                  if (building.id === 'dark_elixir_driller') return `4_${maxLevel}`
                  if (building.id === 'gold_storage') return `5_${maxLevel}`
                  if (building.id === 'elixir_storage') return `6_${maxLevel}`
                  if (building.id === 'dark_elixir_storage') return `7_${maxLevel}`
                  if (building.id === 'barbarian') return `31_${maxLevel}`
                  if (building.id === 'archer') return `32_${maxLevel}`
                  if (building.id === 'giant') return `33_${maxLevel}`
                  if (building.id === 'goblin') return `34_${maxLevel}`
                  if (building.id === 'wall_breaker') return `35_${maxLevel}`
                  if (building.id === 'balloon') return `36_${maxLevel}`
                  if (building.id === 'wizard') return `37_${maxLevel}`
                  if (building.id === 'healer') return `38_${maxLevel}`
                  if (building.id === 'dragon') return `39_${maxLevel}`
                  if (building.id === 'minion') return `53_${maxLevel}`
                  if (building.id === 'hog_rider') return `54_${maxLevel}`
                  if (building.id === 'lightning_spell') return '43'
                  if (building.id === 'healing_spell') return '44'
                  if (building.id === 'rage_spell') return '45'
                  if (building.id === 'barbarian_king') return '61'
                  if (building.id === 'archer_queen') return '62'
                  if (building.id === 'grand_warden') return '63'
                  if (building.id === 'royal_champion') return '122'
                  if (building.id === 'minion_prince') return '208'
                  if (building.id === 'dragon_duke') return '260'
                  return '18_3'
                }

                const imageSource = activeTab === 'equipment'
                  ? building.image
                  : `${building.image}/${getImagePath()}.png`

                return (
                  <div
                    key={building.id}
                    className={styles.buildingItem}
                    onClick={() => handleBuildingClick(building.id)}
                  >
                    <img
                      src={imageSource}
                      alt={building.name}
                      className={`${styles.buildingItemImage} ${activeTab === 'traps' ? styles.trapBuildingItemImage : ''}`}
                    />
                    <div className={styles.buildingItemInfo}>
                      <div className={styles.buildingItemHeader}>
                        <p className={styles.buildingItemName}>{building.name}</p>
                        {activeTab === 'equipment' && building.hero && (
                                  <p className={styles.buildingItemCount}>
                                    Hero: {building.hero}
                                  </p>
                                )}
                        {activeTab === 'equipment' && (
                          <div className={styles.equipmentMetaControls}>
                            <span className={styles.equipmentMetaLabel}>
                              Type: {equipmentType === 'active' ? 'Active' : 'Passive'}
                            </span>
                            <span className={styles.equipmentMetaLabel}>
                              Rarity: {equipmentRarity === 'epic' ? 'Epic' : 'Common'}
                            </span>
                          </div>
                        )}
                        {(activeTab === 'troops' || activeTab === 'dark_troops') && (
                          <p className={styles.buildingItemCount}>
                            Level Count: {levelCountValue}
                          </p>
                        )}
                        {buildingData?.buildings_unlocked != null && activeTab !== 'troops' && activeTab !== 'dark_troops' && activeTab !== 'spells' && activeTab !== 'heroes' && (
                          <p className={styles.buildingItemCount}>
                            Count: {buildingData.buildings_unlocked}
                          </p>
                        )}
                        {activeTab !== 'troops' && activeTab !== 'dark_troops' && (
                          <p className={styles.buildingItemCount}>
                            Level Count: {levels.length}
                            {activeTab === 'equipment' && (
                              <span className={styles.buildingItemInlineMeta}>
                                {equipmentUnlockLabel}
                              </span>
                            )}
                          </p>
                        )}
                        {activeTab === 'troops' && (
                          <>
                            <p className={styles.buildingItemCount}>
                              Barracks level needed: {barracksLevelNeeded}
                            </p>
                          </>
                        )}
                        {activeTab === 'spells' && (
                          <>
                            <p className={styles.buildingItemCount}>
                              Spell Factory level needed: {spellFactoryLevelNeeded}
                            </p>
                          </>
                        )}
                        {activeTab === 'heroes' && (
                          <>
                            <p className={styles.buildingItemCount}>
                              Hero Hall level needed: {heroHallLevelNeeded}
                            </p>
                          </>
                        )}
                      </div>
                      {levels.length > 0 ? (
                        <div className={styles.buildingItemLevels}>
                          {levels.map((level, idx) => {
                            const resourceIcons = {
                              gold: '/src/assets/magic-items/gold.png',
                              elixir: '/src/assets/magic-items/elixir.png',
                              dark_elixir: '/src/assets/magic-items/de.png',
                            }
                            const resourceOptions = getLevelResourceOptions(level, { isWallLevel: activeTab === 'walls' })
                            const usesDualGoldElixirIcon = resourceOptions.includes('gold') && resourceOptions.includes('elixir')
                            const timeDisplay = typeof level.time === 'number' 
                              ? formatSecondsToTimeDisplay(level.time)
                              : level.time || '—'
                            const costDisplay = activeTab === 'equipment' && Array.isArray(level.resource_costs) && level.resource_costs.length > 0
                              ? formatResourceCostBreakdown(level, {
                                formatCost,
                                formatResourceLabel: formatEquipmentResourceLabel,
                              }, 'glowy_ore')
                              : formatCost(level.cost)
                            return (
                              <div key={idx} className={styles.buildingLevelRow}>
                                <div className={styles.levelResourceIcons}>
                                  {usesDualGoldElixirIcon ? (
                                    <img
                                      src="/src/assets/magic-items/goldelxir.png"
                                      alt="Gold or Elixir"
                                      className={styles.levelResourceIcon}
                                    />
                                  ) : (
                                    resourceOptions.map((resourceKey) => (
                                      <span key={`${level.level}-${resourceKey}`} className={styles.levelResourceOption}>
                                        {resourceIcons[resourceKey] ? (
                                          <img
                                            src={resourceIcons[resourceKey]}
                                            alt={formatTownhallResourceLabel(resourceKey)}
                                            className={styles.levelResourceIcon}
                                          />
                                        ) : null}
                                      </span>
                                    ))
                                  )}
                                </div>
                                <span className={styles.levelNumber}>Lvl: {level.level}</span>
                                {activeTab === 'equipment' && Array.isArray(level.resource_costs) && level.resource_costs.length > 0 ? (
                                  <div className={styles.equipmentCostBreakdown}>
                                    {level.resource_costs.map(({ resource, cost }) => (
                                      <span key={`${level.level}-${resource}`} className={styles.equipmentCostItem}>
                                        {equipmentResourceIcons[resource] ? (
                                          <img
                                            src={equipmentResourceIcons[resource]}
                                            alt={formatEquipmentResourceLabel(resource)}
                                            className={styles.equipmentCostIcon}
                                          />
                                        ) : null}
                                        <span className={styles.equipmentCostValue}>{formatCost(cost)}</span>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <>
                                    <span className={styles.levelCost}>{costDisplay}</span>
                                    <span className={styles.levelTime}>{timeDisplay}</span>
                                  </>
                                )}
                                {activeTab === 'troops' && (
                                  <span className={styles.levelNumber}>
                                    Lab Lvl: {Number(level.lab_level_unlocked ?? 0)}
                                  </span>
                                )}
                                {activeTab === 'dark_troops' && (
                                  <span className={styles.levelNumber}>
                                    Lab Lvl: {Number(level.lab_level_unlocked ?? 0)}
                                  </span>
                                )}
                                {activeTab === 'spells' && (
                                  <span className={styles.levelNumber}>
                                    Lab Lvl: {Number(level.lab_level_unlocked ?? 0)}
                                  </span>
                                )}
                                {activeTab === 'heroes' && (
                                  <span className={styles.levelNumber}>
                                    Hero Hall Lvl: {Number(level.hero_hall_level_unlocked ?? 0)}
                                  </span>
                                )}
                                {activeTab === 'equipment' && (
                                  <span className={styles.levelNumber}>
                                    Blacksmith Lvl: {Number(level.blacksmith_level_unlocked ?? level.level ?? 0)}
                                  </span>
                                )}
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
