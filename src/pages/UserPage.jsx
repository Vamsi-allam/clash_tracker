import { useState, useEffect } from 'react'
import styles from './UserPage.module.css'
import Header from '../components/Header'
import { supabase } from '../supabaseClient'

// Convert API asset URL to proxied URL
const getProxiedAssetUrl = (assetUrl) => {
  if (!assetUrl) return null
  if (assetUrl.startsWith('http')) {
    return assetUrl.replace('https://api-assets.clashofclans.com', '/api/assets')
  }
  return assetUrl
}

const formatStructureName = (structureId = '') => {
  return String(structureId)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const canonImages = import.meta.glob('../assets/Defences/canon/*.png', { eager: true, import: 'default' })
const archerTowerImages = import.meta.glob('../assets/Defences/Archer_Tower/*.png', { eager: true, import: 'default' })
const armyCampImages = import.meta.glob('../assets/Army/Army_Camp/*.png', { eager: true, import: 'default' })
const barracksImages = import.meta.glob('../assets/Army/Barracks/*.png', { eager: true, import: 'default' })
const clanCastleImages = import.meta.glob('../assets/Army/clan_castle/*.png', { eager: true, import: 'default' })
const goldMineImages = import.meta.glob('../assets/Resources/goldmine/*.png', { eager: true, import: 'default' })
const elixirCollectorImages = import.meta.glob('../assets/Resources/elixir_collector/*.png', { eager: true, import: 'default' })
const goldStorageImages = import.meta.glob('../assets/Resources/gold_storage/*.png', { eager: true, import: 'default' })
const elixirStorageImages = import.meta.glob('../assets/Resources/elixi_storage/*.png', { eager: true, import: 'default' })

export default function UserPage({ username, onLogout, userId }) {
  const [tag, setTag] = useState('')
  const [playerData, setPlayerData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [villages, setVillages] = useState([])
  const [activeVillage, setActiveVillage] = useState(null)
  const [viewMode, setViewMode] = useState('search')
  const [builderCount, setBuilderCount] = useState(2)
  const [wallConfig, setWallConfig] = useState(null)
  const [wallCounts, setWallCounts] = useState({})
  const [wallLoading, setWallLoading] = useState(false)
  const [structureCatalog, setStructureCatalog] = useState({ defences: [], army: [], resources: [], troops: [] })
  const [structureLevels, setStructureLevels] = useState({})
  const [structuresLoading, setStructuresLoading] = useState(false)

  useEffect(() => {
    loadVillages()
  }, [userId])

  const loadVillages = async () => {
    if (!userId) return
    const { data } = await supabase
      .from('user_villages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    if (data && data.length > 0) {
      setVillages(data)
      if (!activeVillage) setActiveVillage(data[0])
      setViewMode('loaded')
    } else {
      setViewMode('search')
    }
  }

  const handleSearch = async () => {
    const cleanTag = tag.trim().replace(/^#/, '').toUpperCase()
    if (!cleanTag) return
    setLoading(true)
    setError('')
    setPlayerData(null)
    try {
      const res = await fetch(`/api/coc/players/%23${cleanTag}`)
      if (!res.ok) {
        const err = await res.json()
        setError(err.message || 'Player not found')
        return
      }
      const data = await res.json()
      setPlayerData(data)
    } catch (e) {
      setError('Failed to fetch player data')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleProceed = async () => {
    if (!playerData || !userId) return
    setSaving(true)
    setError('')

    const existingResult = await supabase
      .from('user_villages')
      .select('id')
      .eq('user_id', userId)
      .eq('player_tag', playerData.tag)
      .maybeSingle()

    if (existingResult.data) {
      setError('Village already added to this user')
      setSaving(false)
      return
    }

    const villageRow = {
      user_id: userId,
      player_tag: playerData.tag,
      player_name: playerData.name,
      townhall_level: playerData.townHallLevel,
      exp_level: playerData.expLevel,
      clan_name: playerData.clan?.name || null,
      clan_badge_url: playerData.clan?.badgeUrls?.small || null,
      clan_level: playerData.clan?.clanLevel || null,
    }
    const { data, error: saveError } = await supabase
      .from('user_villages')
      .insert(villageRow)
      .select()
      .single()

    if (saveError) {
      if (saveError.code === '23505') {
        setError('Village already added to this user')
      } else {
        setError(saveError.message || 'Failed to save village')
      }
    } else if (data) {
      await loadVillages()
      setActiveVillage(data)
      setViewMode('loaded')
      setPlayerData(null)
      setTag('')
    }
    setSaving(false)
  }

  const handleSelectVillage = (village) => {
    setActiveVillage(village)
    setViewMode('loaded')
    setPlayerData(null)
    setTag('')
  }

  const handleAddVillage = () => {
    setViewMode('search')
    setPlayerData(null)
    setTag('')
    setActiveVillage(null)
  }

  const showingSearch = viewMode === 'search' || villages.length === 0
  const showingLoaded = viewMode === 'loaded' && !showingSearch
  const showingStructures = viewMode === 'structures'
  const showingWalls = viewMode === 'walls'

  const clanBadgeUrl = getProxiedAssetUrl(playerData?.clan?.badgeUrls?.small)

  const loadTownhallStructures = async (townhallLevel) => {
    if (!townhallLevel) return

    setStructuresLoading(true)

    try {
      const { data } = await supabase
        .from('townhall_buildings')
        .select('*')
        .eq('townhall_level', townhallLevel)
        .single()

      const normalizeStructures = (structures) => {
        if (!structures) return []
        const normalizedList = Array.isArray(structures)
          ? structures.map((value) => ({ ...(value || {}) }))
          : Object.entries(structures).map(([key, value]) => ({ id: key, ...(value || {}) }))

        const dedupedById = new Map()
        normalizedList.forEach((building) => {
          if (!building.id) return
          if (townhallLevel === 2 && building.id === 'canon') {
            building.buildings_unlocked = Math.max(2, Number(building.buildings_unlocked || 0))
          }
          dedupedById.set(building.id, building)
        })

        return Array.from(dedupedById.values())
      }

      const sortDefences = (structures) => {
        const priority = {
          canon: 0,
          archer_tower: 1,
        }

        return [...structures].sort((left, right) => {
          const leftPriority = priority[left.id] ?? 100
          const rightPriority = priority[right.id] ?? 100
          if (leftPriority !== rightPriority) return leftPriority - rightPriority
          return left.name.localeCompare(right.name)
        })
      }

      const createInitialLevels = (building) => {
        const count = Math.max(1, building.buildings_unlocked || 1)
        return Array.from({ length: count }, (_, index) => getDefaultRowLevel(building, index, isCopyUnlocked(building, index)))
      }

      const normalizedDefences = sortDefences(normalizeStructures(data?.defences))
      const normalizedArmy = normalizeStructures(data?.army)
      const normalizedResources = normalizeStructures(data?.resources)
      const normalizedTroops = normalizeStructures(data?.troops)

      setStructureCatalog({
        defences: normalizedDefences,
        army: normalizedArmy,
        resources: normalizedResources,
        troops: normalizedTroops,
      })

      const initialLevels = {}
      ;[...normalizedDefences, ...normalizedArmy, ...normalizedResources, ...normalizedTroops].forEach((building) => {
        initialLevels[building.id] = createInitialLevels(building)
      })
      setStructureLevels(initialLevels)
    } catch (fetchError) {
      console.error('Failed to load townhall structures:', fetchError)
      setStructureCatalog({ defences: [], army: [], resources: [], troops: [] })
      setStructureLevels({})
    } finally {
      setStructuresLoading(false)
    }
  }

  const handleSetupVillageStructures = () => {
    loadTownhallStructures(activeVillage?.townhall_level)
    setViewMode('structures')
  }

  const handleSetAllToZero = () => {
    const resetLevels = {}
    ;[...structureCatalog.defences, ...structureCatalog.army, ...structureCatalog.resources].forEach((building) => {
      const rowCount = Math.max(1, building.buildings_unlocked || building.levels?.length || 1)
      resetLevels[building.id] = Array.from({ length: rowCount }, (_, index) => getDefaultRowLevel(building, index, isCopyUnlocked(building, index)))
    })
    setStructureLevels(resetLevels)
  }

  const handleSetAllToMax = () => {
    const maxedLevels = {}
    ;[...structureCatalog.defences, ...structureCatalog.army, ...structureCatalog.resources].forEach((building) => {
      const rowCount = Math.max(1, building.buildings_unlocked || building.levels?.length || 1)
      const maxLevel = Math.max(...(building.levels || []).map((level) => level.level), 0)
      maxedLevels[building.id] = Array.from({ length: rowCount }, () => maxLevel)
    })
    setStructureLevels(maxedLevels)
  }

  const handleBackToLoaded = () => {
    setViewMode('loaded')
  }

  const handleProceedToWalls = async () => {
    if (!activeVillage) return
    setViewMode('walls')
    setWallLoading(true)

    try {
      const { data } = await supabase
        .from('townhall_buildings')
        .select('townhall_level, walls, defences, army, resources, troops')
        .eq('townhall_level', activeVillage.townhall_level)
        .single()

      const initialCounts = {}
      const wallLevels = data?.walls?.levels || []

      wallLevels.forEach((wallLevel) => {
        initialCounts[wallLevel.level] = 0
      })

      setWallConfig(data?.walls || null)
      setWallCounts(initialCounts)
    } catch (fetchError) {
      console.error('Failed to load wall config:', fetchError)
      setWallConfig(null)
      setWallCounts({})
      setStructureCatalog({ defences: [], army: [], resources: [], troops: [] })
      setStructureLevels({})
    } finally {
      setWallLoading(false)
    }
  }

  const handleWallCountChange = (levelNumber, value) => {
    setWallCounts((current) => ({
      ...current,
      [levelNumber]: Number(value),
    }))
  }

  const handleResetWalls = () => {
    const resetCounts = {}
    ;(wallConfig?.levels || []).forEach((wallLevel) => {
      resetCounts[wallLevel.level] = 0
    })
    setWallCounts(resetCounts)
  }

  const wallLevels = wallConfig?.levels || []
  const wallPieces = wallConfig?.buildings_unlocked || 0
  const wallBuilt = Object.values(wallCounts).reduce((total, value) => total + Number(value || 0), 0)
  const remainingWalls = Math.max(wallPieces - wallBuilt, 0)

  const isCopyUnlocked = (building, rowIndex) => {
    if (Array.isArray(building?.copy_unlocks) && building.copy_unlocks[rowIndex] != null) {
      return Boolean(building.copy_unlocks[rowIndex])
    }
    if (rowIndex === 0) {
      return building?.starts_unlocked !== false
    }
    return false
  }

  const getDefaultRowLevel = (building, rowIndex, unlocked = true) => {
    if (!unlocked) return 0
    return 1
  }

  const getBuildingImagePath = (building, level) => {
    if (building?.image_path) {
      return `${building.image_path}${level}.png`
    }

    const buildingId = building?.id
    const imageMap = {
      canon: (imageLevel) => canonImages[`../assets/Defences/canon/18_${imageLevel}.png`] || '',
      archer_tower: (imageLevel) => archerTowerImages[`../assets/Defences/Archer_Tower/16_${imageLevel}.png`] || '',
      army_camp: (imageLevel) => armyCampImages[`../assets/Army/Army_Camp/10_${imageLevel}.png`] || '',
      barracks: (imageLevel) => barracksImages[`../assets/Army/Barracks/8_${imageLevel}.png`] || '',
      clan_castle: (imageLevel) => clanCastleImages[`../assets/Army/clan_castle/19_${imageLevel}.png`] || '',
      gold_mine: (imageLevel) => goldMineImages[`../assets/Resources/goldmine/2_${imageLevel}.png`] || '',
      elixir_collector: (imageLevel) => elixirCollectorImages[`../assets/Resources/elixir_collector/3_${imageLevel}.png`] || '',
      gold_storage: (imageLevel) => goldStorageImages[`../assets/Resources/gold_storage/5_${imageLevel}.png`] || '',
      elixir_storage: (imageLevel) => elixirStorageImages[`../assets/Resources/elixi_storage/6_${imageLevel}.png`] || '',
    }

    const prefix = imageMap[buildingId]
    return prefix ? prefix(level) : ''
  }

  const updateStructureLevel = (buildingId, rowIndex, value) => {
    setStructureLevels((current) => {
      const nextLevels = [...(current[buildingId] || [])]
      nextLevels[rowIndex] = Number(value)
      return {
        ...current,
        [buildingId]: nextLevels,
      }
    })
  }

  const renderStructureCard = (building, cardKey = building.id) => {
    const displayName = building.name || formatStructureName(building.id)
    const currentLevels = structureLevels[building.id] || []
    const rowCount = Math.max(1, building.buildings_unlocked || currentLevels.length || 1)
    const maxLevel = Math.max(...(building.levels || []).map((level) => level.level), 0)
    const getMinimumLevel = (rowIndex) => getDefaultRowLevel(building, rowIndex, isCopyUnlocked(building, rowIndex))
    const clampLevel = (value, rowIndex) => Math.min(Math.max(Number(value || 0), getMinimumLevel(rowIndex)), maxLevel)
    const buttonLevels = building.id === 'archer_tower'
      ? Array.from({ length: maxLevel + 1 }, (_, index) => index)
      : Array.from({ length: maxLevel }, (_, index) => index + 1)

    return (
      <section key={cardKey} className={styles.defenceCard}>
        <div className={styles.defenceCardHeader}>
          <h3 className={styles.defenceCardTitle}>{displayName}</h3>
          <span className={styles.defenceCountBadge}>x{rowCount}</span>
        </div>
        <div className={styles.defenceSetRow}>
          <span className={styles.defenceSetLabel}>Set all to:</span>
          <div className={styles.defenceButtonGroup}>
            {buttonLevels.map((levelNumber) => (
              <button key={levelNumber} className={styles.defenceLevelBtn} onClick={() => {
                const nextLevels = Array.from({ length: rowCount }, (_, index) => (index === 0 ? levelNumber : 0))
                setStructureLevels((current) => ({
                  ...current,
                  [building.id]: nextLevels,
                }))
              }}>
                {levelNumber}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.defenceRows}>
          {Array.from({ length: rowCount }, (_, rowIndex) => {
            const defaultLevel = getDefaultRowLevel(building, rowIndex, isCopyUnlocked(building, rowIndex))
            const rowLevel = clampLevel(currentLevels[rowIndex] ?? defaultLevel, rowIndex)
            const minimumLevel = getMinimumLevel(rowIndex)
            return (
              <div key={`${building.id}-${rowIndex}`} className={styles.defenceRow}>
                <span className={styles.defenceRowCount}>{rowIndex + 1}</span>
                {getBuildingImagePath(building, rowLevel) ? (
                  <img
                    src={getBuildingImagePath(building, rowLevel)}
                    alt={displayName}
                    className={styles.defenceIcon}
                  />
                ) : (
                  <div className={styles.defenceIconPlaceholder} />
                )}
                <input
                  type="range"
                  min={minimumLevel}
                  max={maxLevel}
                  step="1"
                  value={rowLevel}
                  onChange={(e) => updateStructureLevel(building.id, rowIndex, e.target.value)}
                  className={styles.defenceSlider}
                />
                <input
                  type="number"
                  min={minimumLevel}
                  max={maxLevel}
                  step="1"
                  value={rowLevel}
                  onChange={(e) => updateStructureLevel(building.id, rowIndex, e.target.value)}
                  className={styles.defenceValueInput}
                />
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  const defencePriority = {
    canon: 0,
    archer_tower: 1,
  }

  const defenceBuildings = structureCatalog.defences
    .filter((building) => building.id !== 'clan_castle')
    .slice()
    .sort((left, right) => {
      const leftPriority = defencePriority[left.id] ?? 100
      const rightPriority = defencePriority[right.id] ?? 100
      if (leftPriority !== rightPriority) return leftPriority - rightPriority
      return (left.name || '').localeCompare(right.name || '')
    })

  return (
    <>
      <Header
        username={username}
        onLogout={onLogout}
        villages={villages}
        activeVillage={activeVillage}
        onSelectVillage={handleSelectVillage}
        onAddVillage={handleAddVillage}
      />
      <div className={styles.container}>
        <div className={styles.auroraLeft} />
        <div className={styles.auroraRight} />
        <div className={styles.content}>

          {showingSearch ? (
            <div className={styles.setupShell}>
              <div className={styles.setupHero}>
                <h2 className={styles.setupTitle}>Add New Village</h2>
                <p className={styles.setupSubtitle}>Search by player tag, confirm the village details, then save it to your account.</p>
              </div>

              <div className={styles.setupPrompt}>How would you like to find your village?</div>

              <section className={styles.setupCard}>
                <div className={styles.setupCardHeader}>
                  <span className={styles.setupCardArrow}>▾</span>
                  <span>Enter Your Player Tag</span>
                </div>

                <div className={styles.setupCardBody}>
                  <div className={styles.setupSearchColumn}>
                    <p className={styles.searchLabel}>Enter your player tag below to load the details of your village:</p>
                    <div className={styles.searchRow}>
                      <span className={styles.hashPrefix}>#</span>
                      <input
                        className={styles.tagInput}
                        type="text"
                        placeholder="Enter player tag"
                        value={tag}
                        onChange={(e) => setTag(e.target.value)}
                        onKeyDown={handleKeyDown}
                      />
                    </div>
                    <button
                      className={styles.searchBtn}
                      onClick={handleSearch}
                      disabled={loading}
                    >
                      {loading ? 'Loading...' : 'Load Player Details'}
                    </button>
                    {error && <p className={styles.errorMsg}>{error}</p>}
                  </div>

                  <div className={styles.setupPreviewColumn}>
                    {!playerData ? (
                      <div className={styles.previewPlaceholder}>
                        <p className={styles.previewPlaceholderText}>
                          Your player details will appear here after the tag is loaded.
                        </p>
                        <p className={styles.previewPlaceholderNote}>
                          Make sure the tag is correct before continuing.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className={styles.previewTopRow}>
                          <div className={styles.previewPlayerBlock}>
                            <div className={styles.previewHeader}>
                              <span className={styles.previewHeaderLabel}>Player</span>
                            </div>

                            <div className={styles.previewSummary}>
                              <h3 className={styles.previewName}>{playerData.name}</h3>
                              <div className={styles.expBadge}>
                                <img src="/src/assets/exp/xp.png" alt="xp" className={styles.expIcon} />
                                <span className={styles.expLevel}>{playerData.expLevel}</span>
                              </div>
                            </div>

                            <div className={styles.previewMeta}>Town Hall Level {playerData.townHallLevel}</div>
                          </div>

                          <div className={styles.previewClanBlock}>
                            <span className={styles.previewHeaderLabel}>Clan</span>
                            {playerData.clan ? (
                              <div className={styles.clanRow}>
                                {clanBadgeUrl ? (
                                  <img
                                    src={clanBadgeUrl}
                                    alt={playerData.clan.name}
                                    className={styles.clanBadge}
                                  />
                                ) : (
                                  <span className={styles.clanBadge}>?</span>
                                )}
                                <span className={styles.clanName}>{playerData.clan.name}</span>
                              </div>
                            ) : (
                              <div className={styles.notInClan}>Player is not in a clan</div>
                            )}
                          </div>
                        </div>

                        <div className={styles.previewCenterRow}>
                          <img
                            src={`/src/assets/townhall/1_${playerData.townHallLevel}.png`}
                            alt={`TH ${playerData.townHallLevel}`}
                            className={styles.previewThImage}
                          />
                        </div>

                        <div className={styles.previewFooter}>
                          <p className={styles.previewFooterText}>
                            If the details above look correct, press the button below to save this village.
                          </p>
                          <button className={styles.proceedBtn} onClick={handleProceed} disabled={saving}>
                            {saving ? 'Saving...' : 'Proceed →'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </section>
            </div>
          ) : showingLoaded ? (
            <div className={styles.loadedFlowCard}>
              <div className={styles.loadedFlowHeader}>Village Loaded</div>
              <p className={styles.loadedFlowText}>
                Your village has been successfully loaded. Click the button below to setup the structures:
              </p>
              <button className={styles.loadedFlowBtn} onClick={handleSetupVillageStructures}>
                Setup Village Structures ▸
              </button>
            </div>
          ) : showingStructures ? (
            <div className={styles.structuresFlowCard}>
              <div className={styles.structuresHero}>
                <span className={styles.structuresTitle}>NEW: Upload your Village Export</span>
                <p className={styles.structuresSubtitle}>
                  Update all the levels in your village and active upgrades with a press of a button!
                </p>
                <button className={styles.structuresUploadBtn}>Upload Export</button>
              </div>

              <div className={styles.structuresDivider} />

              <div className={styles.structuresGrid}>
                <section className={styles.structuresCard}>
                  <h3 className={styles.structuresSectionTitle}>Builders (Excluding B.O.B)</h3>
                  <div className={styles.structuresTopRow}>
                    <div className={styles.builderBlock}>
                      <div className={styles.buildersRow}>
                        <img src="/src/assets/BuilderHut/Bob.png" alt="Builder" className={styles.builderIcon} />
                        <input
                          type="range"
                          min="2"
                          max="5"
                          step="1"
                          value={builderCount}
                          onChange={(e) => setBuilderCount(Number(e.target.value))}
                          className={styles.builderRange}
                        />
                        <div className={styles.builderValueBox}>{builderCount}</div>
                      </div>
                    </div>

                    <div className={styles.bobBlock}>
                      <h3 className={styles.structuresSectionTitle}>B.O.B</h3>
                      <p className={styles.structuresBobText}>✕ B.O.B is available at Builder Hall 9</p>
                    </div>
                  </div>
                  <p className={styles.structuresNote}>
                    <strong>Please note:</strong> Reducing the number of builders can affect builder plans and active upgrade tasks, so be sure this is correct!
                  </p>

                  <div className={styles.structuresFooter}>
                    <h3 className={styles.structuresFooterTitle}>Already fully upgraded?</h3>
                    <p className={styles.structuresFooterText}>
                      Save time testing the lower card using the buttons below:
                    </p>
                    <div className={styles.structuresFooterButtons}>
                      <button className={styles.structuresDangerBtn} onClick={handleSetAllToZero}>Set all to 0</button>
                      <button className={styles.structuresDangerBtn} onClick={handleSetAllToMax}>Set all to max</button>
                      <button className={styles.structuresSecondaryBtn} onClick={handleProceedToWalls}>Proceed</button>
                    </div>
                  </div>

                </section>

                <section className={styles.structuresCard}>
                  <div className={styles.structuresDatabaseSection}>
                    <h2 className={styles.structuresDatabaseTitle}>Defences</h2>
                    <div className={styles.structuresDatabaseGrid}>
                      {defenceBuildings.map((building, index) => renderStructureCard(building, `defences-${building.id}-${index}`))}
                    </div>

                    <h2 className={styles.structuresDatabaseTitle}>Resources</h2>
                    <div className={styles.structuresDatabaseGrid}>
                      {structureCatalog.resources.map((building, index) => renderStructureCard(building, `resources-${building.id}-${index}`))}
                    </div>

                    <h2 className={styles.structuresDatabaseTitle}>Army</h2>
                    <div className={styles.structuresDatabaseGrid}>
                      {structureCatalog.army.map((building, index) => renderStructureCard(building, `army-${building.id}-${index}`))}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          ) : showingWalls ? (
            <div className={styles.wallsFlowCard}>
              <h2 className={styles.wallsTitle}>Update Walls</h2>

              <div className={styles.wallsInfoBar}>
                To quickly see a summary of your wall pieces, edit one of your village layouts and press "Update". The bar along the bottom will show the levels and counts of each structure. To avoid losing your base design, press "Cancel" to return to your village.
              </div>

              <button className={styles.wallsResetBtn} onClick={handleResetWalls}>Reset Walls to 0</button>

              <div className={styles.wallsBody}>
                <div className={styles.wallsLeftPane}>
                  <h3 className={styles.wallsSectionTitle}>Walls</h3>

                  {wallLoading ? (
                    <p className={styles.wallsLoading}>Loading wall data...</p>
                  ) : (
                    wallLevels.map((wallLevel) => (
                      <div key={wallLevel.level} className={styles.wallRow}>
                        <img
                          src={`${wallConfig?.image_path || '/src/assets/Walls/60_'}${wallLevel.level}.png`}
                          alt={`Wall Level ${wallLevel.level}`}
                          className={styles.wallRowIcon}
                        />
                        <div className={styles.wallRowContent}>
                          <div className={styles.wallRowLabel}>Level {wallLevel.level}</div>
                          <input
                            type="range"
                            min="0"
                            max={wallPieces}
                            step="1"
                            value={wallCounts[wallLevel.level] || 0}
                            onChange={(e) => handleWallCountChange(wallLevel.level, e.target.value)}
                            className={styles.wallSlider}
                          />
                        </div>
                        <div className={styles.wallValueBox}>{wallCounts[wallLevel.level] || 0}</div>
                      </div>
                    ))
                  )}
                </div>

                <div className={styles.wallsOverviewCard}>
                  <h3 className={styles.wallsOverviewTitle}>Walls Overview</h3>

                  <div className={styles.wallsOverviewStats}>
                    <div className={styles.wallsOverviewStatBlock}>
                      <div className={styles.wallsOverviewLabel}>Maximum Level:</div>
                      <div className={styles.wallsOverviewValueRow}>
                        <img src={`${wallConfig?.image_path || '/src/assets/Walls/60_'}1.png`} alt="Wall" className={styles.wallsMiniIcon} />
                                                <img src={`${wallConfig?.image_path || '/src/assets/Walls/60_'}1.png`} alt="Wall" className={styles.wallsMiniIcon} />
                        <span>{wallLevels.length || 0}</span>
                      </div>
                    </div>

                    <div className={styles.wallsOverviewStatBlock}>
                      <div className={styles.wallsOverviewLabel}>Pieces Available:</div>
                      <div className={styles.wallsOverviewValueRow}>{wallPieces}</div>
                    </div>

                    <div className={styles.wallsOverviewBuiltBlock}>
                      <div className={styles.wallsOverviewLabel}>Built:</div>
                      <div className={styles.wallsOverviewBuiltValue}>{wallBuilt} out of {wallPieces}</div>
                      <div className={styles.wallsOverviewWarning}>⚠ You can build {remainingWalls} more walls</div>
                    </div>
                  </div>

                  <div className={styles.wallsOverviewActions}>
                    <button className={styles.wallsCancelBtn} onClick={handleBackToLoaded}>✕ Cancel</button>
                    <button className={styles.wallsUpdateBtn}>✓ Update</button>
                  </div>
                </div>
              </div>

            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}
