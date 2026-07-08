import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import styles from './BuildingEditorPage.module.css'
import { supabase } from '../supabaseClient'
import Header from '../components/Header'
import ToastNotification from '../components/ToastNotification'
import { getTownhallSnapshotForLevel } from '../utils/townhallSnapshot'
import { ALL_BUILDINGS, BUILDING_SECTIONS, getBuildingCategory, getDefaultBuildingData } from '../data/buildings'

const RESOURCE_ICONS = {
  gold: '/src/assets/magic-items/gold.png',
  elixir: '/src/assets/magic-items/elixir.png',
  dark_elixir: '/src/assets/magic-items/de.png',
}

const getLevelResourceOptions = (levelInfo, { isWallLevel = false } = {}) => {
  const normalizedFromOptions = Array.isArray(levelInfo?.resource_options)
    ? levelInfo.resource_options
      .map((resource) => String(resource || '').trim().toLowerCase())
      .filter((resource, index, collection) => Boolean(resource) && collection.indexOf(resource) === index)
    : []

  if (normalizedFromOptions.length > 0) return normalizedFromOptions

  if (isWallLevel && Number(levelInfo?.level || 0) >= 5) {
    return ['gold', 'elixir']
  }

  return [String(levelInfo?.resource || 'gold').trim().toLowerCase() || 'gold']
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
  lab_level_unlocked: Number(sourceLevel.lab_level_unlocked ?? 0),
})

const normalizeTroopLevels = (count, sourceLevels = []) =>
  Array.from({ length: Math.max(0, count) }, (_, index) => createTroopLevelDraft(index + 1, sourceLevels[index]))

const normalizeSpellLevels = (count, sourceLevels = []) =>
  Array.from({ length: Math.max(0, count) }, (_, index) => createTroopLevelDraft(index + 1, sourceLevels[index]))

const createHeroLevelDraft = (levelNumber, sourceLevel = {}) => ({
  level: levelNumber,
  cost: Number(sourceLevel.cost ?? 0),
  costDisplay: Number(sourceLevel.costDisplay ?? sourceLevel.cost ?? 0),
  costMagnitude: sourceLevel.costMagnitude || '',
  resource: sourceLevel.resource || 'dark_elixir',
  time: sourceLevel.time || '0sec',
  hero_hall_level_unlocked: Number(sourceLevel.hero_hall_level_unlocked ?? 0),
})

const normalizeHeroLevels = (count, sourceLevels = []) =>
  Array.from({ length: Math.max(0, count) }, (_, index) => createHeroLevelDraft(index + 1, sourceLevels[index]))

const createBuildingLevelDraft = (levelNumber, sourceLevel = {}) => ({
  level: levelNumber,
  cost: Number(sourceLevel.cost ?? 0),
  costDisplay: Number(sourceLevel.costDisplay ?? sourceLevel.cost ?? 0),
  costMagnitude: sourceLevel.costMagnitude || '',
  resource: sourceLevel.resource || 'gold',
  resource_options: Array.isArray(sourceLevel.resource_options) ? [...sourceLevel.resource_options] : [],
  time: sourceLevel.time || '0sec',
})

const normalizeBuildingLevels = (count, sourceLevels = []) =>
  Array.from({ length: Math.max(0, count) }, (_, index) => createBuildingLevelDraft(index + 1, sourceLevels[index]))

const normalizeTroopLevelCount = (levels = [], fallbackCount = 0) => {
  const levelCount = Array.isArray(levels) ? levels.length : 0
  return Math.max(1, levelCount || Number(fallbackCount) || 1)
}

export default function BuildingEditorPage({ username, onLogout }) {
  const { townhallLevel, buildingId } = useParams()
  const navigate = useNavigate()
  const isEditingRef = useRef(false)
  const isWallBuilding = buildingId === 'walls'
  const isDarkTroopBuilding = BUILDING_SECTIONS.dark_troops.some((building) => building.id === buildingId)
  const isTroopBuilding = BUILDING_SECTIONS.troops.some((building) => building.id === buildingId) || isDarkTroopBuilding
  const isSpellBuilding = BUILDING_SECTIONS.spells.some((building) => building.id === buildingId)
  const isTroopLikeBuilding = isTroopBuilding || isSpellBuilding
  const isHeroBuilding = BUILDING_SECTIONS.heroes.some((building) => building.id === buildingId)

  const [staticData, setStaticData] = useState({})
  const [dynamicData, setDynamicData] = useState({})
  const [isEditing, setIsEditing] = useState(false)
  const [editingLevels, setEditingLevels] = useState([])
  const [editingBuildingCount, setEditingBuildingCount] = useState(0)
  const [editingLevelCount, setEditingLevelCount] = useState(0)
  const [editingCopyUnlocks, setEditingCopyUnlocks] = useState([])
  const [editingBarracksLevelUnlocked, setEditingBarracksLevelUnlocked] = useState(1)
  const [editingSpellFactoryLevelUnlocked, setEditingSpellFactoryLevelUnlocked] = useState(1)
  const [editingHeroHallLevelUnlocked, setEditingHeroHallLevelUnlocked] = useState(1)
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
        // Fetch dynamic data from database
        const selectedTownhall = parseInt(townhallLevel)
        // Load static data
        const defaultData = getDefaultBuildingData(selectedTownhall)
        const { data: rows, error } = await supabase
          .from('townhall_buildings')
          .select('*')
          .lte('townhall_level', selectedTownhall)
          .order('townhall_level', { ascending: true })

        if (error) throw error

        const inheritedTownhallData = getTownhallSnapshotForLevel(rows || [], selectedTownhall, defaultData)
        const staticBuildingData = categoryField === 'walls'
          ? inheritedTownhallData.walls || { buildings_unlocked: 0, levels: [] }
          : (inheritedTownhallData[categoryField] || []).find((entry) => entry?.id === buildingId)
            || defaultData[buildingId]
            || { buildings_unlocked: 0, levels: [] }
        setStaticData(staticBuildingData)

        const categoryData = categoryField === 'walls'
          ? inheritedTownhallData.walls
          : inheritedTownhallData[categoryField]

        const buildingData = categoryField === 'walls'
          ? categoryData
          : Array.isArray(categoryData)
            ? categoryData.find((entry) => entry?.id === buildingId)
            : categoryData?.[buildingId]

        const hasSavedLevels = Array.isArray(buildingData?.levels) && buildingData.levels.length > 0
        const resolvedLevels = hasSavedLevels
          ? JSON.parse(JSON.stringify(buildingData.levels))
          : JSON.parse(JSON.stringify(staticBuildingData.levels || []))
        const initialLevelCount = isTroopLikeBuilding
          ? normalizeTroopLevelCount(resolvedLevels, buildingData?.buildings_unlocked || staticBuildingData.buildings_unlocked || 0)
          : isHeroBuilding
            ? 1
            : Number(buildingData?.buildings_unlocked || staticBuildingData.buildings_unlocked || 0)
        const initialBuildingLevelCount = isTroopLikeBuilding
          ? initialLevelCount
          : isHeroBuilding
            ? normalizeTroopLevelCount(resolvedLevels, resolvedLevels.length || 1)
            : Math.max(0, resolvedLevels.length)
        const initialBarracksLevelUnlocked = isDarkTroopBuilding
          ? Number(buildingData?.dark_barracks_level_unlocked ?? staticBuildingData.dark_barracks_level_unlocked ?? 1) || 1
          : Number(buildingData?.barracks_level_unlocked ?? staticBuildingData.barracks_level_unlocked ?? 1) || 1
        const initialSpellFactoryLevelUnlocked = Number(buildingData?.spell_factory_level_unlocked ?? staticBuildingData.spell_factory_level_unlocked ?? 1) || 1
        const initialHeroHallLevelUnlocked = Number(buildingData?.hero_hall_level_unlocked ?? staticBuildingData.hero_hall_level_unlocked ?? 1) || 1
        if (buildingData) {
          // Only update if still not editing
          if (!isEditingRef.current) {
            setDynamicData({
              ...buildingData,
              levels: resolvedLevels,
            })
            setEditingLevels(
              isTroopBuilding
                ? normalizeTroopLevels(initialLevelCount, resolvedLevels)
                : isSpellBuilding
                  ? normalizeSpellLevels(initialLevelCount, resolvedLevels)
                : isHeroBuilding
                  ? normalizeHeroLevels(initialBuildingLevelCount, resolvedLevels)
                  : normalizeBuildingLevels(initialBuildingLevelCount, resolvedLevels)
            )
            setEditingBuildingCount(initialLevelCount)
            setEditingLevelCount(initialBuildingLevelCount)
            setEditingBarracksLevelUnlocked(initialBarracksLevelUnlocked)
            setEditingSpellFactoryLevelUnlocked(initialSpellFactoryLevelUnlocked)
            setEditingHeroHallLevelUnlocked(initialHeroHallLevelUnlocked)
            setEditingCopyUnlocks(
              isTroopLikeBuilding
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
            const draftCount = isTroopLikeBuilding
              ? normalizeTroopLevelCount(draftLevels, staticBuildingData.buildings_unlocked || 0)
              : isHeroBuilding
                ? 1
                : staticBuildingData.buildings_unlocked || 0
            const draftLevelCount = isTroopLikeBuilding
              ? draftCount
              : isHeroBuilding
                ? normalizeTroopLevelCount(draftLevels, draftLevels.length || 1)
                : draftLevels.length
            const draftUnlocks = isTroopLikeBuilding
              ? createCopyUnlocks(1, 1)
              : normalizeCopyUnlocks(
                  draftCount,
                  staticBuildingData.copy_unlocks || [],
                  staticBuildingData.starts_unlocked ?? true,
                )

            setDynamicData({
              buildings_unlocked: draftCount,
              copy_unlocks: draftUnlocks,
              levels: isTroopBuilding
                ? normalizeTroopLevels(draftCount, draftLevels)
                : isSpellBuilding
                  ? normalizeSpellLevels(draftCount, draftLevels)
                  : isHeroBuilding
                    ? normalizeHeroLevels(draftLevelCount, draftLevels)
                    : normalizeBuildingLevels(draftLevelCount, draftLevels),
              ...(isTroopBuilding
                ? (isDarkTroopBuilding
                    ? { dark_barracks_level_unlocked: Number(staticBuildingData.dark_barracks_level_unlocked ?? 1) || 1 }
                    : { barracks_level_unlocked: Number(staticBuildingData.barracks_level_unlocked ?? 1) || 1 })
                : {}),
              ...(isSpellBuilding ? { spell_factory_level_unlocked: Number(staticBuildingData.spell_factory_level_unlocked ?? 1) || 1 } : {}),
              ...(isHeroBuilding ? { hero_hall_level_unlocked: Number(staticBuildingData.hero_hall_level_unlocked ?? 1) || 1 } : {}),
            })
            setEditingLevels(
              isTroopBuilding
                ? normalizeTroopLevels(draftCount, draftLevels)
                : isSpellBuilding
                  ? normalizeSpellLevels(draftCount, draftLevels)
                  : isHeroBuilding
                    ? normalizeHeroLevels(draftLevelCount, draftLevels)
                    : normalizeBuildingLevels(draftLevelCount, draftLevels)
            )
            setEditingBuildingCount(draftCount)
            setEditingLevelCount(draftLevelCount)
            setEditingBarracksLevelUnlocked(
              isDarkTroopBuilding
                ? Number(staticBuildingData.dark_barracks_level_unlocked ?? 1) || 1
                : Number(staticBuildingData.barracks_level_unlocked ?? 1) || 1
            )
            setEditingSpellFactoryLevelUnlocked(Number(staticBuildingData.spell_factory_level_unlocked ?? 1) || 1)
            setEditingHeroHallLevelUnlocked(Number(staticBuildingData.hero_hall_level_unlocked ?? 1) || 1)
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
  }, [townhallLevel, buildingId, isDarkTroopBuilding])

  const isLevelMatching = (staticLevel, dynamicLevel) => {
    if (!staticLevel || !dynamicLevel) return false
    return (
      staticLevel.cost === dynamicLevel.cost &&
      staticLevel.time === dynamicLevel.time &&
      staticLevel.resource === dynamicLevel.resource &&
      Number(staticLevel.lab_level_unlocked ?? 0) === Number(dynamicLevel.lab_level_unlocked ?? 0) &&
      Number(staticLevel.hero_hall_level_unlocked ?? 0) === Number(dynamicLevel.hero_hall_level_unlocked ?? 0)
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
    if (isSpellBuilding) {
      setEditingLevels((current) => normalizeSpellLevels(nextCount, current))
    }
  }

  const handleEditingLevelCountChange = (value) => {
    const nextCount = Math.max(0, parseInt(value) || 0)
    setEditingLevelCount(nextCount)
    if (isHeroBuilding) {
      setEditingLevels((current) => normalizeHeroLevels(nextCount, current))
    } else if (!isTroopLikeBuilding) {
      setEditingLevels((current) => normalizeBuildingLevels(nextCount, current))
    }
  }

  const handleEditingBarracksLevelUnlockedChange = (value) => {
    setEditingBarracksLevelUnlocked(Math.max(1, parseInt(value) || 1))
  }

  const handleEditingSpellFactoryLevelUnlockedChange = (value) => {
    setEditingSpellFactoryLevelUnlocked(Math.max(1, parseInt(value) || 1))
  }

  const handleEditingHeroHallLevelUnlockedChange = (value) => {
    setEditingHeroHallLevelUnlocked(Math.max(1, parseInt(value) || 1))
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
      // Fetch inherited townhall data so new higher levels keep previous buildings
      const selectedTownhall = parseInt(townhallLevel)
      const { data: rows, error: fetchError } = await supabase
        .from('townhall_buildings')
        .select('*')
        .lte('townhall_level', selectedTownhall)
        .order('townhall_level', { ascending: true })

      if (fetchError) throw fetchError

      const inheritedTownhallData = getTownhallSnapshotForLevel(rows || [], selectedTownhall, getDefaultBuildingData(selectedTownhall))

      const categoryField = getBuildingCategory(buildingId)
      const normalizedLevels = isTroopBuilding
        ? normalizeTroopLevels(editingBuildingCount, editingLevels)
        : isSpellBuilding
          ? normalizeSpellLevels(editingBuildingCount, editingLevels)
        : isHeroBuilding
          ? normalizeHeroLevels(editingLevelCount, editingLevels)
          : normalizeBuildingLevels(editingLevelCount, editingLevels)
      const normalizedLevelsWithWallResources = isWallBuilding
        ? normalizedLevels.map((levelInfo) => Number(levelInfo.level || 0) >= 5
          ? {
            ...levelInfo,
            resource: 'gold',
            resource_options: ['gold', 'elixir'],
          }
          : {
            ...levelInfo,
            resource_options: Array.isArray(levelInfo.resource_options) ? [...levelInfo.resource_options] : [],
          })
        : normalizedLevels
      const troopLevelCount = isTroopLikeBuilding
        ? normalizedLevelsWithWallResources.length
        : isHeroBuilding
          ? 1
          : editingBuildingCount
      const updatedBuildingData = {
        buildings_unlocked: troopLevelCount,
        starts_unlocked: editingCopyUnlocks[0] ?? true,
        copy_unlocks: isTroopLikeBuilding ? createCopyUnlocks(1, 1) : normalizeCopyUnlocks(editingBuildingCount, editingCopyUnlocks, true),
        levels: normalizedLevelsWithWallResources,
        ...(isTroopBuilding
          ? (isDarkTroopBuilding
              ? { dark_barracks_level_unlocked: editingBarracksLevelUnlocked }
              : { barracks_level_unlocked: editingBarracksLevelUnlocked })
          : {}),
        ...(isSpellBuilding ? { spell_factory_level_unlocked: editingSpellFactoryLevelUnlocked } : {}),
        ...(isHeroBuilding ? { hero_hall_level_unlocked: editingHeroHallLevelUnlocked } : {}),
      }

      // Build complete record with the correct category updated
      const recordToSave = {
        townhall_level: selectedTownhall,
        defences: inheritedTownhallData.defences || [],
        traps: inheritedTownhallData.traps || [],
        army: inheritedTownhallData.army || [],
        resources: inheritedTownhallData.resources || [],
        troops: inheritedTownhallData.troops || [],
        spells: inheritedTownhallData.spells || [],
        dark_troops: inheritedTownhallData.dark_troops || [],
        heroes: inheritedTownhallData.heroes || [],
        walls: inheritedTownhallData.walls || {},
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
        copy_unlocks: isTroopLikeBuilding ? createCopyUnlocks(1, 1) : normalizeCopyUnlocks(editingBuildingCount, editingCopyUnlocks, true),
        levels: normalizedLevelsWithWallResources,
        ...(isTroopBuilding
          ? (isDarkTroopBuilding
              ? { dark_barracks_level_unlocked: editingBarracksLevelUnlocked }
              : { barracks_level_unlocked: editingBarracksLevelUnlocked })
          : {}),
        ...(isSpellBuilding ? { spell_factory_level_unlocked: editingSpellFactoryLevelUnlocked } : {}),
        ...(isHeroBuilding ? { hero_hall_level_unlocked: editingHeroHallLevelUnlocked } : {}),
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
  const troopCountLabel = isTroopLikeBuilding ? 'Level Count' : 'Count'
  const levelCountLabel = 'Level Count'
  const troopBarracksLevel = isTroopBuilding
    ? Number(
      isDarkTroopBuilding
        ? (dynamicData.dark_barracks_level_unlocked || staticData.dark_barracks_level_unlocked || 1)
        : (dynamicData.barracks_level_unlocked || staticData.barracks_level_unlocked || 1)
    )
    : 0
  const spellFactoryUnlockLevel = isSpellBuilding
    ? Number(dynamicData.spell_factory_level_unlocked || staticData.spell_factory_level_unlocked || 1)
    : 0
  const heroHallUnlockLevel = isHeroBuilding
    ? Number(dynamicData.hero_hall_level_unlocked || staticData.hero_hall_level_unlocked || 1)
    : 0

  // Detect if there are changes
  const hasChanges = () => {
    if (editingBuildingCount !== (dynamicData.buildings_unlocked || 0)) {
      return true
    }
    if (!isTroopLikeBuilding && editingLevelCount !== (dynamicData.levels || []).length) {
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
    if (isTroopBuilding && Number(editingBarracksLevelUnlocked) !== Number(isDarkTroopBuilding ? (dynamicData.dark_barracks_level_unlocked || 1) : (dynamicData.barracks_level_unlocked || 1))) {
      return true
    }
    if (isSpellBuilding && Number(editingSpellFactoryLevelUnlocked) !== Number(dynamicData.spell_factory_level_unlocked || 1)) {
      return true
    }
    if (isHeroBuilding && Number(editingHeroHallLevelUnlocked) !== Number(dynamicData.hero_hall_level_unlocked || 1)) {
      return true
    }
    return editingLevels.some((level, idx) => {
      const original = (dynamicData.levels || [])[idx]
      if (!original) return true
      return (
        level.cost !== original.cost ||
        level.time !== original.time ||
        level.resource !== original.resource ||
        Number(level.lab_level_unlocked ?? 0) !== Number(original.lab_level_unlocked ?? 0) ||
        Number(level.hero_hall_level_unlocked ?? 0) !== Number(original.hero_hall_level_unlocked ?? 0)
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
                if (defence.id === 'bomb') return `27_${maxLevel}`
                if (defence.id === 'giant_bomb') return `28_${maxLevel}`
                if (defence.id === 'air_bomb') return `26_${maxLevel}`
                if (defence.id === 'seeking_air_mine') return `29_${maxLevel}`
                if (defence.id === 'spring_trap') return `30_${maxLevel}`
                if (defence.id === 'mortar') return `23_${maxLevel}`
                if (defence.id === 'wizard_tower') return `24_${maxLevel}`
                if (defence.id === 'air_defense') return `14_${maxLevel}`
                if (defence.id === 'air_sweeper') return `15_${maxLevel}`
                if (defence.id === 'hidden_tesla') return `21_${maxLevel}`
                if (defence.id === 'lab') return `13_${maxLevel}`
                if (defence.id === 'hero_hall') return `202_${maxLevel}`
                if (defence.id === 'army_camp') return `10_${maxLevel}`
                if (defence.id === 'spell_factory') return `11_${maxLevel}`
                if (defence.id === 'barracks') return `8_${maxLevel}`
                if (defence.id === 'dark_barracks') return `9_${maxLevel}`
                if (defence.id === 'clan_castle') return `19_${maxLevel}`
                if (defence.id === 'walls') return `60_${maxLevel}`
                if (defence.id === 'gold_mine') return `2_${maxLevel}`
                if (defence.id === 'elixir_collector') return `3_${maxLevel}`
                if (defence.id === 'dark_elixir_driller') return `4_${maxLevel}`
                if (defence.id === 'gold_storage') return `5_${maxLevel}`
                if (defence.id === 'elixir_storage') return `6_${maxLevel}`
                if (defence.id === 'dark_elixir_storage') return `7_${maxLevel}`
                if (defence.id === 'barbarian') return `31_${maxLevel}`
                if (defence.id === 'archer') return `32_${maxLevel}`
                if (defence.id === 'giant') return `33_${maxLevel}`
                if (defence.id === 'goblin') return `34_${maxLevel}`
                if (defence.id === 'wall_breaker') return `35_${maxLevel}`
                if (defence.id === 'balloon') return `36_${maxLevel}`
                if (defence.id === 'wizard') return `37_${maxLevel}`
                if (defence.id === 'healer') return `38_${maxLevel}`
                if (defence.id === 'dragon') return `39_${maxLevel}`
                if (defence.id === 'minion') return `53_${maxLevel}`
                if (defence.id === 'lightning_spell') return '43'
                if (defence.id === 'healing_spell') return '44'
                if (defence.id === 'rage_spell') return '45'
                if (defence.id === 'barbarian_king') return '61'
                if (defence.id === 'archer_queen') return '62'
                if (defence.id === 'grand_warden') return '63'
                if (defence.id === 'royal_champion') return '122'
                if (defence.id === 'minion_prince') return '208'
                if (defence.id === 'dragon_duke') return '260'
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
                {!isHeroBuilding && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '8px' }}>
                    {troopCountLabel}: {staticData.buildings_unlocked || 0}
                  </span>
                )}
                {!isTroopLikeBuilding && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '8px' }}>
                    {levelCountLabel}: {currentStaticLevel.length}
                  </span>
                )}
                {isTroopBuilding && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '8px' }}>
                    {isDarkTroopBuilding ? 'Dark Barracks' : 'Barracks'} level needed: {troopBarracksLevel}
                  </span>
                )}
                {isSpellBuilding && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '8px' }}>
                    Spell Factory level needed: {spellFactoryUnlockLevel}
                  </span>
                )}
                {isHeroBuilding && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '8px' }}>
                    Hero Hall level needed: {heroHallUnlockLevel}
                  </span>
                )}
              </div>
              <div className={styles.levelsList}>
                {currentStaticLevel.map((level) => (
                  <div key={`static-${level.level}`} className={styles.levelRow}>
                    <div className={styles.resourceIconsWrap}>
                      {(() => {
                        const resourceOptions = getLevelResourceOptions(level, { isWallLevel: isWallBuilding })
                        const usesDualGoldElixirIcon = resourceOptions.includes('gold') && resourceOptions.includes('elixir')

                        if (usesDualGoldElixirIcon) {
                          return (
                            <img
                              src="/src/assets/magic-items/goldelxir.png"
                              alt="Gold or Elixir"
                              className={styles.resourceIcon}
                            />
                          )
                        }

                        return resourceOptions.map((resourceKey) => (
                          <span key={`static-${level.level}-${resourceKey}`} className={styles.resourceOption}>
                            {RESOURCE_ICONS[resourceKey] ? (
                              <img
                                src={RESOURCE_ICONS[resourceKey]}
                                alt={resourceKey}
                                className={styles.resourceIcon}
                              />
                            ) : null}
                          </span>
                        ))
                      })()}
                    </div>
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
                {!isEditing && !isHeroBuilding && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '8px' }}>
                    {troopCountLabel}: {dynamicData.buildings_unlocked || 0}
                  </span>
                )}
                {isEditing && (
                  <>
                    {!isHeroBuilding && (
                      <>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{troopCountLabel}:</span>
                        <input
                          type="number"
                          value={editingBuildingCount}
                          onChange={(e) => handleEditingBuildingCountChange(e.target.value)}
                          min="0"
                          className={styles.headingCountInput}
                        />
                      </>
                    )}
                    {!isTroopLikeBuilding && (
                      <>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '12px' }}>{levelCountLabel}:</span>
                        <input
                          type="number"
                          value={editingLevelCount}
                          onChange={(e) => handleEditingLevelCountChange(e.target.value)}
                          min="0"
                          className={styles.headingCountInput}
                        />
                      </>
                    )}
                    {isTroopBuilding && (isDarkTroopBuilding ? Number(townhallLevel) >= 7 : Number(townhallLevel) >= 3) && (
                      <>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '12px' }}>{isDarkTroopBuilding ? 'Dark Barracks level:' : 'Barracks level:'}</span>
                        <input
                          type="number"
                          value={editingBarracksLevelUnlocked}
                          onChange={(e) => handleEditingBarracksLevelUnlockedChange(e.target.value)}
                          min="1"
                          className={styles.headingCountInput}
                        />
                      </>
                    )}
                    {isSpellBuilding && Number(townhallLevel) >= 5 && (
                      <>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '12px' }}>Spell Factory level:</span>
                        <input
                          type="number"
                          value={editingSpellFactoryLevelUnlocked}
                          onChange={(e) => handleEditingSpellFactoryLevelUnlockedChange(e.target.value)}
                          min="1"
                          className={styles.headingCountInput}
                        />
                      </>
                    )}
                    {isHeroBuilding && Number(townhallLevel) >= 4 && (
                      <>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '12px' }}>Hero Hall level:</span>
                        <input
                          type="number"
                          value={editingHeroHallLevelUnlocked}
                          onChange={(e) => handleEditingHeroHallLevelUnlockedChange(e.target.value)}
                          min="1"
                          className={styles.headingCountInput}
                        />
                      </>
                    )}
                  </>
                )}
                {isTroopBuilding && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '8px' }}>
                    {isDarkTroopBuilding ? 'Dark Barracks' : 'Barracks'} level needed: {troopBarracksLevel}
                  </span>
                )}
                {isSpellBuilding && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '8px' }}>
                    Spell Factory level needed: {spellFactoryUnlockLevel}
                  </span>
                )}
                {isHeroBuilding && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '8px' }}>
                    Hero Hall level needed: {heroHallUnlockLevel}
                  </span>
                )}
                {!isTroopLikeBuilding && !isEditing && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '8px' }}>
                    {levelCountLabel}: {dynamicData.levels?.length || 0}
                  </span>
                )}
              </div>
              {isEditing && !isWallBuilding && !isTroopLikeBuilding && !isHeroBuilding && editingBuildingCount > 0 && (
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
                        <div className={styles.resourceIconsWrap}>
                          {(() => {
                            const resourceOptions = getLevelResourceOptions(level, { isWallLevel: isWallBuilding })
                            const usesDualGoldElixirIcon = resourceOptions.includes('gold') && resourceOptions.includes('elixir')

                            if (usesDualGoldElixirIcon) {
                              return (
                                <img
                                  src="/src/assets/magic-items/goldelxir.png"
                                  alt="Gold or Elixir"
                                  className={styles.resourceIcon}
                                />
                              )
                            }

                            return resourceOptions.map((resourceKey) => (
                              <span key={`dynamic-${level.level}-${resourceKey}`} className={styles.resourceOption}>
                                {RESOURCE_ICONS[resourceKey] ? (
                                  <img
                                    src={RESOURCE_ICONS[resourceKey]}
                                    alt={resourceKey}
                                    className={styles.resourceIcon}
                                  />
                                ) : null}
                              </span>
                            ))
                          })()}
                        </div>
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
                      <div className={styles.resourceIconsWrap}>
                        {(() => {
                          const resourceOptions = getLevelResourceOptions(level, { isWallLevel: isWallBuilding })
                          const usesDualGoldElixirIcon = resourceOptions.includes('gold') && resourceOptions.includes('elixir')

                          if (usesDualGoldElixirIcon) {
                            return (
                              <img
                                src="/src/assets/magic-items/goldelxir.png"
                                alt="Gold or Elixir"
                                className={styles.resourceIcon}
                              />
                            )
                          }

                          return resourceOptions.map((resourceKey) => (
                            <span key={`edit-${level.level}-${resourceKey}`} className={styles.resourceOption}>
                              {RESOURCE_ICONS[resourceKey] ? (
                                <img
                                  src={RESOURCE_ICONS[resourceKey]}
                                  alt={resourceKey}
                                  className={styles.resourceIcon}
                                />
                              ) : null}
                            </span>
                          ))
                        })()}
                      </div>
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
                      {isWallBuilding && Number(level.level || 0) >= 5 ? (
                        <span className={styles.wallDualResourceLabel}>Gold or Elixir</span>
                      ) : (
                        <select
                          value={level.resource}
                          onChange={(e) => handleEditLevel(idx, 'resource', e.target.value)}
                          className={styles.resourceSelect}
                        >
                          <option value="gold">Gold</option>
                          <option value="elixir">Elixir</option>
                          <option value="dark_elixir">Dark Elixir</option>
                        </select>
                      )}
                      <button
                        onClick={() => openTimeModal(idx)}
                        className={styles.timeModalBtn}
                        title="Click to set time"
                      >
                        {level.time}
                      </button>
                      {(isTroopBuilding || isSpellBuilding) && Number(townhallLevel) >= 3 && (
                        <div className={styles.troopLabGroup}>
                          <span className={styles.troopLabLabel}>Lab:</span>
                          <input
                            type="number"
                            value={level.lab_level_unlocked ?? 0}
                            onChange={(e) => handleEditLevel(idx, 'lab_level_unlocked', Math.max(0, parseInt(e.target.value) || 0))}
                            min="0"
                            className={`${styles.headingCountInput} ${styles.troopLabInput}`}
                          />
                        </div>
                      )}
                      {isHeroBuilding && Number(townhallLevel) >= 4 && (
                        <div className={styles.troopLabGroup}>
                          <span className={styles.troopLabLabel}>Hero Hall:</span>
                          <input
                            type="number"
                            value={level.hero_hall_level_unlocked ?? 0}
                            onChange={(e) => handleEditLevel(idx, 'hero_hall_level_unlocked', Math.max(0, parseInt(e.target.value) || 0))}
                            min="0"
                            className={`${styles.headingCountInput} ${styles.troopLabInput}`}
                          />
                        </div>
                      )}
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
