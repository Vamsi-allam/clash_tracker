import { useState, useEffect, useRef } from 'react'
import styles from './UserPage.module.css'
import RefreshIcon from '@mui/icons-material/Refresh'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import GridViewIcon from '@mui/icons-material/GridView'
import BorderAllIcon from '@mui/icons-material/BorderAll'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import SettingsIcon from '@mui/icons-material/Settings'
import HandymanOutlinedIcon from '@mui/icons-material/HandymanOutlined'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import CheckIcon from '@mui/icons-material/Check'
import builderBoostImg from '../assets/magic-items/builder-boost.png'
import researchBoostImg from '../assets/magic-items/research-boost.png'
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

const formatPlayerTag = (value = '') => {
  const cleanTag = String(value).trim().replace(/^#/, '').toUpperCase()
  return cleanTag ? `#${cleanTag}` : ''
}

const formatUpgradeClock = (remainingSeconds) => {
  const safeSeconds = Math.max(0, Math.ceil(Number(remainingSeconds || 0)))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const seconds = safeSeconds % 60

  return [
    hours ? `${hours}h` : '',
    minutes ? `${minutes}m` : '',
    !hours && !minutes ? `${seconds}s` : seconds ? `${seconds}s` : '',
  ].filter(Boolean).join(' ')
}

const getStructureRowCount = (building, currentLevels = []) => {
  const unlockedCount = Number(building?.buildings_unlocked) || 0
  const savedCount = Array.isArray(currentLevels) ? currentLevels.length : 0
  return Math.max(1, unlockedCount, savedCount)
}

const getUpgradeRowIndex = (buildingId = '') => {
  const match = String(buildingId).match(/-(\d+)$/)
  if (!match) return null

  const rowIndex = Number(match[1]) - 1
  return Number.isFinite(rowIndex) && rowIndex >= 0 ? rowIndex : null
}

const getOpenActionRowStorageKey = (userId, villageId) => `clash_tracker_open_action_row:${userId || 'guest'}:${villageId || 'none'}`

const readOpenActionRowKey = (userId, villageId) => {
  if (typeof window === 'undefined' || !villageId) return ''

  try {
    return window.localStorage.getItem(getOpenActionRowStorageKey(userId, villageId)) || ''
  } catch {
    return ''
  }
}

const getTownhallSnapshotCacheKey = (villageId, townhallLevel) => `clash_tracker_townhall_snapshot:${villageId || 'none'}:${townhallLevel || 'none'}`

const readTownhallSnapshotCache = (villageId, townhallLevel) => {
  if (typeof window === 'undefined' || !villageId || !townhallLevel) return null

  try {
    const rawValue = window.localStorage.getItem(getTownhallSnapshotCacheKey(villageId, townhallLevel))
    return rawValue ? JSON.parse(rawValue) : null
  } catch {
    return null
  }
}

const writeTownhallSnapshotCache = (villageId, townhallLevel, nextSnapshot) => {
  if (typeof window === 'undefined' || !villageId || !townhallLevel) return

  try {
    window.localStorage.setItem(
      getTownhallSnapshotCacheKey(villageId, townhallLevel),
      JSON.stringify({
        ...nextSnapshot,
        savedAt: new Date().toISOString(),
      }),
    )
  } catch {
    // Ignore cache write failures.
  }
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
const upgradeResourceIcons = {
  gold: '/src/assets/magic-items/gold.png',
  elixir: '/src/assets/magic-items/elixir.png',
  dark_elixir: '/src/assets/magic-items/de.png',
}

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
  const [remainingBetaBuilderCount, setRemainingBetaBuilderCount] = useState(2)
  const [savingBuilders, setSavingBuilders] = useState(false)
  const [wallConfig, setWallConfig] = useState(null)
  const [wallCounts, setWallCounts] = useState({})
  const [wallLoading, setWallLoading] = useState(false)
  const [structureCatalog, setStructureCatalog] = useState({ defences: [], army: [], resources: [], troops: [] })
  const [structureLevels, setStructureLevels] = useState({})
  const [structuresLoading, setStructuresLoading] = useState(false)
  const [refreshingVillage, setRefreshingVillage] = useState(false)
  const [activeLoadedTab, setActiveLoadedTab] = useState('defences')
  const [pendingUpgrades, setPendingUpgrades] = useState([])
  const [upgradeClock, setUpgradeClock] = useState(Date.now())
  const [openActionRowKey, setOpenActionRowKey] = useState('')
  const [actionPopup, setActionPopup] = useState({ open: false, title: '', action: '', rowKey: '' })
  const activeVillageRef = useRef(null)
  const viewModeRef = useRef('search')
  const builderCountRef = useRef(2)
  const upgradingRowsRef = useRef(false)
  const previousLoadedTabRef = useRef('defences')
  const suppressSnapshotRefreshRef = useRef(false)

  const setActiveVillagePersisted = async (villageId) => {
    if (!userId || !villageId) return

    await supabase
      .from('user_villages')
      .update({ is_active: false })
      .eq('user_id', userId)

    const { error } = await supabase
      .from('user_villages')
      .update({ is_active: true })
      .eq('id', villageId)

    if (error) throw error
  }

  useEffect(() => {
    activeVillageRef.current = activeVillage
  }, [activeVillage])

  useEffect(() => {
    viewModeRef.current = viewMode
  }, [viewMode])

  useEffect(() => {
    const savedBuilderCount = Number(activeVillage?.builder_count)
    if (savedBuilderCount) {
      const normalizedCount = Math.min(5, Math.max(2, savedBuilderCount))
      builderCountRef.current = normalizedCount
      setBuilderCount(normalizedCount)
    }
  }, [activeVillage])

  useEffect(() => {
    if (!activeVillage?.id) {
      setOpenActionRowKey('')
      return
    }

    setOpenActionRowKey(readOpenActionRowKey(userId, activeVillage.id))
  }, [userId, activeVillage?.id])

  useEffect(() => {
    if (structuresLoading) return
    if (!activeVillage?.id || !openActionRowKey) return

    const rowIndex = getUpgradeRowIndex(openActionRowKey)
    if (rowIndex == null) return

    const pendingUpgrade = getPendingUpgradeForRow(activeVillage.id, openActionRowKey, rowIndex)
    if (!pendingUpgrade) {
      setOpenActionRowKey('')
    }
  }, [activeVillage?.id, openActionRowKey, pendingUpgrades, structuresLoading])

  useEffect(() => {
    if (typeof window === 'undefined' || !activeVillage?.id) return

    try {
      if (openActionRowKey) {
        window.localStorage.setItem(getOpenActionRowStorageKey(userId, activeVillage.id), openActionRowKey)
      } else {
        window.localStorage.removeItem(getOpenActionRowStorageKey(userId, activeVillage.id))
      }
    } catch {
      // Ignore storage failures.
    }
  }, [openActionRowKey, userId, activeVillage?.id])

  useEffect(() => {
    loadVillages()
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setPendingUpgrades([])
      return
    }

    setPendingUpgrades([])
  }, [userId])

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setUpgradeClock(Date.now())
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [])

  const loadVillages = async () => {
    if (!userId) return
    const { data } = await supabase
      .from('user_villages')
      .select('*')
      .eq('user_id', userId)
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false })
    if (data && data.length > 0) {
      setVillages(data)
      const selectedVillage = data.find((village) => village.is_active) || data[0]
      if (selectedVillage) {
        setActiveVillage(selectedVillage)
        const selectedBuilderCount = Math.min(5, Math.max(2, Number(selectedVillage.builder_count) || 2))
        builderCountRef.current = selectedBuilderCount
        setBuilderCount(selectedBuilderCount)
        setRemainingBetaBuilderCount(selectedBuilderCount)
        loadTownhallStructures(selectedVillage.townhall_level, selectedVillage.id)
      }
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

    const cleanTag = String(playerData.tag || '').trim().replace(/^#/, '').toUpperCase()
    const storedTag = formatPlayerTag(cleanTag)
    const selectedBuilderCount = Math.min(5, Math.max(2, Number(builderCountRef.current) || 2))

    const existingResult = await supabase
      .from('user_villages')
      .select('id')
      .eq('user_id', userId)
      .eq('player_tag', storedTag)
      .maybeSingle()

    const villageRow = {
      user_id: userId,
      player_tag: storedTag,
      player_name: playerData.name,
      townhall_level: playerData.townHallLevel,
      exp_level: playerData.expLevel,
      builder_count: selectedBuilderCount,
      clan_name: playerData.clan?.name || null,
      clan_badge_url: playerData.clan?.badgeUrls?.small || null,
      clan_level: playerData.clan?.clanLevel || null,
    }
    const { data, error: saveError } = existingResult.data
      ? await supabase
        .from('user_villages')
        .update(villageRow)
        .eq('id', existingResult.data.id)
        .select()
        .single()
      : await supabase
        .from('user_villages')
        .insert(villageRow)
        .select()
        .single()

    if (saveError) {
      setError(saveError.message || 'Failed to save village')
    } else if (data) {
      await setActiveVillagePersisted(data.id)
      await loadVillages()
      setActiveVillage(data)
      loadTownhallStructures(data.townhall_level, data.id)
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
    const storedTag = formatPlayerTag(cleanTag)
    const selectedBuilderCount = Math.min(5, Math.max(2, Number(builderCountRef.current) || 2))

    // Check existing
    const { data: existing } = await supabase
      .from('user_villages')
      .select('*')
      .eq('user_id', userId)
      .eq('player_tag', storedTag)
      .maybeSingle()

    const row = {
      user_id: userId,
      player_tag: storedTag,
      player_name: player.name,
      townhall_level: player.townHallLevel,
      exp_level: player.expLevel,
      builder_count: selectedBuilderCount,
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
    setActiveVillagePersisted(village.id).catch(() => {})
    setActiveVillage(village)
    loadTownhallStructures(village.townhall_level, village.id)
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

  const handleSaveBuilders = async () => {
    if (!activeVillage?.id) return

    setSavingBuilders(true)
    setError('')

    try {
      const normalizedCount = Math.min(5, Math.max(2, Number(builderCountRef.current) || 2))
      const { data, error: updateError } = await supabase
        .from('user_villages')
        .update({
          builder_count: normalizedCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', activeVillage.id)
        .select()
        .single()

      if (updateError) throw updateError

      if (data) {
        builderCountRef.current = Math.min(5, Math.max(2, Number(data.builder_count) || normalizedCount))
        setBuilderCount(Math.min(5, Math.max(2, Number(data.builder_count) || normalizedCount)))
        setRemainingBetaBuilderCount(Math.min(5, Math.max(2, Number(data.builder_count) || normalizedCount)))
        setActiveVillage(data)
        setVillages((current) => current.map((village) => (village.id === data.id ? data : village)))
      }
    } catch (saveError) {
      setError(saveError.message || 'Failed to save builders')
    } finally {
      setSavingBuilders(false)
    }
  }

  const showingSearch = viewMode === 'search' || villages.length === 0
  const showingLoaded = viewMode === 'loaded' && !showingSearch
  const showingStructures = viewMode === 'structures'
  const showingWalls = viewMode === 'walls'

  const clanBadgeUrl = getProxiedAssetUrl(playerData?.clan?.badgeUrls?.small)
  const currentTownHallLevel = Number(activeVillage?.townhall_level || playerData?.townHallLevel || 0)
  const maxTownHallLevel = 18
  const hasReachedMaxTownHall = currentTownHallLevel >= maxTownHallLevel
  const nextTownHallLevel = Math.min(currentTownHallLevel + 1, maxTownHallLevel)

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

    const { loadStructures = false, loadWalls = false, villageId = activeVillageRef.current?.id } = options
    const cachedSnapshot = readTownhallSnapshotCache(villageId, townhallLevel)
    const nextSnapshotCache = { ...(cachedSnapshot || {}) }

    if (cachedSnapshot) {
      if (loadStructures && cachedSnapshot.structureCatalog) {
        setStructureCatalog(cachedSnapshot.structureCatalog)
        setStructureLevels(cachedSnapshot.structureLevels || {})
        setPendingUpgrades(cachedSnapshot.pendingUpgrades || [])
      }

      if (loadWalls && cachedSnapshot.wallConfig) {
        setWallConfig(cachedSnapshot.wallConfig)
        setWallCounts(cachedSnapshot.wallCounts || {})
      }
    }

    const { data } = await supabase
      .from('townhall_buildings')
      .select('*')
      .eq('townhall_level', townhallLevel)
      .single()

    const normalizedData = normalizeTownhallBuildings(data)

    if (loadStructures) {
      setStructureCatalog(normalizedData)

      let savedStructureRows = []
      if (villageId) {
        const { data: structureRows } = await supabase
          .from('user_village_buildings')
          .select('building_id, building_name, current_level, quantity, upgrade_started_at, upgrade_finish_at, upgrade_from_level, upgrade_to_level')
          .eq('village_id', villageId)
          .not('building_id', 'like', 'walls-%')

        savedStructureRows = structureRows || []
      }

      const createInitialLevels = (building) => {
        const count = getStructureRowCount(building)
        return Array.from({ length: count }, (_, index) => getDefaultRowLevel(building, index, isCopyUnlocked(building, index)))
      }

      const initialLevels = {}
      ;[...normalizedData.defences, ...normalizedData.army, ...normalizedData.resources, ...normalizedData.troops].forEach((building) => {
        const savedRowsForBuilding = savedStructureRows.filter((row) => row.building_id?.startsWith(`${building.id}-`))
        const rowCount = getStructureRowCount(building, savedRowsForBuilding)
        initialLevels[building.id] = Array.from({ length: rowCount }, (_, index) => {
          const savedRow = savedStructureRows.find((row) => row.building_id === `${building.id}-${index + 1}`)
          if (savedRow) return Number(savedRow.current_level || 0)
          return createInitialLevels(building)[index] ?? getDefaultRowLevel(building, index, isCopyUnlocked(building, index))
        })
      })
      setStructureLevels(initialLevels)

      const now = Date.now()
      const restoredPendingUpgrades = savedStructureRows
        .map((row) => {
          const rowIndex = getUpgradeRowIndex(row.building_id)
          const finishAt = row.upgrade_finish_at ? new Date(row.upgrade_finish_at).getTime() : NaN
          const startedAt = row.upgrade_started_at ? new Date(row.upgrade_started_at).getTime() : NaN

          if (rowIndex == null || !Number.isFinite(finishAt)) return null

          return {
            id: getPendingUpgradeId(villageId, row.building_id, rowIndex),
            villageId,
            buildingId: row.building_id,
            buildingName: row.building_name || formatStructureName(row.building_id),
            rowIndex,
            fromLevel: Number(row.upgrade_from_level ?? row.current_level ?? 0),
            toLevel: Number(row.upgrade_to_level ?? row.current_level ?? 0),
            startedAt: Number.isFinite(startedAt) ? startedAt : now,
            finishAt,
            durationSeconds: Math.max(0, Math.round((finishAt - (Number.isFinite(startedAt) ? startedAt : now)) / 1000)),
          }
        })
        .filter((upgrade) => upgrade && Number(upgrade.finishAt) > 0)

      setPendingUpgrades(restoredPendingUpgrades)

      nextSnapshotCache.structureCatalog = normalizedData
      nextSnapshotCache.structureLevels = initialLevels
      nextSnapshotCache.pendingUpgrades = restoredPendingUpgrades
    }

    if (loadWalls) {
      const initialCounts = {}

      let savedWallRows = []
      if (villageId) {
        const { data: wallRows } = await supabase
          .from('user_village_buildings')
          .select('building_id, current_level, quantity')
          .eq('village_id', villageId)
          .like('building_id', 'walls-%')

        savedWallRows = wallRows || []
      }

      const savedWallLevels = Array.from(
        new Map(
          savedWallRows
            .map((row) => Number(row.current_level || 0))
            .filter((level) => level > 0)
            .map((level) => [level, { level }]),
        ).values(),
      ).sort((left, right) => left.level - right.level)

      const wallLevels = data?.walls?.levels?.length > 0 ? data.walls.levels : savedWallLevels
      const savedWallTotal = savedWallRows.reduce((total, row) => total + Number(row.quantity || 0), 0)
      const buildingsUnlocked = Number(data?.walls?.buildings_unlocked) || savedWallTotal

      wallLevels.forEach((wallLevel) => {
        const savedRow = savedWallRows.find((row) => row.building_id === `walls-${wallLevel.level}`)
        if (savedRow) {
          initialCounts[wallLevel.level] = Number(savedRow.quantity || 0)
          return
        }

        const savedLevelRow = savedWallRows.find((row) => Number(row.current_level || 0) === Number(wallLevel.level))
        initialCounts[wallLevel.level] = Number(savedLevelRow?.quantity || 0)
      })

      setWallConfig({
        ...(data?.walls || {}),
        levels: wallLevels,
        buildings_unlocked: buildingsUnlocked,
      })
      setWallCounts(initialCounts)

      nextSnapshotCache.wallConfig = {
        ...(data?.walls || {}),
        levels: wallLevels,
        buildings_unlocked: buildingsUnlocked,
      }
      nextSnapshotCache.wallCounts = initialCounts
    }

    if (loadStructures || loadWalls) {
      writeTownhallSnapshotCache(villageId, townhallLevel, nextSnapshotCache)
    }

    return data || null
  }

  const loadTownhallStructures = async (townhallLevel, villageId = activeVillageRef.current?.id) => {
    if (!townhallLevel) return

    setStructuresLoading(true)

    try {
      const data = await loadTownhallSnapshot(townhallLevel, { loadStructures: true, villageId })
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

  const loadWallsSnapshot = async ({ switchToWallsView = false } = {}) => {
    if (!activeVillage) return

    setWallLoading(true)

    if (switchToWallsView) {
      setViewMode('walls')
    }

    try {
      const data = await loadTownhallSnapshot(activeVillage.townhall_level, { loadWalls: true, villageId: activeVillage.id })
      if (!data) {
        setWallConfig(null)
        setWallCounts({})
      }
    } catch (fetchError) {
      console.error('Failed to load wall config:', fetchError)
      setWallConfig(null)
      setWallCounts({})
    } finally {
      setWallLoading(false)
    }
  }

  const handleOpenWallsEditor = async () => {
    previousLoadedTabRef.current = activeLoadedTab
    void loadWallsSnapshot({ switchToWallsView: true })
  }

  const handleEditLevels = () => {
    if (activeLoadedTab === 'walls') {
      void handleOpenWallsEditor()
      return
    }

    handleSetupVillageStructures()
  }

  const handleUpdateStructures = async () => {
    if (!activeVillage?.id) return

    setStructuresLoading(true)
    setError('')
    suppressSnapshotRefreshRef.current = true

    try {
      const structureRowsToSave = [...editDefenseBuildings, ...editArmyBuildings, ...editResourceBuildings]
        .flatMap((building) => {
          const currentLevels = structureLevels[building.id] || []
          const rowCount = getStructureRowCount(building, currentLevels)

          return Array.from({ length: rowCount }, (_, index) => ({
            village_id: activeVillage.id,
            building_id: `${building.id}-${index + 1}`,
            building_name: building.name || formatStructureName(building.id),
            current_level: Number(currentLevels[index] ?? getDefaultRowLevel(building, index, isCopyUnlocked(building, index))),
            quantity: 1,
            updated_at: new Date().toISOString(),
          }))
        })
        .filter((row) => row.current_level >= 0)

      if (structureRowsToSave.length > 0) {
        const { error: upsertError } = await supabase
          .from('user_village_buildings')
          .upsert(structureRowsToSave, { onConflict: 'village_id,building_id' })

        if (upsertError) throw upsertError
      }

      writeTownhallSnapshotCache(activeVillage.id, activeVillage.townhall_level, {
        structureCatalog,
        structureLevels,
        pendingUpgrades,
        wallConfig,
        wallCounts,
      })

      setViewMode('loaded')
      alert('Structures saved successfully!')
    } catch (saveError) {
      setError(saveError.message || 'Failed to save structures')
    } finally {
      setStructuresLoading(false)
      suppressSnapshotRefreshRef.current = false
    }
  }

  const handleSetAllToZero = () => {
    const resetLevels = {}
    ;[...editDefenseBuildings, ...editArmyBuildings, ...editResourceBuildings].forEach((building) => {
      const rowCount = getStructureRowCount(building, building.levels || [])
      resetLevels[building.id] = Array.from({ length: rowCount }, (_, index) => getDefaultRowLevel(building, index, isCopyUnlocked(building, index)))
    })
    setStructureLevels(resetLevels)
  }

  const handleSetAllToMax = () => {
    const maxedLevels = {}
    ;[...editDefenseBuildings, ...editArmyBuildings, ...editResourceBuildings].forEach((building) => {
      const rowCount = getStructureRowCount(building, building.levels || [])
      const maxLevel = Math.max(...(building.levels || []).map((level) => level.level), 0)
      maxedLevels[building.id] = Array.from({ length: rowCount }, () => maxLevel)
    })
    setStructureLevels(maxedLevels)
  }

  const handleBackToLoaded = async () => {
    if (!activeVillage?.id || !activeVillage?.townhall_level) {
      setViewMode('loaded')
      return
    }

    setStructuresLoading(true)
    setWallLoading(true)

    try {
      await loadTownhallSnapshot(activeVillage.townhall_level, {
        loadStructures: true,
        loadWalls: true,
        villageId: activeVillage.id,
      })
    } catch (restoreError) {
      console.error('Failed to restore loaded view after wall editor:', restoreError)
    } finally {
      setActiveLoadedTab(previousLoadedTabRef.current || 'defences')
      setViewMode('loaded')
      setStructuresLoading(false)
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
    suppressSnapshotRefreshRef.current = true

    try {
      const wallRowsToSave = (wallConfig.levels || [])
        .map((wallLevel) => ({
          village_id: activeVillage.id,
          building_id: `walls-${wallLevel.level}`,
          building_name: 'Walls',
          current_level: wallLevel.level,
          quantity: Number(wallCounts[wallLevel.level] || 0),
          updated_at: new Date().toISOString(),
        }))

      if (wallRowsToSave.length > 0) {
        const { error: upsertError } = await supabase
          .from('user_village_buildings')
          .upsert(wallRowsToSave, { onConflict: 'village_id,building_id' })

        if (upsertError) throw upsertError
      }

      writeTownhallSnapshotCache(activeVillage.id, activeVillage.townhall_level, {
        structureCatalog,
        structureLevels,
        pendingUpgrades,
        wallConfig,
        wallCounts,
      })

      await handleBackToLoaded()
      alert('Walls saved successfully!')
    } catch (saveError) {
      setError(saveError.message || 'Failed to save walls')
    } finally {
      setWallLoading(false)
      suppressSnapshotRefreshRef.current = false
    }
  }

  const wallLevels = wallConfig?.levels || []
  const wallPieces = wallConfig?.buildings_unlocked || 0
  const wallBuilt = Object.values(wallCounts).reduce((total, value) => total + Number(value || 0), 0)
  const remainingWalls = Math.max(wallPieces - wallBuilt, 0)
  const wallMaxLevel = wallLevels.length > 0 ? Math.max(...wallLevels.map((wallLevel) => wallLevel.level || 0)) : 0
  const wallsAtMaxLevel = Number(wallCounts[wallMaxLevel] || 0)
  const isWallBuildComplete = wallPieces > 0 && remainingWalls === 0
  const isWallMaxComplete = wallPieces > 0 && wallMaxLevel > 0 && wallsAtMaxLevel >= wallPieces
  const getWallRowMax = (levelNumber) => {
    const otherWalls = Object.entries(wallCounts).reduce((total, [levelKey, count]) => {
      if (Number(levelKey) === Number(levelNumber)) return total
      return total + Number(count || 0)
    }, 0)

    return Math.max(wallPieces - otherWalls, 0)
  }
  const defenseSortPriority = {
    canon: 0,
    archer_tower: 1,
  }

  const visibleDefenseBuildings = [...(structureCatalog.defences || [])]
    .filter((building) => building?.id)
    .sort((left, right) => {
      const leftPriority = defenseSortPriority[left.id] ?? 2
      const rightPriority = defenseSortPriority[right.id] ?? 2
      if (leftPriority !== rightPriority) return leftPriority - rightPriority
      return (left.name || formatStructureName(left.id)).localeCompare(right.name || formatStructureName(right.id))
    })
  const visibleResourceBuildings = [...(structureCatalog.resources || [])].filter((building) => building?.id)
  const visibleArmyBuildings = [...(structureCatalog.army || [])].filter((building) => building?.id)

  const editDefenseBuildings = [...(structureCatalog.defences || [])]
    .filter((building) => building?.id)
    .sort((left, right) => {
      const leftPriority = defenseSortPriority[left.id] ?? 2
      const rightPriority = defenseSortPriority[right.id] ?? 2
      if (leftPriority !== rightPriority) return leftPriority - rightPriority
      return (left.name || formatStructureName(left.id)).localeCompare(right.name || formatStructureName(right.id))
    })
  const editResourceBuildings = [...(structureCatalog.resources || [])]
    .filter((building) => ['gold_mine', 'elixir_collector', 'gold_storage', 'elixir_storage'].includes(building.id))
  const editArmyBuildings = [...(structureCatalog.army || [])]
    .filter((building) => building.id === 'army_camp')

  const activeLoadedTabBuildings = activeLoadedTab === 'defences'
    ? visibleDefenseBuildings
    : activeLoadedTab === 'army'
      ? visibleArmyBuildings
      : activeLoadedTab === 'resources'
        ? visibleResourceBuildings
        : activeLoadedTab === 'troops'
          ? (structureCatalog.troops || [])
          : []

  const isWallsTabActive = activeLoadedTab === 'walls'

  const remainingBetaResourceDefinitions = [
    { id: 'gold', label: 'Gold', icon: '/src/assets/magic-items/gold.png' },
    { id: 'elixir', label: 'Elixir', icon: '/src/assets/magic-items/elixir.png' },
    { id: 'dark_elixir', label: 'Dark Elixir', icon: '/src/assets/magic-items/de.png' },
  ]

  const formatNumberShort = (value) => {
    const numberValue = Number(value || 0)
    if (numberValue >= 1000) {
      const thousands = numberValue / 1000
      return `${Number.isInteger(thousands) ? thousands : Number(thousands.toFixed(2))}K`
    }
    return `${numberValue}`
  }

  const formatUpgradeTime = (value) => {
    const raw = String(value || '').trim().toLowerCase()
    if (!raw) return '0s'

    const compact = raw.replace(/\s+/g, '')
    const parts = compact.match(/\d+(?:\.\d+)?(?:h|hr|hrs|m|min|mins|s|sec|secs)/g)
    const tokens = parts || [compact]
    let totalSeconds = 0

    tokens.forEach((token) => {
      const match = token.match(/(\d+(?:\.\d+)?)(h|hr|hrs|m|min|mins|s|sec|secs)/)
      if (!match) return

      const amount = Number(match[1])
      const unit = match[2]
      if (unit.startsWith('h')) totalSeconds += amount * 3600
      else if (unit.startsWith('m')) totalSeconds += amount * 60
      else totalSeconds += amount
    })

    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = Math.round(totalSeconds % 60)

    return [
      hours ? `${hours}h` : '',
      minutes ? `${minutes}m` : '',
      !hours && !minutes ? `${seconds}s` : seconds ? `${seconds}s` : '',
    ].filter(Boolean).join(' ')
  }

  const getTimeSeconds = (value) => {
    const raw = String(value || '').trim().toLowerCase()
    if (!raw) return 0

    const compact = raw.replace(/\s+/g, '')
    const match = compact.match(/^(\d+(?:\.\d+)?)(h|hr|hrs|m|min|mins|s|sec|secs)$/)
    if (!match) return 0

    const amount = Number(match[1])
    const unit = match[2]
    if (unit.startsWith('h')) return amount * 3600
    if (unit.startsWith('m')) return amount * 60
    return amount
  }

  const formatSeconds = (totalSeconds) => {
    const safeSeconds = Math.max(0, Math.round(Number(totalSeconds || 0)))
    const hours = Math.floor(safeSeconds / 3600)
    const minutes = Math.floor((safeSeconds % 3600) / 60)
    const seconds = safeSeconds % 60

    return [
      hours ? `${hours}h` : '',
      minutes ? `${minutes}m` : '',
      !hours && !minutes ? `${seconds}s` : seconds ? `${seconds}s` : '',
    ].filter(Boolean).join(' ')
  }

  const getNextUpgradeLevels = (building, currentLevel) => {
    const levels = [...(building.levels || [])].sort((left, right) => Number(left.level || 0) - Number(right.level || 0))
    return levels.filter((level) => Number(level.level || 0) > Number(currentLevel || 0))
  }

  const getUpgradeResourceLabel = (resource) => {
    const normalizedResource = String(resource || '').trim().toLowerCase()
    if (normalizedResource === 'dark_elixir') return 'Dark Elixir'
    if (normalizedResource === 'elixir') return 'Elixir'
    return 'Gold'
  }

  const getUpgradeResourceClass = (resource) => {
    const normalizedResource = String(resource || '').trim().toLowerCase()
    if (normalizedResource === 'dark_elixir') return styles.readOnlyResourceCostDarkElixir
    if (normalizedResource === 'elixir') return styles.readOnlyResourceCostElixir
    return styles.readOnlyResourceCostGold
  }

  const getUpgradeSummary = (building, currentLevel) => {
    const nextLevels = getNextUpgradeLevels(building, currentLevel)
    const totalCost = nextLevels.reduce((total, level) => total + Number(level.cost || 0), 0)
    const totalSeconds = nextLevels.reduce((total, level) => total + getTimeSeconds(level.time), 0)

    return {
      nextLevels,
      totalCost,
      totalResource: nextLevels[0]?.resource || '',
      totalTime: formatSeconds(totalSeconds),
    }
  }

  const getPendingUpgradeId = (villageId, buildingId, rowIndex) => `${villageId}:${buildingId}:${rowIndex}`

  const getPendingUpgradeForRow = (villageId, buildingId, rowIndex) => {
    if (!villageId || !buildingId) return null

    return pendingUpgrades.find(
      (upgrade) =>
        upgrade.villageId === villageId &&
        upgrade.buildingId === buildingId &&
        Number(upgrade.rowIndex) === Number(rowIndex)
    ) || null
  }

  const openComingSoonPopup = (title, action, rowKey) => {
    setActionPopup({
      open: true,
      title,
      action,
      rowKey,
    })
  }

  const closeComingSoonPopup = () => {
    setActionPopup({ open: false, title: '', action: '', rowKey: '' })
  }

  const completePendingUpgrade = async (upgrade) => {
    if (!upgrade?.id || !upgrade?.villageId || !upgrade?.buildingId) return false
    const buildingKey = String(upgrade.buildingId).replace(/-\d+$/, '')

    const { error: updateError } = await supabase
      .from('user_village_buildings')
      .update({
        current_level: Number(upgrade.toLevel),
        upgrade_started_at: null,
        upgrade_finish_at: null,
        upgrade_from_level: null,
        upgrade_to_level: null,
        updated_at: new Date().toISOString(),
      })
      .eq('village_id', upgrade.villageId)
      .eq('building_id', upgrade.buildingId)

    if (updateError) throw updateError

    setPendingUpgrades((current) => current.filter((item) => item.id !== upgrade.id))

    if (activeVillageRef.current?.id === upgrade.villageId) {
      setStructureLevels((current) => {
        const nextLevels = [...(current[buildingKey] || [])]
        nextLevels[Number(upgrade.rowIndex)] = Number(upgrade.toLevel)
        return {
          ...current,
          [buildingKey]: nextLevels,
        }
      })
    }

    return true
  }

  const startStructureUpgrade = async (building, rowState) => {
    if (!activeVillage?.id || !building?.id || rowState == null) return

    const rowIndex = Number(rowState.rowIndex)
    const buildingRowId = `${building.id}-${rowIndex + 1}`
    const existingUpgrade = getPendingUpgradeForRow(activeVillage.id, buildingRowId, rowIndex)
    if (existingUpgrade) return

    const nextLevel = getNextUpgradeLevels(building, rowState.rowLevel)[0]
    if (!nextLevel) return

    const durationSeconds = Math.max(0, getTimeSeconds(nextLevel.time))
    const startedAt = Date.now()
    const finishAt = startedAt + durationSeconds * 1000

    const upgradeRow = {
      village_id: activeVillage.id,
      building_id: buildingRowId,
      building_name: building.name || formatStructureName(building.id),
      current_level: Number(rowState.rowLevel),
      quantity: 1,
      upgrade_started_at: new Date(startedAt).toISOString(),
      upgrade_finish_at: new Date(finishAt).toISOString(),
      upgrade_from_level: Number(rowState.rowLevel),
      upgrade_to_level: Number(nextLevel.level),
      updated_at: new Date().toISOString(),
    }

    const { error: saveError } = await supabase
      .from('user_village_buildings')
      .upsert([upgradeRow], { onConflict: 'village_id,building_id' })

    if (saveError) throw saveError

    setPendingUpgrades((current) => [
      ...current.filter((item) => item.id !== getPendingUpgradeId(activeVillage.id, buildingRowId, rowIndex)),
      {
        id: getPendingUpgradeId(activeVillage.id, buildingRowId, rowIndex),
        villageId: activeVillage.id,
        buildingId: buildingRowId,
        buildingName: building.name || formatStructureName(building.id),
        rowIndex,
        fromLevel: Number(rowState.rowLevel),
        toLevel: Number(nextLevel.level),
        startedAt,
        finishAt,
        durationSeconds,
      },
    ])
  }

  useEffect(() => {
    if (upgradingRowsRef.current) return

    const dueUpgrades = pendingUpgrades.filter((upgrade) => Number(upgrade.finishAt) <= upgradeClock)
    if (dueUpgrades.length === 0) return

    upgradingRowsRef.current = true

    const flushCompletedUpgrades = async () => {
      try {
        for (const upgrade of dueUpgrades) {
          await completePendingUpgrade(upgrade)
        }
      } catch (upgradeError) {
        setError(upgradeError.message || 'Failed to complete upgrade')
      } finally {
        upgradingRowsRef.current = false
      }
    }

    void flushCompletedUpgrades()
  }, [pendingUpgrades, upgradeClock])

  const computeStructuresCompletion = () => {
    const buildings = [...structureCatalog.defences, ...structureCatalog.army, ...structureCatalog.resources, ...structureCatalog.troops]
    if (!buildings || buildings.length === 0) return 0
    let totalRatio = 0
    let count = 0

    buildings.forEach((building) => {
      const maxLevel = Math.max(...(building.levels || []).map((l) => l.level), 0)
      const rows = getStructureRowCount(building, structureLevels[building.id] || [])
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
    const currentVillageId = activeVillage?.id
    if (!townhallLevel || !currentVillageId) return

    const channel = supabase
      .channel(`townhall_buildings_${townhallLevel}_${currentVillageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'townhall_buildings',
          filter: `townhall_level=eq.${townhallLevel}`,
        },
        async () => {
          const currentVillage = activeVillageRef.current
          if (!currentVillage || currentVillage.townhall_level !== townhallLevel) return
          if (suppressSnapshotRefreshRef.current) return

          await loadTownhallSnapshot(townhallLevel, {
            loadStructures: true,
            loadWalls: true,
            villageId: currentVillage.id,
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_village_buildings',
          filter: `village_id=eq.${currentVillageId}`,
        },
        async () => {
          const currentVillage = activeVillageRef.current
          if (!currentVillage || currentVillage.id !== currentVillageId) return
          if (suppressSnapshotRefreshRef.current) return

          await loadTownhallSnapshot(townhallLevel, {
            loadStructures: true,
            loadWalls: true,
            villageId: currentVillage.id,
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeVillage?.id, activeVillage?.townhall_level])

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

  const remainingBetaTotalsByResource = remainingBetaResourceDefinitions.reduce((accumulator, resource) => {
    accumulator[resource.id] = 0
    return accumulator
  }, {})
  let remainingBetaTotalSeconds = 0
  let remainingBetaTotalUpgrades = 0

  if (isWallsTabActive) {
    const sortedWallLevels = [...wallLevels]
      .map((levelInfo) => ({ ...(levelInfo || {}), level: Number(levelInfo?.level || 0) }))
      .filter((levelInfo) => levelInfo.level > 0)
      .sort((left, right) => left.level - right.level)
    const wallLevelsByNumber = new Map(sortedWallLevels.map((levelInfo) => [Number(levelInfo.level), levelInfo]))
    const wallTopLevel = sortedWallLevels.length > 0 ? Number(sortedWallLevels[sortedWallLevels.length - 1].level) : 0

    Object.entries(wallCounts).forEach(([levelKey, count]) => {
      const currentLevel = Number(levelKey)
      const quantityAtLevel = Number(count || 0)
      if (quantityAtLevel <= 0 || currentLevel <= 0 || wallTopLevel <= currentLevel) return

      for (let nextLevel = currentLevel + 1; nextLevel <= wallTopLevel; nextLevel += 1) {
        const levelInfo = wallLevelsByNumber.get(nextLevel)
        if (!levelInfo) continue

        const resourceKey = String(levelInfo.resource || '').trim().toLowerCase()
        if (Object.prototype.hasOwnProperty.call(remainingBetaTotalsByResource, resourceKey)) {
          remainingBetaTotalsByResource[resourceKey] += Number(levelInfo.cost || 0) * quantityAtLevel
        }
        remainingBetaTotalSeconds += getTimeSeconds(levelInfo.time) * quantityAtLevel
        remainingBetaTotalUpgrades += quantityAtLevel
      }
    })
  } else {
    activeLoadedTabBuildings
      .filter((building) => building?.id)
      .forEach((building) => {
        const currentLevels = structureLevels[building.id] || []
        const rowCount = getStructureRowCount(building, currentLevels)
        const levelsArray = currentLevels.length > 0
          ? currentLevels
          : Array.from({ length: rowCount }, (_, index) => getDefaultRowLevel(building, index, isCopyUnlocked(building, index)))

        for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
          const rowBuildingId = `${building.id}-${rowIndex + 1}`
          const pendingUpgrade = getPendingUpgradeForRow(activeVillage?.id, rowBuildingId, rowIndex)
          const rowLevel = pendingUpgrade
            ? Number(pendingUpgrade.toLevel)
            : Number(levelsArray[rowIndex] ?? getDefaultRowLevel(building, rowIndex, isCopyUnlocked(building, rowIndex)))
          const nextLevels = getNextUpgradeLevels(building, rowLevel)
          remainingBetaTotalUpgrades += nextLevels.length

          nextLevels.forEach((levelInfo) => {
            const resourceKey = String(levelInfo.resource || '').trim().toLowerCase()
            if (Object.prototype.hasOwnProperty.call(remainingBetaTotalsByResource, resourceKey)) {
              remainingBetaTotalsByResource[resourceKey] += Number(levelInfo.cost || 0)
            }
            remainingBetaTotalSeconds += getTimeSeconds(levelInfo.time)
          })
        }
      })
  }

  const remainingBetaResourceRows = remainingBetaResourceDefinitions
    .map((resource) => ({
      ...resource,
      total: remainingBetaTotalsByResource[resource.id] || 0,
    }))
    .filter((resource) => resource.total > 0)

  const remainingBetaMaxBuilderCount = Math.max(1, Math.min(5, remainingBetaTotalUpgrades || 1))
  const savedVillageBuilderCount = Math.max(1, Math.min(5, Number(activeVillage?.builder_count) || 2))
  const remainingBetaSelectorCount = activeLoadedTab === 'troops' ? 1 : savedVillageBuilderCount
  const displayedBuilderCount = Math.max(1, Math.min(remainingBetaSelectorCount, Number(remainingBetaBuilderCount) || savedVillageBuilderCount))
  const remainingBetaUnitLabel = activeLoadedTab === 'troops' ? 'Lab Worker' : 'Builders'
  const remainingBetaUnitLabelLower = activeLoadedTab === 'troops' ? 'lab worker' : 'builders'

  const remainingBetaTimeSeconds = Math.ceil(
    remainingBetaTotalSeconds / Math.max(1, Math.min(5, Number(remainingBetaBuilderCount) || 2))
  )

  useEffect(() => {
    if (activeLoadedTab === 'walls') return

    const savedBuilderCount = Number(activeVillage?.builder_count)
    if (savedBuilderCount) {
      setRemainingBetaBuilderCount(Math.min(5, Math.max(1, savedBuilderCount)))
      return
    }

    if (activeLoadedTab === 'troops') {
      setRemainingBetaBuilderCount(1)
      return
    }

    setRemainingBetaBuilderCount(Math.max(1, Math.min(5, remainingBetaTotalUpgrades || 1)))
  }, [activeLoadedTab, activeVillage?.builder_count, remainingBetaTotalUpgrades])

  useEffect(() => {
    if (activeLoadedTab !== 'walls') return
    if (!activeVillage?.townhall_level) return

    void loadWallsSnapshot()
  }, [activeLoadedTab, activeVillage?.id, activeVillage?.townhall_level])

  const getBuildingImagePath = (building, level) => {
    const requestedLevel = Math.max(0, Number(level) || 0)
    const fallbackLevel = requestedLevel === 0 ? 1 : requestedLevel

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

    if (prefix) {
      const requestedImage = prefix(requestedLevel)
      if (requestedImage) return requestedImage
      return requestedLevel === 0 ? prefix(fallbackLevel) : ''
    }

    if (building?.image_path) {
      if (requestedLevel > 0) {
        return `${building.image_path}${requestedLevel}.png`
      }
      return `${building.image_path}${fallbackLevel}.png`
    }

    return ''
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

  const renderStructureCard = (building, cardKey = building.id, options = {}) => {
    const { readOnly = false } = options
    const displayName = building.name || formatStructureName(building.id)
    const currentLevels = structureLevels[building.id] || []
    const rowCount = getStructureRowCount(building, currentLevels)
    const maxLevel = Math.max(...(building.levels || []).map((level) => level.level), 0)
    const getMinimumLevel = (rowIndex) => getDefaultRowLevel(building, rowIndex, isCopyUnlocked(building, rowIndex))
    const clampLevel = (value, rowIndex) => Math.min(Math.max(Number(value || 0), getMinimumLevel(rowIndex)), maxLevel)
    const buttonLevels = Array.from({ length: maxLevel }, (_, index) => index + 1)

    const rowStates = Array.from({ length: rowCount }, (_, rowIndex) => {
      const defaultLevel = getDefaultRowLevel(building, rowIndex, isCopyUnlocked(building, rowIndex))
      const rowLevel = clampLevel(currentLevels[rowIndex] ?? defaultLevel, rowIndex)
      const minimumLevel = getMinimumLevel(rowIndex)
      const upgradeSummary = getUpgradeSummary(building, rowLevel)
      const pendingUpgrade = getPendingUpgradeForRow(activeVillage?.id, `${building.id}-${rowIndex + 1}`, rowIndex)
      const pendingRemainingSeconds = pendingUpgrade ? Math.max(0, Math.ceil((Number(pendingUpgrade.finishAt) - upgradeClock) / 1000)) : 0
      const pendingDurationSeconds = pendingUpgrade ? Math.max(0, Number(pendingUpgrade.durationSeconds || 0)) : 0
      const pendingProgressPercent = pendingUpgrade && pendingDurationSeconds > 0
        ? Math.max(0, Math.min(100, Math.round(((pendingDurationSeconds - pendingRemainingSeconds) / pendingDurationSeconds) * 100)))
        : 0
      const visibleNextLevels = pendingUpgrade
        ? upgradeSummary.nextLevels.filter((levelInfo) => Number(levelInfo.level) > Number(pendingUpgrade.toLevel))
        : upgradeSummary.nextLevels
      const pendingLevelInfo = pendingUpgrade ? visibleNextLevels[0] || null : null
      const visibleTotalCost = visibleNextLevels.reduce((total, level) => total + Number(level.cost || 0), 0)
      const visibleTotalSeconds = visibleNextLevels.reduce((total, level) => total + getTimeSeconds(level.time), 0)
      const actionRowKey = `${building.id}-${rowIndex + 1}`

      return {
        rowIndex,
        rowLevel,
        minimumLevel,
        actionRowKey,
        upgradeSummary,
        pendingUpgrade,
        pendingRemainingSeconds,
        pendingProgressPercent,
        pendingLevelInfo,
        visibleNextLevels,
        visibleTotalCost,
        visibleTotalSeconds,
        statusIcon: rowLevel <= 0 ? (
          <HandymanOutlinedIcon className={styles.readOnlyActionIcon} />
        ) : (
          <ArrowUpwardIcon className={styles.readOnlyActionIcon} />
        ),
      }
    })

    if (readOnly) {
      const totalRemainingUpgrades = rowStates.reduce((total, rowState) => total + (rowState.pendingUpgrade ? rowState.visibleNextLevels.length : rowState.upgradeSummary.nextLevels.length), 0)
      const totalCost = rowStates.reduce((total, rowState) => {
        const nextLevels = rowState.pendingUpgrade ? rowState.visibleNextLevels : rowState.upgradeSummary.nextLevels
        return total + nextLevels.reduce((rowTotal, levelInfo) => rowTotal + Number(levelInfo.cost || 0), 0)
      }, 0)
      const totalSeconds = rowStates.reduce((total, rowState) => {
        const nextLevels = rowState.pendingUpgrade ? rowState.visibleNextLevels : rowState.upgradeSummary.nextLevels
        return total + nextLevels.reduce((rowTotal, levelInfo) => rowTotal + getTimeSeconds(levelInfo.time), 0)
      }, 0)
      const summaryImageLevel = rowStates[0]?.rowLevel ?? 0
      const tableRowStyle = {
        gridTemplateRows: `repeat(${rowCount}, minmax(0, auto))`,
      }
      const rowsColumnStyle = {
        gridRow: `1 / span ${rowCount}`,
      }

      return (
        <section key={cardKey} className={`${styles.defenceCard} ${styles.readOnlyBuildingBlock}`}>
          <div className={styles.readOnlyCardGrid} style={tableRowStyle}>
            <div className={styles.readOnlySummaryPanel} style={{ gridRow: `1 / span ${rowCount}` }}>
              {getBuildingImagePath(building, summaryImageLevel) ? (
                <img
                  src={getBuildingImagePath(building, summaryImageLevel)}
                  alt={displayName}
                  className={styles.readOnlySummaryImage}
                />
              ) : (
                <div className={styles.readOnlySummaryImagePlaceholder} />
              )}

              <div className={styles.readOnlySummaryName}>{displayName}</div>
              {totalRemainingUpgrades > 0 && (
                <div className={styles.readOnlySummaryBox}>
                  <div className={styles.readOnlySummaryCount}>{totalRemainingUpgrades} Upgrades</div>
                  <div className={`${styles.readOnlySummaryCost} ${getUpgradeResourceClass(rowStates[0]?.upgradeSummary?.totalResource)}`}>
                    {upgradeResourceIcons[String(rowStates[0]?.upgradeSummary?.totalResource || '').trim().toLowerCase()] ? (
                      <img
                        src={upgradeResourceIcons[String(rowStates[0]?.upgradeSummary?.totalResource || '').trim().toLowerCase()]}
                        alt={getUpgradeResourceLabel(rowStates[0]?.upgradeSummary?.totalResource)}
                        className={styles.readOnlySummaryResourceIcon}
                      />
                    ) : null}
                    <span>{formatNumberShort(totalCost)}</span>
                  </div>
                  <div className={styles.readOnlySummaryTime}>{formatSeconds(totalSeconds)}</div>
                </div>
              )}
            </div>

            <div className={styles.readOnlyRowsColumn} style={rowsColumnStyle}>
              {rowStates.map((rowState) => (
                <div key={`${building.id}-${rowState.rowIndex}`} className={styles.readOnlyRow}>
                  <div className={styles.readOnlyLevelCell}>
                    {getBuildingImagePath(building, rowState.rowLevel) ? (
                      <img
                        src={getBuildingImagePath(building, rowState.rowLevel)}
                        alt={displayName}
                        className={styles.readOnlyRowImage}
                      />
                    ) : (
                      <div className={styles.defenceIconPlaceholder} />
                    )}
                    <div className={styles.readOnlyLevelMeta}>
                      <div className={styles.readOnlyLevelValue}>{rowState.rowLevel}/{maxLevel}</div>
                      {openActionRowKey === rowState.actionRowKey || rowState.pendingUpgrade ? (
                        <div className={styles.readOnlyActionChooserWrap}>
                          <div className={styles.readOnlyActionChooser}>
                            <button
                              type="button"
                              className={`${styles.readOnlyActionBtn} ${styles.readOnlyActionChoiceBtn} ${styles.readOnlyActionBtnConstruct}`}
                              onClick={() => openComingSoonPopup(rowState.rowLevel <= 0 ? 'Construct' : 'Upgrade', 'wrench', rowState.actionRowKey)}
                              aria-label="Started"
                              title="Started"
                            >
                              <HandymanOutlinedIcon className={styles.readOnlyActionIcon} />
                            </button>
                            <button
                              type="button"
                              className={`${styles.readOnlyActionBtn} ${styles.readOnlyActionChoiceBtn} ${styles.readOnlyActionBtnConfirm}`}
                              onClick={() => openComingSoonPopup(rowState.rowLevel <= 0 ? 'Construct' : 'Upgrade', 'check', rowState.actionRowKey)}
                              aria-label={rowState.rowLevel <= 0 ? 'Construct started' : 'Upgrade started'}
                              title={rowState.rowLevel <= 0 ? 'Construct started' : 'Upgrade started'}
                            >
                              <CheckIcon className={styles.readOnlyActionIcon} />
                            </button>
                          </div>
                          {actionPopup.open && actionPopup.rowKey === rowState.actionRowKey && (
                            <div className={styles.comingSoonInlinePopup} role="status" aria-live="polite">
                              <div className={styles.comingSoonInlineTitleRow}>
                                <span className={styles.comingSoonInlineIcon}>{actionPopup.action === 'check' ? <CheckIcon /> : <HandymanOutlinedIcon />}</span>
                                <span className={styles.comingSoonInlineTitle}>{actionPopup.title} feature</span>
                              </div>
                              <div className={styles.comingSoonInlineText}>Features adding soon.</div>
                              <button type="button" className={styles.comingSoonInlineButton} onClick={closeComingSoonPopup}>
                                OK
                              </button>
                            </div>
                          )}
                        </div>
                      ) : rowState.rowLevel >= maxLevel ? (
                        <div className={`${styles.readOnlyActionBtn} ${styles.readOnlyActionBtnComplete}`} aria-label="Fully upgraded" title="Fully upgraded">
                          <CheckIcon className={styles.readOnlyActionCompleteIcon} />
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={`${styles.readOnlyActionBtn} ${rowState.rowLevel <= 0 ? styles.readOnlyActionBtnConstruct : styles.readOnlyActionBtnUpgrade} ${rowState.pendingUpgrade ? styles.readOnlyActionBtnPending : ''}`}
                          disabled={Boolean(rowState.pendingUpgrade)}
                          aria-label={rowState.rowLevel <= 0 ? 'Construct' : 'Upgrade'}
                          title={rowState.rowLevel <= 0 ? 'Construct' : 'Upgrade'}
                          onClick={() => {
                            setOpenActionRowKey(rowState.actionRowKey)
                            closeComingSoonPopup()
                            void startStructureUpgrade(building, rowState)
                          }}
                        >
                          {rowState.rowLevel <= 0 ? (
                            <HandymanOutlinedIcon className={styles.readOnlyActionIcon} />
                          ) : (
                            <ArrowUpwardIcon className={styles.readOnlyActionIcon} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className={styles.readOnlyDetailsRow}>
                    {rowState.pendingUpgrade ? (
                      <div className={styles.readOnlyUpgradeProgressBlock}>
                        <div className={`${styles.readOnlyUpgradeSummary} ${styles.readOnlyUpgradeSummaryPending}`}>
                          <div
                            className={styles.readOnlyUpgradeProgressFill}
                            style={{ width: `${rowState.pendingProgressPercent}%` }}
                            aria-hidden="true"
                          />
                          <span>Upgrading - completes in {formatUpgradeClock(rowState.pendingRemainingSeconds)}</span>
                          <span>{rowState.pendingProgressPercent}%</span>
                        </div>

                        {rowState.visibleNextLevels.length > 0 && (
                          <>
                            <div className={styles.readOnlyUpgradeList}>
                              {rowState.visibleNextLevels.map((levelInfo) => (
                                <div key={`${building.id}-${rowState.rowIndex}-pending-lvl-${levelInfo.level}`} className={styles.readOnlyUpgradeItem}>
                                  <span className={styles.readOnlyUpgradeResourceLabel}>
                                    {upgradeResourceIcons[String(levelInfo.resource || '').trim().toLowerCase()] ? (
                                      <img
                                        src={upgradeResourceIcons[String(levelInfo.resource || '').trim().toLowerCase()]}
                                        alt={getUpgradeResourceLabel(levelInfo.resource)}
                                        className={styles.readOnlyUpgradeResourceIcon}
                                      />
                                    ) : null}
                                    {getUpgradeResourceLabel(levelInfo.resource)}
                                  </span>
                                  <span className={styles.readOnlyUpgradeLevel}>Lvl {levelInfo.level}:</span>
                                  <span className={`${styles.readOnlyUpgradeCost} ${getUpgradeResourceClass(levelInfo.resource)}`}>
                                    {formatNumberShort(levelInfo.cost)}
                                  </span>
                                  <span className={styles.readOnlyUpgradeTime}>{formatUpgradeTime(levelInfo.time)}</span>
                                </div>
                              ))}
                            </div>
                            <div className={styles.readOnlyUpgradeSummary}>
                              {rowState.visibleNextLevels.length} Levels - {formatNumberShort(rowState.visibleTotalCost)} - {formatSeconds(rowState.visibleTotalSeconds)}
                            </div>
                          </>
                        )}
                      </div>
                    ) : rowState.visibleNextLevels.length > 0 ? (
                      <>
                        <div className={styles.readOnlyUpgradeList}>
                          {rowState.visibleNextLevels.map((levelInfo) => (
                            <div key={`${building.id}-${rowState.rowIndex}-lvl-${levelInfo.level}`} className={styles.readOnlyUpgradeItem}>
                              <span className={styles.readOnlyUpgradeResourceLabel}>
                                {upgradeResourceIcons[String(levelInfo.resource || '').trim().toLowerCase()] ? (
                                  <img
                                    src={upgradeResourceIcons[String(levelInfo.resource || '').trim().toLowerCase()]}
                                    alt={getUpgradeResourceLabel(levelInfo.resource)}
                                    className={styles.readOnlyUpgradeResourceIcon}
                                  />
                                ) : null}
                                {getUpgradeResourceLabel(levelInfo.resource)}
                              </span>
                              <span className={styles.readOnlyUpgradeLevel}>Lvl {levelInfo.level}:</span>
                              <span className={`${styles.readOnlyUpgradeCost} ${getUpgradeResourceClass(levelInfo.resource)}`}>
                                {formatNumberShort(levelInfo.cost)}
                              </span>
                              <span className={styles.readOnlyUpgradeTime}>{formatUpgradeTime(levelInfo.time)}</span>
                            </div>
                          ))}
                        </div>
                        <div className={styles.readOnlyUpgradeSummary}>
                          {rowState.visibleNextLevels.length} Levels - {formatNumberShort(rowState.visibleTotalCost)} - {formatSeconds(rowState.visibleTotalSeconds)}
                        </div>
                      </>
                    ) : (
                      <div className={`${styles.readOnlyUpgradeSummary} ${styles.readOnlyUpgradeSummaryComplete}`}>
                        <span>Fully upgraded</span>
                        <CheckIcon className={styles.readOnlyUpgradeSummaryIcon} aria-label="Fully upgraded" titleAccess="Fully upgraded" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )
    }

    return (
      <section key={cardKey} className={styles.defenceCard}>
        <div className={styles.defenceCardHeader}>
          <h3 className={styles.defenceCardTitle}>{displayName}</h3>
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
          {rowStates.map((rowState) => (
            <div key={`${building.id}-${rowState.rowIndex}`} className={styles.defenceRow}>
              {getBuildingImagePath(building, rowState.rowLevel) ? (
                <img
                  src={getBuildingImagePath(building, rowState.rowLevel)}
                  alt={displayName}
                  className={styles.defenceIcon}
                />
              ) : (
                <div className={styles.defenceIconPlaceholder} />
              )}
              <input
                type="range"
                min={rowState.minimumLevel}
                max={maxLevel}
                step="1"
                value={rowState.rowLevel}
                onChange={(e) => updateStructureLevel(building.id, rowState.rowIndex, e.target.value)}
                className={styles.defenceSlider}
              />
              <input
                type="number"
                min={rowState.minimumLevel}
                max={maxLevel}
                step="1"
                value={rowState.rowLevel}
                onChange={(e) => updateStructureLevel(building.id, rowState.rowIndex, e.target.value)}
                className={styles.defenceValueInput}
              />
            </div>
          ))}
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

  const loadedTabPrimaryLabel =
    activeLoadedTab === 'defences'
      ? 'Defense'
      : activeLoadedTab === 'army'
        ? 'Army'
        : activeLoadedTab === 'resources'
          ? 'Resources'
          : activeLoadedTab === 'troops'
            ? 'Troops'
            : 'Walls'

        const loadedTabSecondaryLabel = activeLoadedTab === 'walls' ? 'Wall Quantity' : 'Level'

    const loadedTabSectionTitle =
      activeLoadedTab === 'defences'
        ? 'Defenses'
        : activeLoadedTab === 'army'
          ? 'Army'
          : activeLoadedTab === 'resources'
            ? 'Resources'
            : activeLoadedTab === 'troops'
              ? 'Troops'
              : 'Walls'

  const tabLabels = {
    defences: 'Defenses',
    army: 'Army',
    resources: 'Resources',
    troops: 'Troops',
    walls: 'Walls',
  }

  const isBuildingCategoryComplete = (buildings = []) => {
    if (!Array.isArray(buildings) || buildings.length === 0) return false

    return buildings.every((building) => {
      const maxLevel = Math.max(...(building.levels || []).map((level) => Number(level.level || 0)), 0)
      if (maxLevel <= 0) return false

      const rowCount = getStructureRowCount(building, structureLevels[building.id] || [])
      const rowLevels = structureLevels[building.id] || Array.from({ length: rowCount }, (_, index) => getDefaultRowLevel(building, index, isCopyUnlocked(building, index)))

      return Array.from({ length: rowCount }, (_, index) => Number(rowLevels[index] || 0) >= maxLevel).every(Boolean)
    })
  }

  const loadedTabCompletion = {
    defences: isBuildingCategoryComplete(visibleDefenseBuildings),
    army: isBuildingCategoryComplete(visibleArmyBuildings),
    resources: isBuildingCategoryComplete(visibleResourceBuildings),
    troops: isBuildingCategoryComplete(structureCatalog.troops || []),
    walls: isWallMaxComplete,
  }
  const activeRemainingBetaComplete = isWallsTabActive ? isWallMaxComplete : Boolean(loadedTabCompletion[activeLoadedTab])

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
              <div className={styles.centeredPlayerTag}>{formatPlayerTag(activeVillage?.player_tag || playerData?.tag || tag)}</div>

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

                      <div className={styles.switchBuilderBox}>
                        <button className={styles.switchBuilderBtn}>Switch to Builder Base</button>
                      </div>
                    </div>

                    <div className={styles.progressBlock}>
                      <div className={styles.progressLabel}>Completion:</div>
                      <div className={styles.progressBars}>
                          <div className={styles.progressRow}>
                            <div className={styles.progressBarWrap}>
                              <div className={styles.progressBarInner} style={{width: `${Math.max(0, computeStructuresCompletion())}%`}} />
                              <span className={styles.progressOverlayLabel}>{Math.max(0, computeStructuresCompletion())}%</span>
                            </div>
                            <div className={styles.progressName}>Structures</div>
                          </div>

                        <div className={styles.progressRow}>
                          <div className={styles.progressBarWrap}>
                            <div className={styles.progressBarInner} style={{width: `${wallPieces ? Math.round((wallBuilt/(wallPieces||1))*100) : 0}%`}} />
                            <span className={styles.progressOverlayLabel}>{wallPieces ? Math.round((wallBuilt/(wallPieces||1))*100) : 0}%</span>
                          </div>
                          <div className={styles.progressName}>Walls</div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Middle: Next Townhall */}
                <div className={styles.middlePanel}>
                  <div className={styles.nextThBox}>
                    <h4 className={styles.nextThHeading}>Next Town Hall:</h4>

                    {hasReachedMaxTownHall ? (
                      <div className={styles.nextThMaxMessage}>Your Town Hall is fully upgraded.</div>
                    ) : (
                      <div className={styles.nextThPreview}>
                        <div className={styles.nextThImageWrap}>
                          <img src={`/src/assets/townhall/1_${nextTownHallLevel}.png`} alt={`TH ${nextTownHallLevel}`} className={styles.nextThImage} />
                          <div className={styles.nextThLevel}>TH {nextTownHallLevel}</div>
                        </div>

                        <div className={styles.nextThInfo}>
                          <div className={styles.nextThStatsCard}>
                            <div className={styles.nextThStatRow}>
                              <span className={styles.nextThStatLabel}>Cost:</span>
                              <span className={`${styles.nextThStatValue} ${currentTownHallLevel === 2 ? styles.nextThCostValue : ''}`}>
                                {currentTownHallLevel === 2 ? '4K' : '—'}
                              </span>
                            </div>
                            <div className={styles.nextThStatRow}>
                              <span className={styles.nextThStatLabel}>Duration:</span>
                              <span className={styles.nextThStatValue}>{currentTownHallLevel === 2 ? '30m' : '—'}</span>
                            </div>
                          </div>

                          <div className={styles.nextThActionRow}>
                            <button className={styles.startUpgradeBtn}>Start TH Upgrade</button>
                            <span className={styles.nextThHelp}>?</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Mass Update & Boosts */}
                <div className={styles.rightPanel}>
                  <div className={styles.massUpdateBox}>
                    <h4>Mass Update:</h4>
                    <div className={styles.massButtons}>
                      <button className={`${styles.massBtn} ${styles.active}`}>
                        <GridViewIcon className={styles.massButtonIcon} />
                        Structures
                      </button>
                      <button className={styles.massBtn}>
                        <BorderAllIcon className={styles.massButtonIcon} />
                        Walls
                      </button>
                    </div>
                  </div>

                  <div className={styles.boostsBox}>
                    <h4>Boosts:</h4>
                    <div className={styles.boostButtonsRow}>
                      <button className={styles.builderBoostBtn}>
                        <img src={builderBoostImg} alt="Builder Boost" className={styles.boostButtonImg} />
                        Use Builder Boost
                      </button>
                      <button className={styles.researchBoostBtn}>
                        <img src={researchBoostImg} alt="Research Boost" className={styles.boostButtonImg} />
                        Use Research Boost
                      </button>
                    </div>
                    <div className={styles.boostNote}>Season Boosts are available at Town Hall 7</div>
                  </div>
                </div>
              </div>

                <div className={styles.upgradeKeyBox}>
                  <span className={styles.upgradeKeyLabel}>Key:</span>
                  <div className={styles.upgradeKeyItem}>
                    <span className={`${styles.upgradeKeySwatch} ${styles.upgradeKeyComplete}`} />
                    <span className={styles.upgradeKeyText}>Complete</span>
                  </div>
                  <div className={styles.upgradeKeyItem}>
                    <span className={`${styles.upgradeKeySwatch} ${styles.upgradeKeyUpgrading}`} />
                    <span className={styles.upgradeKeyText}>Upgrading</span>
                  </div>
                  <div className={styles.upgradeKeyItem}>
                    <span className={`${styles.upgradeKeySwatch} ${styles.upgradeKeyOutstanding}`} />
                    <span className={styles.upgradeKeyText}>Outstanding upgrades</span>
                  </div>
                </div>

                <div className={styles.loadedTabShell}>
                  <div className={styles.loadedTabBar}>
                    {['defences', 'army', 'resources', 'troops', 'walls'].map((tab) => (
                      <button
                        type="button"
                        key={tab}
                        className={`${styles.loadedTabBtn} ${activeLoadedTab === tab ? styles.loadedTabBtnActive : ''} ${loadedTabCompletion[tab] ? styles.loadedTabBtnComplete : ''}`}
                        onMouseDown={() => setActiveLoadedTab(tab)}
                        onTouchStart={() => setActiveLoadedTab(tab)}
                      >
                        <span className={styles.loadedTabBtnLabel}>{tabLabels[tab]}</span>
                        {loadedTabCompletion[tab] && (
                          <CheckIcon className={styles.loadedTabBtnIcon} />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className={`${styles.loadedTabBody} ${activeLoadedTab === 'walls' ? styles.loadedTabBodyWalls : ''}`}>
                    <div className={styles.loadedTabMain}>
                      {activeLoadedTab === 'defences' && (
                        <div className={styles.loadedTabSection}>
                          <div className={styles.loadedTabSectionHeader}>
                            <div className={styles.loadedTabHeaderLeft}>
                              <h3 className={styles.loadedTabSectionTitle}>{loadedTabSectionTitle}</h3>
                              <SettingsIcon className={styles.loadedTabSettingsIcon} />
                            </div>
                            <button
                              type="button"
                              className={styles.loadedTabEditBtn}
                              onClick={handleEditLevels}
                              disabled={structuresLoading}
                            >
                              <EditOutlinedIcon className={styles.loadedTabEditBtnIcon} />
                              {structuresLoading ? 'Loading...' : 'Edit Levels'}
                            </button>
                          </div>
                          <div className={styles.loadedStructureFrame}>
                            <div className={styles.loadedStructureHeader}>
                              <span>{loadedTabPrimaryLabel}</span>
                              <span>{loadedTabSecondaryLabel}</span>
                              <span>Upgrades</span>
                            </div>
                            <div className={styles.readOnlyLoadedList}>
                              {visibleDefenseBuildings.map((building, index) => renderStructureCard(building, `tab-defences-${building.id}-${index}`, { readOnly: true }))}
                            </div>
                          </div>
                        </div>
                      )}

                      {activeLoadedTab === 'army' && (
                        <div className={styles.loadedTabSection}>
                          <div className={styles.loadedTabSectionHeader}>
                            <div className={styles.loadedTabHeaderLeft}>
                              <h3 className={styles.loadedTabSectionTitle}>{loadedTabSectionTitle}</h3>
                              <SettingsIcon className={styles.loadedTabSettingsIcon} />
                            </div>
                            <button
                              type="button"
                              className={styles.loadedTabEditBtn}
                              onClick={handleEditLevels}
                              disabled={structuresLoading}
                            >
                              <EditOutlinedIcon className={styles.loadedTabEditBtnIcon} />
                              {structuresLoading ? 'Loading...' : 'Edit Levels'}
                            </button>
                          </div>
                          <div className={styles.loadedStructureFrame}>
                            <div className={styles.loadedStructureHeader}>
                              <span>{loadedTabPrimaryLabel}</span>
                              <span>{loadedTabSecondaryLabel}</span>
                              <span>Upgrades</span>
                            </div>
                            <div className={styles.readOnlyLoadedList}>
                              {visibleArmyBuildings.map((building, index) => renderStructureCard(building, `tab-army-${building.id}-${index}`, { readOnly: true }))}
                            </div>
                          </div>
                        </div>
                      )}

                      {activeLoadedTab === 'resources' && (
                        <div className={styles.loadedTabSection}>
                          <div className={styles.loadedTabSectionHeader}>
                            <div className={styles.loadedTabHeaderLeft}>
                              <h3 className={styles.loadedTabSectionTitle}>{loadedTabSectionTitle}</h3>
                              <SettingsIcon className={styles.loadedTabSettingsIcon} />
                            </div>
                            <button
                              type="button"
                              className={styles.loadedTabEditBtn}
                              onClick={handleEditLevels}
                              disabled={structuresLoading}
                            >
                              <EditOutlinedIcon className={styles.loadedTabEditBtnIcon} />
                              {structuresLoading ? 'Loading...' : 'Edit Levels'}
                            </button>
                          </div>
                          <div className={styles.loadedStructureFrame}>
                            <div className={styles.loadedStructureHeader}>
                              <span>{loadedTabPrimaryLabel}</span>
                              <span>{loadedTabSecondaryLabel}</span>
                              <span>Upgrades</span>
                            </div>
                            <div className={styles.readOnlyLoadedList}>
                              {visibleResourceBuildings.map((building, index) => renderStructureCard(building, `tab-resources-${building.id}-${index}`, { readOnly: true }))}
                            </div>
                          </div>
                        </div>
                      )}

                      {activeLoadedTab === 'troops' && (
                        <div className={styles.loadedTabSection}>
                          <div className={styles.loadedTabSectionHeader}>
                            <h3 className={styles.loadedTabSectionTitle}>{loadedTabSectionTitle}</h3>
                            <SettingsIcon className={styles.loadedTabSettingsIcon} />
                          </div>
                          <div className={styles.loadedStructureFrame}>
                            <div className={styles.loadedStructureHeader}>
                              <span>{loadedTabPrimaryLabel}</span>
                              <span>{loadedTabSecondaryLabel}</span>
                              <span>Upgrades</span>
                            </div>
                            <div className={styles.readOnlyLoadedList}>
                              {(structureCatalog.troops || []).map((building, index) => renderStructureCard(building, `tab-troops-${building.id}-${index}`, { readOnly: true }))}
                            </div>
                          </div>
                        </div>
                      )}

                      {activeLoadedTab === 'walls' && (
                        <div className={styles.loadedTabSection}>
                          <div className={styles.loadedTabSectionHeader}>
                            <div className={styles.loadedTabHeaderLeft}>
                              <h3 className={styles.loadedTabSectionTitle}>{loadedTabSectionTitle}</h3>
                              <SettingsIcon className={styles.loadedTabSettingsIcon} />
                            </div>
                            <button
                              type="button"
                              className={styles.loadedTabEditBtn}
                              onClick={handleEditLevels}
                              disabled={wallLoading}
                            >
                              <EditOutlinedIcon className={styles.loadedTabEditBtnIcon} />
                              {wallLoading ? 'Loading...' : 'Edit Levels'}
                            </button>
                          </div>
                          <div className={styles.wallsSummaryLine}>
                            <strong>{wallBuilt} of {wallPieces} wall pieces built</strong>
                            {isWallMaxComplete ? (
                              <span className={styles.wallsSummarySuccess}>✓ All wall pieces are upgraded to the maximum level</span>
                            ) : isWallBuildComplete ? (
                              <span className={styles.wallsSummaryWarning}>⚠ All wall pieces are built. Upgrade them to max level.</span>
                            ) : (
                              <>
                                <span className={styles.wallsSummaryWarning}>⚠ You can build {remainingWalls} more walls.</span>
                                <span>Build more walls</span>
                                <button type="button" className={styles.wallsSummaryLink} onClick={handleOpenWallsEditor}>
                                  here
                                </button>
                              </>
                            )}
                          </div>
                          <div className={styles.loadedStructureFrame}>
                            <div className={styles.loadedStructureHeader}>
                              <span>Wall</span>
                              <span>Quantity</span>
                              <span>Upgrades</span>
                            </div>
                            <div className={styles.loadedWallsTable}>
                              {wallLevels.map((wallLevel) => {
                                const upcomingWallLevels = wallLevels
                                  .filter((levelInfo) => Number(levelInfo.level) > Number(wallLevel.level))
                                  .sort((left, right) => Number(left.level) - Number(right.level))
                                  .slice(0, 2)

                                return (
                                <div key={wallLevel.level} className={styles.loadedWallsTableRow}>
                                  <div className={`${styles.loadedWallsTableCell} ${styles.loadedWallsNameCell}`}>
                                    <img
                                      src={`${wallConfig?.image_path || '/src/assets/Walls/60_'}${wallLevel.level}.png`}
                                      alt={`Wall Level ${wallLevel.level}`}
                                      className={styles.loadedWallsTableIcon}
                                    />
                                    <span>Level {wallLevel.level}</span>
                                  </div>
                                  <div className={`${styles.loadedWallsTableCell} ${styles.loadedWallsQuantityCell}`}>
                                    {upcomingWallLevels.length > 0 ? (
                                      <div className={styles.loadedWallQuantityGroup}>
                                        <div className={styles.loadedWallQuantityNumberGrid}>
                                          <span className={styles.loadedWallQuantityValue}>{wallCounts[wallLevel.level] || 0}</span>
                                        </div>
                                        <div className={styles.loadedWallQuantityActionsGrid}>
                                          <div className={styles.loadedWallActionGroup}>
                                            <button
                                              type="button"
                                              className={`${styles.loadedWallActionBtn} ${styles.loadedWallActionUpgrade}`}
                                              aria-label="Wall upgrade action"
                                            >
                                              ↑1
                                            </button>
                                            <button
                                              type="button"
                                              className={`${styles.loadedWallActionBtn} ${styles.loadedWallActionAdd}`}
                                              aria-label="Wall add action"
                                            >
                                              +
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className={styles.loadedWallQuantityGroup}>
                                        <div className={styles.loadedWallQuantityNumberGrid}>
                                          <span className={styles.loadedWallQuantityValue}>{wallCounts[wallLevel.level] || 0}</span>
                                        </div>
                                        <div className={styles.loadedWallQuantityActionsGrid} />
                                      </div>
                                    )}
                                  </div>
                                  <div className={`${styles.loadedWallsTableCell} ${styles.loadedWallsUpgradeCell}`}>
                                    {upcomingWallLevels.length > 0 ? (
                                      <div className={styles.loadedWallUpgradeList}>
                                        {upcomingWallLevels.map((upgradeLevel) => (
                                          <div key={`wall-upgrade-${wallLevel.level}-${upgradeLevel.level}`} className={styles.loadedWallUpgradeItem}>
                                            {upgradeResourceIcons[String(upgradeLevel.resource || '').trim().toLowerCase()] ? (
                                              <img
                                                src={upgradeResourceIcons[String(upgradeLevel.resource || '').trim().toLowerCase()]}
                                                alt={getUpgradeResourceLabel(upgradeLevel.resource)}
                                                className={styles.loadedWallCostIcon}
                                              />
                                            ) : null}
                                            <span className={styles.loadedWallUpgradeLabel}>Lvl {upgradeLevel.level}:</span>
                                            <span className={styles.loadedWallUpgradeValue}>{formatNumberShort(upgradeLevel.cost || 0)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className={styles.loadedWallCost}>
                                        <span className={styles.loadedWallUpgradeLabel}>Max</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )})}
                            </div>
                          </div>
                        </div>
                      )}

                    </div>

                    <div className={styles.loadedRemainingBlock}>
                      <h3 className={styles.loadedRemainingTitle}>Remaining (Beta)</h3>
                      <div className={styles.loadedRemainingCard}>
                        <div className={styles.loadedRemainingTable}>
                          <div className={styles.loadedRemainingHeadRow}>
                            <span>Resource</span>
                            <span>Total</span>
                          </div>
                          {!activeRemainingBetaComplete && remainingBetaResourceRows.map((resource) => (
                            <div key={resource.id} className={styles.loadedRemainingRow}>
                              <span className={styles.loadedRemainingLabelWithIcon}>
                                <img src={resource.icon} alt={resource.label} className={styles.loadedRemainingResourceIcon} />
                                {resource.label}
                              </span>
                              <strong className={styles.loadedRemainingResourceValue}>{formatNumberShort(resource.total)}</strong>
                            </div>
                          ))}

                          {isWallsTabActive ? (
                            activeRemainingBetaComplete && (
                              <div className={styles.loadedRemainingRow}>
                                <span className={styles.loadedRemainingLabelWithIcon}>Status</span>
                                <strong className={styles.loadedRemainingCompleteValue}>Complete</strong>
                              </div>
                            )
                          ) : (
                            <>
                              <div className={styles.loadedRemainingRow}>
                                <span className={styles.loadedRemainingLabelWithIcon}>
                                  <AccessTimeIcon className={styles.loadedRemainingClockIcon} />
                                  Time
                                </span>
                                {activeRemainingBetaComplete ? (
                                  <strong className={styles.loadedRemainingCompleteValue}>Complete</strong>
                                ) : (
                                  <div className={styles.loadedRemainingTimeBlock}>
                                    <span className={styles.loadedRemainingTimeBuilders}>With {displayedBuilderCount} {remainingBetaUnitLabelLower}:</span>
                                    <strong className={styles.loadedRemainingTimeValue}>{formatSeconds(remainingBetaTimeSeconds)}</strong>
                                  </div>
                                )}
                              </div>
                              {!activeRemainingBetaComplete && (
                                <div className={styles.loadedRemainingBuildersRow}>
                                  <div className={styles.loadedRemainingBuildersStack}>
                                    <div className={styles.loadedRemainingBuildersLabel}>{remainingBetaUnitLabel}:</div>
                                    <div className={styles.loadedRemainingBuildersNumbers}>
                                      {Array.from({ length: remainingBetaSelectorCount }, (_, index) => {
                                        const builderNumber = index + 1
                                        const isActive = builderNumber === displayedBuilderCount
                                        const isDisabled = builderNumber > remainingBetaMaxBuilderCount

                                        return (
                                          <button
                                            key={builderNumber}
                                            type="button"
                                            className={`${styles.loadedRemainingBuilderBox} ${isActive ? styles.loadedRemainingBuilderBoxActive : ''} ${isDisabled ? styles.loadedRemainingBuilderBoxDisabled : ''}`}
                                            onClick={() => {
                                              if (isDisabled) return
                                              setRemainingBetaBuilderCount(builderNumber)
                                            }}
                                            disabled={isDisabled}
                                            aria-pressed={isActive}
                                            aria-disabled={isDisabled}
                                            aria-label={`Show time with ${builderNumber} builders`}
                                          >
                                            {builderNumber}
                                          </button>
                                        )
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
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
                          onChange={(e) => {
                            const nextCount = Math.min(5, Math.max(2, Number(e.target.value) || 2))
                            builderCountRef.current = nextCount
                            setBuilderCount(nextCount)
                          }}
                          onMouseUp={handleSaveBuilders}
                          onTouchEnd={handleSaveBuilders}
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
                      {editDefenseBuildings.map((building, index) => renderStructureCard(building, `defences-${building.id}-${index}`))}
                    </div>

                    <h2 className={styles.structuresDatabaseTitle}>Resources</h2>
                    <div className={styles.structuresDatabaseGrid}>
                      {editResourceBuildings.map((building, index) => renderStructureCard(building, `resources-${building.id}-${index}`))}
                    </div>

                    <h2 className={styles.structuresDatabaseTitle}>Army</h2>
                    <div className={styles.structuresDatabaseGrid}>
                      {editArmyBuildings.map((building, index) => renderStructureCard(building, `army-${building.id}-${index}`))}
                    </div>
                  </div>
                </section>

                <div className={styles.structuresProceedBar}>
                  <button className={styles.structuresSecondaryBtn} onClick={handleUpdateStructures} disabled={structuresLoading}>
                    {structuresLoading ? 'Saving...' : 'Update'}
                  </button>
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

                  {wallLoading && wallLevels.length === 0 ? (
                    <p className={styles.wallsLoading}>Loading wall data...</p>
                  ) : (
                    <>
                      {wallLoading && wallLevels.length > 0 && (
                        <p className={styles.wallsLoading}>Syncing latest wall data...</p>
                      )}
                      {wallLevels.map((wallLevel) => (
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
                      ))}
                    </>
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
                      {isWallMaxComplete ? (
                        <div className={styles.wallsOverviewSuccess}>✓ All wall pieces are upgraded to the maximum level</div>
                      ) : isWallBuildComplete ? (
                        <div className={styles.wallsOverviewWarning}>⚠ All wall pieces are built. Upgrade them to max level</div>
                      ) : (
                        <div className={styles.wallsOverviewWarning}>⚠ You can build {remainingWalls} more walls</div>
                      )}
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