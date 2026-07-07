import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import styles from './BuildingEditorPage.module.css'
import { supabase } from '../supabaseClient'
import Header from '../components/Header'
import ToastNotification from '../components/ToastNotification'

const AVAILABLE_DEFENCES = [
  { id: 'canon', name: 'Canon', image: '/src/assets/Defences/canon' },
  { id: 'archer_tower', name: 'Archer Tower', image: '/src/assets/Defences/Archer_Tower' },
  { id: 'mortar', name: 'Mortar', image: '/src/assets/Defences/mortar' },
  { id: 'wizard_tower', name: 'Wizard Tower', image: '/src/assets/Defences/wizard_tower' },
  { id: 'air_defense', name: 'Air Defense', image: '/src/assets/Defences/air_defense' },
  { id: 'inferno_tower', name: 'Inferno Tower', image: '/src/assets/Defences/Inferno_tower' },
  { id: 'x_bow', name: 'X-Bow', image: '/src/assets/Defences/x-bow' },
  { id: 'eagle_artillery', name: 'Eagle Artillery', image: '/src/assets/Defences/Eagle_Artillery' },
]

const AVAILABLE_ARMY = [
  { id: 'army_camp', name: 'Army Camp', image: '/src/assets/Army/Army_Camp' },
  { id: 'barracks', name: 'Barracks', image: '/src/assets/Army/Barracks' },
  { id: 'clan_castle', name: 'Clan Castle', image: '/src/assets/Army/clan_castle' },
]

const AVAILABLE_RESOURCES = [
  { id: 'gold_mine', name: 'Gold Mine', image: '/src/assets/Resources/goldmine' },
  { id: 'elixir_collector', name: 'Elixir Collector', image: '/src/assets/Resources/elixir_collector' },
  { id: 'gold_storage', name: 'Gold Storage', image: '/src/assets/Resources/gold_storage' },
  { id: 'elixir_storage', name: 'Elixir Storage', image: '/src/assets/Resources/elixi_storage' },
]

const AVAILABLE_TROOPS = [
  { id: 'barbarian', name: 'Barbarian', image: '/src/assets/Troops/Barbarian' },
  { id: 'archer', name: 'Archer', image: '/src/assets/Troops/Archer' },
  { id: 'giant', name: 'Giant', image: '/src/assets/Troops/Giant' },
  { id: 'goblin', name: 'Goblin', image: '/src/assets/Troops/Goblin' },
]

const AVAILABLE_WALLS = [
  { id: 'walls', name: 'Walls', image: '/src/assets/Walls' },
]

const ALL_BUILDINGS = [...AVAILABLE_DEFENCES, ...AVAILABLE_ARMY, ...AVAILABLE_RESOURCES, ...AVAILABLE_TROOPS, ...AVAILABLE_WALLS]

const getBuildingCategory = (buildingId) => {
  if (AVAILABLE_DEFENCES.some((building) => building.id === buildingId)) return 'defences'
  if (AVAILABLE_ARMY.some((building) => building.id === buildingId)) return 'army'
  if (AVAILABLE_RESOURCES.some((building) => building.id === buildingId)) return 'resources'
  if (AVAILABLE_TROOPS.some((building) => building.id === buildingId)) return 'troops'
  if (AVAILABLE_WALLS.some((building) => building.id === buildingId)) return 'walls'
  return 'defences'
}

const RESOURCE_ICONS = {
  gold: '/src/assets/magic-items/gold.png',
  elixir: '/src/assets/magic-items/elixir.png',
  dark_elixir: '/src/assets/magic-items/de.png',
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

const parseTimeStringToSeconds = (timeString) => {
  if (!timeString || typeof timeString !== 'string') return 0
  
  let totalSeconds = 0
  const timeLower = timeString.toLowerCase().trim()
  
  // Parse days
  const daysMatch = timeLower.match(/(\d+)\s*d(?:ays?)?/)
  if (daysMatch) totalSeconds += parseInt(daysMatch[1]) * 86400
  
  // Parse hours
  const hoursMatch = timeLower.match(/(\d+)\s*h(?:r|ours?)?/)
  if (hoursMatch) totalSeconds += parseInt(hoursMatch[1]) * 3600
  
  // Parse minutes
  const minutesMatch = timeLower.match(/(\d+)\s*m(?:in|inutes?)?/)
  if (minutesMatch) totalSeconds += parseInt(minutesMatch[1]) * 60
  
  // Parse seconds
  const secondsMatch = timeLower.match(/(\d+)\s*s(?:ec|econds?)?/)
  if (secondsMatch) totalSeconds += parseInt(secondsMatch[1])
  
  return totalSeconds
}

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

const createCopyUnlocks = (count, unlockedCount = 1) =>
  Array.from({ length: count }, (_, index) => index < unlockedCount)

const normalizeCopyUnlocks = (count, existingUnlocks = [], startsUnlocked = true) =>
  Array.from({ length: count }, (_, index) => existingUnlocks[index] ?? (index === 0 ? startsUnlocked : false))

const createTroopLevelDraft = (levelNumber, sourceLevel = {}) => ({
  level: levelNumber,
  cost: Number(sourceLevel.cost ?? 0),
  costDisplay: Number(sourceLevel.costDisplay ?? sourceLevel.cost ?? 0),
  costMagnitude: sourceLevel.costMagnitude || '',
  resource: sourceLevel.resource || 'gold',
  time: sourceLevel.time || '0sec',
})

const normalizeTroopLevels = (count, sourceLevels = []) =>
  Array.from({ length: Math.max(0, count) }, (_, index) => createTroopLevelDraft(index + 1, sourceLevels[index]))

const normalizeTroopLevelCount = (levels = [], fallbackCount = 0) => {
  const levelCount = Array.isArray(levels) ? levels.length : 0
  return Math.max(1, levelCount || Number(fallbackCount) || 1)
}

const getDefaultBuildingData = (townhallLevel) => {
  if (townhallLevel === 2) {
    return {
      canon: {
        buildings_unlocked: 2,
        starts_unlocked: true,
        copy_unlocks: createCopyUnlocks(2, 1),
        levels: [
          { level: 1, cost: 250, resource: 'gold', time: '5sec' },
          { level: 2, cost: 1000, resource: 'gold', time: '30sec' },
          { level: 3, cost: 4000, resource: 'gold', time: '2min' },
        ],
      },
      archer_tower: {
        buildings_unlocked: 1,
        starts_unlocked: true,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 1000, resource: 'gold', time: '15sec' },
          { level: 2, cost: 2000, resource: 'gold', time: '2min' },
        ],
      },
      army_camp: {
        buildings_unlocked: 1,
        starts_unlocked: true,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 200, resource: 'elixir', time: '1min' },
          { level: 2, cost: 2000, resource: 'elixir', time: '5min' },
        ],
      },
      barracks: {
        buildings_unlocked: 1,
        starts_unlocked: true,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 100, resource: 'elixir', time: '10sec' },
          { level: 2, cost: 500, resource: 'elixir', time: '15sec' },
          { level: 3, cost: 2500, resource: 'elixir', time: '2min' },
          { level: 4, cost: 5000, resource: 'elixir', time: '30min' },
        ],
      },
      clan_castle: {
        buildings_unlocked: 1,
        starts_unlocked: true,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 10000, resource: 'elixir', time: '0sec' },
        ],
      },
      gold_mine: {
        buildings_unlocked: 2,
        starts_unlocked: true,
        copy_unlocks: createCopyUnlocks(2, 1),
        levels: [
          { level: 1, cost: 150, resource: 'elixir', time: '5sec' },
          { level: 2, cost: 300, resource: 'elixir', time: '15sec' },
          { level: 3, cost: 700, resource: 'elixir', time: '1min' },
          { level: 4, cost: 1400, resource: 'elixir', time: '2min' },
        ],
      },
      elixir_collector: {
        buildings_unlocked: 2,
        starts_unlocked: true,
        copy_unlocks: createCopyUnlocks(2, 1),
        levels: [
          { level: 1, cost: 150, resource: 'gold', time: '5sec' },
          { level: 2, cost: 300, resource: 'gold', time: '15sec' },
          { level: 3, cost: 700, resource: 'gold', time: '1min' },
          { level: 4, cost: 1400, resource: 'gold', time: '2min' },
        ],
      },
      gold_storage: {
        buildings_unlocked: 1,
        starts_unlocked: true,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 300, resource: 'elixir', time: '10sec' },
          { level: 2, cost: 750, resource: 'elixir', time: '2min' },
          { level: 3, cost: 1500, resource: 'elixir', time: '5min' },
        ],
      },
      elixir_storage: {
        buildings_unlocked: 1,
        starts_unlocked: true,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 300, resource: 'gold', time: '10sec' },
          { level: 2, cost: 750, resource: 'gold', time: '2min' },
          { level: 3, cost: 1500, resource: 'gold', time: '5min' },
        ],
      },
      walls: {
        buildings_unlocked: 25,
        starts_unlocked: true,
        copy_unlocks: createCopyUnlocks(25, 1),
        levels: [
          { level: 1, cost: 0, resource: 'gold', time: '0sec' },
          { level: 2, cost: 1000, resource: 'gold', time: '0sec' },
        ],
      },
      barbarian: {
        buildings_unlocked: 1,
        starts_unlocked: true,
        copy_unlocks: createCopyUnlocks(1, 1),
        barracks_level_unlocked: 1,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec' },
        ],
      },
      archer: {
        buildings_unlocked: 1,
        starts_unlocked: true,
        copy_unlocks: createCopyUnlocks(1, 1),
        barracks_level_unlocked: 2,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec' },
        ],
      },
      giant: {
        buildings_unlocked: 1,
        starts_unlocked: true,
        copy_unlocks: createCopyUnlocks(1, 1),
        barracks_level_unlocked: 3,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec' },
        ],
      },
      goblin: {
        buildings_unlocked: 1,
        starts_unlocked: true,
        copy_unlocks: createCopyUnlocks(1, 1),
        barracks_level_unlocked: 4,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec' },
        ],
      },
    }
  }
  return {}
}

export default function BuildingEditorPage({ username, onLogout }) {
  const { townhallLevel, buildingId } = useParams()
  const navigate = useNavigate()
  const isEditingRef = useRef(false)
  const isWallBuilding = buildingId === 'walls'
  const isTroopBuilding = AVAILABLE_TROOPS.some((building) => building.id === buildingId)

  const [staticData, setStaticData] = useState({})
  const [dynamicData, setDynamicData] = useState({})
  const [isEditing, setIsEditing] = useState(false)
  const [editingLevels, setEditingLevels] = useState([])
  const [editingBuildingCount, setEditingBuildingCount] = useState(0)
  const [editingCopyUnlocks, setEditingCopyUnlocks] = useState([])
  const [editingBarracksLevelUnlocked, setEditingBarracksLevelUnlocked] = useState(1)
  const [savingLoading, setSavingLoading] = useState(false)
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' })

  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity })
  }

  const closeToast = (_, reason) => {
    if (reason === 'clickaway') return
    setToast((current) => ({ ...current, open: false }))
  }
  const [loading, setLoading] = useState(true)
  const [timeModalOpen, setTimeModalOpen] = useState(false)
  const [timeModalLevel, setTimeModalLevel] = useState(null)
  const [timeModalValues, setTimeModalValues] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  const defence = ALL_BUILDINGS.find((d) => d.id === buildingId)

  // Keep ref in sync with isEditing state
  useEffect(() => {
    isEditingRef.current = isEditing
  }, [isEditing])

  useEffect(() => {
    const fetchData = async () => {
      // Don't fetch if already editing
      if (isEditingRef.current) return

      setLoading(true)
      try {
        const categoryField = getBuildingCategory(buildingId)
        // Load static data
        const defaultData = getDefaultBuildingData(parseInt(townhallLevel))
        let staticBuildingData = defaultData[buildingId] || { buildings_unlocked: 0, levels: [] }
        setStaticData(staticBuildingData)

        // Fetch dynamic data from database
        const { data, error } = await supabase
          .from('townhall_buildings')
          .select('*')
          .eq('townhall_level', parseInt(townhallLevel))
          .single()

        if (error && error.code !== 'PGRST116') throw error
        
        const categoryData = categoryField === 'walls'
          ? data?.walls
          : data?.[categoryField]

        const buildingData = categoryField === 'walls'
          ? categoryData
          : Array.isArray(categoryData)
            ? categoryData.find((entry) => entry?.id === buildingId)
            : categoryData?.[buildingId]

        const hasSavedLevels = Array.isArray(buildingData?.levels) && buildingData.levels.length > 0
        const resolvedLevels = hasSavedLevels
          ? JSON.parse(JSON.stringify(buildingData.levels))
          : JSON.parse(JSON.stringify(staticBuildingData.levels || []))
        const initialLevelCount = isTroopBuilding
          ? normalizeTroopLevelCount(resolvedLevels, buildingData?.buildings_unlocked || staticBuildingData.buildings_unlocked || 0)
          : Number(buildingData?.buildings_unlocked || staticBuildingData.buildings_unlocked || 0)
        const initialBarracksLevelUnlocked = Number(buildingData?.barracks_level_unlocked ?? staticBuildingData.barracks_level_unlocked ?? 1) || 1

        if (buildingData) {
          // Only update if still not editing
          if (!isEditingRef.current) {
            setDynamicData({
              ...buildingData,
              levels: resolvedLevels,
            })
            setEditingLevels(isTroopBuilding ? normalizeTroopLevels(initialLevelCount, resolvedLevels) : resolvedLevels)
            setEditingBuildingCount(initialLevelCount)
            setEditingBarracksLevelUnlocked(initialBarracksLevelUnlocked)
            setEditingCopyUnlocks(
              isTroopBuilding
                ? createCopyUnlocks(1, 1)
                : normalizeCopyUnlocks(
                    initialLevelCount,
                    buildingData.copy_unlocks || staticBuildingData.copy_unlocks || [],
                    buildingData.starts_unlocked ?? staticBuildingData.starts_unlocked ?? true,
                  )
            )
          }
        } else {
          // No database record yet - use static data as initial dynamic data
          if (!isEditingRef.current) {
            const draftLevels = JSON.parse(JSON.stringify(staticBuildingData.levels || []))
            const draftCount = isTroopBuilding
              ? normalizeTroopLevelCount(draftLevels, staticBuildingData.buildings_unlocked || 0)
              : staticBuildingData.buildings_unlocked || 0
            const draftUnlocks = isTroopBuilding
              ? createCopyUnlocks(1, 1)
              : normalizeCopyUnlocks(
                  draftCount,
                  staticBuildingData.copy_unlocks || [],
                  staticBuildingData.starts_unlocked ?? true,
                )

            setDynamicData({
              buildings_unlocked: draftCount,
              copy_unlocks: draftUnlocks,
              levels: isTroopBuilding ? normalizeTroopLevels(draftCount, draftLevels) : draftLevels,
              ...(isTroopBuilding ? { barracks_level_unlocked: Number(staticBuildingData.barracks_level_unlocked ?? 1) || 1 } : {}),
            })
            setEditingLevels(isTroopBuilding ? normalizeTroopLevels(draftCount, draftLevels) : draftLevels)
            setEditingBuildingCount(draftCount)
            setEditingBarracksLevelUnlocked(Number(staticBuildingData.barracks_level_unlocked ?? 1) || 1)
            setEditingCopyUnlocks(draftUnlocks)
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        if (!isEditingRef.current) {
          setLoading(false)
        }
      }
    }

    fetchData()
  }, [townhallLevel, buildingId])

  const isLevelMatching = (staticLevel, dynamicLevel) => {
    if (!staticLevel || !dynamicLevel) return false
    return (
      staticLevel.cost === dynamicLevel.cost &&
      staticLevel.time === dynamicLevel.time &&
      staticLevel.resource === dynamicLevel.resource
    )
  }

  const handleEditLevel = (levelIndex, field, value) => {
    // If editingLevels is empty, initialize it from static data
    let toUpdate = editingLevels.length > 0 ? [...editingLevels] : JSON.parse(JSON.stringify(currentStaticLevel))
    
    const magnitudes = { '': 1, 'k': 1000, 'm': 1000000, 'b': 1000000000 }
    
    if (field === 'cost') {
      // Recalculate actual cost using current magnitude
      const magnitude = toUpdate[levelIndex].costMagnitude || ''
      const multiplier = magnitudes[magnitude] || 1
      const displayValue = parseFloat(value) || 0
      toUpdate[levelIndex] = {
        ...toUpdate[levelIndex],
        costDisplay: displayValue,
        cost: displayValue * multiplier,
      }
    } else if (field === 'costMagnitude') {
      // Calculate actual cost based on new magnitude
      const displayValue = toUpdate[levelIndex].costDisplay || 0
      const multiplier = magnitudes[value] || 1
      toUpdate[levelIndex] = {
        ...toUpdate[levelIndex],
        costMagnitude: value,
        cost: displayValue * multiplier,
      }
    } else {
      toUpdate[levelIndex] = {
        ...toUpdate[levelIndex],
        [field]: value,
      }
    }
    setEditingLevels(toUpdate)
  }

  const handleEditingBuildingCountChange = (value) => {
    const nextCount = Math.max(0, parseInt(value) || 0)
    setEditingBuildingCount(nextCount)
    setEditingCopyUnlocks((current) => normalizeCopyUnlocks(nextCount, current, current[0] ?? true))
    if (isTroopBuilding) {
      setEditingLevels((current) => normalizeTroopLevels(nextCount, current))
    }
  }

  const handleEditingBarracksLevelUnlockedChange = (value) => {
    setEditingBarracksLevelUnlocked(Math.max(1, parseInt(value) || 1))
  }

  const handleToggleCopyUnlock = (copyIndex) => {
    setEditingCopyUnlocks((current) => {
      const nextUnlocks = normalizeCopyUnlocks(editingBuildingCount, current, current[0] ?? true)
      nextUnlocks[copyIndex] = !nextUnlocks[copyIndex]
      return nextUnlocks
    })
  }

  const openTimeModal = (levelIndex) => {
    const level = editingLevels[levelIndex]
    const seconds = parseTimeStringToSeconds(level.time)
    setTimeModalValues(parseSecondsToDropdowns(seconds))
    setTimeModalLevel(levelIndex)
    setTimeModalOpen(true)
  }

  const closeTimeModal = () => {
    setTimeModalOpen(false)
    setTimeModalLevel(null)
  }

  const handleTimeModalChange = (timeUnit, value) => {
    setTimeModalValues({
      ...timeModalValues,
      [timeUnit]: Math.min(Math.max(0, parseInt(value) || 0), timeUnit === 'days' ? 31 : timeUnit === 'hours' ? 23 : 59)
    })
  }

  const saveTimeModal = () => {
    const { days, hours, minutes, seconds } = timeModalValues
    const totalSeconds = days * 86400 + hours * 3600 + minutes * 60 + seconds
    const formattedTime = formatSecondsToTimeDisplay(totalSeconds)
    
    let toUpdate = [...editingLevels]
    toUpdate[timeModalLevel] = {
      ...toUpdate[timeModalLevel],
      time: formattedTime,
    }
    setEditingLevels(toUpdate)
    closeTimeModal()
  }

  const handleSave = async () => {
    setSavingLoading(true)
    try {
      // Fetch current data - handle case where no row exists yet
      const { data: currentData, error: fetchError } = await supabase
        .from('townhall_buildings')
        .select('*')
        .eq('townhall_level', parseInt(townhallLevel))
        .single()

      // If row doesn't exist (PGRST116), that's OK - we'll create it
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

      const categoryField = getBuildingCategory(buildingId)
      const normalizedLevels = isTroopBuilding ? normalizeTroopLevels(editingBuildingCount, editingLevels) : editingLevels
      const troopLevelCount = isTroopBuilding ? normalizedLevels.length : editingBuildingCount
      const updatedBuildingData = {
        buildings_unlocked: troopLevelCount,
        starts_unlocked: editingCopyUnlocks[0] ?? true,
        copy_unlocks: isTroopBuilding ? createCopyUnlocks(1, 1) : normalizeCopyUnlocks(editingBuildingCount, editingCopyUnlocks, true),
        levels: normalizedLevels,
        ...(isTroopBuilding ? { barracks_level_unlocked: editingBarracksLevelUnlocked } : {}),
      }

      // Build complete record with the correct category updated
      const recordToSave = {
        townhall_level: parseInt(townhallLevel),
        defences: currentData?.defences || {},
        army: currentData?.army || {},
        resources: currentData?.resources || {},
        troops: currentData?.troops || {},
        walls: currentData?.walls || {},
        updated_at: new Date().toISOString(),
      }

      if (categoryField === 'walls') {
        recordToSave.walls = updatedBuildingData
      } else {
        const existingCategory = Array.isArray(recordToSave[categoryField]) ? recordToSave[categoryField] : []
        const nextCategory = [...existingCategory]
        const existingIndex = nextCategory.findIndex((entry) => entry?.id === buildingId)
        const nextEntry = { id: buildingId, ...updatedBuildingData }

        if (existingIndex >= 0) {
          nextCategory[existingIndex] = nextEntry
        } else {
          nextCategory.push(nextEntry)
        }

        recordToSave[categoryField] = nextCategory
      }

      // Upsert with proper conflict handling
      const { error: upsertError } = await supabase
        .from('townhall_buildings')
        .upsert(recordToSave, { onConflict: 'townhall_level' })

      if (upsertError) throw upsertError

      showToast('Building data saved successfully!', 'success')
      
      // Update dynamic data with what we just saved
      setDynamicData({
        buildings_unlocked: troopLevelCount,
        starts_unlocked: editingCopyUnlocks[0] ?? true,
        copy_unlocks: isTroopBuilding ? createCopyUnlocks(1, 1) : normalizeCopyUnlocks(editingBuildingCount, editingCopyUnlocks, true),
        levels: normalizedLevels,
        ...(isTroopBuilding ? { barracks_level_unlocked: editingBarracksLevelUnlocked } : {}),
      })
      setIsEditing(false)
    } catch (err) {
      console.error('Error saving:', err)
      showToast('Error saving building data: ' + err.message, 'error')
    } finally {
      setSavingLoading(false)
    }
  }

  if (loading) {
    return (
      <>
        <div className={styles.page}>
          <Header username={username} onLogout={onLogout} />
          <div className={styles.container}>
            <div>Loading...</div>
          </div>
        </div>
        <ToastNotification
          open={toast.open}
          message={toast.message}
          severity={toast.severity}
          onClose={closeToast}
        />
      </>
    )
  }

  if (!defence) {
    return (
      <div className={styles.page}>
        <Header username={username} onLogout={onLogout} />
        <div className={styles.container}>
          <div>Building not found</div>
        </div>
      </div>
    )
  }

  const currentDynamicLevel = dynamicData.levels || staticData.levels || []
  const currentStaticLevel = staticData.levels || []
  const troopCountLabel = isTroopBuilding ? 'Level Count' : 'Count'
  const troopBarracksLevel = isTroopBuilding
    ? Number(dynamicData.barracks_level_unlocked || staticData.barracks_level_unlocked || 1)
    : 0

  // Detect if there are changes
  const hasChanges = () => {
    if (editingBuildingCount !== (dynamicData.buildings_unlocked || 0)) {
      return true
    }
    const currentUnlocks = normalizeCopyUnlocks(
      editingBuildingCount,
      editingCopyUnlocks,
      dynamicData.starts_unlocked ?? true,
    )
    const originalUnlocks = normalizeCopyUnlocks(
      dynamicData.buildings_unlocked || 0,
      dynamicData.copy_unlocks || [],
      dynamicData.starts_unlocked ?? true,
    )
    if (currentUnlocks.length !== originalUnlocks.length || currentUnlocks.some((value, index) => value !== originalUnlocks[index])) {
      return true
    }
    if (editingLevels.length !== (dynamicData.levels || []).length) {
      return true
    }
    if (isTroopBuilding && Number(editingBarracksLevelUnlocked) !== Number(dynamicData.barracks_level_unlocked || 1)) {
      return true
    }
    return editingLevels.some((level, idx) => {
      const original = (dynamicData.levels || [])[idx]
      if (!original) return true
      return (
        level.cost !== original.cost ||
        level.time !== original.time ||
        level.resource !== original.resource
      )
    })
  }

  return (
    <div className={styles.page}>
      <Header username={username} onLogout={onLogout} />
      <div className={styles.container}>
        <button className={styles.backBtn} onClick={() => navigate(`/admin/${townhallLevel}`)}>
          ← Back
        </button>

        {/* Building Card: Image | Divider | Data */}
        <div className={styles.buildingCard}>
          {/* Left: Image + Name */}
          <div className={styles.buildingImageSection}>
            {(() => {
              const allLevels = editingLevels.length > 0 ? editingLevels : (dynamicData.levels || staticData.levels || [])
              const maxLevel = allLevels.length > 0 ? Math.max(...allLevels.map(l => l.level)) : 3
              
              const getImagePath = () => {
                if (defence.id === 'archer_tower') return `16_${maxLevel}`
                if (defence.id === 'canon') return `18_${maxLevel}`
                if (defence.id === 'army_camp') return `10_${maxLevel}`
                if (defence.id === 'barracks') return `8_${maxLevel}`
                if (defence.id === 'clan_castle') return `19_${maxLevel}`
                if (defence.id === 'walls') return `60_${maxLevel}`
                if (defence.id === 'gold_mine') return `2_${maxLevel}`
                if (defence.id === 'elixir_collector') return `3_${maxLevel}`
                if (defence.id === 'gold_storage') return `5_${maxLevel}`
                if (defence.id === 'elixir_storage') return `6_${maxLevel}`
                if (defence.id === 'barbarian') return `31_${maxLevel}`
                if (defence.id === 'archer') return `32_${maxLevel}`
                if (defence.id === 'giant') return `33_${maxLevel}`
                if (defence.id === 'goblin') return `34_${maxLevel}`
                return '18_3'
              }
              
              return (
                <img
                  src={`${defence.image}/${getImagePath()}.png`}
                  alt={defence.name}
                  className={styles.buildingImage}
                />
              )
            })()}
            <p className={styles.buildingNameLabel}>{defence.name}</p>
          </div>

          {/* Divider */}
          <div className={styles.dividerLine} />

          {/* Right: Data with Edit & Save Buttons */}
          <div className={styles.buildingHeader}>
            {/* Edit Button - Top Left */}
            <button
              className={styles.editToggleBtn}
              onClick={() => setIsEditing(!isEditing)}
              title={isEditing ? 'Cancel' : 'Edit'}
            >
              {isEditing ? '✕' : '✏️'}
            </button>

            {/* Save Button - Top Right */}
            <button
              className={styles.saveBtn}
              onClick={handleSave}
              disabled={!isEditing || !hasChanges() || savingLoading}
              style={{ opacity: (!isEditing || !hasChanges()) ? 0.5 : 1, cursor: (!isEditing || !hasChanges()) ? 'not-allowed' : 'pointer' }}
            >
              {savingLoading ? 'Saving...' : '💾'}
            </button>
            
            {/* Static Data Section */}
            <div>
              <div className={styles.sectionHeading}>
                Static
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '8px' }}>
                  {troopCountLabel}: {staticData.buildings_unlocked || 0}
                </span>
                {isTroopBuilding && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '8px' }}>
                    Barracks level needed: {troopBarracksLevel}
                  </span>
                )}
              </div>
              <div className={styles.levelsList}>
                {currentStaticLevel.map((level) => (
                  <div key={`static-${level.level}`} className={styles.levelRow}>
                    <img
                      src={RESOURCE_ICONS[level.resource]}
                      alt={level.resource}
                      className={styles.resourceIcon}
                    />
                    <div className={styles.levelLabel}>Lvl {level.level}:</div>
                    <span className={`${styles.costValue} ${styles[level.resource]}`}>{formatCost(level.cost)}</span>
                    <span className={styles.timeValue}>{level.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamic/Edit Data Section */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(102, 227, 196, 0.2)' }}>
              <div className={styles.sectionHeading}>
                Dynamic
                {!isEditing && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '8px' }}>
                    {troopCountLabel}: {dynamicData.buildings_unlocked || 0}
                  </span>
                )}
                {isEditing && (
                  <>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{troopCountLabel}:</span>
                    <input
                      type="number"
                      value={editingBuildingCount}
                      onChange={(e) => handleEditingBuildingCountChange(e.target.value)}
                      min="0"
                      className={styles.headingCountInput}
                    />
                    {isTroopBuilding && (
                      <>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '12px' }}>Barracks level:</span>
                        <input
                          type="number"
                          value={editingBarracksLevelUnlocked}
                          onChange={(e) => handleEditingBarracksLevelUnlockedChange(e.target.value)}
                          min="1"
                          className={styles.headingCountInput}
                        />
                      </>
                    )}
                  </>
                )}
                {isTroopBuilding && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '8px' }}>
                    Barracks level needed: {troopBarracksLevel}
                  </span>
                )}
              </div>
              {isEditing && !isWallBuilding && !isTroopBuilding && editingBuildingCount > 0 && (
                <div className={styles.unlockPreview}>
                  <div className={styles.unlockPreviewTitle}>{isTroopBuilding ? 'Level unlock preview' : 'Unlock preview'}</div>
                  {Array.from({ length: editingBuildingCount }, (_, index) => (
                    <div key={`unlock-preview-${index}`} className={styles.unlockPreviewRow}>
                      <span className={styles.unlockPreviewCopy}>{isTroopBuilding ? `Level ${index + 1}` : `Copy ${index + 1}`}</span>
                      <button
                        type="button"
                        className={`${styles.unlockPreviewToggle} ${editingCopyUnlocks[index] ? styles.unlockPreviewToggleOn : styles.unlockPreviewToggleOff}`}
                        onClick={() => handleToggleCopyUnlock(index)}
                      >
                        {editingCopyUnlocks[index] ? 'Unlocked' : 'Locked'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {!isEditing && currentDynamicLevel.length > 0 && (
                <div className={styles.levelsList}>
                  {currentDynamicLevel.map((level) => {
                    const staticLevel = currentStaticLevel.find((l) => l.level === level.level)
                    const isMatching = isLevelMatching(staticLevel, level)

                    return (
                      <div key={`dynamic-${level.level}`} className={styles.levelRow}>
                        <img
                          src={RESOURCE_ICONS[level.resource]}
                          alt={level.resource}
                          className={styles.resourceIcon}
                        />
                        <div className={styles.levelLabel}>Lvl {level.level}:</div>
                        <span className={`${styles.costValue} ${styles[level.resource]}`}>{formatCost(level.cost)}</span>
                        <span className={styles.timeValue}>{level.time}</span>
                        {isMatching && <span className={styles.checkmark}>✓</span>}
                      </div>
                    )
                  })}
                </div>
              )}

              {!isEditing && currentDynamicLevel.length === 0 && (
                <div className={styles.noData}>No data saved yet</div>
              )}

              {isEditing && (
                <div className={styles.levelsList}>
                  {(editingLevels.length > 0 ? editingLevels : currentStaticLevel).map((level, idx) => (
                    <div key={`edit-${level.level}`} className={styles.levelEditRow}>
                      <img
                        src={RESOURCE_ICONS[level.resource]}
                        alt={level.resource}
                        className={styles.resourceIcon}
                      />
                      <span className={styles.levelLabel}>Lvl {level.level}:</span>
                      <div className={styles.costInputGroup}>
                        <input
                          type="number"
                          value={level.costDisplay || level.cost}
                          onChange={(e) => handleEditLevel(idx, 'cost', e.target.value)}
                          className={styles.costInput}
                          placeholder="0"
                        />
                        <select
                          value={level.costMagnitude || ''}
                          onChange={(e) => handleEditLevel(idx, 'costMagnitude', e.target.value)}
                          className={styles.magnitudeSelect}
                        >
                          <option value="">None</option>
                          <option value="k">k</option>
                          <option value="m">m</option>
                          <option value="b">b</option>
                        </select>
                      </div>
                      <select
                        value={level.resource}
                        onChange={(e) => handleEditLevel(idx, 'resource', e.target.value)}
                        className={styles.resourceSelect}
                      >
                        <option value="gold">Gold</option>
                        <option value="elixir">Elixir</option>
                        <option value="dark_elixir">Dark Elixir</option>
                      </select>
                      <button
                        onClick={() => openTimeModal(idx)}
                        className={styles.timeModalBtn}
                        title="Click to set time"
                      >
                        {level.time}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Time Modal */}
      {timeModalOpen && (
        <div className={styles.modalOverlay} onClick={closeTimeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Set Upgrade Time</h3>
              <button
                className={styles.modalClose}
                onClick={closeTimeModal}
              >
                ✕
              </button>
            </div>
            
            <div className={styles.modalContent}>
              <div className={styles.timeInputGroup}>
                <label>Days (0-31)</label>
                <input
                  type="number"
                  min="0"
                  max="31"
                  value={timeModalValues.days}
                  onChange={(e) => handleTimeModalChange('days', e.target.value)}
                  className={styles.timeModalInput}
                />
              </div>
              
              <div className={styles.timeInputGroup}>
                <label>Hours (0-23)</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={timeModalValues.hours}
                  onChange={(e) => handleTimeModalChange('hours', e.target.value)}
                  className={styles.timeModalInput}
                />
              </div>
              
              <div className={styles.timeInputGroup}>
                <label>Minutes (0-59)</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={timeModalValues.minutes}
                  onChange={(e) => handleTimeModalChange('minutes', e.target.value)}
                  className={styles.timeModalInput}
                />
              </div>
              
              <div className={styles.timeInputGroup}>
                <label>Seconds (0-59)</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={timeModalValues.seconds}
                  onChange={(e) => handleTimeModalChange('seconds', e.target.value)}
                  className={styles.timeModalInput}
                />
              </div>

              <div className={styles.timeDisplay}>
                Total: {formatSecondsToTimeDisplay(
                  timeModalValues.days * 86400 +
                  timeModalValues.hours * 3600 +
                  timeModalValues.minutes * 60 +
                  timeModalValues.seconds
                )}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.modalSaveBtn}
                onClick={saveTimeModal}
              >
                Save
              </button>
              <button
                className={styles.modalCancelBtn}
                onClick={closeTimeModal}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
