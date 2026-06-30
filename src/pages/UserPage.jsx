import { useState, useEffect, useRef } from 'react'
import styles from './UserPage.module.css'
import RefreshIcon from '@mui/icons-material/Refresh'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
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
  const [refreshingVillage, setRefreshingVillage] = useState(false)
  const activeVillageRef = useRef(null)
  const viewModeRef = useRef('search')

  useEffect(() => {
    activeVillageRef.current = activeVillage
  }, [activeVillage])

  useEffect(() => {
    viewModeRef.current = viewMode
  }, [viewMode])

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

      // Persist fetched village automatically for signed-in users
      if (userId) {
        const saved = await upsertVillageFromPlayer(data)
        if (saved) {
          setActiveVillage(saved)
          await loadVillages()
          setViewMode('loaded')
        }
      }
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
      loadTownhallStructures(data.townhall_level)
      setViewMode('structures')
      setPlayerData(null)
      setTag('')
    }
    setSaving(false)
  }

  // Upsert a village row for the current user from fetched player data
  const upsertVillageFromPlayer = async (player) => {
    if (!userId || !player?.tag) return null

    const cleanTag = String(player.tag).trim().replace(/^#/, '').toUpperCase()

    // Check existing
    const { data: existing } = await supabase
      .from('user_villages')
      .select('*')
      .eq('user_id', userId)
      .eq('player_tag', cleanTag)
      .maybeSingle()

    const row = {
      user_id: userId,
      player_tag: cleanTag,
      player_name: player.name,
      townhall_level: player.townHallLevel,
      exp_level: player.expLevel,
      clan_name: player.clan?.name || null,
      clan_badge_url: player.clan?.badgeUrls?.small || null,
      clan_level: player.clan?.clanLevel || null,
    }

    if (existing) {
      const { data, error } = await supabase
        .from('user_villages')
        .update(row)
        .eq('id', existing.id)
        .select()
        .single()

      if (data) return data
      return null
    }

    const { data, error } = await supabase
      .from('user_villages')
      .insert(row)
      .select()
      .single()

    if (data) return data
    return null
  }

  const handleSelectVillage = (village) => {
    setActiveVillage(village)
    setViewMode('loaded')
    setPlayerData(null)
    setTag('')
  }

  const handleRefreshVillage = async () => {
    // Determine the tag to refresh from: active village -> loaded playerData -> tag input
    const sourceTag = activeVillage?.player_tag || playerData?.tag || tag
    if (!sourceTag) return

    setRefreshingVillage(true)
    setError('')

    try {
      const cleanTag = String(sourceTag).trim().replace(/^#/, '').toUpperCase()
      const res = await fetch(`/api/coc/players/%23${cleanTag}`)

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Failed to refresh village')
      }

      const data = await res.json()

      // If signed in, upsert the village so fetch results persist
      if (userId) {
        const saved = await upsertVillageFromPlayer(data)
        if (saved) {
          setActiveVillage(saved)
          await loadVillages()
        }
      } else {
        // No signed-in user: if we have an activeVillage row id, update that row
        if (activeVillage?.id) {
          const updatedVillage = {
            ...activeVillage,
            player_name: data.name,
            townhall_level: data.townHallLevel,
            exp_level: data.expLevel,
            clan_name: data.clan?.name || null,
            clan_badge_url: data.clan?.badgeUrls?.small || null,
            clan_level: data.clan?.clanLevel || null,
          }

          const { error: updateError } = await supabase
            .from('user_villages')
            .update({
              player_name: updatedVillage.player_name,
              townhall_level: updatedVillage.townhall_level,
              exp_level: updatedVillage.exp_level,
              clan_name: updatedVillage.clan_name,
              clan_badge_url: updatedVillage.clan_badge_url,
              clan_level: updatedVillage.clan_level,
            })
            .eq('id', activeVillage.id)

          if (updateError) throw updateError

          setActiveVillage(updatedVillage)
        }

        // Update preview data so user can see the refreshed info
        setPlayerData(data)
      }
    } catch (refreshError) {
      setError(refreshError.message || 'Failed to refresh village')
    } finally {
      setRefreshingVillage(false)
    }
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

  const normalizeTownhallBuildings = (data) => {
    const normalizeStructures = (structures) => {
      if (!structures) return []
      const normalizedList = Array.isArray(structures)
        ? structures.map((value) => ({ ...(value || {}) }))
        : Object.entries(structures).map(([key, value]) => ({ id: key, ...(value || {}) }))

      const dedupedById = new Map()
      normalizedList.forEach((building) => {
        if (!building.id) return
        if (Number(data?.townhall_level) === 2 && building.id === 'canon') {
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
        return (left.name || formatStructureName(left.id)).localeCompare(right.name || formatStructureName(right.id))
      })
    }

    const normalizedDefences = sortDefences(normalizeStructures(data?.defences))
    const normalizedArmy = normalizeStructures(data?.army)
    const normalizedResources = normalizeStructures(data?.resources)
    const normalizedTroops = normalizeStructures(data?.troops)

    return {
      defences: normalizedDefences,
      army: normalizedArmy,
      resources: normalizedResources,
      troops: normalizedTroops,
    }
  }

  const loadTownhallSnapshot = async (townhallLevel, options = {}) => {
    if (!townhallLevel) return null

    const { loadStructures = false, loadWalls = false } = options

    const { data } = await supabase
      .from('townhall_buildings')
      .select('*')
      .eq('townhall_level', townhallLevel)
      .single()

    const normalizedData = normalizeTownhallBuildings(data)

    if (loadStructures) {
      setStructureCatalog(normalizedData)

      let savedStructureRows = []
      if (activeVillageRef.current?.id) {
        const { data: structureRows } = await supabase
          .from('user_village_buildings')
          .select('building_id, current_level, quantity')
          .eq('village_id', activeVillageRef.current.id)
          .not('building_id', 'like', 'walls-%')

        savedStructureRows = structureRows || []
      }

      const createInitialLevels = (building) => {
        const count = Math.max(1, building.buildings_unlocked || 1)
        return Array.from({ length: count }, (_, index) => {
          const savedRow = savedStructureRows.find((row) => row.building_id === `${building.id}-${index + 1}`)
          if (savedRow) return Number(savedRow.current_level || 0)
          return getDefaultRowLevel(building, index, isCopyUnlocked(building, index))
        })
      }

      const initialLevels = {}
      ;[...normalizedData.defences, ...normalizedData.army, ...normalizedData.resources, ...normalizedData.troops].forEach((building) => {
        initialLevels[building.id] = createInitialLevels(building)
      })
      setStructureLevels(initialLevels)
    }

    if (loadWalls) {
      const initialCounts = {}
      const wallLevels = data?.walls?.levels || []

      let savedWallRows = []
      if (activeVillageRef.current?.id) {
        const { data: wallRows } = await supabase
          .from('user_village_buildings')
          .select('building_id, current_level, quantity')
          .eq('village_id', activeVillageRef.current.id)
          .like('building_id', 'walls-%')

        savedWallRows = wallRows || []
      }

      wallLevels.forEach((wallLevel) => {
        const savedRow = savedWallRows.find((row) => row.building_id === `walls-${wallLevel.level}`)
        initialCounts[wallLevel.level] = Number(savedRow?.quantity || 0)
      })

      setWallConfig(data?.walls || null)
      setWallCounts(initialCounts)
    }

    return data || null
  }

  const loadTownhallStructures = async (townhallLevel) => {
    if (!townhallLevel) return

    setStructuresLoading(true)

    try {
      const data = await loadTownhallSnapshot(townhallLevel, { loadStructures: true })
      if (!data) {
        setStructureCatalog({ defences: [], army: [], resources: [], troops: [] })
        setStructureLevels({})
      }
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
    ;[...visibleDefenseBuildings, ...visibleArmyBuildings, ...visibleResourceBuildings].forEach((building) => {
      const rowCount = Math.max(1, building.buildings_unlocked || building.levels?.length || 1)
      resetLevels[building.id] = Array.from({ length: rowCount }, (_, index) => getDefaultRowLevel(building, index, isCopyUnlocked(building, index)))
    })
    setStructureLevels(resetLevels)
  }

  const handleSetAllToMax = () => {
    const maxedLevels = {}
    ;[...visibleDefenseBuildings, ...visibleArmyBuildings, ...visibleResourceBuildings].forEach((building) => {
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
      const data = await loadTownhallSnapshot(activeVillage.townhall_level, { loadWalls: true })
      if (!data) {
        setWallConfig(null)
        setWallCounts({})
      }
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
    const otherWalls = Object.entries(wallCounts).reduce((total, [levelKey, count]) => {
      if (Number(levelKey) === Number(levelNumber)) return total
      return total + Number(count || 0)
    }, 0)
    const maxForThisLevel = Math.max(wallPieces - otherWalls, 0)

    setWallCounts((current) => ({
      ...current,
      [levelNumber]: Math.min(Math.max(Number(value) || 0, 0), maxForThisLevel),
    }))
  }

  const handleResetWalls = () => {
    const resetCounts = {}
    ;(wallConfig?.levels || []).forEach((wallLevel) => {
      resetCounts[wallLevel.level] = 0
    })
    setWallCounts(resetCounts)
  }

  const handleUpdateWalls = async () => {
    if (!activeVillage?.id || !wallConfig) return

    setWallLoading(true)
    setError('')

    try {
      const wallRowsToSave = (wallConfig.levels || [])
        .map((wallLevel) => ({
          village_id: activeVillage.id,
          building_id: `walls-${wallLevel.level}`,
          building_name: 'Walls',
          current_level: wallLevel.level,
          quantity: Number(wallCounts[wallLevel.level] || 0),
        }))
        .filter((row) => row.quantity > 0)

      const structureRowsToSave = [...visibleDefenseBuildings, ...visibleArmyBuildings, ...visibleResourceBuildings]
        .flatMap((building) => {
          const currentLevels = structureLevels[building.id] || []
          const rowCount = Math.max(1, building.buildings_unlocked || currentLevels.length || 1)

          return Array.from({ length: rowCount }, (_, index) => ({
            village_id: activeVillage.id,
            building_id: `${building.id}-${index + 1}`,
            building_name: building.name || formatStructureName(building.id),
            current_level: Number(currentLevels[index] ?? getDefaultRowLevel(building, index, isCopyUnlocked(building, index))),
            quantity: 1,
          }))
        })
        .filter((row) => row.current_level >= 0)

      const { error: deleteError } = await supabase
        .from('user_village_buildings')
        .delete()
        .eq('village_id', activeVillage.id)

      if (deleteError) throw deleteError

      const rowsToInsert = [...structureRowsToSave, ...wallRowsToSave]

      if (rowsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('user_village_buildings')
          .insert(rowsToInsert)

        if (insertError) throw insertError
      }

      setViewMode('loaded')
      alert('Walls saved successfully!')
    } catch (saveError) {
      setError(saveError.message || 'Failed to save walls')
    } finally {
      setWallLoading(false)
    }
  }

  const wallLevels = wallConfig?.levels || []
  const wallPieces = wallConfig?.buildings_unlocked || 0
  const wallBuilt = Object.values(wallCounts).reduce((total, value) => total + Number(value || 0), 0)
  const remainingWalls = Math.max(wallPieces - wallBuilt, 0)
  const wallMaxLevel = wallLevels.length > 0 ? Math.max(...wallLevels.map((wallLevel) => wallLevel.level || 0)) : 0
  const getWallRowMax = (levelNumber) => {
    const otherWalls = Object.entries(wallCounts).reduce((total, [levelKey, count]) => {
      if (Number(levelKey) === Number(levelNumber)) return total
      return total + Number(count || 0)
    }, 0)

    return Math.max(wallPieces - otherWalls, 0)
  }
  const visibleDefenseBuildings = structureCatalog.defences.filter((building) => ['canon', 'archer_tower'].includes(building.id))
  const visibleResourceBuildings = structureCatalog.resources.filter((building) => ['gold_mine', 'elixir_collector', 'gold_storage', 'elixir_storage'].includes(building.id))
  const visibleArmyBuildings = structureCatalog.army.filter((building) => building.id === 'army_camp')

  const computeStructuresCompletion = () => {
    const buildings = [...structureCatalog.defences, ...structureCatalog.army, ...structureCatalog.resources, ...structureCatalog.troops]
    if (!buildings || buildings.length === 0) return 0
    let totalRatio = 0
    let count = 0

    buildings.forEach((building) => {
      const maxLevel = Math.max(...(building.levels || []).map((l) => l.level), 0)
      const rows = Math.max(1, building.buildings_unlocked || (building.levels?.length || 1))
      const levelsArray = structureLevels[building.id] || Array.from({ length: rows }, () => getDefaultRowLevel(building, 0, true))

      for (let i = 0; i < rows; i++) {
        const cur = Number(levelsArray[i] || 0)
        if (maxLevel > 0) totalRatio += (cur / maxLevel)
        else totalRatio += 0
        count += 1
      }
    })

    if (count === 0) return 0
    return Math.round((totalRatio / count) * 100)
  }

  useEffect(() => {
    const townhallLevel = activeVillage?.townhall_level
    if (!townhallLevel) return

    const channel = supabase
      .channel(`townhall_buildings_${townhallLevel}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'townhall_buildings',
          filter: `townhall_level=eq.${townhallLevel}`,
        },
        async (payload) => {
          const currentVillage = activeVillageRef.current
          const currentView = viewModeRef.current
          if (!currentVillage || currentVillage.townhall_level !== townhallLevel) return

          if (currentView === 'structures') {
            await loadTownhallSnapshot(townhallLevel, { loadStructures: true })
            return
          }

          if (currentView === 'walls') {
            await loadTownhallSnapshot(townhallLevel, { loadWalls: true })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeVillage?.townhall_level])

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
                const nextLevels = Array.from({ length: rowCount }, () => levelNumber)
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
            <div className={styles.centeredPlayerHeader}>
              <div className={styles.centeredPlayerName}>{activeVillage?.player_name || playerData?.name || 'Village Loaded'}</div>
              <div className={styles.centeredPlayerTag}>{activeVillage?.player_tag || playerData?.tag || ''}</div>

              <div className={styles.headerDivider} />

              <div className={styles.detailedColumns}>
                {/* Left: Current Townhall */}
                <div className={styles.leftPanel}>
                  <div className={styles.thHeader}>
                    <h2>Town Hall {activeVillage?.townhall_level || playerData?.townHallLevel || 0}</h2>
                    {activeVillage?.clan_name && <div className={styles.clanName}>{activeVillage.clan_name}</div>}
                  </div>

                  <div className={styles.thBody}>
                    <div className={styles.thImageWrap}>
                      <img
                        src={`/src/assets/townhall/1_${activeVillage?.townhall_level || playerData?.townHallLevel || 2}.png`}
                        alt={`TH ${activeVillage?.townhall_level || playerData?.townHallLevel || 2}`}
                        className={styles.currentThImageSmall}
                      />

                      <div className={styles.thButtonsRow}>
                        <button className={styles.leftApiBtn} onClick={handleRefreshVillage} disabled={refreshingVillage} title="API">
                          <RefreshIcon className={`${styles.btnIcon} ${refreshingVillage ? styles.rotating : ''}`} />
                          API
                        </button>
                        <button className={styles.leftUploadBtn} title="Upload">
                          <CloudUploadIcon className={styles.btnIcon} />
                          Upload
                        </button>
                      </div>

                      <button className={styles.switchBuilderBtn}>Switch to Builder Base</button>
                    </div>

                    <div className={styles.progressBlock}>
                      <div className={styles.progressLabel}>Completion:</div>
                      <div className={styles.progressBars}>
                          <div className={styles.progressRow}>
                            <div className={styles.progressName}>Structures</div>
                            <div className={styles.progressBarWrap}>
                              <div className={styles.progressBarInner} style={{width: `${Math.max(0, computeStructuresCompletion())}%`}}>
                                <span className={styles.progressInnerLabel}>{Math.max(0, computeStructuresCompletion())}%</span>
                              </div>
                            </div>
                          </div>

                        <div className={styles.progressRow}>
                          <div className={styles.progressName}>Walls</div>
                          <div className={styles.progressBarWrap}>
                            <div className={styles.progressBarInner} style={{width: `${wallPieces ? Math.round((wallBuilt/(wallPieces||1))*100) : 0}%`}}>
                              <span className={styles.progressInnerLabel}>{wallPieces ? Math.round((wallBuilt/(wallPieces||1))*100) : 0}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Middle: Next Townhall */}
                <div className={styles.middlePanel}>
                  <div className={styles.nextThBox}>
                    <h4>Next Town Hall:</h4>
                    <div className={styles.nextThPreview}>
                      <img src={`/src/assets/townhall/1_${(activeVillage?.townhall_level||playerData?.townHallLevel||2)+1}.png`} alt="Next TH" className={styles.nextThImage} />
                      <div className={styles.nextThInfo}>
                        <div className={styles.nextThCost}><strong>Cost:</strong> <span className={styles.costValue}>—</span></div>
                        <div className={styles.nextThDuration}><strong>Duration:</strong> <span className={styles.durationValue}>—</span></div>
                        <button className={styles.startUpgradeBtn}>Start TH Upgrade</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Mass Update & Boosts */}
                <div className={styles.rightPanel}>
                  <div className={styles.massUpdateBox}>
                    <h4>Mass Update:</h4>
                    <div className={styles.massButtons}>
                      <button className={`${styles.massBtn} ${styles.active}`}>Structures</button>
                      <button className={styles.massBtn}>Walls</button>
                    </div>
                  </div>

                  <div className={styles.boostsBox}>
                    <h4>Boosts:</h4>
                    <div className={styles.boostButtonsRow}>
                      <button className={styles.builderBoostBtn}>Use Builder Boost</button>
                      <button className={styles.researchBoostBtn}>Use Research Boost</button>
                    </div>
                    <div className={styles.boostNote}>Season Boosts are available at Town Hall 7</div>
                  </div>
                </div>
              </div>
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
                    </div>
                  </div>

                </section>

                <section className={styles.structuresCard}>
                  <div className={styles.structuresDatabaseSection}>
                    <h2 className={styles.structuresDatabaseTitle}>Defences</h2>
                    <div className={styles.structuresDatabaseGrid}>
                      {visibleDefenseBuildings.map((building, index) => renderStructureCard(building, `defences-${building.id}-${index}`))}
                    </div>

                    <h2 className={styles.structuresDatabaseTitle}>Resources</h2>
                    <div className={styles.structuresDatabaseGrid}>
                      {visibleResourceBuildings.map((building, index) => renderStructureCard(building, `resources-${building.id}-${index}`))}
                    </div>

                    <h2 className={styles.structuresDatabaseTitle}>Army</h2>
                    <div className={styles.structuresDatabaseGrid}>
                      {visibleArmyBuildings.map((building, index) => renderStructureCard(building, `army-${building.id}-${index}`))}
                    </div>
                  </div>
                </section>

                <div className={styles.structuresProceedBar}>
                  <button className={styles.structuresSecondaryBtn} onClick={handleProceedToWalls}>Proceed</button>
                </div>

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
                            max={getWallRowMax(wallLevel.level)}
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
                        <img
                          src={`${wallConfig?.image_path || '/src/assets/Walls/60_'}${wallMaxLevel || 1}.png`}
                          alt={`Wall Level ${wallMaxLevel || 1}`}
                          className={styles.wallsMiniIcon}
                        />
                        <span>{wallMaxLevel || 0}</span>
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
                    <button className={styles.wallsUpdateBtn} onClick={handleUpdateWalls} disabled={wallLoading}>
                      {wallLoading ? 'Saving...' : '✓ Update'}
                    </button>
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
