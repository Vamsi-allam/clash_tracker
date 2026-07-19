import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import builderBoostImg from '../assets/magic-items/builder-boost.png'
import researchBoostImg from '../assets/magic-items/research-boost.png'
import Header from '../components/Header'
import ToastNotification from '../components/ToastNotification'
import { supabase } from '../supabaseClient'
import { getTownhallSnapshotForLevel } from '../utils/townhallSnapshot'
import { BUILDING_SECTIONS, TROOP_BARRACKS_REQUIREMENTS, TROOP_BUILDING_IDS, DARK_TROOP_BARRACKS_REQUIREMENTS, DARK_TROOP_BUILDING_IDS, SIEGE_WORKSHOP_REQUIREMENTS, SIEGE_BUILDING_IDS, PET_HOUSE_REQUIREMENTS, PET_BUILDING_IDS, SPELL_FACTORY_REQUIREMENTS, DARK_SPELL_FACTORY_REQUIREMENTS, SPELL_BUILDING_IDS, DARK_SPELL_BUILDING_IDS, HERO_BUILDING_IDS, EQUIPMENT_BUILDING_IDS, getDefaultBuildingData } from '../data/buildings'

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

const formatCost = (value) => {
  const numberValue = Number(value || 0)
  if (numberValue >= 1000000) {
    return `${Number((numberValue / 1000000).toFixed(2)).toString().replace(/\.0+$/, '')}M`
  }
  if (numberValue >= 1000) {
    return `${Number((numberValue / 1000).toFixed(2)).toString().replace(/\.0+$/, '')}K`
  }
  return `${numberValue}`
}

const normalizeResourceId = (resourceId) => {
  const raw = String(resourceId || '').trim().toLowerCase()
  const cleaned = raw.replace(/[_\- ]/g, '')
  if (cleaned.includes('shiny')) return 'shiny_ore'
  if (cleaned.includes('glowy')) return 'glowy_ore'
  if (cleaned.includes('star') || cleaned.includes('starry')) return 'starry_ore'
  if (cleaned.includes('darkelixir') || cleaned === 'de' || cleaned === 'dark_elixir') return 'dark_elixir'
  if (cleaned.includes('elixir')) return 'elixir'
  if (cleaned.includes('gold')) return 'gold'
  // fallback to original cleaned id
  return cleaned
}

const normalizeEquipmentType = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  return normalized === 'passive' ? 'passive' : 'active'
}

const normalizeEquipmentRarity = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  return normalized === 'epic' ? 'epic' : 'common'
}

const equipmentResourceIcons = {
  glowy_ore: '/src/assets/magic-items/ore-glowy.png',
  shiny_ore: '/src/assets/magic-items/ore-shiny.png',
  starry_ore: '/src/assets/magic-items/ore-starry.png',
}

const equipmentResourceOrder = ['shiny_ore', 'glowy_ore', 'starry_ore']

const parseTimeStringToSeconds = (timeString) => {
  if (!timeString || typeof timeString !== 'string') return 0

  let totalSeconds = 0
  const timeLower = timeString.toLowerCase().trim()

  const daysMatch = timeLower.match(/(\d+)\s*d(?:ays?)?/
  )
  if (daysMatch) totalSeconds += parseInt(daysMatch[1]) * 86400

  const hoursMatch = timeLower.match(/(\d+)\s*h(?:r|ours?)?/)
  if (hoursMatch) totalSeconds += parseInt(hoursMatch[1]) * 3600

  const minutesMatch = timeLower.match(/(\d+)\s*m(?:in|inutes?)?/)
  if (minutesMatch) totalSeconds += parseInt(minutesMatch[1]) * 60

  const secondsMatch = timeLower.match(/(\d+)\s*s(?:ec|econds?)?/)
  if (secondsMatch) totalSeconds += parseInt(secondsMatch[1])

  return totalSeconds
}

const formatUpgradeClock = (remainingSeconds) => {
  const safeSeconds = Math.max(0, Math.ceil(Number(remainingSeconds || 0)))
  const days = Math.floor(safeSeconds / 86400)
  const hours = Math.floor((safeSeconds % 86400) / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const seconds = safeSeconds % 60

  return [
    days ? `${days}d` : '',
    hours ? `${hours}h` : '',
    minutes ? `${minutes}m` : '',
    !days && !hours && !minutes ? `${seconds}s` : seconds ? `${seconds}s` : '',
  ].filter(Boolean).join(' ')
}

const splitDurationSeconds = (totalSeconds) => {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0))
  const days = Math.floor(safeSeconds / 86400)
  const hours = Math.floor((safeSeconds % 86400) / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const seconds = safeSeconds % 60

  return { days, hours, minutes, seconds }
}

const getMaxAllowedRemainingSeconds = (upgrade) => {
  const startedAt = Number(upgrade?.startedAt || 0)
  const totalDurationSeconds = Number(upgrade?.durationSeconds || 0)
  if (!startedAt || !totalDurationSeconds) return 0

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
  return Math.max(0, totalDurationSeconds - elapsedSeconds)
}

const clampDurationPartsToMax = (parts, maxSeconds) => {
  const limitedMax = Math.max(0, Math.floor(Number(maxSeconds) || 0))
  const currentDays = Math.max(0, Math.floor(Number(parts?.days) || 0))
  const currentHours = Math.max(0, Math.floor(Number(parts?.hours) || 0))
  const currentMinutes = Math.max(0, Math.floor(Number(parts?.minutes) || 0))
  const currentSeconds = Math.max(0, Math.floor(Number(parts?.seconds) || 0))

  let remaining = limitedMax
  const days = Math.min(currentDays, Math.floor(remaining / 86400))
  remaining -= days * 86400
  const hours = Math.min(currentHours, Math.floor(remaining / 3600))
  remaining -= hours * 3600
  const minutes = Math.min(currentMinutes, Math.floor(remaining / 60))
  remaining -= minutes * 60
  const seconds = Math.min(currentSeconds, remaining)

  return { days, hours, minutes, seconds }
}

const getStructureRowCount = (building, currentLevels = []) => {
  const buildingId = String(building?.id || '')
  if (TROOP_BUILDING_IDS.has(buildingId) || DARK_TROOP_BUILDING_IDS.has(buildingId) || SIEGE_BUILDING_IDS.has(buildingId) || PET_BUILDING_IDS.has(buildingId) || SPELL_BUILDING_IDS.has(buildingId) || EQUIPMENT_BUILDING_IDS.has(buildingId)) return 1
  if (buildingId === 'builder_hut') {
    return Math.max(1, Number(building?.buildings_unlocked) || 0)
  }

  const unlockedCount = Number(building?.buildings_unlocked) || 0
  const savedCount = Array.isArray(currentLevels) ? currentLevels.length : 0
  return Math.max(1, unlockedCount, savedCount)
}

const normalizeBuilderHutCount = (value) => Math.max(0, Math.min(5, Number(value) || 0))

const applyBuilderHutCountToSnapshot = (snapshot = {}, builderHutCount = 0) => {
  const defences = Array.isArray(snapshot?.defences) ? snapshot.defences : []
  if (defences.length === 0) return snapshot

  const normalizedCount = normalizeBuilderHutCount(builderHutCount)
  let hasBuilderHut = false

  const nextDefences = defences.map((building) => {
    if (String(building?.id || '') !== 'builder_hut') return building
    hasBuilderHut = true

    return {
      ...building,
      buildings_unlocked: normalizedCount,
      copy_unlocks: Array.from({ length: normalizedCount }, () => true),
    }
  })

  if (!hasBuilderHut) return snapshot

  return {
    ...snapshot,
    defences: nextDefences,
  }
}

const getTroopBarracksRequirement = (building) => {
  const fallbackRequirement = TROOP_BARRACKS_REQUIREMENTS[String(building?.id || '').toLowerCase()] || 1
  return Math.max(fallbackRequirement, Number(building?.barracks_level_unlocked) || 0)
}

const getDarkTroopBarracksRequirement = (building) => {
  const fallbackRequirement = DARK_TROOP_BARRACKS_REQUIREMENTS[String(building?.id || '').toLowerCase()] || 1
  return Math.max(fallbackRequirement, Number(building?.dark_barracks_level_unlocked) || 0)
}

const getSiegeWorkshopRequirement = (building) => {
  const fallbackRequirement = SIEGE_WORKSHOP_REQUIREMENTS[String(building?.id || '').toLowerCase()] || 1
  return Math.max(fallbackRequirement, Number(building?.workshop_level_unlocked) || 0)
}

const getPetHouseRequirement = (building) => {
  const fallbackRequirement = PET_HOUSE_REQUIREMENTS[String(building?.id || '').toLowerCase()] || 1
  return Math.max(fallbackRequirement, Number(building?.pet_house_level_unlocked) || 0)
}

const getHeroHallUnlockRequirement = (building) => {
  return Math.max(1, Number(building?.hero_hall_level_unlocked) || 0)
}

const getSpellFactoryRequirement = (building) => {
  const fallbackRequirement = SPELL_FACTORY_REQUIREMENTS[String(building?.id || '').toLowerCase()] || 1
  const configuredRequirement = Number(building?.spell_factory_level_unlocked)
  if (Number.isFinite(configuredRequirement) && configuredRequirement > 0) {
    return configuredRequirement
  }
  return fallbackRequirement
}

const getDarkSpellFactoryRequirement = (building) => {
  const fallbackRequirement = DARK_SPELL_FACTORY_REQUIREMENTS[String(building?.id || '').toLowerCase()] || 1
  const configuredRequirement = Number(building?.dark_spell_factory_level_unlocked)
  if (Number.isFinite(configuredRequirement) && configuredRequirement > 0) {
    return configuredRequirement
  }
  return fallbackRequirement
}

const getCurrentBarracksLevel = (structureLevels = {}) => {
  const barracksLevels = Array.isArray(structureLevels?.barracks) ? structureLevels.barracks : []
  return barracksLevels.reduce((highest, value) => Math.max(highest, Number(value) || 0), 0)
}

const getCurrentDarkBarracksLevel = (structureLevels = {}) => {
  const darkBarracksLevels = Array.isArray(structureLevels?.dark_barracks) ? structureLevels.dark_barracks : []
  return darkBarracksLevels.reduce((highest, value) => Math.max(highest, Number(value) || 0), 0)
}

const getCurrentLabLevel = (structureLevels = {}) => {
  const labLevels = Array.isArray(structureLevels?.lab) ? structureLevels.lab : []
  return labLevels.reduce((highest, value) => Math.max(highest, Number(value) || 0), 0)
}

const getCurrentWorkshopLevel = (structureLevels = {}) => {
  const workshopLevels = Array.isArray(structureLevels?.workshop) ? structureLevels.workshop : []
  return workshopLevels.reduce((highest, value) => Math.max(highest, Number(value) || 0), 0)
}

const getCurrentHeroHallLevel = (structureLevels = {}) => {
  const heroHallLevels = Array.isArray(structureLevels?.hero_hall) ? structureLevels.hero_hall : []
  return heroHallLevels.reduce((highest, value) => Math.max(highest, Number(value) || 0), 0)
}

const getCurrentSpellFactoryLevel = (structureLevels = {}) => {
  const spellFactoryLevels = Array.isArray(structureLevels?.spell_factory) ? structureLevels.spell_factory : []
  return spellFactoryLevels.reduce((highest, value) => Math.max(highest, Number(value) || 0), 0)
}

const getCurrentDarkSpellFactoryLevel = (structureLevels = {}) => {
  const darkSpellFactoryLevels = Array.isArray(structureLevels?.dark_spell_factory) ? structureLevels.dark_spell_factory : []
  return darkSpellFactoryLevels.reduce((highest, value) => Math.max(highest, Number(value) || 0), 0)
}

const getCurrentBlacksmithLevel = (structureLevels = {}) => {
  const blacksmithLevels = Array.isArray(structureLevels?.blacksmith) ? structureLevels.blacksmith : []
  return blacksmithLevels.reduce((highest, value) => Math.max(highest, Number(value) || 0), 0)
}

const getCurrentPetHouseLevel = (structureLevels = {}) => {
  const petHouseLevels = Array.isArray(structureLevels?.pet_house) ? structureLevels.pet_house : []
  return petHouseLevels.reduce((highest, value) => Math.max(highest, Number(value) || 0), 0)
}

const getAllowedBuildingRowIdsForSnapshot = (snapshot = {}, builderHutCount = 0) => {
  const snapshotWithBuilderHutCount = applyBuilderHutCountToSnapshot(snapshot, builderHutCount)
  const rowIds = new Set()

  ;['defences', 'traps', 'army', 'resources', 'troops', 'spells', 'dark_troops', 'sieges', 'heroes', 'pets', 'equipment'].forEach((categoryKey) => {
    const category = Array.isArray(snapshotWithBuilderHutCount?.[categoryKey]) ? snapshotWithBuilderHutCount[categoryKey] : []

    category.forEach((building) => {
      const buildingId = String(building?.id || '').trim()
      if (!buildingId) return

      const rowCount = Math.max(
        1,
        Number(building?.buildings_unlocked || 0),
        Array.isArray(building?.copy_unlocks) ? building.copy_unlocks.length : 0,
      )

      for (let index = 0; index < rowCount; index += 1) {
        rowIds.add(`${buildingId}-${index + 1}`)
      }
    })
  })

  if (snapshotWithBuilderHutCount?.walls && typeof snapshotWithBuilderHutCount.walls === 'object') {
    const wallLevels = Array.isArray(snapshotWithBuilderHutCount.walls.levels) ? snapshotWithBuilderHutCount.walls.levels : []
    wallLevels.forEach((level) => {
      const levelNumber = Number(level?.level || 0)
      if (levelNumber > 0) {
        rowIds.add(`walls-${levelNumber}`)
      }
    })
  }

  return rowIds
}

const syncVillageBuildingRowsToTownhall = async (villageId, townhallLevel, builderHutCount = 0) => {
  if (!villageId || !townhallLevel) return

  const { data: rows, error } = await supabase
    .from('townhall_buildings')
    .select('*')
    .lte('townhall_level', townhallLevel)
    .order('townhall_level', { ascending: true })

  if (error) throw error

  const snapshot = getTownhallSnapshotForLevel(rows || [], townhallLevel, getDefaultBuildingData(townhallLevel))
  const allowedRowIds = getAllowedBuildingRowIdsForSnapshot(snapshot, builderHutCount)

  const { data: existingRows, error: loadError } = await supabase
    .from('user_village_buildings')
    .select('building_id')
    .eq('village_id', villageId)

  if (loadError) throw loadError

  const idsToDelete = (existingRows || [])
    .map((row) => String(row?.building_id || '').trim())
    .filter((buildingId) => buildingId && !allowedRowIds.has(buildingId))

  if (idsToDelete.length === 0) return

  const { error: deleteError } = await supabase
    .from('user_village_buildings')
    .delete()
    .eq('village_id', villageId)
    .in('building_id', idsToDelete)

  if (deleteError) throw deleteError

  clearTownhallSnapshotCache(villageId)
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

const clearTownhallSnapshotCache = (villageId) => {
  if (typeof window === 'undefined' || !villageId) return

  try {
    const prefix = `clash_tracker_townhall_snapshot:${villageId}:`
    const keysToRemove = []

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach((key) => window.localStorage.removeItem(key))
  } catch {
    // Ignore cache clear failures.
  }
}

const canonImages = import.meta.glob('../assets/Defences/canon/*.png', { eager: true, import: 'default' })
const mortarImages = import.meta.glob('../assets/Defences/mortar/*.png', { eager: true, import: 'default' })
const bombTowerImages = import.meta.glob('../assets/Defences/Bomb_tower/*.png', { eager: true, import: 'default' })
const airDefenseImages = import.meta.glob('../assets/Defences/air_defense/*.png', { eager: true, import: 'default' })
const airSweeperImages = import.meta.glob('../assets/Defences/air_sweeper/*.png', { eager: true, import: 'default' })
const hiddenTeslaImages = import.meta.glob('../assets/Defences/hidden_tesla/*.png', { eager: true, import: 'default' })
const infernoTowerImages = import.meta.glob('../assets/Defences/Inferno_tower/*.png', { eager: true, import: 'default' })
const xBowImages = import.meta.glob('../assets/Defences/x-bow/*.png', { eager: true, import: 'default' })
const eagleArtilleryImages = import.meta.glob('../assets/Defences/Eagle_Artillery/*.png', { eager: true, import: 'default' })
const scattershotImages = import.meta.glob('../assets/Defences/scattershot/*.png', { eager: true, import: 'default' })
const wizardTowerImages = import.meta.glob('../assets/Defences/wizard_tower/*.png', { eager: true, import: 'default' })
const bombImages = import.meta.glob('../assets/Traps/Bomb/*.png', { eager: true, import: 'default' })
const giantBombImages = import.meta.glob('../assets/Traps/Gaint_Bomb/*.png', { eager: true, import: 'default' })
const skeletonTrapImages = import.meta.glob('../assets/Traps/Skeleton_Trap/*.png', { eager: true, import: 'default' })
const airBombImages = import.meta.glob('../assets/Traps/Air_Bomb/*.png', { eager: true, import: 'default' })
const seekingAirMineImages = import.meta.glob('../assets/Traps/Seeking_Air_Mine/*.png', { eager: true, import: 'default' })
const springTrapImages = import.meta.glob('../assets/Traps/Spring_Trap/*.png', { eager: true, import: 'default' })
const tornadoTrapImages = import.meta.glob('../assets/Traps/Tornado_Trap/*.png', { eager: true, import: 'default' })
const archerTowerImages = import.meta.glob('../assets/Defences/Archer_Tower/*.png', { eager: true, import: 'default' })
const builderHutImages = import.meta.glob('../assets/Defences/Builder_hut/*.png', { eager: true, import: 'default' })
const armyCampImages = import.meta.glob('../assets/Army/Army_Camp/*.png', { eager: true, import: 'default' })
const barracksImages = import.meta.glob('../assets/Army/Barracks/*.png', { eager: true, import: 'default' })
const darkBarracksImages = import.meta.glob('../assets/Army/Dark_Barracks/*.png', { eager: true, import: 'default' })
const spellFactoryImages = import.meta.glob('../assets/Army/Spell_Factory/*.png', { eager: true, import: 'default' })
const darkSpellFactoryImages = import.meta.glob('../assets/Army/Dark_Spell_Factory/*.png', { eager: true, import: 'default' })
const workshopImages = import.meta.glob('../assets/Army/Workshop/*.png', { eager: true, import: 'default' })
const clanCastleImages = import.meta.glob('../assets/Army/clan_castle/*.png', { eager: true, import: 'default' })
const labImages = import.meta.glob('../assets/Army/Lab/*.png', { eager: true, import: 'default' })
const blacksmithImages = import.meta.glob('../assets/Army/Blacksmith/*.png', { eager: true, import: 'default' })
const heroHallImages = import.meta.glob('../assets/Army/Hero_Hall/*.png', { eager: true, import: 'default' })
const petHouseImages = import.meta.glob('../assets/Army/Pet_House/*.png', { eager: true, import: 'default' })
const goldMineImages = import.meta.glob('../assets/Resources/goldmine/*.png', { eager: true, import: 'default' })
const elixirCollectorImages = import.meta.glob('../assets/Resources/elixir_collector/*.png', { eager: true, import: 'default' })
const goldStorageImages = import.meta.glob('../assets/Resources/gold_storage/*.png', { eager: true, import: 'default' })
const elixirStorageImages = import.meta.glob('../assets/Resources/elixi_storage/*.png', { eager: true, import: 'default' })
const darkElixirDrillerImages = import.meta.glob('../assets/Resources/dark_elixir_driller/*.png', { eager: true, import: 'default' })
const darkElixirStorageImages = import.meta.glob('../assets/Resources/dark_elixir_storage/*.png', { eager: true, import: 'default' })
const helperHutImages = import.meta.glob('../assets/Resources/Helper_hut/*.png', { eager: true, import: 'default' })
const barbarianTroopImages = import.meta.glob('../assets/Troops/Barbarian/*.png', { eager: true, import: 'default' })
const archerTroopImages = import.meta.glob('../assets/Troops/Archer/*.png', { eager: true, import: 'default' })
const giantTroopImages = import.meta.glob('../assets/Troops/Giant/*.png', { eager: true, import: 'default' })
const goblinTroopImages = import.meta.glob('../assets/Troops/Goblin/*.png', { eager: true, import: 'default' })
const wallBreakerImages = import.meta.glob('../assets/Troops/Wall_breaker/*.png', { eager: true, import: 'default' })
const balloonTroopImages = import.meta.glob('../assets/Troops/Ballon/*.png', { eager: true, import: 'default' })
const wizardTroopImages = import.meta.glob('../assets/Troops/wizard/*.png', { eager: true, import: 'default' })
const healerTroopImages = import.meta.glob('../assets/Troops/Healer/*.png', { eager: true, import: 'default' })
const dragonTroopImages = import.meta.glob('../assets/Troops/Dragon/*.png', { eager: true, import: 'default' })
const pekkaTroopImages = import.meta.glob('../assets/Troops/P.E.K.K.A/*.png', { eager: true, import: 'default' })
const babyDragonTroopImages = import.meta.glob('../assets/Troops/Baby_Dragon/*.png', { eager: true, import: 'default' })
const minerTroopImages = import.meta.glob('../assets/Troops/Miner/*.png', { eager: true, import: 'default' })
const electroDragonTroopImages = import.meta.glob('../assets/Troops/Electro_Dragon/*.png', { eager: true, import: 'default' })
const electroTitanTroopImages = import.meta.glob('../assets/Troops/Electro_Titan/*.png', { eager: true, import: 'default' })
const yetiTroopImages = import.meta.glob('../assets/Troops/Yeti/*.png', { eager: true, import: 'default' })
const dragonRiderTroopImages = import.meta.glob('../assets/Troops/DragonRider/*.png', { eager: true, import: 'default' })
const minionDarkTroopImages = import.meta.glob('../assets/Dark_Troops/Minion/*.png', { eager: true, import: 'default' })
const hogRiderDarkTroopImages = import.meta.glob('../assets/Dark_Troops/Hog_rider/*.png', { eager: true, import: 'default' })
const valkyrieDarkTroopImages = import.meta.glob('../assets/Dark_Troops/Valkyrie/*.png', { eager: true, import: 'default' })
const golemDarkTroopImages = import.meta.glob('../assets/Dark_Troops/Golem/*.png', { eager: true, import: 'default' })
const witchDarkTroopImages = import.meta.glob('../assets/Dark_Troops/Witch/*.png', { eager: true, import: 'default' })
const lavaHoundDarkTroopImages = import.meta.glob('../assets/Dark_Troops/Lava_Hound/*.png', { eager: true, import: 'default' })
const bowlerDarkTroopImages = import.meta.glob('../assets/Dark_Troops/Bowler/*.png', { eager: true, import: 'default' })
const iceGolemDarkTroopImages = import.meta.glob('../assets/Dark_Troops/Ice_Golem/*.png', { eager: true, import: 'default' })
const headHunterDarkTroopImages = import.meta.glob('../assets/Dark_Troops/HeadHunter/*.png', { eager: true, import: 'default' })
const apprenticeWardenDarkTroopImages = import.meta.glob('../assets/Dark_Troops/Apprentice_Warden/*.png', { eager: true, import: 'default' })
const druidDarkTroopImages = import.meta.glob('../assets/Dark_Troops/Druid/*.png', { eager: true, import: 'default' })
const lassiPetImages = import.meta.glob('../assets/pets/L.A.S.S.I/*.png', { eager: true, import: 'default' })
const electroOwlPetImages = import.meta.glob('../assets/pets/Electro_Owl/*.png', { eager: true, import: 'default' })
const mightyYakPetImages = import.meta.glob('../assets/pets/Might_Yak/*.png', { eager: true, import: 'default' })
const unicornPetImages = import.meta.glob('../assets/pets/Unicorn/*.png', { eager: true, import: 'default' })
const wallWreckerSiegeImages = import.meta.glob('../assets/Seige_machines/Wall_Wrecker/*.png', { eager: true, import: 'default' })
const battleBlimpSiegeImages = import.meta.glob('../assets/Seige_machines/Battle_Blimp/*.png', { eager: true, import: 'default' })
const stoneSlammerSiegeImages = import.meta.glob('../assets/Seige_machines/Stone_Slammer/*.png', { eager: true, import: 'default' })
const siegeBarracksSiegeImages = import.meta.glob('../assets/Seige_machines/Siege_Barracks/*.png', { eager: true, import: 'default' })
const logLauncherSiegeImages = import.meta.glob('../assets/Seige_machines/Log_Launcher/*.png', { eager: true, import: 'default' })
const flameFlingerSiegeImages = import.meta.glob('../assets/Seige_machines/Flame_Flinger/*.png', { eager: true, import: 'default' })
const battleDrillSiegeImages = import.meta.glob('../assets/Seige_machines/Battle_Drill/*.png', { eager: true, import: 'default' })
const troopLauncherSiegeImages = import.meta.glob('../assets/Seige_machines/Troop_Launcher/*.png', { eager: true, import: 'default' })
const lightningSpellImages = import.meta.glob('../assets/spells/Lightning_Spell/*.png', { eager: true, import: 'default' })
const healingSpellImages = import.meta.glob('../assets/spells/Healing_Spell/*.png', { eager: true, import: 'default' })
const rageSpellImages = import.meta.glob('../assets/spells/Rage_Spell/*.png', { eager: true, import: 'default' })
const jumpSpellImages = import.meta.glob('../assets/spells/Jump_Spell/*.png', { eager: true, import: 'default' })
const freezeSpellImages = import.meta.glob('../assets/spells/Freeze_Spell/*.png', { eager: true, import: 'default' })
const cloneSpellImages = import.meta.glob('../assets/spells/Clone_Spell/*.png', { eager: true, import: 'default' })
const poisonSpellImages = import.meta.glob('../assets/spells/Poison_Spell/*.png', { eager: true, import: 'default' })
const earthquakeSpellImages = import.meta.glob('../assets/spells/Earthquake_Spell/*.png', { eager: true, import: 'default' })
const hasteSpellImages = import.meta.glob('../assets/spells/Haste_Spell/*.png', { eager: true, import: 'default' })
const skeletonSpellImages = import.meta.glob('../assets/spells/Skeleton_Spell/*.png', { eager: true, import: 'default' })
const batSpellImages = import.meta.glob('../assets/spells/Bat_spell/*.png', { eager: true, import: 'default' })
const iceBlockSpellImages = import.meta.glob('../assets/spells/Ice_Block_spell/*.png', { eager: true, import: 'default' })
const overgrowthSpellImages = import.meta.glob('../assets/spells/Overgrowth_Spell/*.png', { eager: true, import: 'default' })
const invisibilitySpellImages = import.meta.glob('../assets/spells/Invisibility_Spell/*.png', { eager: true, import: 'default' })
const recallSpellImages = import.meta.glob('../assets/spells/Recall_Spell/*.png', { eager: true, import: 'default' })
const barbarianKingImages = import.meta.glob('../assets/Heros/Barbarian_King/*.png', { eager: true, import: 'default' })
const archerQueenImages = import.meta.glob('../assets/Heros/Archer_Queen/*.png', { eager: true, import: 'default' })
const grandWardenImages = import.meta.glob('../assets/Heros/Grand_Warden/*.png', { eager: true, import: 'default' })
const royalChampionImages = import.meta.glob('../assets/Heros/Royal_Champion/*.png', { eager: true, import: 'default' })
const minionPrinceImages = import.meta.glob('../assets/Heros/Minion_Prince/*.png', { eager: true, import: 'default' })
const dragonDukeImages = import.meta.glob('../assets/Heros/Dragon_Duke/*.png', { eager: true, import: 'default' })
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
  const [structureCatalog, setStructureCatalog] = useState({ defences: [], traps: [], army: [], resources: [], troops: [], spells: [], dark_troops: [], sieges: [], heroes: [], pets: [], equipment: [] })
  const [structureLevels, setStructureLevels] = useState({})
  const [structuresLoading, setStructuresLoading] = useState(false)
  const [refreshingVillage, setRefreshingVillage] = useState(false)
  const [activeLoadedTab, setActiveLoadedTab] = useState('defences')
  const [pendingUpgrades, setPendingUpgrades] = useState([])
  const [townhallUpgradeInfo, setTownhallUpgradeInfo] = useState(null)
  const [upgradeClock, setUpgradeClock] = useState(Date.now())
  const [openActionRowKey, setOpenActionRowKey] = useState('')
  const [actionPopup, setActionPopup] = useState({ open: false, title: '', action: '', rowKey: '' })
  const [completeUpgradePopup, setCompleteUpgradePopup] = useState({ open: false, rowKey: '', upgrade: null, magicItem: 'none', saving: false })
  const [modifyUpgradePopup, setModifyUpgradePopup] = useState({ open: false, rowKey: '', upgrade: null, durationParts: { days: 0, hours: 0, minutes: 0, seconds: 0 }, saving: false })
  const [wallUpgradePopup, setWallUpgradePopup] = useState({ open: false, sourceLevel: 0, targetLevel: 0, amount: 1 })
  const [townhallUpgradePopup, setTownhallUpgradePopup] = useState({ open: false, mode: 'complete', durationParts: { days: 0, hours: 0, minutes: 0, seconds: 0 }, magicItem: 'none', saving: false })
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' })
  const activeVillageRef = useRef(null)
  const viewModeRef = useRef('search')
  const builderCountRef = useRef(2)
  const upgradingRowsRef = useRef(false)
  const townhallUpgradingRef = useRef(false)
  const previousLoadedTabRef = useRef('defences')
  const suppressSnapshotRefreshRef = useRef(false)
  const currentBarracksLevel = getCurrentBarracksLevel(structureLevels)
  const currentDarkBarracksLevel = getCurrentDarkBarracksLevel(structureLevels)
  const currentLabLevel = getCurrentLabLevel(structureLevels)
  const currentSpellFactoryLevel = getCurrentSpellFactoryLevel(structureLevels)
  const currentDarkSpellFactoryLevel = getCurrentDarkSpellFactoryLevel(structureLevels)
  const currentWorkshopLevel = getCurrentWorkshopLevel(structureLevels)
  const currentHeroHallLevel = getCurrentHeroHallLevel(structureLevels)
  const currentBlacksmithLevel = getCurrentBlacksmithLevel(structureLevels)
  const currentPetHouseLevel = getCurrentPetHouseLevel(structureLevels)
  const showTrapsTab = Number(activeVillage?.townhall_level || 0) >= 3
  const showSpellsTab = Number(activeVillage?.townhall_level || 0) >= 5
  const showDarkTroopsTab = Number(activeVillage?.townhall_level || 0) >= 7
  const showSiegesTab = Number(activeVillage?.townhall_level || 0) >= 12
  const showHeroesTab = Number(activeVillage?.townhall_level || 0) >= 4
  const showEquipmentTab = Number(activeVillage?.townhall_level || 0) >= 8
  const showPetsTab = Number(activeVillage?.townhall_level || 0) >= 14
  const showLabAssistBox = Number(activeVillage?.townhall_level || 0) >= 9
  const displayedLoadedTab = !showTrapsTab && activeLoadedTab === 'traps'
    ? 'defences'
    : !showSpellsTab && activeLoadedTab === 'spells'
      ? 'defences'
    : !showDarkTroopsTab && activeLoadedTab === 'dark_troops'
      ? 'defences'
    : !showSiegesTab && activeLoadedTab === 'sieges'
      ? 'defences'
    : !showHeroesTab && activeLoadedTab === 'heroes'
      ? 'defences'
    : !showEquipmentTab && activeLoadedTab === 'equipment'
      ? 'defences'
    : !showPetsTab && activeLoadedTab === 'pets'
      ? 'defences'
      : activeLoadedTab

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

  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity })
  }

  const closeToast = (_, reason) => {
    if (reason === 'clickaway') return
    setToast((current) => ({ ...current, open: false }))
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
        await syncVillageBuildingRowsToTownhall(selectedVillage.id, selectedVillage.townhall_level, selectedBuilderCount)
        await loadTownhallStructures(selectedVillage.townhall_level, selectedVillage.id, selectedBuilderCount)
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
      await syncVillageBuildingRowsToTownhall(data.id, data.townhall_level, selectedBuilderCount)
      await loadTownhallStructures(data.townhall_level, data.id, selectedBuilderCount)
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
    loadTownhallStructures(village.townhall_level, village.id, Math.min(5, Math.max(2, Number(village?.builder_count) || 2)))
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
          const refreshedBuilderCount = Math.min(5, Math.max(2, Number(updatedVillage?.builder_count) || 2))
          await syncVillageBuildingRowsToTownhall(updatedVillage.id, updatedVillage.townhall_level, refreshedBuilderCount)
          await loadTownhallStructures(updatedVillage.townhall_level, updatedVillage.id, refreshedBuilderCount)
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
  const activeTownhallUpgrade = activeVillage?.townhall_upgrade_started_at && activeVillage?.townhall_upgrade_finish_at
    ? {
        villageId: activeVillage.id,
        fromLevel: Number(activeVillage.townhall_upgrade_from_level || activeVillage.townhall_level || currentTownHallLevel),
        toLevel: Number(activeVillage.townhall_upgrade_to_level || currentTownHallLevel + 1),
        startedAt: new Date(activeVillage.townhall_upgrade_started_at).getTime(),
        finishAt: new Date(activeVillage.townhall_upgrade_finish_at).getTime(),
      }
    : null

  const activeTownhallUpgradeRemainingSeconds = activeTownhallUpgrade
    ? Math.max(0, Math.ceil((Number(activeTownhallUpgrade.finishAt || 0) - upgradeClock) / 1000))
    : 0

  const activeTownhallUpgradeTotalSeconds = activeTownhallUpgrade
    ? Math.max(1, Math.ceil((Number(activeTownhallUpgrade.finishAt || 0) - Number(activeTownhallUpgrade.startedAt || 0)) / 1000))
    : Math.max(0, Math.floor(Number(townhallUpgradeInfo?.timeSeconds || 0)))

  const activeTownhallUpgradeProgress = activeTownhallUpgrade
    ? Math.max(0, Math.min(100, Math.round(((activeTownhallUpgradeTotalSeconds - activeTownhallUpgradeRemainingSeconds) / activeTownhallUpgradeTotalSeconds) * 100)))
    : 0

  const townhallUpgradeTargetLevel = Number(activeTownhallUpgrade?.toLevel || nextTownHallLevel)

  const normalizeTownhallBuildings = (data, builderHutCount = 0) => {
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

    const normalizeWalls = (walls) => {
      if (!walls || typeof walls !== 'object') return null

      return {
        ...walls,
        levels: Array.isArray(walls.levels)
          ? walls.levels.map((level) => ({ ...(level || {}) }))
          : [],
        copy_unlocks: Array.isArray(walls.copy_unlocks) ? [...walls.copy_unlocks] : [],
      }
    }

    const sortDefences = (structures) => {
      const priority = Object.fromEntries(BUILDING_SECTIONS.defences.map((building, index) => [building.id, index]))

      return [...structures].sort((left, right) => {
        const leftPriority = priority[left.id] ?? 100
        const rightPriority = priority[right.id] ?? 100
        if (leftPriority !== rightPriority) return leftPriority - rightPriority
        return (left.name || formatStructureName(left.id)).localeCompare(right.name || formatStructureName(right.id))
      })
    }

    const normalizedDefences = sortDefences(normalizeStructures(data?.defences)).map((building) => {
      if (String(building?.id || '') !== 'builder_hut') return building

      const normalizedCount = normalizeBuilderHutCount(builderHutCount)
      return {
        ...building,
        buildings_unlocked: normalizedCount,
        copy_unlocks: Array.from({ length: normalizedCount }, () => true),
      }
    })
    const normalizedTraps = normalizeStructures(data?.traps)
    const normalizedArmy = normalizeStructures(data?.army)
    const normalizedResources = normalizeStructures(data?.resources)
    const normalizedTroops = normalizeStructures(data?.troops)
    const normalizedSpells = normalizeStructures(data?.spells)
    const normalizedDarkTroopsFromCategory = normalizeStructures(data?.dark_troops)
    const normalizedDarkTroops = normalizedDarkTroopsFromCategory.length > 0
      ? normalizedDarkTroopsFromCategory
      : BUILDING_SECTIONS.dark_troops
        .map((building) => {
          const sourceEntry = data?.[building.id]
          if (!sourceEntry || typeof sourceEntry !== 'object') return null
          return { id: building.id, ...(sourceEntry || {}) }
        })
        .filter(Boolean)
    const normalizedSieges = normalizeStructures(data?.sieges)
    const normalizedHeroes = normalizeStructures(data?.heroes)
    const normalizedPets = normalizeStructures(data?.pets)
    const normalizedEquipment = normalizeStructures(data?.equipment)

    return {
      defences: normalizedDefences,
      traps: normalizedTraps,
      army: normalizedArmy,
      resources: normalizedResources,
      troops: normalizedTroops,
      spells: normalizedSpells,
      dark_troops: normalizedDarkTroops,
      sieges: normalizedSieges,
      heroes: normalizedHeroes,
      pets: normalizedPets,
      equipment: normalizedEquipment,
      walls: normalizeWalls(data?.walls),
    }
  }

  const loadTownhallSnapshot = async (townhallLevel, options = {}) => {
    if (!townhallLevel) return null

    const { loadStructures = false, loadWalls = false, villageId = activeVillageRef.current?.id, builderHutCount = Math.min(5, Math.max(2, Number(activeVillageRef.current?.builder_count || builderCountRef.current || 2))) } = options
    const cachedSnapshot = readTownhallSnapshotCache(villageId, townhallLevel)
    const nextSnapshotCache = { ...(cachedSnapshot || {}) }

    if (cachedSnapshot) {
      if (loadStructures && cachedSnapshot.structureCatalog) {
        setStructureCatalog(applyBuilderHutCountToSnapshot(cachedSnapshot.structureCatalog, builderHutCount))
        setStructureLevels(cachedSnapshot.structureLevels || {})
        setPendingUpgrades(cachedSnapshot.pendingUpgrades || [])
      }

      if (cachedSnapshot.townhallUpgradeInfo) {
        setTownhallUpgradeInfo(cachedSnapshot.townhallUpgradeInfo)
      }

      if (loadWalls && cachedSnapshot.wallConfig) {
        setWallConfig(cachedSnapshot.wallConfig)
        setWallCounts(cachedSnapshot.wallCounts || {})
      }
    }

    const { data: rows } = await supabase
      .from('townhall_buildings')
      .select('*')
      .lte('townhall_level', townhallLevel)
      .order('townhall_level', { ascending: true })

    const selectedTownhallRow = (rows || []).find((row) => Number(row.townhall_level) === Number(townhallLevel)) || null
    const normalizedData = normalizeTownhallBuildings(
      getTownhallSnapshotForLevel(rows || [], townhallLevel, getDefaultBuildingData(townhallLevel)),
      builderHutCount,
    )
    const hasSavedTraps = (rows || []).some((row) => {
      const traps = row?.traps
      if (Array.isArray(traps)) return traps.some((entry) => Boolean(entry))
      if (traps && typeof traps === 'object') return Object.keys(traps).length > 0
      return false
    })

    if (!hasSavedTraps) {
      normalizedData.traps = []
    }
    const nextTownhallUpgradeInfo = {
      cost: Number(selectedTownhallRow?.townhall_upgrade_cost || 0),
      resource: String(selectedTownhallRow?.townhall_upgrade_resource || 'gold').trim().toLowerCase(),
      timeSeconds: Number(selectedTownhallRow?.townhall_upgrade_time_seconds || parseTimeStringToSeconds(selectedTownhallRow?.townhall_upgrade_time || '')),
    }
    setTownhallUpgradeInfo(nextTownhallUpgradeInfo)

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
      ;[...normalizedData.defences, ...normalizedData.traps, ...normalizedData.army, ...normalizedData.resources, ...normalizedData.troops, ...normalizedData.spells, ...normalizedData.dark_troops, ...normalizedData.sieges, ...normalizedData.heroes, ...normalizedData.pets, ...normalizedData.equipment].forEach((building) => {
        const savedRowsForBuilding = savedStructureRows.filter((row) => row.building_id?.startsWith(`${building.id}-`))
        const rowCount = getStructureRowCount(building, savedRowsForBuilding)
        initialLevels[building.id] = Array.from({ length: rowCount }, (_, index) => {
          const savedRow = savedStructureRows.find((row) => row.building_id === `${building.id}-${index + 1}`)
          if (savedRow) return Number(savedRow.current_level || 0)
          return createInitialLevels(building)[index] ?? getDefaultRowLevel(building, index, isCopyUnlocked(building, index))
        })
      })
      setStructureLevels(initialLevels)

      // Auto-persist equipment rows that have no existing DB row yet
      // so upgrades tracked later can always update an existing record
      if (villageId) {
        const equipmentWithNoRow = (normalizedData.equipment || []).filter(
          (building) => !savedStructureRows.some((row) => row.building_id?.startsWith(`${building.id}-`))
        )
        if (equipmentWithNoRow.length > 0) {
          const equipmentInitRows = equipmentWithNoRow.map((building) => ({
            village_id: villageId,
            building_id: `${building.id}-1`,
            building_name: building.name || formatStructureName(building.id),
            current_level: Number(initialLevels[building.id]?.[0] ?? 1),
            quantity: 1,
            updated_at: new Date().toISOString(),
          }))
          await supabase
            .from('user_village_buildings')
            .upsert(equipmentInitRows, { onConflict: 'village_id,building_id' })
        }
      }

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

    nextSnapshotCache.townhallUpgradeInfo = nextTownhallUpgradeInfo

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

      const wallLevels = normalizedData.walls?.levels?.length > 0 ? normalizedData.walls.levels : savedWallLevels
      const savedWallTotal = savedWallRows.reduce((total, row) => total + Number(row.quantity || 0), 0)
      const buildingsUnlocked = Number(normalizedData.walls?.buildings_unlocked) || savedWallTotal

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
        ...(normalizedData.walls || {}),
        levels: wallLevels,
        buildings_unlocked: buildingsUnlocked,
      })
      setWallCounts(initialCounts)

      nextSnapshotCache.wallConfig = {
        ...(normalizedData.walls || {}),
        levels: wallLevels,
        buildings_unlocked: buildingsUnlocked,
      }
      nextSnapshotCache.wallCounts = initialCounts
    }

    if (loadStructures || loadWalls) {
      writeTownhallSnapshotCache(villageId, townhallLevel, nextSnapshotCache)
    }

    return selectedTownhallRow || rows?.[rows.length - 1] || null
  }

  const loadTownhallStructures = async (townhallLevel, villageId = activeVillageRef.current?.id, builderHutCount = Math.min(5, Math.max(2, Number(activeVillageRef.current?.builder_count || builderCountRef.current || 2)))) => {
    if (!townhallLevel) return

    setStructuresLoading(true)

    try {
      const data = await loadTownhallSnapshot(townhallLevel, {
        loadStructures: true,
        loadWalls: true,
        villageId,
        builderHutCount,
      })
      if (!data) {
        setStructureCatalog({ defences: [], traps: [], army: [], resources: [], troops: [], spells: [], dark_troops: [], sieges: [], heroes: [], pets: [], equipment: [] })
        setStructureLevels({})
        setWallConfig(null)
        setWallCounts({})
      }
    } catch (fetchError) {
      console.error('Failed to load townhall structures:', fetchError)
      setStructureCatalog({ defences: [], traps: [], army: [], resources: [], troops: [], spells: [], dark_troops: [], sieges: [], heroes: [], pets: [], equipment: [] })
      setStructureLevels({})
      setWallConfig(null)
      setWallCounts({})
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
      const data = await loadTownhallSnapshot(activeVillage.townhall_level, {
        loadWalls: true,
        villageId: activeVillage.id,
        builderHutCount: Math.min(5, Math.max(2, Number(activeVillage?.builder_count || 2))),
      })
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
      const structureRowsToSave = [...editDefenseBuildings, ...editTrapBuildings, ...editArmyBuildings, ...editResourceBuildings]
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
      showToast('Structures saved successfully!', 'success')
    } catch (saveError) {
      setError(saveError.message || 'Failed to save structures')
    } finally {
      setStructuresLoading(false)
      suppressSnapshotRefreshRef.current = false
    }
  }

  const handleSetAllToZero = () => {
    const resetLevels = {}
    ;[...editDefenseBuildings, ...editTrapBuildings, ...editArmyBuildings, ...editResourceBuildings].forEach((building) => {
      const rowCount = getStructureRowCount(building, structureLevels[building.id] || [])
      resetLevels[building.id] = Array.from({ length: rowCount }, (_, index) => getDefaultRowLevel(building, index, isCopyUnlocked(building, index)))
    })
    setStructureLevels(resetLevels)
  }

  const handleSetAllToMax = () => {
    const maxedLevels = {}
    ;[...editDefenseBuildings, ...editTrapBuildings, ...editArmyBuildings, ...editResourceBuildings].forEach((building) => {
      const rowCount = getStructureRowCount(building, structureLevels[building.id] || [])
      const maxLevel = Math.max(...(building.levels || []).map((level) => level.level), 0)
      maxedLevels[building.id] = Array.from({ length: rowCount }, () => maxLevel)
    })
    setStructureLevels(maxedLevels)
  }

  const handleCancelStructuresEdit = async () => {
    if (!activeVillage?.id || !activeVillage?.townhall_level) {
      setViewMode('loaded')
      return
    }

    setStructuresLoading(true)

    try {
      await loadTownhallSnapshot(activeVillage.townhall_level, {
        loadStructures: true,
        villageId: activeVillage.id,
      })
    } catch (restoreError) {
      console.error('Failed to restore loaded view after structures editor:', restoreError)
    } finally {
      setViewMode('loaded')
      setStructuresLoading(false)
    }
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

  const handleWallUpgradeOne = async (levelNumber) => {
    const currentLevelNumber = Number(levelNumber)
    const nextLevelNumber = currentLevelNumber + 1

    const currentCount = Number(wallCounts[currentLevelNumber] || 0)
    if (currentCount <= 0) return

    const hasNextLevel = wallLevels.some((wallLevel) => Number(wallLevel.level) === nextLevelNumber)
    if (!hasNextLevel) return

    const nextCounts = {
      ...wallCounts,
      [currentLevelNumber]: currentCount - 1,
      [nextLevelNumber]: Number(wallCounts[nextLevelNumber] || 0) + 1,
    }

    setWallCounts(nextCounts)

    try {
      await handleUpdateWalls(nextCounts, { returnToLoaded: false })
    } catch (saveError) {
      setError(saveError.message || 'Failed to save walls')
    }
  }

  const openWallUpgradePopup = (levelNumber) => {
    const sourceLevel = Number(levelNumber)
    const targetLevel = sourceLevel + 1
    const availableCount = Number(wallCounts[sourceLevel] || 0)
    const hasTargetLevel = wallLevels.some((wallLevel) => Number(wallLevel.level) === targetLevel)

    if (availableCount <= 0 || !hasTargetLevel) return

    setWallUpgradePopup({
      open: true,
      sourceLevel,
      targetLevel,
      amount: 1,
    })
  }

  const closeWallUpgradePopup = () => {
    setWallUpgradePopup({ open: false, sourceLevel: 0, targetLevel: 0, amount: 1 })
  }

  const handleWallUpgradePopupAmountChange = (value) => {
    setWallUpgradePopup((current) => {
      const sourceCount = Number(wallCounts[current.sourceLevel] || 0)
      const nextAmount = Math.min(Math.max(Number(value) || 0, 1), sourceCount)

      return {
        ...current,
        amount: nextAmount,
      }
    })
  }

  const handleWallBulkUpgrade = (levelNumber, upgradeAmount) => {
    const currentLevelNumber = Number(levelNumber)
    const nextLevelNumber = currentLevelNumber + 1
    const amount = Math.max(0, Math.floor(Number(upgradeAmount) || 0))

    if (amount <= 0) return

    const hasNextLevel = wallLevels.some((wallLevel) => Number(wallLevel.level) === nextLevelNumber)
    if (!hasNextLevel) return

    setWallCounts((current) => {
      const currentCount = Number(current[currentLevelNumber] || 0)
      const transferCount = Math.min(currentCount, amount)
      if (transferCount <= 0) return current

      return {
        ...current,
        [currentLevelNumber]: currentCount - transferCount,
        [nextLevelNumber]: Number(current[nextLevelNumber] || 0) + transferCount,
      }
    })
  }

  const handleResetWalls = () => {
    const resetCounts = {}
    ;(wallConfig?.levels || []).forEach((wallLevel) => {
      resetCounts[wallLevel.level] = 0
    })
    setWallCounts(resetCounts)
  }

  const confirmWallUpgradePopup = async () => {
    const amount = Math.min(
      Math.max(Number(wallUpgradePopup.amount) || 0, 1),
      Number(wallCounts[wallUpgradePopup.sourceLevel] || 0),
    )

    if (!wallUpgradePopup.open || amount <= 0) return

    const sourceLevel = Number(wallUpgradePopup.sourceLevel)
    const targetLevel = Number(wallUpgradePopup.targetLevel)
    const sourceCount = Number(wallCounts[sourceLevel] || 0)
    const transferCount = Math.min(sourceCount, amount)

    if (transferCount <= 0) return

    const nextCounts = {
      ...wallCounts,
      [sourceLevel]: sourceCount - transferCount,
      [targetLevel]: Number(wallCounts[targetLevel] || 0) + transferCount,
    }

    setWallCounts(nextCounts)

    await handleUpdateWalls(nextCounts, { returnToLoaded: false })
    closeWallUpgradePopup()
  }

  const wallUpgradePopupMarkup = wallUpgradePopup.open ? (
    <div className={styles.wallUpgradeOverlay} onClick={closeWallUpgradePopup}>
      <div className={styles.wallUpgradePopup} onClick={(event) => event.stopPropagation()}>
        <button type="button" className={styles.wallUpgradeCloseBtn} onClick={closeWallUpgradePopup} aria-label="Close walls popup">
          ×
        </button>

        <h3 className={styles.wallUpgradeTitle}>Upgrade multiple walls</h3>

        <div className={styles.wallUpgradeImagesRow}>
          <div className={styles.wallUpgradeImageBlock}>
            <img
              src={`${wallConfig?.image_path || '/src/assets/Walls/60_'}${wallUpgradePopup.sourceLevel || 1}.png`}
              alt={`Wall Level ${wallUpgradePopup.sourceLevel || 1}`}
              className={styles.wallUpgradeImage}
            />
          </div>
          <div className={styles.wallUpgradeArrow}>→</div>
          <div className={styles.wallUpgradeImageBlock}>
            <img
              src={`${wallConfig?.image_path || '/src/assets/Walls/60_'}${wallUpgradePopup.targetLevel || 1}.png`}
              alt={`Wall Level ${wallUpgradePopup.targetLevel || 1}`}
              className={styles.wallUpgradeImage}
            />
          </div>
        </div>

        <p className={styles.wallUpgradePrompt}>
          Enter the number of wall pieces to upgrade from level {wallUpgradePopup.sourceLevel} to level {wallUpgradePopup.targetLevel} (up to: {Number(wallCounts[wallUpgradePopup.sourceLevel] || 0)}):
        </p>

        <div className={styles.wallUpgradeFieldBlock}>
          <label className={styles.wallUpgradeLabel} htmlFor="wall-upgrade-amount">Number to upgrade:</label>
          <input
            id="wall-upgrade-amount"
            type="number"
            min="1"
            max={Number(wallCounts[wallUpgradePopup.sourceLevel] || 0)}
            value={wallUpgradePopup.amount}
            onChange={(event) => handleWallUpgradePopupAmountChange(event.target.value)}
            className={styles.wallUpgradeInput}
          />
        </div>

        <div className={styles.wallUpgradeOr}>OR</div>

        <div className={styles.wallUpgradeFieldBlock}>
          <div className={styles.wallUpgradeLabel}>Total Remaining:</div>
          <div className={styles.wallUpgradeRemainingBox}>
            {Math.max(Number(wallCounts[wallUpgradePopup.sourceLevel] || 0) - Number(wallUpgradePopup.amount || 0), 0)}
          </div>
        </div>

        <div className={styles.wallUpgradeActions}>
          <button type="button" className={styles.wallUpgradeBackBtn} onClick={closeWallUpgradePopup}>← Back</button>
          <button
            type="button"
            className={styles.wallUpgradeConfirmBtn}
            onClick={confirmWallUpgradePopup}
            disabled={Number(wallCounts[wallUpgradePopup.sourceLevel] || 0) <= 0}
          >
            ↑ Upgrade
          </button>
        </div>
      </div>
    </div>
  ) : null

  const handleUpdateWalls = async (nextWallCounts = wallCounts, options = {}) => {
    if (!activeVillage?.id || !wallConfig) return

    const { returnToLoaded = false } = options

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
          quantity: Number(nextWallCounts[wallLevel.level] || 0),
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
        wallCounts: nextWallCounts,
      })

      showToast('Walls saved successfully!', 'success')

      if (returnToLoaded) {
        await handleBackToLoaded()
      }
    } catch (saveError) {
      setError(saveError.message || 'Failed to save walls')
      showToast(saveError.message || 'Failed to save walls', 'error')
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
  const computeWallsCompletion = () => {
    if (!wallPieces || !wallMaxLevel) return 0

    const totalProgress = Object.entries(wallCounts).reduce((total, [levelKey, count]) => {
      const levelNumber = Number(levelKey || 0)
      const levelRatio = Math.min(Math.max(levelNumber / wallMaxLevel, 0), 1)
      return total + (Number(count || 0) * levelRatio)
    }, 0)

    const rawPercent = (totalProgress / wallPieces) * 100
    return Math.floor(rawPercent * 10) / 10
  }
  const isWallBuildComplete = wallPieces > 0 && remainingWalls === 0
  const isWallMaxComplete = wallPieces > 0 && wallMaxLevel > 0 && wallsAtMaxLevel >= wallPieces
  const getWallRowMax = (levelNumber) => {
    const otherWalls = Object.entries(wallCounts).reduce((total, [levelKey, count]) => {
      if (Number(levelKey) === Number(levelNumber)) return total
      return total + Number(count || 0)
    }, 0)

    return Math.max(wallPieces - otherWalls, 0)
  }
  const armySortPriority = {
    army_camp: 0,
    barracks: 1,
    dark_barracks: 2,
    clan_castle: 3,
    spell_factory: 4,
    dark_spell_factory: 5,
    workshop: 6,
    lab: 6,
    hero_hall: 7,
    blacksmith: 8,
    pet_house: 9,
  }

  const visibleDefenseBuildings = [...(structureCatalog.defences || [])]
    .filter((building) => building?.id)
    .sort((left, right) => {
      return (left.name || formatStructureName(left.id)).localeCompare(right.name || formatStructureName(right.id))
    })
  const visibleTrapBuildings = showTrapsTab
    ? [...(structureCatalog.traps || [])]
      .filter((building) => building?.id)
      .reduce((accumulator, building) => {
        if (!accumulator.some((entry) => entry.id === building.id)) accumulator.push(building)
        return accumulator
      }, [])
      .sort((left, right) => {
        return (left.name || formatStructureName(left.id)).localeCompare(right.name || formatStructureName(right.id))
      })
    : []
  const visibleResourceBuildings = [...(structureCatalog.resources || [])].filter((building) => building?.id)
  const visibleArmyBuildings = [...(structureCatalog.army || [])]
    .filter((building) => building?.id)
    .sort((left, right) => {
      const leftPriority = armySortPriority[left.id] ?? 99
      const rightPriority = armySortPriority[right.id] ?? 99
      if (leftPriority !== rightPriority) return leftPriority - rightPriority
      return (left.name || formatStructureName(left.id)).localeCompare(right.name || formatStructureName(right.id))
    })

  const editDefenseBuildings = [...(structureCatalog.defences || [])]
    .filter((building) => building?.id)
    .sort((left, right) => {
      return (left.name || formatStructureName(left.id)).localeCompare(right.name || formatStructureName(right.id))
    })
  const editTrapBuildings = [...visibleTrapBuildings]
  const editResourceBuildings = [...(structureCatalog.resources || [])]
    .filter((building) => ['gold_mine', 'elixir_collector', 'gold_storage', 'elixir_storage', 'dark_elixir_driller', 'dark_elixir_storage'].includes(building.id))
  const editArmyBuildings = [...(structureCatalog.army || [])]
    .filter((building) => ['army_camp', 'lab', 'hero_hall', 'blacksmith', 'pet_house'].includes(building.id))
  const visibleSpellBuildings = activeLoadedTab === 'spells'
    ? (() => {
      const spellBuildings = (structureCatalog.spells || []).filter((building) => building?.id)
      const normalSpells = []
      const darkSpells = []

      spellBuildings.forEach((building) => {
        if (DARK_SPELL_BUILDING_IDS.has(String(building.id || ''))) {
          darkSpells.push(building)
        } else {
          normalSpells.push(building)
        }
      })

      return [...normalSpells, ...darkSpells]
    })()
    : []
  const visibleDarkTroopBuildings = activeLoadedTab === 'dark_troops'
    ? (structureCatalog.dark_troops || [])
    : []

  const visibleSiegeBuildings = activeLoadedTab === 'sieges'
    ? (structureCatalog.sieges || [])
    : []

  const visibleEquipmentBuildings = activeLoadedTab === 'equipment'
    ? (structureCatalog.equipment || [])
    : []

  const visiblePetBuildings = activeLoadedTab === 'pets'
    ? (structureCatalog.pets || [])
    : []

  const equipmentHeroSortOrder = {
    'Barbarian King': 0,
    'Archer Queen': 1,
    'Grand Warden': 3,
    'Royal Champion': 4,
    'Minion Prince': 2,
    'Dragon Duke': 5,
    Other: 99,
  }

  const equipmentPriorityById = {
    barbarian_puppet: 1,
    rage_vial: 2,
    earthquake_boots: 3,
    vampstache: 4,
    giant_gauntlet: 5,
    spiky_ball: 6,
    snake_bracelet: 7,
    stick_horse: 8,
    archer_puppet: 1,
    invisibility_vial: 2,
    giant_arrow: 3,
    frozen_arrow: 4,
    magic_mirror: 5,
    action_figure: 6,
    monolith_arrow: 7,
    dark_orb: 1,
    henchmen_puppet: 2,
    metal_pants:3,
    dark_crown: 4,
    meteor_staff: 5,
    eternal_tome: 1,
    life_gem: 2,
    heroic_torch: 3,
    fireball: 4,
    lavaloon_puppet: 5,
    rage_gem: 6,
    hog_rider_puppet: 3,
  }

  const getEquipmentPriority = (building) => {
    if (!building?.id) return 999
    const directPriority = Number(building?.priority)
    if (Number.isFinite(directPriority) && directPriority > 0) return directPriority
    return equipmentPriorityById[building.id] ?? 999
  }

  const equipmentByHero = visibleEquipmentBuildings.reduce((acc, building) => {
    const heroName = building?.hero || 'Other'
    if (!acc[heroName]) acc[heroName] = []
    acc[heroName].push(building)
    return acc
  }, {})

  Object.keys(equipmentByHero).forEach((heroName) => {
    equipmentByHero[heroName].sort((left, right) => {
      const leftPriority = getEquipmentPriority(left)
      const rightPriority = getEquipmentPriority(right)
      if (leftPriority !== rightPriority) return leftPriority - rightPriority
      return (left.name || formatStructureName(left.id)).localeCompare(right.name || formatStructureName(right.id))
    })
  })

  const sortedEquipmentByHeroEntries = Object.entries(equipmentByHero).sort(([leftHero], [rightHero]) => {
    const leftOrder = equipmentHeroSortOrder[leftHero] ?? 98
    const rightOrder = equipmentHeroSortOrder[rightHero] ?? 98
    if (leftOrder !== rightOrder) return leftOrder - rightOrder
    return leftHero.localeCompare(rightHero)
  })

  const activeLoadedTabBuildings = activeLoadedTab === 'defences'
    ? visibleDefenseBuildings
    : activeLoadedTab === 'traps' && showTrapsTab
      ? visibleTrapBuildings
    : activeLoadedTab === 'army'
      ? visibleArmyBuildings
      : activeLoadedTab === 'resources'
        ? visibleResourceBuildings
        : activeLoadedTab === 'troops'
          ? (structureCatalog.troops || [])
          : activeLoadedTab === 'spells'
            ? (structureCatalog.spells || [])
          : activeLoadedTab === 'dark_troops'
            ? (structureCatalog.dark_troops || [])
          : activeLoadedTab === 'sieges'
            ? (structureCatalog.sieges || [])
          : activeLoadedTab === 'heroes'
            ? (structureCatalog.heroes || [])
          : activeLoadedTab === 'equipment'
            ? (structureCatalog.equipment || [])
          : activeLoadedTab === 'pets'
            ? (structureCatalog.pets || [])
          : []

  const isWallsTabActive = activeLoadedTab === 'walls'

  const getPendingUpgradeCountForBuildings = (buildings = []) => {
    if (!Array.isArray(buildings) || buildings.length === 0) return 0

    const buildingIds = new Set(buildings.map((building) => building?.id).filter(Boolean))

    return pendingUpgrades.reduce((total, upgrade) => {
      const baseBuildingId = String(upgrade?.buildingId || '').replace(/-\d+$/, '')
      return buildingIds.has(baseBuildingId) ? total + 1 : total
    }, 0)
  }

  const loadedTabUpgradeCounts = {
    defences: getPendingUpgradeCountForBuildings(visibleDefenseBuildings),
    traps: showTrapsTab ? getPendingUpgradeCountForBuildings(visibleTrapBuildings) : 0,
    army: getPendingUpgradeCountForBuildings(visibleArmyBuildings),
    resources: getPendingUpgradeCountForBuildings(visibleResourceBuildings),
    troops: getPendingUpgradeCountForBuildings(structureCatalog.troops || []),
    spells: getPendingUpgradeCountForBuildings(structureCatalog.spells || []),
    dark_troops: getPendingUpgradeCountForBuildings(structureCatalog.dark_troops || []),
    sieges: getPendingUpgradeCountForBuildings(structureCatalog.sieges || []),
    heroes: getPendingUpgradeCountForBuildings(structureCatalog.heroes || []),
    equipment: showEquipmentTab ? getPendingUpgradeCountForBuildings(structureCatalog.equipment || []) : 0,
    pets: showPetsTab ? getPendingUpgradeCountForBuildings(structureCatalog.pets || []) : 0,
    walls: 0,
  }

  const remainingBetaResourceDefinitions = [
    { id: 'gold', label: 'Gold', icon: '/src/assets/magic-items/gold.png' },
    { id: 'elixir', label: 'Elixir', icon: '/src/assets/magic-items/elixir.png' },
    { id: 'dark_elixir', label: 'Dark Elixir', icon: '/src/assets/magic-items/de.png' },
    // Equipment ores
    { id: 'glowy_ore', label: 'Glowy Ore', icon: '/src/assets/magic-items/ore-glowy.png' },
    { id: 'shiny_ore', label: 'Shiny Ore', icon: '/src/assets/magic-items/ore-shiny.png' },
    { id: 'starry_ore', label: 'Starry Ore', icon: '/src/assets/magic-items/ore-starry.png' },
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
    const parts = compact.match(/\d+(?:\.\d+)?(?:d|day|days|h|hr|hrs|m|min|mins|s|sec|secs)/g)
    const tokens = parts || [compact]
    let totalSeconds = 0

    tokens.forEach((token) => {
      const match = token.match(/(\d+(?:\.\d+)?)(d|day|days|h|hr|hrs|m|min|mins|s|sec|secs)/)
      if (!match) return

      const amount = Number(match[1])
      const unit = match[2]
      if (unit.startsWith('d')) totalSeconds += amount * 86400
      else if (unit.startsWith('h')) totalSeconds += amount * 3600
      else if (unit.startsWith('m')) totalSeconds += amount * 60
      else totalSeconds += amount
    })

    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = Math.round(totalSeconds % 60)

    return [
      days ? `${days}d` : '',
      hours ? `${hours}h` : '',
      minutes ? `${minutes}m` : '',
      !days && !hours && !minutes ? `${seconds}s` : seconds ? `${seconds}s` : '',
    ].filter(Boolean).join(' ')
  }

  const getTimeSeconds = (value) => {
    const raw = String(value || '').trim().toLowerCase()
    if (!raw) return 0

    const compact = raw.replace(/\s+/g, '')
    const parts = compact.match(/\d+(?:\.\d+)?(?:d|day|days|h|hr|hrs|m|min|mins|s|sec|secs)/g)
    if (!parts) return 0

    let totalSeconds = 0
    parts.forEach((token) => {
      const match = token.match(/(\d+(?:\.\d+)?)(d|day|days|h|hr|hrs|m|min|mins|s|sec|secs)/)
      if (!match) return
      const amount = Number(match[1])
      const unit = match[2]
      if (unit.startsWith('d')) totalSeconds += amount * 86400
      else if (unit.startsWith('h')) totalSeconds += amount * 3600
      else if (unit.startsWith('m')) totalSeconds += amount * 60
      else totalSeconds += amount
    })
    return totalSeconds
  }

  const formatSeconds = (totalSeconds) => {
    const safeSeconds = Math.max(0, Math.round(Number(totalSeconds || 0)))
    const days = Math.floor(safeSeconds / 86400)
    const hours = Math.floor((safeSeconds % 86400) / 3600)
    const minutes = Math.floor((safeSeconds % 3600) / 60)
    const seconds = safeSeconds % 60

    return [
      days ? `${days}d` : '',
      hours ? `${hours}h` : '',
      minutes ? `${minutes}m` : '',
      !days && !hours && !minutes ? `${seconds}s` : seconds ? `${seconds}s` : '',
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

  const getUpgradeResourceClass = (resource) => {
    const normalizedResource = String(resource || '').trim().toLowerCase()
    if (normalizedResource === 'dark_elixir') return styles.readOnlyResourceCostDarkElixir
    if (normalizedResource === 'elixir') return styles.readOnlyResourceCostElixir
    return styles.readOnlyResourceCostGold
  }

  const getUpgradeSummary = (building, currentLevel, labLevel = 0, heroHallLevel = 0, blacksmithLevel = 0) => {
    const allNextLevels = getNextUpgradeLevels(building, currentLevel)
    const equipmentUsesBlacksmithRequirement = allNextLevels.some((level) => Number(level?.blacksmith_level_unlocked ?? building?.blacksmith_level_unlocked ?? 0) > 0)
    const nextLevels = PET_BUILDING_IDS.has(String(building?.id || ''))
      ? allNextLevels.filter((level) => Number(level.pet_house_level_unlocked ?? building?.pet_house_level_unlocked ?? 0) <= Number(currentPetHouseLevel || 0))
      : (TROOP_BUILDING_IDS.has(String(building?.id || '')) || DARK_TROOP_BUILDING_IDS.has(String(building?.id || '')) || SIEGE_BUILDING_IDS.has(String(building?.id || '')) || SPELL_BUILDING_IDS.has(String(building?.id || '')))
      ? allNextLevels.filter((level) => Number(level.lab_level_unlocked ?? 0) <= Number(labLevel || 0))
      : HERO_BUILDING_IDS.has(String(building?.id || ''))
        ? allNextLevels.filter((level) => Number(level.hero_hall_level_unlocked ?? 0) <= Number(heroHallLevel || 0))
        : String(building?.id || '') === 'blacksmith'
          ? allNextLevels
          : equipmentUsesBlacksmithRequirement
            ? allNextLevels.filter((level) => Number(level.blacksmith_level_unlocked ?? building?.blacksmith_level_unlocked ?? 0) <= Number(blacksmithLevel || 0))
            : allNextLevels
    const totalCost = nextLevels.reduce((total, level) => total + Number(level.cost || 0), 0)
    const totalSeconds = nextLevels.reduce((total, level) => total + getTimeSeconds(level.time), 0)

    return {
      allNextLevels,
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

  const openCompleteUpgradePopup = (rowState) => {
    if (!rowState?.pendingUpgrade) return

    setCompleteUpgradePopup({
      open: true,
      rowKey: rowState.actionRowKey,
      upgrade: rowState.pendingUpgrade,
      magicItem: 'none',
      saving: false,
    })
  }

  const closeCompleteUpgradePopup = () => {
    setCompleteUpgradePopup({ open: false, rowKey: '', upgrade: null, magicItem: 'none', saving: false })
  }

  const updateCompleteUpgradeMagicItem = (value) => {
    setCompleteUpgradePopup((current) => ({
      ...current,
      magicItem: value,
    }))
  }

  const confirmCompleteUpgradePopup = async () => {
    const upgrade = completeUpgradePopup.upgrade
    if (!upgrade) return

    setCompleteUpgradePopup((current) => ({
      ...current,
      saving: true,
    }))

    try {
      await completePendingUpgrade(upgrade)
      closeCompleteUpgradePopup()
    } catch (completeError) {
      setCompleteUpgradePopup((current) => ({
        ...current,
        saving: false,
      }))
      setError(completeError.message || 'Failed to complete upgrade')
    }
  }

  const openModifyUpgradePopup = (rowState) => {
    if (!rowState?.pendingUpgrade) return

    const maxAllowedRemainingSeconds = getMaxAllowedRemainingSeconds(rowState.pendingUpgrade)

    setModifyUpgradePopup({
      open: true,
      rowKey: rowState.actionRowKey,
      upgrade: rowState.pendingUpgrade,
      durationParts: clampDurationPartsToMax(splitDurationSeconds(rowState.pendingRemainingSeconds), maxAllowedRemainingSeconds),
      saving: false,
    })
  }

  const closeModifyUpgradePopup = () => {
    setModifyUpgradePopup({ open: false, rowKey: '', upgrade: null, durationParts: { days: 0, hours: 0, minutes: 0, seconds: 0 }, saving: false })
  }

  const updateModifyUpgradeDurationPart = (part, value) => {
    setModifyUpgradePopup((current) => ({
      ...current,
      durationParts: clampDurationPartsToMax({
        ...current.durationParts,
        [part]: Math.max(0, Math.floor(Number(value) || 0)),
      }, getMaxAllowedRemainingSeconds(current.upgrade)),
    }))
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

      void loadTownhallStructures(activeVillageRef.current.townhall_level, upgrade.villageId)
    }

    return true
  }

  const completeTownhallUpgrade = async (upgrade) => {
    if (!upgrade?.villageId) return false

    const { data: updatedVillage, error: updateError } = await supabase
      .from('user_villages')
      .update({
        townhall_level: Number(upgrade.toLevel || currentTownHallLevel),
        townhall_upgrade_started_at: null,
        townhall_upgrade_finish_at: null,
        townhall_upgrade_from_level: null,
        townhall_upgrade_to_level: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', upgrade.villageId)
      .select()
      .single()

    if (updateError) throw updateError

    if (updatedVillage) {
      setActiveVillage(updatedVillage)
      setVillages((current) => current.map((village) => (village.id === updatedVillage.id ? updatedVillage : village)))
      const upgradedBuilderCount = Math.min(5, Math.max(2, Number(updatedVillage?.builder_count) || 2))
      await syncVillageBuildingRowsToTownhall(updatedVillage.id, updatedVillage.townhall_level, upgradedBuilderCount)
      await loadTownhallStructures(updatedVillage.townhall_level, updatedVillage.id, upgradedBuilderCount)
    }

    return true
  }

  const cancelPendingUpgrade = async (upgrade) => {
    if (!upgrade?.id || !upgrade?.villageId || !upgrade?.buildingId) return false

    const { error: updateError } = await supabase
      .from('user_village_buildings')
      .update({
        current_level: Number(upgrade.fromLevel),
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
      const buildingKey = String(upgrade.buildingId).replace(/-\d+$/, '')

      setStructureLevels((current) => {
        const nextLevels = [...(current[buildingKey] || [])]
        nextLevels[Number(upgrade.rowIndex)] = Number(upgrade.fromLevel)
        return {
          ...current,
          [buildingKey]: nextLevels,
        }
      })
    }

    return true
  }

  const saveModifiedUpgradeTime = async () => {
    const upgrade = modifyUpgradePopup.upgrade
    if (!upgrade?.id || !upgrade?.villageId || !upgrade?.buildingId) return

    const maxAllowedRemainingSeconds = getMaxAllowedRemainingSeconds(upgrade)
    const remainingSeconds = Math.max(0, Math.floor(
      (Number(modifyUpgradePopup.durationParts.days) || 0) * 86400
      + (Number(modifyUpgradePopup.durationParts.hours) || 0) * 3600
      + (Number(modifyUpgradePopup.durationParts.minutes) || 0) * 60
      + (Number(modifyUpgradePopup.durationParts.seconds) || 0),
    ))

    if (remainingSeconds > maxAllowedRemainingSeconds) {
      setError(`Upgrade time cannot exceed ${formatUpgradeClock(maxAllowedRemainingSeconds)}`)
      return
    }

    const newFinishAt = Date.now() + (remainingSeconds * 1000)
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - Number(upgrade.startedAt || Date.now())) / 1000))
    const nextDurationSeconds = elapsedSeconds + remainingSeconds

    setModifyUpgradePopup((current) => ({
      ...current,
      saving: true,
    }))

    try {
      const { error: updateError } = await supabase
        .from('user_village_buildings')
        .update({
          upgrade_finish_at: new Date(newFinishAt).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('village_id', upgrade.villageId)
        .eq('building_id', upgrade.buildingId)

      if (updateError) throw updateError

      setPendingUpgrades((current) => current.map((item) => {
        if (item.id !== upgrade.id) return item

        return {
          ...item,
          finishAt: newFinishAt,
          durationSeconds: nextDurationSeconds,
        }
      }))

      setModifyUpgradePopup((current) => ({
        ...current,
        upgrade: {
          ...upgrade,
          finishAt: newFinishAt,
          durationSeconds: nextDurationSeconds,
        },
        remainingText: formatUpgradeClock(remainingSeconds),
        saving: false,
      }))
      closeModifyUpgradePopup()
    } catch (saveError) {
      setModifyUpgradePopup((current) => ({
        ...current,
        saving: false,
      }))
      setError(saveError.message || 'Failed to update upgrade time')
    }
  }

  const handleStartTownhallUpgrade = async () => {
    if (!activeVillage?.id || hasReachedMaxTownHall) return
    if (activeTownhallUpgrade) return
    if (!townhallConstructionReady) {
      showToast('Construct all buildings before upgrading the Town Hall.', 'warning')
      return
    }

    if (!isWallBuildComplete) {
      showToast('Build all the walls before upgrading to the next Town Hall.', 'warning')
      return
    }

    const durationSeconds = Math.max(0, Math.floor(Number(townhallUpgradeInfo?.timeSeconds) || 0))
    if (durationSeconds <= 0) {
      setError('Town Hall upgrade time is not configured yet.')
      return
    }

    const startedAt = Date.now()
    const finishAt = startedAt + (durationSeconds * 1000)

    const { data: updatedVillage, error } = await supabase
      .from('user_villages')
      .update({
        townhall_upgrade_started_at: new Date(startedAt).toISOString(),
        townhall_upgrade_finish_at: new Date(finishAt).toISOString(),
        townhall_upgrade_from_level: Number(currentTownHallLevel),
        townhall_upgrade_to_level: Number(nextTownHallLevel),
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeVillage.id)
      .select()
      .single()

    if (error) {
      setError(error.message || 'Failed to start town hall upgrade')
      return
    }

    if (updatedVillage) {
      setActiveVillage(updatedVillage)
      setVillages((current) => current.map((village) => (village.id === updatedVillage.id ? updatedVillage : village)))
    }
  }

  const openTownhallModifyPopup = () => {
    if (!activeTownhallUpgrade) return

    setTownhallUpgradePopup({
      open: true,
      mode: 'modify',
      durationParts: clampDurationPartsToMax(
        splitDurationSeconds(activeTownhallUpgradeRemainingSeconds),
        activeTownhallUpgradeRemainingSeconds,
      ),
      saving: false,
    })
  }

  const openTownhallCompletePopup = () => {
    if (!activeTownhallUpgrade) return

    setTownhallUpgradePopup({
      open: true,
      mode: 'complete',
      durationParts: { days: 0, hours: 0, minutes: 0, seconds: 0 },
      magicItem: 'none',
      saving: false,
    })
  }

  const closeTownhallUpgradePopup = () => {
    setTownhallUpgradePopup({ open: false, mode: 'complete', durationParts: { days: 0, hours: 0, minutes: 0, seconds: 0 }, magicItem: 'none', saving: false })
  }

  const updateTownhallUpgradeMagicItem = (value) => {
    setTownhallUpgradePopup((current) => ({
      ...current,
      magicItem: value,
    }))
  }

  const updateTownhallUpgradeDurationPart = (part, value) => {
    setTownhallUpgradePopup((current) => ({
      ...current,
      durationParts: clampDurationPartsToMax({
        ...current.durationParts,
        [part]: Math.max(0, Math.floor(Number(value) || 0)),
      }, activeTownhallUpgradeRemainingSeconds),
    }))
  }

  const saveTownhallUpgradeTime = async () => {
    if (!activeTownhallUpgrade?.villageId || !activeVillage?.id) return

    const maxAllowedRemainingSeconds = activeTownhallUpgradeRemainingSeconds
    const remainingSeconds = Math.max(0, Math.floor(
      (Number(townhallUpgradePopup.durationParts.days) || 0) * 86400
      + (Number(townhallUpgradePopup.durationParts.hours) || 0) * 3600
      + (Number(townhallUpgradePopup.durationParts.minutes) || 0) * 60
      + (Number(townhallUpgradePopup.durationParts.seconds) || 0),
    ))

    if (remainingSeconds > maxAllowedRemainingSeconds) {
      setError(`Upgrade time cannot exceed ${formatUpgradeClock(maxAllowedRemainingSeconds)}`)
      return
    }

    const newFinishAt = Date.now() + (remainingSeconds * 1000)

    setTownhallUpgradePopup((current) => ({
      ...current,
      saving: true,
    }))

    try {
      const { data: updatedVillage, error: updateError } = await supabase
        .from('user_villages')
        .update({
          townhall_upgrade_finish_at: new Date(newFinishAt).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', activeVillage.id)
        .select()
        .single()

      if (updateError) throw updateError

      if (updatedVillage) {
        setActiveVillage(updatedVillage)
        setVillages((current) => current.map((village) => (village.id === updatedVillage.id ? updatedVillage : village)))
      }

      closeTownhallUpgradePopup()
    } catch (saveError) {
      setTownhallUpgradePopup((current) => ({
        ...current,
        saving: false,
      }))
      setError(saveError.message || 'Failed to update town hall upgrade time')
    }
  }

  const confirmTownhallUpgradeCompletion = async () => {
    if (!activeTownhallUpgrade) return

    setTownhallUpgradePopup((current) => ({
      ...current,
      saving: true,
    }))

    try {
      await completeTownhallUpgrade(activeTownhallUpgrade)
      closeTownhallUpgradePopup()
    } catch (completeError) {
      setTownhallUpgradePopup((current) => ({
        ...current,
        saving: false,
      }))
      setError(completeError.message || 'Failed to complete town hall upgrade')
    }
  }

  const cancelTownhallUpgrade = async () => {
    if (!activeTownhallUpgrade?.villageId) return

    try {
      const { data: updatedVillage, error: updateError } = await supabase
        .from('user_villages')
        .update({
          townhall_level: Number(activeTownhallUpgrade.fromLevel || currentTownHallLevel),
          townhall_upgrade_started_at: null,
          townhall_upgrade_finish_at: null,
          townhall_upgrade_from_level: null,
          townhall_upgrade_to_level: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', activeTownhallUpgrade.villageId)
        .select()
        .single()

      if (updateError) throw updateError

      if (updatedVillage) {
        setActiveVillage(updatedVillage)
        setVillages((current) => current.map((village) => (village.id === updatedVillage.id ? updatedVillage : village)))
        const revertedBuilderCount = Math.min(5, Math.max(2, Number(updatedVillage?.builder_count) || 2))
        await syncVillageBuildingRowsToTownhall(updatedVillage.id, updatedVillage.townhall_level, revertedBuilderCount)
        await loadTownhallStructures(updatedVillage.townhall_level, updatedVillage.id, revertedBuilderCount)
      }

      closeTownhallUpgradePopup()
    } catch (cancelError) {
      setError(cancelError.message || 'Failed to cancel town hall upgrade')
    }
  }

  const startStructureUpgrade = async (building, rowState) => {
    if (!activeVillage?.id || !building?.id || rowState == null) return

    const rowIndex = Number(rowState.rowIndex)
    const buildingRowId = `${building.id}-${rowIndex + 1}`
    const existingUpgrade = getPendingUpgradeForRow(activeVillage.id, buildingRowId, rowIndex)
    if (existingUpgrade) return

    // If the building is unlocked via gems, allow unlocking/upgrading regardless of blacksmith/lab/barracks/hero requirements
    const isGemUnlock = String(building?.unlock_source || '').toLowerCase().includes('gem')
    if (!isGemUnlock) {
      if (rowState.labRequirementLabel === 'Blacksmith' && rowState.labRequirementLevel != null && rowState.visibleNextLevels.length === 0) {
        showToast(`Blacksmith level ${rowState.labRequirementLevel} is required to upgrade this equipment.`, 'error')
        return
      }

      if ((TROOP_BUILDING_IDS.has(String(building.id || '')) || DARK_TROOP_BUILDING_IDS.has(String(building.id || '')) || SPELL_BUILDING_IDS.has(String(building.id || ''))) && rowState.labRequirementLevel != null && rowState.visibleNextLevels.length === 0) {
        const unitLabel = SPELL_BUILDING_IDS.has(String(building.id || '')) ? 'spell' : 'troop'
        showToast(`Lab level ${rowState.labRequirementLevel} is required to upgrade this ${unitLabel}.`, 'error')
        return
      }

      if (PET_BUILDING_IDS.has(String(building.id || '')) && rowState.labRequirementLevel != null && rowState.visibleNextLevels.length === 0) {
        showToast(`Pet House level ${rowState.labRequirementLevel} is required to upgrade this pet.`, 'error')
        return
      }

      if (TROOP_BUILDING_IDS.has(String(building.id || '')) && Number(currentBarracksLevel || 0) < getTroopBarracksRequirement(building)) {
        showToast(`Barracks level ${getTroopBarracksRequirement(building)} is required to unlock this troop.`, 'error')
        return
      }

      if (DARK_TROOP_BUILDING_IDS.has(String(building.id || '')) && Number(currentDarkBarracksLevel || 0) < getDarkTroopBarracksRequirement(building)) {
        showToast(`Dark Barracks level ${getDarkTroopBarracksRequirement(building)} is required to unlock this troop.`, 'error')
        return
      }

      if (PET_BUILDING_IDS.has(String(building.id || '')) && Number(currentPetHouseLevel || 0) < getPetHouseRequirement(building)) {
        showToast(`Pet House level ${getPetHouseRequirement(building)} is required to unlock this pet.`, 'error')
        return
      }

      if (SPELL_BUILDING_IDS.has(String(building.id || ''))) {
        const isDarkSpell = DARK_SPELL_BUILDING_IDS.has(String(building.id || ''))
        const spellRequirement = isDarkSpell ? getDarkSpellFactoryRequirement(building) : getSpellFactoryRequirement(building)
        const currentFactoryLevel = isDarkSpell ? Number(currentDarkSpellFactoryLevel || 0) : Number(currentSpellFactoryLevel || 0)
        const factoryLabel = isDarkSpell ? 'Dark Spell Factory' : 'Spell Factory'

        if (currentFactoryLevel < spellRequirement) {
          showToast(`${factoryLabel} level ${spellRequirement} is required to unlock this spell.`, 'error')
          return
        }
      }

      if (HERO_BUILDING_IDS.has(String(building.id || '')) && rowState.labRequirementLevel != null && rowState.visibleNextLevels.length === 0) {
        showToast(`Hero Hall level ${rowState.labRequirementLevel} is required to upgrade this hero.`, 'error')
        return
      }
    }

    const nextLevel = rowState.visibleNextLevels?.[0] || getNextUpgradeLevels(building, rowState.rowLevel)[0]
    if (!nextLevel) return

    // If this building is gem-unlocked and the row is currently 0 -> perform an instant unlock to level 1
    const isGemUnlockBuilding = String(building?.unlock_source || '').toLowerCase().includes('gem')
    if (isGemUnlockBuilding && Number(rowState.rowLevel || 0) === 0 && Number(nextLevel.level || 0) === 1) {
      try {
        const buildingRowId = `${building.id}-${rowIndex + 1}`
        const upsertRow = {
          village_id: activeVillage.id,
          building_id: buildingRowId,
          building_name: building.name || formatStructureName(building.id),
          current_level: 1,
          quantity: 1,
          upgrade_started_at: null,
          upgrade_finish_at: null,
          upgrade_from_level: null,
          upgrade_to_level: null,
          updated_at: new Date().toISOString(),
        }

        const { error: saveError } = await supabase
          .from('user_village_buildings')
          .upsert([upsertRow], { onConflict: 'village_id,building_id' })

        if (saveError) throw saveError

        // Update local state so UI immediately reflects unlocked level
        setStructureLevels((current) => {
          const next = { ...(current || {}) }
          const arr = Array.isArray(next[building.id]) ? [...next[building.id]] : []
          arr[rowIndex] = 1
          next[building.id] = arr
          return next
        })

        // No pending upgrade created for a gem unlock — return early
        return
      } catch (e) {
        setError(e.message || 'Failed to unlock via gems')
        return
      }
    }

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

  useEffect(() => {
    if (townhallUpgradingRef.current) return
    if (!activeTownhallUpgrade) return
    if (Number(activeTownhallUpgrade.finishAt) > upgradeClock) return

    townhallUpgradingRef.current = true

    const flushTownhallUpgrade = async () => {
      try {
        await completeTownhallUpgrade(activeTownhallUpgrade)
      } catch (upgradeError) {
        setError(upgradeError.message || 'Failed to complete town hall upgrade')
      } finally {
        townhallUpgradingRef.current = false
      }
    }

    void flushTownhallUpgrade()
  }, [activeTownhallUpgrade?.finishAt, activeVillage?.id, upgradeClock])

  const computeStructuresCompletion = () => {
    const buildings = [...(structureCatalog.defences || []), ...visibleTrapBuildings, ...(structureCatalog.army || []), ...(structureCatalog.resources || [])]
    if (!buildings || buildings.length === 0) return 0
    let totalCurrentLevels = 0
    let totalMaxLevels = 0

    buildings.forEach((building) => {
      const maxLevel = Math.max(...(building.levels || []).map((l) => l.level), 0)
      const rows = getStructureRowCount(building, structureLevels[building.id] || [])
      const levelsArray = structureLevels[building.id] || Array.from(
        { length: rows },
        (_, index) => getDefaultRowLevel(building, index, isCopyUnlocked(building, index)),
      )

      if (maxLevel <= 0) {
        return
      }

      for (let i = 0; i < rows; i++) {
        const currentLevel = Number(levelsArray[i] || 0)
        totalCurrentLevels += Math.min(Math.max(currentLevel, 0), maxLevel)
        totalMaxLevels += maxLevel
      }
    })

    if (totalMaxLevels === 0) return 0
    const rawPercent = (totalCurrentLevels / totalMaxLevels) * 100
    return Math.floor(rawPercent * 10) / 10
  }

  const computeTroopsCompletion = () => {
    const buildings = [...(structureCatalog.troops || []), ...(structureCatalog.dark_troops || []), ...(structureCatalog.sieges || [])]
    if (!buildings || buildings.length === 0) return 0

    let totalCurrentLevels = 0
    let totalMaxLevels = 0

    buildings.forEach((building) => {
      const maxLevel = Math.max(...(building.levels || []).map((l) => l.level), 0)
      const isDarkTroop = DARK_TROOP_BUILDING_IDS.has(String(building?.id || ''))
      const isSiege = SIEGE_BUILDING_IDS.has(String(building?.id || ''))
      const troopRequirement = isSiege
        ? getSiegeWorkshopRequirement(building)
        : isDarkTroop
          ? getDarkTroopBarracksRequirement(building)
          : getTroopBarracksRequirement(building)
      const troopUnlocked = isSiege
        ? Number(currentWorkshopLevel || 0) >= Number(troopRequirement || 0)
        : isDarkTroop
          ? Number(currentDarkBarracksLevel || 0) >= Number(troopRequirement || 0)
          : Number(currentBarracksLevel || 0) >= Number(troopRequirement || 0)

      if (maxLevel <= 0) {
        return
      }

      const rows = getStructureRowCount(building, structureLevels[building.id] || [])
      const levelsArray = structureLevels[building.id] || Array.from(
        { length: rows },
        (_, index) => getDefaultRowLevel(building, index, isCopyUnlocked(building, index)),
      )

      for (let i = 0; i < rows; i++) {
        // Locked troops are shown as 0/1 in the UI, so keep denominator at 1 until unlocked.
        const denominatorMax = troopUnlocked ? maxLevel : 1
        const currentLevel = troopUnlocked ? Number(levelsArray[i] || 0) : 0
        totalCurrentLevels += Math.min(Math.max(currentLevel, 0), denominatorMax)
        totalMaxLevels += denominatorMax
      }
    })

    if (totalMaxLevels === 0) return 0
    const rawPercent = (totalCurrentLevels / totalMaxLevels) * 100
    return Math.floor(rawPercent * 10) / 10
  }

  const computeSpellsCompletion = () => {
    const buildings = [...(structureCatalog.spells || [])]
    if (!buildings || buildings.length === 0) return 0

    let totalRatio = 0
    let count = 0

    buildings.forEach((building) => {
      const isDarkSpell = DARK_SPELL_BUILDING_IDS.has(String(building?.id || ''))
      const spellRequirement = isDarkSpell ? getDarkSpellFactoryRequirement(building) : getSpellFactoryRequirement(building)
      const currentFactoryLevel = isDarkSpell ? Number(currentDarkSpellFactoryLevel || 0) : Number(currentSpellFactoryLevel || 0)
      if (currentFactoryLevel < spellRequirement) {
        count += 1
        return
      }

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

  const computeHeroesCompletion = () => {
    const buildings = [...(structureCatalog.heroes || [])]
    if (!buildings || buildings.length === 0) return 0

    let totalCurrentLevels = 0
    let totalMaxLevels = 0

    buildings.forEach((building) => {
      const heroRequirement = getHeroHallUnlockRequirement(building)
      const heroUnlocked = Number(currentHeroHallLevel || 0) >= Number(heroRequirement || 0)
      const levels = (building.levels || []).map((level) => ({
        ...level,
        hero_hall_level_unlocked: Number(level?.hero_hall_level_unlocked ?? 0),
      }))

      const maxLevel = !heroUnlocked
        ? Math.max(...levels.map((level) => Number(level.level || 0)), 0)
        : Math.max(
          ...levels
            .filter((level) => level.hero_hall_level_unlocked <= Number(currentHeroHallLevel || 0))
            .map((level) => Number(level.level || 0)),
          0,
        )

      if (maxLevel <= 0) {
        return
      }

      const rows = getStructureRowCount(building, structureLevels[building.id] || [])
      const levelsArray = structureLevels[building.id] || Array.from({ length: rows }, () => 0)

      for (let i = 0; i < rows; i += 1) {
        const currentLevel = heroUnlocked ? Number(levelsArray[i] || 0) : 0
        totalCurrentLevels += Math.min(Math.max(currentLevel, 0), maxLevel)
        totalMaxLevels += maxLevel
      }
    })

    if (totalMaxLevels === 0) return 0
    const rawPercent = (totalCurrentLevels / totalMaxLevels) * 100
    return Math.floor(rawPercent * 10) / 10
  }

  const computeEquipmentCompletion = () => {
    const buildings = [...(structureCatalog.equipment || [])]
    if (!buildings || buildings.length === 0) return 0

    let totalCurrentProgressLevels = 0
    let totalMaxProgressLevels = 0

    buildings.forEach((building) => {
      const levels = (building.levels || []).map((level) => ({
        ...level,
        blacksmith_level_unlocked: Number(level?.blacksmith_level_unlocked ?? 0),
      }))

      if (levels.length === 0) {
        return
      }

      const minLevel = Math.min(...levels.map((level) => Number(level.level || 0)))
      const maxLevel = Math.max(...levels.map((level) => Number(level.level || 0)))
      const progressRange = Math.max(maxLevel - minLevel, 0)
      const equipmentRequirement = Number(building?.blacksmith_level_unlocked ?? 0)
      const isGemUnlock = String(building?.unlock_source || '').toLowerCase().includes('gem')
      const equipmentUnlocked = isGemUnlock || equipmentRequirement === 0 || Number(currentBlacksmithLevel || 0) >= equipmentRequirement

      const rows = getStructureRowCount(building, structureLevels[building.id] || [])
      const levelsArray = structureLevels[building.id] || Array.from(
        { length: rows },
        (_, index) => getDefaultRowLevel(building, index, isCopyUnlocked(building, index)),
      )

      if (progressRange <= 0) {
        return
      }

      for (let i = 0; i < rows; i += 1) {
        const currentLevel = equipmentUnlocked ? Number(levelsArray[i] || 0) : 0
        const clampedLevel = Math.min(Math.max(currentLevel, 0), maxLevel)
        const progressLevels = Math.max(clampedLevel - minLevel, 0)
        totalCurrentProgressLevels += Math.min(progressLevels, progressRange)
        totalMaxProgressLevels += progressRange
      }
    })

    if (totalMaxProgressLevels === 0) return 0
    const rawPercent = (totalCurrentProgressLevels / totalMaxProgressLevels) * 100
    return Math.floor(rawPercent * 10) / 10
  }

  const computePetsCompletion = () => {
    const buildings = [...(structureCatalog.pets || [])]
    if (!buildings || buildings.length === 0) return 0

    let totalCurrentLevels = 0
    let totalMaxLevels = 0

    buildings.forEach((building) => {
      const maxLevel = Math.max(...(building.levels || []).map((l) => l.level), 0)
      const petRequirement = getPetHouseRequirement(building)
      const petUnlocked = Number(currentPetHouseLevel || 0) >= Number(petRequirement || 0)

      if (maxLevel <= 0) {
        return
      }

      const rows = getStructureRowCount(building, structureLevels[building.id] || [])
      const levelsArray = structureLevels[building.id] || Array.from(
        { length: rows },
        (_, index) => getDefaultRowLevel(building, index, isCopyUnlocked(building, index)),
      )

      for (let i = 0; i < rows; i += 1) {
        // Keep locked pets at 0/1 until Pet House requirement is met.
        const denominatorMax = petUnlocked ? maxLevel : 1
        const currentLevel = petUnlocked ? Number(levelsArray[i] || 0) : 0
        totalCurrentLevels += Math.min(Math.max(currentLevel, 0), denominatorMax)
        totalMaxLevels += denominatorMax
      }
    })

    if (totalMaxLevels === 0) return 0
    const rawPercent = (totalCurrentLevels / totalMaxLevels) * 100
    return Math.floor(rawPercent * 10) / 10
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
    // For equipment unlocked via gems, default to locked (0) so the user can unlock via gems
    const isGemUnlock = String(building?.unlock_source || '').toLowerCase().includes('gem')
    if (isGemUnlock) return 0
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
        const resourceKey = normalizeResourceId(levelInfo.resource || '')
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
          if (HERO_BUILDING_IDS.has(String(building?.id || '')) && Number(currentHeroHallLevel || 0) < getHeroHallUnlockRequirement(building)) {
            continue
          }

          const rowBuildingId = `${building.id}-${rowIndex + 1}`
          const pendingUpgrade = getPendingUpgradeForRow(activeVillage?.id, rowBuildingId, rowIndex)
          const rowLevel = pendingUpgrade
            ? Number(pendingUpgrade.toLevel)
            : Number(levelsArray[rowIndex] ?? getDefaultRowLevel(building, rowIndex, isCopyUnlocked(building, rowIndex)))
          const nextLevels = PET_BUILDING_IDS.has(String(building?.id || ''))
            ? getNextUpgradeLevels(building, rowLevel).filter((levelInfo) => Number(levelInfo.pet_house_level_unlocked ?? building?.pet_house_level_unlocked ?? 0) <= Number(currentPetHouseLevel || 0))
            : (TROOP_BUILDING_IDS.has(String(building?.id || '')) || DARK_TROOP_BUILDING_IDS.has(String(building?.id || '')) || SPELL_BUILDING_IDS.has(String(building?.id || '')))
            ? getNextUpgradeLevels(building, rowLevel).filter((levelInfo) => Number(levelInfo.lab_level_unlocked ?? 0) <= Number(currentLabLevel || 0))
            : HERO_BUILDING_IDS.has(String(building?.id || ''))
              ? getNextUpgradeLevels(building, rowLevel).filter((levelInfo) => Number(levelInfo.hero_hall_level_unlocked ?? 0) <= Number(currentHeroHallLevel || 0))
              : getNextUpgradeLevels(building, rowLevel)
          remainingBetaTotalUpgrades += nextLevels.length

          nextLevels.forEach((levelInfo) => {
            if (activeLoadedTab === 'equipment' && Array.isArray(levelInfo.resource_costs) && levelInfo.resource_costs.length > 0) {
              levelInfo.resource_costs.forEach(({ resource, cost }) => {
                const key = normalizeResourceId(resource)
                if (Object.prototype.hasOwnProperty.call(remainingBetaTotalsByResource, key)) {
                  remainingBetaTotalsByResource[key] += Number(cost || 0)
                }
              })
            } else {
              const resourceKey = normalizeResourceId(levelInfo.resource || '')
              if (Object.prototype.hasOwnProperty.call(remainingBetaTotalsByResource, resourceKey)) {
                remainingBetaTotalsByResource[resourceKey] += Number(levelInfo.cost || 0)
              }
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
    .filter((resource) => {
      // For equipment tab, always show ore rows (glowy/shiny/starry) even if zero so the user sees all ores
      if (activeLoadedTab === 'equipment') {
        return resource.total > 0 || ['glowy_ore', 'shiny_ore', 'starry_ore'].includes(resource.id)
      }
      return resource.total > 0
    })
    // enforce a stable ordering: ores first (glowy, shiny, starry), then gold/elixir/dark_elixir
    .sort((a, b) => {
      // prefer order: shiny, glowy, starry, then gold/elixir/dark_elixir
      const order = ['shiny_ore', 'glowy_ore', 'stary_ore', 'gold', 'elixir', 'dark_elixir']
      const ai = order.indexOf(a.id)
      const bi = order.indexOf(b.id)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })

  const remainingBetaMaxBuilderCount = Math.max(1, Math.min(5, remainingBetaTotalUpgrades || 1))
  const savedVillageBuilderCount = Math.max(1, Math.min(5, Number(activeVillage?.builder_count) || 2))
  const isLabTabActive = activeLoadedTab === 'troops' || activeLoadedTab === 'spells' || activeLoadedTab === 'dark_troops' || activeLoadedTab === 'sieges'
  const remainingBetaSelectorCount = isLabTabActive ? 1 : savedVillageBuilderCount
  const displayedBuilderCount = Math.max(1, Math.min(remainingBetaSelectorCount, Number(remainingBetaBuilderCount) || savedVillageBuilderCount))
  const remainingBetaUnitLabel = isLabTabActive ? 'Lab Worker' : 'Builders'
  const remainingBetaUnitLabelLower = isLabTabActive ? 'lab worker' : 'builders'

  const remainingBetaTimeSeconds = Math.ceil(
    remainingBetaTotalSeconds / displayedBuilderCount
  )

  useEffect(() => {
    if (activeLoadedTab === 'walls') return

    if (activeLoadedTab === 'troops' || activeLoadedTab === 'spells' || activeLoadedTab === 'dark_troops' || activeLoadedTab === 'sieges') {
      setRemainingBetaBuilderCount(1)
      return
    }

    const savedBuilderCount = Number(activeVillage?.builder_count)
    if (savedBuilderCount) {
      setRemainingBetaBuilderCount(Math.min(5, Math.max(1, savedBuilderCount)))
      return
    }

    setRemainingBetaBuilderCount(Math.max(1, Math.min(5, remainingBetaTotalUpgrades || 1)))
  }, [activeLoadedTab, activeVillage?.builder_count, remainingBetaTotalUpgrades])

  useEffect(() => {
    if (activeLoadedTab !== 'walls') return
    if (!activeVillage?.townhall_level) return

    void loadWallsSnapshot()
  }, [activeLoadedTab, activeVillage?.id, activeVillage?.townhall_level])

  useEffect(() => {
    if (!showTrapsTab && activeLoadedTab === 'traps') {
      setActiveLoadedTab('defences')
    }
  }, [activeLoadedTab, showTrapsTab])

  useEffect(() => {
    if (!showSpellsTab && activeLoadedTab === 'spells') {
      setActiveLoadedTab('defences')
    }
  }, [activeLoadedTab, showSpellsTab])

  useEffect(() => {
    if (!showDarkTroopsTab && activeLoadedTab === 'dark_troops') {
      setActiveLoadedTab('defences')
    }
  }, [activeLoadedTab, showDarkTroopsTab])

  useEffect(() => {
    if (!showSiegesTab && activeLoadedTab === 'sieges') {
      setActiveLoadedTab('defences')
    }
  }, [activeLoadedTab, showSiegesTab])

  useEffect(() => {
    if (!showHeroesTab && activeLoadedTab === 'heroes') {
      setActiveLoadedTab('defences')
    }
  }, [activeLoadedTab, showHeroesTab])

  useEffect(() => {
    if (!showEquipmentTab && activeLoadedTab === 'equipment') {
      setActiveLoadedTab('defences')
    }
  }, [activeLoadedTab, showEquipmentTab])

  useEffect(() => {
    if (!showPetsTab && activeLoadedTab === 'pets') {
      setActiveLoadedTab('defences')
    }
  }, [activeLoadedTab, showPetsTab])

  const getBuildingImagePath = (building, level) => {
    const requestedLevel = Math.max(0, Number(level) || 0)

    const buildingId = building?.id
    const imageMap = {
      canon: (imageLevel) => canonImages[`../assets/Defences/canon/18_${imageLevel}.png`] || '',
      mortar: (imageLevel) => mortarImages[`../assets/Defences/mortar/23_${imageLevel}.png`] || '',
      bomb_tower: (imageLevel) => bombTowerImages[`../assets/Defences/Bomb_tower/17_${imageLevel}.png`] || '',
      air_defense: (imageLevel) => airDefenseImages[`../assets/Defences/air_defense/14_${imageLevel}.png`] || '',
      air_sweeper: (imageLevel) => airSweeperImages[`../assets/Defences/air_sweeper/15_${imageLevel}.png`] || '',
      hidden_tesla: (imageLevel) => hiddenTeslaImages[`../assets/Defences/hidden_tesla/21_${imageLevel}.png`] || '',
      inferno_tower: (imageLevel) => infernoTowerImages[`../assets/Defences/Inferno_tower/22_${imageLevel}.png`] || '',
      x_bow: (imageLevel) => xBowImages[`../assets/Defences/x-bow/25_${imageLevel}.png`] || '',
      eagle_artillery: (imageLevel) => eagleArtilleryImages[`../assets/Defences/Eagle_Artillery/20_${imageLevel}.png`] || '',
      scattershot: (imageLevel) => scattershotImages[`../assets/Defences/scattershot/119_${imageLevel}.png`] || '',
      bomb: (imageLevel) => bombImages[`../assets/Traps/Bomb/27_${imageLevel}.png`] || '',
      giant_bomb: (imageLevel) => giantBombImages[`../assets/Traps/Gaint_Bomb/28_${imageLevel}.png`] || '',
      skeleton_trap: (imageLevel) => skeletonTrapImages[`../assets/Traps/Skeleton_Trap/64_${imageLevel}.png`] || '',
      air_bomb: (imageLevel) => airBombImages[`../assets/Traps/Air_Bomb/26_${imageLevel}.png`] || '',
      seeking_air_mine: (imageLevel) => seekingAirMineImages[`../assets/Traps/Seeking_Air_Mine/29_${imageLevel}.png`] || '',
      spring_trap: (imageLevel) => springTrapImages[`../assets/Traps/Spring_Trap/30_${imageLevel}.png`] || '',
      tornado_trap: (imageLevel) => tornadoTrapImages[`../assets/Traps/Tornado_Trap/108_${imageLevel}.png`] || '',
      archer_tower: (imageLevel) => archerTowerImages[`../assets/Defences/Archer_Tower/16_${imageLevel}.png`] || '',
      builder_hut: (imageLevel) => builderHutImages[`../assets/Defences/Builder_hut/127_${imageLevel}.png`] || '',
      wizard_tower: (imageLevel) => wizardTowerImages[`../assets/Defences/wizard_tower/24_${imageLevel}.png`] || '',
      army_camp: (imageLevel) => armyCampImages[`../assets/Army/Army_Camp/10_${imageLevel}.png`] || '',
      barracks: (imageLevel) => barracksImages[`../assets/Army/Barracks/8_${imageLevel}.png`] || '',
      dark_barracks: (imageLevel) => darkBarracksImages[`../assets/Army/Dark_Barracks/9_${imageLevel}.png`] || '',
      spell_factory: (imageLevel) => spellFactoryImages[`../assets/Army/Spell_Factory/11_${imageLevel}.png`] || '',
      dark_spell_factory: (imageLevel) => darkSpellFactoryImages[`../assets/Army/Dark_Spell_Factory/12_${imageLevel}.png`] || '',
      workshop: (imageLevel) => workshopImages[`../assets/Army/Workshop/104_${imageLevel}.png`] || '',
      clan_castle: (imageLevel) => clanCastleImages[`../assets/Army/clan_castle/19_${imageLevel}.png`] || '',
      lab: (imageLevel) => labImages[`../assets/Army/Lab/13_${imageLevel}.png`] || '',
      blacksmith: (imageLevel) => blacksmithImages[`../assets/Army/Blacksmith/152_${imageLevel}.png`] || '',
      hero_hall: (imageLevel) => heroHallImages[`../assets/Army/Hero_Hall/202_${imageLevel}.png`] || '',
      pet_house: (imageLevel) => petHouseImages[`../assets/Army/Pet_House/128_${imageLevel}.png`] || '',
      lassi: () => lassiPetImages['../assets/pets/L.A.S.S.I/129.png'] || lassiPetImages['../assets/pets/L.A.S.S.I/129_0.png'] || '',
      electro_owl: () => electroOwlPetImages['../assets/pets/Electro_Owl/130.png'] || electroOwlPetImages['../assets/pets/Electro_Owl/130_0.png'] || '',
      mighty_yak: () => mightyYakPetImages['../assets/pets/Might_Yak/131.png'] || mightyYakPetImages['../assets/pets/Might_Yak/131_0.png'] || '',
      unicorn: () => unicornPetImages['../assets/pets/Unicorn/132.png'] || unicornPetImages['../assets/pets/Unicorn/132_0.png'] || '',
      gold_mine: (imageLevel) => goldMineImages[`../assets/Resources/goldmine/2_${imageLevel}.png`] || '',
      elixir_collector: (imageLevel) => elixirCollectorImages[`../assets/Resources/elixir_collector/3_${imageLevel}.png`] || '',
      gold_storage: (imageLevel) => goldStorageImages[`../assets/Resources/gold_storage/5_${imageLevel}.png`] || '',
      elixir_storage: (imageLevel) => elixirStorageImages[`../assets/Resources/elixi_storage/6_${imageLevel}.png`] || '',
      dark_elixir_driller: (imageLevel) => darkElixirDrillerImages[`../assets/Resources/dark_elixir_driller/4_${imageLevel}.png`] || '',
      dark_elixir_storage: (imageLevel) => darkElixirStorageImages[`../assets/Resources/dark_elixir_storage/7_${imageLevel}.png`] || '',
      helper_hut: (imageLevel) => helperHutImages[`../assets/Resources/Helper_hut/206_${imageLevel}.png`] || '',
      barbarian: (imageLevel) => barbarianTroopImages[`../assets/Troops/Barbarian/31_${imageLevel}.png`] || '',
      archer: (imageLevel) => archerTroopImages[`../assets/Troops/Archer/32_${imageLevel}.png`] || '',
      giant: (imageLevel) => giantTroopImages[`../assets/Troops/Giant/33_${imageLevel}.png`] || '',
      goblin: (imageLevel) => goblinTroopImages[`../assets/Troops/Goblin/34_${imageLevel}.png`] || '',
      wall_breaker: (imageLevel) => wallBreakerImages[`../assets/Troops/Wall_breaker/35_${imageLevel}.png`] || '',
      balloon: (imageLevel) => balloonTroopImages[`../assets/Troops/Ballon/36_${imageLevel}.png`] || '',
      wizard: (imageLevel) => wizardTroopImages[`../assets/Troops/wizard/37_${imageLevel}.png`] || '',
      healer: (imageLevel) => healerTroopImages[`../assets/Troops/Healer/38_${imageLevel}.png`] || '',
      dragon: (imageLevel) => dragonTroopImages[`../assets/Troops/Dragon/39_${imageLevel}.png`] || '',
      pekka: (imageLevel) => pekkaTroopImages[`../assets/Troops/P.E.K.K.A/40_${imageLevel}.png`] || '',
      baby_dragon: (imageLevel) => babyDragonTroopImages[`../assets/Troops/Baby_Dragon/41_${imageLevel}.png`] || '',
      miner: (imageLevel) => minerTroopImages[`../assets/Troops/Miner/42_${imageLevel}.png`] || '',
      electro_dragon: (imageLevel) => electroDragonTroopImages[`../assets/Troops/Electro_Dragon/103_${imageLevel}.png`] || '',
      electro_titan: (imageLevel) => electroTitanTroopImages[`../assets/Troops/Electro_Titan/138_${imageLevel}.png`] || '',
      yeti: (imageLevel) => yetiTroopImages[`../assets/Troops/Yeti/121_${imageLevel}.png`] || '',
      dragon_rider: (imageLevel) => dragonRiderTroopImages[`../assets/Troops/DragonRider/133_${imageLevel}.png`] || '',
      minion: (imageLevel) => minionDarkTroopImages[`../assets/Dark_Troops/Minion/53_${imageLevel}.png`] || '',
      hog_rider: (imageLevel) => hogRiderDarkTroopImages[`../assets/Dark_Troops/Hog_rider/54_${imageLevel}.png`] || '',
      valkyrie: (imageLevel) => valkyrieDarkTroopImages[`../assets/Dark_Troops/Valkyrie/55_${imageLevel}.png`] || '',
      golem: (imageLevel) => golemDarkTroopImages[`../assets/Dark_Troops/Golem/56_${imageLevel}.png`] || '',
      witch: (imageLevel) => witchDarkTroopImages[`../assets/Dark_Troops/Witch/57_${imageLevel}.png`] || '',
      lava_hound: (imageLevel) => lavaHoundDarkTroopImages[`../assets/Dark_Troops/Lava_Hound/58_${imageLevel}.png`] || '',
      bowler: (imageLevel) => bowlerDarkTroopImages[`../assets/Dark_Troops/Bowler/59_${imageLevel}.png`] || '',
      ice_golem: (imageLevel) => iceGolemDarkTroopImages[`../assets/Dark_Troops/Ice_Golem/111_${imageLevel}.png`] || '',
      head_hunter: (imageLevel) => headHunterDarkTroopImages[`../assets/Dark_Troops/HeadHunter/123_${imageLevel}.png`] || '',
      apprentice_warden: (imageLevel) => apprenticeWardenDarkTroopImages[`../assets/Dark_Troops/Apprentice_Warden/151_${imageLevel}.png`] || '',
      druid: (imageLevel) => druidDarkTroopImages[`../assets/Dark_Troops/Druid/197_${imageLevel}.png`] || '',
      wall_wrecker: (imageLevel) => wallWreckerSiegeImages[`../assets/Seige_machines/Wall_Wrecker/105_${imageLevel}.png`] || '',
      battle_blimp: (imageLevel) => battleBlimpSiegeImages[`../assets/Seige_machines/Battle_Blimp/106_${imageLevel}.png`] || '',
      stone_slammer: (imageLevel) => stoneSlammerSiegeImages[`../assets/Seige_machines/Stone_Slammer/109_${imageLevel}.png`] || '',
      siege_barracks: (imageLevel) => siegeBarracksSiegeImages[`../assets/Seige_machines/Siege_Barracks/120_${imageLevel}.png`] || '',
      log_launcher: (imageLevel) => logLauncherSiegeImages[`../assets/Seige_machines/Log_Launcher/125_${imageLevel}.png`] || '',
      flame_flinger: (imageLevel) => flameFlingerSiegeImages[`../assets/Seige_machines/Flame_Flinger/134_${imageLevel}.png`] || '',
      battle_drill: (imageLevel) => battleDrillSiegeImages[`../assets/Seige_machines/Battle_Drill/139_${imageLevel}.png`] || '',
      troop_launcher: (imageLevel) => troopLauncherSiegeImages[`../assets/Seige_machines/Troop_Launcher/215_${imageLevel}.png`] || '',
      lightning_spell: (imageLevel) => imageLevel === 0 ? (lightningSpellImages['../assets/spells/Lightning_Spell/43_0.png'] || '') : (lightningSpellImages['../assets/spells/Lightning_Spell/43.png'] || ''),
      healing_spell: (imageLevel) => imageLevel === 0 ? (healingSpellImages['../assets/spells/Healing_Spell/44_0.png'] || '') : (healingSpellImages['../assets/spells/Healing_Spell/44.png'] || ''),
      rage_spell: (imageLevel) => imageLevel === 0 ? (rageSpellImages['../assets/spells/Rage_Spell/45_0.png'] || '') : (rageSpellImages['../assets/spells/Rage_Spell/45.png'] || ''),
      jump_spell: (imageLevel) => imageLevel === 0 ? (jumpSpellImages['../assets/spells/Jump_Spell/46_0.png'] || '') : (jumpSpellImages['../assets/spells/Jump_Spell/46.png'] || ''),
      freeze_spell: (imageLevel) => imageLevel === 0 ? (freezeSpellImages['../assets/spells/Freeze_Spell/47_0.png'] || '') : (freezeSpellImages['../assets/spells/Freeze_Spell/47.png'] || ''),
      clone_spell: (imageLevel) => imageLevel === 0 ? (cloneSpellImages['../assets/spells/Clone_Spell/48_0.png'] || '') : (cloneSpellImages['../assets/spells/Clone_Spell/48.png'] || ''),
      poison_spell: (imageLevel) => imageLevel === 0 ? (poisonSpellImages['../assets/spells/Poison_Spell/49_0.png'] || '') : (poisonSpellImages['../assets/spells/Poison_Spell/49.png'] || ''),
      earthquake_spell: (imageLevel) => imageLevel === 0 ? (earthquakeSpellImages['../assets/spells/Earthquake_Spell/50_0.png'] || '') : (earthquakeSpellImages['../assets/spells/Earthquake_Spell/50.png'] || ''),
      haste_spell: (imageLevel) => imageLevel === 0 ? (hasteSpellImages['../assets/spells/Haste_Spell/51_0.png'] || '') : (hasteSpellImages['../assets/spells/Haste_Spell/51.png'] || ''),
      skeleton_spell: (imageLevel) => imageLevel === 0 ? (skeletonSpellImages['../assets/spells/Skeleton_Spell/52_0.png'] || '') : (skeletonSpellImages['../assets/spells/Skeleton_Spell/52.png'] || ''),
      bat_spell: (imageLevel) => imageLevel === 0
        ? (batSpellImages['../assets/spells/Bat_spell/110_0.png'] || '')
        : (batSpellImages['../assets/spells/Bat_spell/110.png'] || ''),
      ice_block_spell: (imageLevel) => imageLevel === 0
        ? (iceBlockSpellImages['../assets/spells/Ice_Block_spell/236_0.png'] || '')
        : (iceBlockSpellImages['../assets/spells/Ice_Block_spell/236.png'] || ''),
      overgrowth_spell: (imageLevel) => imageLevel === 0
        ? (overgrowthSpellImages['../assets/spells/Overgrowth_Spell/175_0.png'] || '')
        : (overgrowthSpellImages['../assets/spells/Overgrowth_Spell/175.png'] || ''),
      invisibility_spell: (imageLevel) => imageLevel === 0
        ? (invisibilitySpellImages['../assets/spells/Invisibility_Spell/124_0.png'] || '')
        : (invisibilitySpellImages['../assets/spells/Invisibility_Spell/124.png'] || ''),
      recall_spell: (imageLevel) => imageLevel === 0
        ? (recallSpellImages['../assets/spells/Recall_Spell/140_0.png'] || '')
        : (recallSpellImages['../assets/spells/Recall_Spell/140.png'] || ''),
      barbarian_king: (imageLevel) => imageLevel === 0 ? (barbarianKingImages['../assets/Heros/Barbarian_King/61_0.png'] || '') : (barbarianKingImages['../assets/Heros/Barbarian_King/61.png'] || ''),
      archer_queen: (imageLevel) => imageLevel === 0 ? (archerQueenImages['../assets/Heros/Archer_Queen/62_0.png'] || '') : (archerQueenImages['../assets/Heros/Archer_Queen/62.png'] || ''),
      grand_warden: (imageLevel) => imageLevel === 0 ? (grandWardenImages['../assets/Heros/Grand_Warden/63_0.png'] || '') : (grandWardenImages['../assets/Heros/Grand_Warden/63.png'] || ''),
      royal_champion: (imageLevel) => imageLevel === 0 ? (royalChampionImages['../assets/Heros/Royal_Champion/122_0.png'] || '') : (royalChampionImages['../assets/Heros/Royal_Champion/122.png'] || ''),
      minion_prince: (imageLevel) => imageLevel === 0 ? (minionPrinceImages['../assets/Heros/Minion_Prince/208_0.png'] || '') : (minionPrinceImages['../assets/Heros/Minion_Prince/208.png'] || ''),
      dragon_duke: (imageLevel) => imageLevel === 0 ? (dragonDukeImages['../assets/Heros/Dragon_Duke/260_0.png'] || '') : (dragonDukeImages['../assets/Heros/Dragon_Duke/260.png'] || ''),
    }

    const prefix = imageMap[buildingId]

    if (prefix) {
      const requestedImage = prefix(requestedLevel)
      if (requestedImage) return requestedImage
      return ''
    }

    // Equipment pieces have a fixed static image path (not level-based)
    if (EQUIPMENT_BUILDING_IDS.has(buildingId)) {
      const staticImage = building?.image_path || building?.image
      if (staticImage) return staticImage
      // Fall back to BUILDING_SECTIONS static definition when the snapshot doesn't carry the image field
      const staticEntry = BUILDING_SECTIONS.equipment.find((entry) => entry.id === buildingId)
      return staticEntry?.image || ''
    }

    const fallbackImagePath = building?.image_path || building?.image
    if (fallbackImagePath) {
      return `${fallbackImagePath}${requestedLevel}.png`
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
    const equipmentType = normalizeEquipmentType(building?.equipment_type)
    const equipmentRarity = normalizeEquipmentRarity(building?.equipment_rarity)
    const isEquipmentCard = activeLoadedTab === 'equipment' && EQUIPMENT_BUILDING_IDS.has(String(building?.id || ''))
    const currentLevels = structureLevels[building.id] || []
    const rowCount = getStructureRowCount(building, currentLevels)
    const maxLevel = Math.max(...(building.levels || []).map((level) => level.level), 0)
    const troopBarracksRequirement = getTroopBarracksRequirement(building)
    const siegeWorkshopRequirement = getSiegeWorkshopRequirement(building)
    const spellFactoryRequirement = getSpellFactoryRequirement(building)
    const darkSpellFactoryRequirement = getDarkSpellFactoryRequirement(building)
    const heroHallRequirement = getHeroHallUnlockRequirement(building)
    const getMinimumLevel = (rowIndex) => getDefaultRowLevel(building, rowIndex, isCopyUnlocked(building, rowIndex))
    const clampLevel = (value, rowIndex) => Math.min(Math.max(Number(value || 0), getMinimumLevel(rowIndex)), maxLevel)
    const buttonLevels = Array.from({ length: maxLevel }, (_, index) => index + 1)

    const rowStates = Array.from({ length: rowCount }, (_, rowIndex) => {
      const defaultLevel = getDefaultRowLevel(building, rowIndex, isCopyUnlocked(building, rowIndex))
      const rowLevel = clampLevel(currentLevels[rowIndex] ?? defaultLevel, rowIndex)
      const minimumLevel = getMinimumLevel(rowIndex)
      const upgradeSummary = getUpgradeSummary(building, rowLevel, currentLabLevel, currentHeroHallLevel, currentBlacksmithLevel)
      const pendingUpgrade = getPendingUpgradeForRow(activeVillage?.id, `${building.id}-${rowIndex + 1}`, rowIndex)
      const pendingRemainingSeconds = pendingUpgrade ? Math.max(0, Math.ceil((Number(pendingUpgrade.finishAt) - upgradeClock) / 1000)) : 0
      const pendingDurationSeconds = pendingUpgrade ? Math.max(0, Number(pendingUpgrade.durationSeconds || 0)) : 0
      const pendingProgressPercent = pendingUpgrade && pendingDurationSeconds > 0
        ? Math.max(0, Math.min(100, Math.round(((pendingDurationSeconds - pendingRemainingSeconds) / pendingDurationSeconds) * 100)))
        : 0
      const allRemainingNextLevels = pendingUpgrade
        ? upgradeSummary.allNextLevels.filter((levelInfo) => Number(levelInfo.level) > Number(pendingUpgrade.toLevel))
        : upgradeSummary.allNextLevels
      const visibleNextLevels = pendingUpgrade
        ? upgradeSummary.nextLevels.filter((levelInfo) => Number(levelInfo.level) > Number(pendingUpgrade.toLevel))
        : upgradeSummary.nextLevels
      const equipmentUsesBlacksmithRequirement = allRemainingNextLevels.some((levelInfo) => Number(levelInfo?.blacksmith_level_unlocked ?? building?.blacksmith_level_unlocked ?? 0) > 0)
      const blacksmithLockedNextLevels = equipmentUsesBlacksmithRequirement
        ? allRemainingNextLevels.filter((levelInfo) => Number(levelInfo.blacksmith_level_unlocked ?? building?.blacksmith_level_unlocked ?? 0) > Number(currentBlacksmithLevel || 0))
        : []
      const labLockedNextLevels = PET_BUILDING_IDS.has(String(building?.id || ''))
        ? allRemainingNextLevels.filter((levelInfo) => Number(levelInfo.pet_house_level_unlocked ?? building?.pet_house_level_unlocked ?? 0) > Number(currentPetHouseLevel || 0))
        : (TROOP_BUILDING_IDS.has(String(building?.id || '')) || DARK_TROOP_BUILDING_IDS.has(String(building?.id || '')) || SIEGE_BUILDING_IDS.has(String(building?.id || '')) || SPELL_BUILDING_IDS.has(String(building?.id || '')))
        ? allRemainingNextLevels.filter((levelInfo) => Number(levelInfo.lab_level_unlocked ?? 0) > Number(currentLabLevel || 0))
        : HERO_BUILDING_IDS.has(String(building?.id || ''))
          ? allRemainingNextLevels.filter((levelInfo) => Number(levelInfo.hero_hall_level_unlocked ?? 0) > Number(currentHeroHallLevel || 0))
          : equipmentUsesBlacksmithRequirement
            ? blacksmithLockedNextLevels
            : []
      const labRequirementLevel = labLockedNextLevels.length > 0
        ? Math.min(...labLockedNextLevels.map((levelInfo) =>
            PET_BUILDING_IDS.has(String(building?.id || ''))
              ? Number(levelInfo.pet_house_level_unlocked ?? building?.pet_house_level_unlocked ?? 0) || 0
              : (TROOP_BUILDING_IDS.has(String(building?.id || '')) || DARK_TROOP_BUILDING_IDS.has(String(building?.id || '')) || SIEGE_BUILDING_IDS.has(String(building?.id || '')) || SPELL_BUILDING_IDS.has(String(building?.id || '')))
              ? Number(levelInfo.lab_level_unlocked || 0) || 0
              : HERO_BUILDING_IDS.has(String(building?.id || ''))
                ? Number(levelInfo.hero_hall_level_unlocked || 0) || 0
                : equipmentUsesBlacksmithRequirement
                  ? Number(levelInfo.blacksmith_level_unlocked || 0) || 0
                  : Number(levelInfo.hero_hall_level_unlocked || 0) || 0
          ))
        : blacksmithLockedNextLevels.length > 0
          ? Math.min(...blacksmithLockedNextLevels.map((levelInfo) => Number(levelInfo.blacksmith_level_unlocked ?? building?.blacksmith_level_unlocked ?? 0) || 0))
        : null
      const labRequirementLabel = PET_BUILDING_IDS.has(String(building?.id || ''))
        ? 'Pet House'
        : (TROOP_BUILDING_IDS.has(String(building?.id || '')) || DARK_TROOP_BUILDING_IDS.has(String(building?.id || '')) || SIEGE_BUILDING_IDS.has(String(building?.id || '')) || SPELL_BUILDING_IDS.has(String(building?.id || '')))
        ? 'Lab'
        : HERO_BUILDING_IDS.has(String(building?.id || ''))
          ? 'Hero Hall'
          : blacksmithLockedNextLevels.length > 0
            ? 'Blacksmith'
            : 'Requirement'
      const pendingLevelInfo = pendingUpgrade ? visibleNextLevels[0] || null : null
      const allRemainingTotalCost = allRemainingNextLevels.reduce((total, level) => total + Number(level.cost || 0), 0)
      const allRemainingTotalSeconds = allRemainingNextLevels.reduce((total, level) => total + getTimeSeconds(level.time), 0)
      const visibleTotalCost = visibleNextLevels.reduce((total, level) => total + Number(level.cost || 0), 0)
      const visibleTotalSeconds = visibleNextLevels.reduce((total, level) => total + getTimeSeconds(level.time), 0)
      const labLockedTotalCost = labLockedNextLevels.reduce((total, level) => total + Number(level.cost || 0), 0)
      const labLockedTotalSeconds = labLockedNextLevels.reduce((total, level) => total + getTimeSeconds(level.time), 0)
      const summaryResource = allRemainingNextLevels[0]?.resource || visibleNextLevels[0]?.resource || upgradeSummary.totalResource || ''
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
        allRemainingNextLevels,
        allRemainingTotalCost,
        allRemainingTotalSeconds,
        visibleNextLevels,
        labLockedNextLevels,
        labRequirementLevel,
        labRequirementLabel,
        visibleTotalCost,
        visibleTotalSeconds,
        labLockedTotalCost,
        labLockedTotalSeconds,
        summaryResource,
        statusIcon: rowLevel <= 0 ? (
          <HandymanOutlinedIcon className={styles.readOnlyActionIcon} />
        ) : (
          <ArrowUpwardIcon className={styles.readOnlyActionIcon} />
        ),
      }
    })

    const isUpgradeLevelLocked = (rowState, levelInfo) => {
      if (rowState?.labRequirementLabel === 'Lab') {
        return Number(levelInfo?.lab_level_unlocked ?? 0) > Number(currentLabLevel || 0)
      }

      if (rowState?.labRequirementLabel === 'Hero Hall') {
        return Number(levelInfo?.hero_hall_level_unlocked ?? 0) > Number(currentHeroHallLevel || 0)
      }

      if (rowState?.labRequirementLabel === 'Pet House') {
        return Number(levelInfo?.pet_house_level_unlocked ?? building?.pet_house_level_unlocked ?? rowState?.labRequirementLevel ?? 0) > Number(currentPetHouseLevel || 0)
      }

      if (rowState?.labRequirementLabel === 'Blacksmith') {
        const requiredBlacksmithLevel = Number(levelInfo?.blacksmith_level_unlocked ?? building?.blacksmith_level_unlocked ?? rowState?.labRequirementLevel ?? 0)
        return requiredBlacksmithLevel > Number(currentBlacksmithLevel || 0)
      }

      return false
    }

    const tableRowStyle = {
      gridTemplateRows: `repeat(${rowCount}, minmax(0, auto))`,
    }
    const rowsColumnStyle = {
      gridRow: `1 / span ${rowCount}`,
    }
    const upgradeListClassName = activeLoadedTab === 'equipment'
      ? `${styles.readOnlyUpgradeList} ${styles.readOnlyUpgradeListEquipment}`
      : styles.readOnlyUpgradeList
    const hideLevelOneInUpgradeList = ['troops', 'dark_troops', 'sieges', 'pets', 'spells', 'dark_spells', 'heroes', 'equipment'].includes(activeLoadedTab)
    const getVisibleUpgradeLevels = (levels = []) => (
      hideLevelOneInUpgradeList
        ? levels.filter((levelInfo) => Number(levelInfo?.level) !== 1)
        : levels
    )

    if (readOnly) {
            const isTroopTabCard = activeLoadedTab === 'troops' && TROOP_BUILDING_IDS.has(String(building?.id || ''))
            const isDarkTroopTabCard = activeLoadedTab === 'dark_troops' && DARK_TROOP_BUILDING_IDS.has(String(building?.id || ''))
            const isSiegeTabCard = activeLoadedTab === 'sieges' && SIEGE_BUILDING_IDS.has(String(building?.id || ''))
            const isPetTabCard = activeLoadedTab === 'pets' && PET_BUILDING_IDS.has(String(building?.id || ''))
            const isSpellTabCard = (activeLoadedTab === 'spells' || activeLoadedTab === 'dark_spells') && SPELL_BUILDING_IDS.has(String(building?.id || ''))

            if (isTroopTabCard || isDarkTroopTabCard || isSiegeTabCard || isPetTabCard || isSpellTabCard) {
              const troopRowState = rowStates[0] || null
              const isDarkSpellBuilding = SPELL_BUILDING_IDS.has(String(building?.id || '')) && DARK_SPELL_BUILDING_IDS.has(String(building?.id || ''))
              const troopUnlocked = isTroopTabCard
                ? currentBarracksLevel >= troopBarracksRequirement
                : isDarkTroopTabCard
                  ? currentDarkBarracksLevel >= getDarkTroopBarracksRequirement(building)
                  : isSiegeTabCard
                    ? currentWorkshopLevel >= siegeWorkshopRequirement
                  : isPetTabCard
                    ? currentPetHouseLevel >= getPetHouseRequirement(building)
                  : isDarkSpellBuilding
                    ? currentDarkSpellFactoryLevel >= darkSpellFactoryRequirement
                    : currentSpellFactoryLevel >= spellFactoryRequirement
              const troopRowLevel = troopUnlocked ? Number(troopRowState?.rowLevel || 0) : 0
              const troopRowImageLevel = troopRowLevel
              const troopDisplayMaxLevel = Math.max(1, Number(maxLevel || 0))
              const troopUnlockRequirementLabel = isTroopTabCard
                ? `Requires Barracks level ${troopBarracksRequirement} to unlock`
                : isDarkTroopTabCard
                  ? `Requires Dark Barracks level ${getDarkTroopBarracksRequirement(building)} to unlock`
                  : isSiegeTabCard
                    ? `Requires Workshop level ${siegeWorkshopRequirement} to unlock`
                  : isPetTabCard
                    ? `Requires Pet House level ${getPetHouseRequirement(building)} to unlock`
                  : isDarkSpellBuilding
                    ? `Requires Dark Spell Factory level ${darkSpellFactoryRequirement} to unlock`
                    : `Requires Spell Factory level ${spellFactoryRequirement} to unlock`

              if (!troopUnlocked) {
                const lockedPreviewLevels = getVisibleUpgradeLevels(getNextUpgradeLevels(building, 0))
                const lockedPreviewTotalCost = lockedPreviewLevels.reduce((total, levelInfo) => total + Number(levelInfo.cost || 0), 0)
                const lockedPreviewTotalSeconds = lockedPreviewLevels.reduce((total, levelInfo) => total + getTimeSeconds(levelInfo.time), 0)
                const lockedPreviewResource = lockedPreviewLevels[0]?.resource || 'gold'

                return (
                  <section key={cardKey} className={`${styles.defenceCard} ${styles.readOnlyBuildingBlock}`}>
                    <div className={styles.readOnlyCardGrid} style={tableRowStyle}>
                      <div className={styles.readOnlySummaryPanel} style={{ gridRow: `1 / span ${rowCount}` }}>
                        {getBuildingImagePath(building, troopRowImageLevel) ? (
                          <img
                            src={getBuildingImagePath(building, troopRowImageLevel)}
                            alt={displayName}
                            className={styles.readOnlySummaryImage}
                          />
                        ) : (
                          <div className={styles.readOnlySummaryImagePlaceholder} />
                        )}

                        <div className={styles.readOnlySummaryName}>{displayName}</div>
                      </div>

                      <div className={styles.readOnlyRowsColumn} style={rowsColumnStyle}>
                        <div className={styles.readOnlyRow}>
                          <div className={styles.readOnlyTroopLevelCell}>
                            {getBuildingImagePath(building, troopRowImageLevel) ? (
                              <img
                                src={getBuildingImagePath(building, troopRowImageLevel)}
                                alt={displayName}
                                className={styles.readOnlyRowImage}
                              />
                            ) : (
                              <div className={styles.defenceIconPlaceholder} />
                            )}

                            <div className={styles.readOnlyTroopLevelMeta}>
                              <div className={styles.readOnlyLevelValue}>{troopRowLevel}/{troopDisplayMaxLevel}</div>
                              <LockOutlinedIcon className={`${styles.readOnlyActionIcon} ${styles.readOnlyTroopStateIconLocked}`} />
                            </div>
                          </div>

                          <div className={styles.readOnlyTroopDetails}>
                            <div className={styles.readOnlyUpgradeProgressBlock}>
                              {lockedPreviewLevels.length > 0 && (
                                <>
                                  <div className={styles.readOnlyUpgradeList}>
                                    {lockedPreviewLevels.map((levelInfo) => (
                                      <div key={`${building.id}-locked-preview-lvl-${levelInfo.level}`} className={styles.readOnlyUpgradeItem}>
                                        <span className={styles.readOnlyUpgradeResourceLabel}>
                                          {upgradeResourceIcons[String(levelInfo.resource || '').trim().toLowerCase()] ? (
                                            <img
                                              src={upgradeResourceIcons[String(levelInfo.resource || '').trim().toLowerCase()]}
                                              alt={getUpgradeResourceLabel(levelInfo.resource)}
                                              className={styles.readOnlyUpgradeResourceIcon}
                                            />
                                          ) : null}
                                        </span>
                                        <span className={`${styles.readOnlyUpgradeLevel} ${(isPetTabCard
                                          ? Number(levelInfo.pet_house_level_unlocked ?? building?.pet_house_level_unlocked ?? 0) > Number(currentPetHouseLevel || 0)
                                          : Number(levelInfo.lab_level_unlocked ?? 0) > Number(currentLabLevel || 0)) ? styles.readOnlyUpgradeLevelLocked : ''}`}>
                                          Lvl {levelInfo.level}:
                                        </span>
                                        <span className={`${styles.readOnlyUpgradeCost} ${getUpgradeResourceClass(levelInfo.resource)}`}>
                                          {formatNumberShort(levelInfo.cost)}
                                        </span>
                                        <span className={styles.readOnlyUpgradeTime}>{formatUpgradeTime(levelInfo.time)}</span>
                                      </div>
                                    ))}
                                  </div>

                                  <div className={styles.readOnlyUpgradeSummary}>
                                    <span>{lockedPreviewLevels.length} Levels</span>
                                    <span>-</span>
                                    <span className={`${styles.readOnlyUpgradeCost} ${getUpgradeResourceClass(lockedPreviewResource)}`}>
                                      {formatNumberShort(lockedPreviewTotalCost)}
                                    </span>
                                    <span>-</span>
                                    <span>{formatSeconds(lockedPreviewTotalSeconds)}</span>
                                  </div>
                                </>
                              )}

                              <div className={`${styles.readOnlyUpgradeSummary} ${styles.readOnlyTroopLockedSummary}`}>
                                <span>{troopUnlockRequirementLabel}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                )
              }

            }
            if (activeLoadedTab === 'heroes' && HERO_BUILDING_IDS.has(String(building?.id || ''))) {
              const heroRowState = rowStates[0] || null
              const heroUnlocked = currentHeroHallLevel >= heroHallRequirement
              const heroRowLevel = heroUnlocked ? Number(heroRowState?.rowLevel || 0) : 0
              const heroRowImageLevel = heroRowLevel

              if (!heroUnlocked) {
                const heroLockedPreviewLevels = getVisibleUpgradeLevels(getNextUpgradeLevels(building, 0))
                const heroLockedPreviewTotalCost = heroLockedPreviewLevels.reduce((total, levelInfo) => total + Number(levelInfo.cost || 0), 0)
                const heroLockedPreviewTotalSeconds = heroLockedPreviewLevels.reduce((total, levelInfo) => total + getTimeSeconds(levelInfo.time), 0)
                const heroLockedPreviewResource = heroLockedPreviewLevels[0]?.resource || 'dark_elixir'

                return (
                  <section key={cardKey} className={`${styles.defenceCard} ${styles.readOnlyBuildingBlock}`}>
                    <div className={styles.readOnlyCardGrid} style={tableRowStyle}>
                      <div className={styles.readOnlySummaryPanel} style={{ gridRow: `1 / span ${rowCount}` }}>
                        {getBuildingImagePath(building, heroRowImageLevel) ? (
                          <img
                            src={getBuildingImagePath(building, heroRowImageLevel)}
                            alt={displayName}
                            className={styles.readOnlySummaryImage}
                          />
                        ) : (
                          <div className={styles.readOnlySummaryImagePlaceholder} />
                        )}

                        <div className={styles.readOnlySummaryName}>{displayName}</div>
                      </div>

                      <div className={styles.readOnlyRowsColumn} style={rowsColumnStyle}>
                        <div className={styles.readOnlyRow}>
                          <div className={styles.readOnlyTroopLevelCell}>
                            {getBuildingImagePath(building, heroRowImageLevel) ? (
                              <img
                                src={getBuildingImagePath(building, heroRowImageLevel)}
                                alt={displayName}
                                className={styles.readOnlyRowImage}
                              />
                            ) : (
                              <div className={styles.defenceIconPlaceholder} />
                            )}

                            <div className={styles.readOnlyTroopLevelMeta}>
                              <div className={styles.readOnlyLevelValue}>{heroRowLevel}/{maxLevel}</div>
                              <LockOutlinedIcon className={`${styles.readOnlyActionIcon} ${styles.readOnlyTroopStateIconLocked}`} />
                            </div>
                          </div>

                          <div className={styles.readOnlyTroopDetails}>
                            <div className={styles.readOnlyUpgradeProgressBlock}>
                              {heroLockedPreviewLevels.length > 0 && (
                                <>
                                  <div className={styles.readOnlyUpgradeList}>
                                    {heroLockedPreviewLevels.map((levelInfo) => (
                                      <div key={`${building.id}-hero-locked-preview-lvl-${levelInfo.level}`} className={styles.readOnlyUpgradeItem}>
                                        <span className={styles.readOnlyUpgradeResourceLabel}>
                                          {upgradeResourceIcons[String(levelInfo.resource || '').trim().toLowerCase()] ? (
                                            <img
                                              src={upgradeResourceIcons[String(levelInfo.resource || '').trim().toLowerCase()]}
                                              alt={getUpgradeResourceLabel(levelInfo.resource)}
                                              className={styles.readOnlyUpgradeResourceIcon}
                                            />
                                          ) : null}
                                        </span>
                                        <span className={`${styles.readOnlyUpgradeLevel} ${Number(levelInfo.hero_hall_level_unlocked ?? 0) > Number(currentHeroHallLevel || 0) ? styles.readOnlyUpgradeLevelLocked : ''}`}>
                                          Lvl {levelInfo.level}:
                                        </span>
                                        <span className={`${styles.readOnlyUpgradeCost} ${getUpgradeResourceClass(levelInfo.resource)}`}>
                                          {formatNumberShort(levelInfo.cost)}
                                        </span>
                                        <span className={styles.readOnlyUpgradeTime}>{formatUpgradeTime(levelInfo.time)}</span>
                                      </div>
                                    ))}
                                  </div>

                                  <div className={styles.readOnlyUpgradeSummary}>
                                    <span>{heroLockedPreviewLevels.length} Levels</span>
                                    <span>-</span>
                                    <span className={`${styles.readOnlyUpgradeCost} ${getUpgradeResourceClass(heroLockedPreviewResource)}`}>
                                      {formatNumberShort(heroLockedPreviewTotalCost)}
                                    </span>
                                    <span>-</span>
                                    <span>{formatSeconds(heroLockedPreviewTotalSeconds)}</span>
                                  </div>
                                </>
                              )}

                              <div className={`${styles.readOnlyUpgradeSummary} ${styles.readOnlyTroopLockedSummary}`}>
                                <span>Requires Hero Hall level {heroHallRequirement} to unlock</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                )
              }
            }
            if (activeLoadedTab === 'equipment' && EQUIPMENT_BUILDING_IDS.has(String(building?.id || ''))) {
              const equipmentRowState = rowStates[0] || null
              const equipmentBlacksmithRequired = Number(building?.blacksmith_level_unlocked ?? 0)
              const isGemUnlock = String(building?.unlock_source || '').toLowerCase().includes('gem')
              const equipmentUnlocked = equipmentBlacksmithRequired === 0 || currentBlacksmithLevel >= equipmentBlacksmithRequired
              const equipmentRowLevel = equipmentUnlocked ? Number(equipmentRowState?.rowLevel || 0) : 0

              if (!equipmentUnlocked && !isGemUnlock) {
                const equipmentLockedPreviewLevels = getVisibleUpgradeLevels(getNextUpgradeLevels(building, 0))
                const equipmentLockedTotalSeconds = equipmentLockedPreviewLevels.reduce((total, levelInfo) => total + getTimeSeconds(levelInfo.time), 0)
                const equipmentLockedRequirementLevel = Math.max(
                  equipmentBlacksmithRequired,
                  ...equipmentLockedPreviewLevels.map((levelInfo) => Number(levelInfo?.blacksmith_level_unlocked ?? building?.blacksmith_level_unlocked ?? 0) || 0),
                )
                const equipmentLockedAgg = equipmentLockedPreviewLevels.reduce((acc, levelInfo) => {
                  if (Array.isArray(levelInfo.resource_costs) && levelInfo.resource_costs.length > 0) {
                    levelInfo.resource_costs.forEach(({ resource, cost }) => {
                      const key = String(resource || '').trim().toLowerCase()
                      if (!key) return
                      acc[key] = (acc[key] || 0) + Number(cost || 0)
                    })
                    return acc
                  }

                  const key = String(levelInfo.resource || 'gold').trim().toLowerCase()
                  acc[key] = (acc[key] || 0) + Number(levelInfo.cost || 0)
                  return acc
                }, {})
                const equipmentLockedPreferredKeys = equipmentResourceOrder.filter((resourceKey) => Number(equipmentLockedAgg[resourceKey] || 0) > 0)
                const equipmentLockedFallbackKeys = Object.keys(equipmentLockedAgg).filter((resourceKey) => !equipmentResourceOrder.includes(resourceKey) && Number(equipmentLockedAgg[resourceKey] || 0) > 0)
                const equipmentLockedKeys = [...equipmentLockedPreferredKeys, ...equipmentLockedFallbackKeys]

                return (
                  <section key={cardKey} className={`${styles.defenceCard} ${styles.readOnlyBuildingBlock}`}>
                    <div className={styles.readOnlyCardGrid} style={tableRowStyle}>
                      <div className={styles.readOnlySummaryPanel} style={{ gridRow: `1 / span ${rowCount}` }}>
                        {getBuildingImagePath(building, equipmentRowLevel) ? (
                          <img
                            src={getBuildingImagePath(building, equipmentRowLevel)}
                            alt={displayName}
                            className={styles.readOnlySummaryImage}
                          />
                        ) : (
                          <div className={styles.readOnlySummaryImagePlaceholder} />
                        )}
                        <div className={styles.readOnlySummaryName}>{displayName}</div>
                        <div className={styles.readOnlyEquipmentBadges}>
                          <span className={`${styles.readOnlyEquipmentBadge} ${equipmentType === 'active' ? styles.readOnlyEquipmentBadgeActive : styles.readOnlyEquipmentBadgePassive}`}>
                            {equipmentType === 'active' ? 'Active' : 'Passive'}
                          </span>
                          <span className={`${styles.readOnlyEquipmentBadge} ${equipmentRarity === 'epic' ? styles.readOnlyEquipmentBadgeEpic : styles.readOnlyEquipmentBadgeCommon}`}>
                            {equipmentRarity === 'epic' ? 'Epic' : 'Common'}
                          </span>
                        </div>
                      </div>

                      <div className={styles.readOnlyRowsColumn} style={rowsColumnStyle}>
                        <div className={styles.readOnlyRow}>
                          <div className={styles.readOnlyTroopLevelCell}>
                            {getBuildingImagePath(building, equipmentRowLevel) ? (
                              <img
                                src={getBuildingImagePath(building, equipmentRowLevel)}
                                alt={displayName}
                                className={styles.readOnlyRowImage}
                              />
                            ) : (
                              <div className={styles.defenceIconPlaceholder} />
                            )}

                            <div className={styles.readOnlyTroopLevelMeta}>
                              <div className={styles.readOnlyLevelValue}>{equipmentRowLevel}/{maxLevel}</div>
                              <LockOutlinedIcon className={`${styles.readOnlyActionIcon} ${styles.readOnlyTroopStateIconLocked}`} />
                            </div>
                          </div>

                          <div className={styles.readOnlyTroopDetails}>
                            <div className={styles.readOnlyUpgradeProgressBlock}>
                              {equipmentLockedPreviewLevels.length > 0 && (
                                <>
                                  <div className={upgradeListClassName}>
                                    {equipmentLockedPreviewLevels.map((levelInfo) => (
                                      <div key={`${building.id}-equipment-locked-preview-lvl-${levelInfo.level}`} className={styles.readOnlyUpgradeItem}>
                                        <span className={styles.readOnlyUpgradeResourceLabel}>
                                          {upgradeResourceIcons[String(levelInfo.resource || '').trim().toLowerCase()] ? (
                                            <img
                                              src={upgradeResourceIcons[String(levelInfo.resource || '').trim().toLowerCase()]}
                                              alt={getUpgradeResourceLabel(levelInfo.resource)}
                                              className={styles.readOnlyUpgradeResourceIcon}
                                            />
                                          ) : null}
                                        </span>
                                        <span className={`${styles.readOnlyUpgradeLevel} ${Number(levelInfo?.blacksmith_level_unlocked ?? building?.blacksmith_level_unlocked ?? 0) > Number(currentBlacksmithLevel || 0) ? styles.readOnlyUpgradeLevelLocked : ''}`}>
                                          Lvl {levelInfo.level}:
                                        </span>
                                        {Array.isArray(levelInfo.resource_costs) && levelInfo.resource_costs.length > 0 ? (
                                          <div className={styles.equipmentCostBreakdown}>
                                            {levelInfo.resource_costs.map(({ resource, cost }) => (
                                              <span key={`${levelInfo.level}-${resource}`} className={styles.equipmentCostItem}>
                                                {equipmentResourceIcons[resource] ? (
                                                  <img src={equipmentResourceIcons[resource]} alt={resource} className={styles.equipmentCostIcon} />
                                                ) : null}
                                                <span className={styles.equipmentCostValue}>{formatNumberShort(cost)}</span>
                                              </span>
                                            ))}
                                          </div>
                                        ) : (
                                          <span className={`${styles.readOnlyUpgradeCost} ${getUpgradeResourceClass(levelInfo.resource)}`}>
                                            {formatNumberShort(levelInfo.cost)}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>

                                  <div className={styles.readOnlyUpgradeSummary}>
                                    <span>{equipmentLockedPreviewLevels.length} Levels</span>
                                    <span>-</span>
                                    {equipmentLockedKeys.length > 0 ? (
                                      <div className={styles.equipmentCostBreakdown}>
                                        {equipmentLockedKeys.map((resourceKey) => (
                                          <span key={`${building.id}-equipment-locked-summary-${resourceKey}`} className={styles.equipmentCostItem}>
                                            {equipmentResourceIcons[resourceKey] ? (
                                              <img src={equipmentResourceIcons[resourceKey]} alt={resourceKey} className={styles.equipmentCostIcon} />
                                            ) : null}
                                            <span className={styles.equipmentCostValue}>{formatNumberShort(equipmentLockedAgg[resourceKey])}</span>
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className={`${styles.readOnlyUpgradeCost} ${getUpgradeResourceClass('gold')}`}>{formatNumberShort(0)}</span>
                                    )}
                                    {activeLoadedTab !== 'equipment' && (
                                      <>
                                        <span>-</span>
                                        <span>{formatSeconds(equipmentLockedTotalSeconds)}</span>
                                      </>
                                    )}
                                  </div>
                                </>
                              )}

                              <div className={`${styles.readOnlyUpgradeSummary} ${styles.readOnlyTroopLockedSummary}`}>
                                <span>Requires Blacksmith level {equipmentLockedRequirementLevel} to unlock</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                )
              }
            }

      const totalRemainingUpgrades = rowStates.reduce((total, rowState) => total + rowState.allRemainingNextLevels.length, 0)
      const totalCost = rowStates.reduce((total, rowState) => {
        const nextLevels = rowState.allRemainingNextLevels
        return total + nextLevels.reduce((rowTotal, levelInfo) => rowTotal + Number(levelInfo.cost || 0), 0)
      }, 0)
      const totalSeconds = rowStates.reduce((total, rowState) => {
        const nextLevels = rowState.allRemainingNextLevels
        return total + nextLevels.reduce((rowTotal, levelInfo) => rowTotal + getTimeSeconds(levelInfo.time), 0)
      }, 0)
      const summaryImageLevel = rowStates[0]?.rowLevel ?? 0

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
              {isEquipmentCard && (
                <div className={styles.readOnlyEquipmentBadges}>
                  <span className={`${styles.readOnlyEquipmentBadge} ${equipmentType === 'active' ? styles.readOnlyEquipmentBadgeActive : styles.readOnlyEquipmentBadgePassive}`}>
                    {equipmentType === 'active' ? 'Active' : 'Passive'}
                  </span>
                  <span className={`${styles.readOnlyEquipmentBadge} ${equipmentRarity === 'epic' ? styles.readOnlyEquipmentBadgeEpic : styles.readOnlyEquipmentBadgeCommon}`}>
                    {equipmentRarity === 'epic' ? 'Epic' : 'Common'}
                  </span>
                </div>
              )}
              {totalRemainingUpgrades > 0 && activeLoadedTab !== 'equipment' && (
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
                              onClick={() => openModifyUpgradePopup(rowState)}
                              aria-label="Modify upgrade"
                              title="Modify upgrade"
                            >
                              <HandymanOutlinedIcon className={styles.readOnlyActionIcon} />
                            </button>
                            <button
                              type="button"
                              className={`${styles.readOnlyActionBtn} ${styles.readOnlyActionChoiceBtn} ${styles.readOnlyActionBtnConfirm}`}
                              onClick={() => openCompleteUpgradePopup(rowState)}
                              aria-label={rowState.rowLevel <= 0 ? 'complete construction' : 'Complete Upgrade'}
                              title={rowState.rowLevel <= 0 ? 'Complete Construction' : 'Complete Upgrade'}
                            >
                              <CheckIcon className={styles.readOnlyActionIcon} />
                            </button>
                          </div>
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
                          aria-label={rowState.rowLevel <= 0 ? 'Complete Construction' : 'Complete Construction'}
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

                      {completeUpgradePopup.open && completeUpgradePopup.rowKey === rowState.actionRowKey && rowState.pendingUpgrade && (
                        typeof document !== 'undefined' ? createPortal(
                          <div className={styles.completeUpgradeOverlay} onClick={closeCompleteUpgradePopup}>
                            <div className={styles.completeUpgradePopup} onClick={(event) => event.stopPropagation()}>
                              <button type="button" className={styles.completeUpgradeCloseBtn} onClick={closeCompleteUpgradePopup} aria-label="Close complete upgrade popup">
                                ×
                              </button>

                              <h3 className={styles.completeUpgradeTitle}>Complete Upgrade</h3>

                              <div className={styles.completeUpgradeImagesRow}>
                                <div className={styles.completeUpgradeImageBlock}>
                                  <img
                                    src={getBuildingImagePath(building, rowState.pendingUpgrade.fromLevel)}
                                    alt={`${displayName} Level ${rowState.pendingUpgrade.fromLevel}`}
                                    className={styles.completeUpgradeImage}
                                  />
                                </div>
                                <div className={styles.completeUpgradeArrow}>→</div>
                                <div className={styles.completeUpgradeImageBlock}>
                                  <img
                                    src={getBuildingImagePath(building, rowState.pendingUpgrade.toLevel)}
                                    alt={`${displayName} Level ${rowState.pendingUpgrade.toLevel}`}
                                    className={styles.completeUpgradeImage}
                                  />
                                </div>
                              </div>

                              <p className={styles.completeUpgradePrompt}>
                                Do you wish to complete {displayName} upgrading from level {rowState.pendingUpgrade.fromLevel} to level {rowState.pendingUpgrade.toLevel}?
                              </p>

                              <div className={styles.completeUpgradeChoiceTitle}>Use Magic Item?</div>
                              <div className={styles.completeUpgradeChoiceNote}>This will be used for historical upgrade records.</div>

                              <div className={styles.completeUpgradeChoices} role="radiogroup" aria-label="Use magic item">
                                {[
                                  ['none', 'None'],
                                  ['book', 'Book'],
                                  ['hammer', 'Hammer'],
                                ].map(([value, label]) => (
                                  <label key={value} className={styles.completeUpgradeChoiceOption}>
                                    <span className={styles.completeUpgradeChoiceLabel}>{label}</span>
                                    <input
                                      type="radio"
                                      name={`complete-upgrade-${rowState.actionRowKey}`}
                                      value={value}
                                      checked={completeUpgradePopup.magicItem === value}
                                      onChange={() => updateCompleteUpgradeMagicItem(value)}
                                    />
                                  </label>
                                ))}
                              </div>

                              <div className={styles.completeUpgradeActions}>
                                <button type="button" className={styles.completeUpgradeBackBtn} onClick={closeCompleteUpgradePopup}>← Back</button>
                                <button
                                  type="button"
                                  className={styles.completeUpgradeConfirmBtn}
                                  onClick={() => {
                                    void confirmCompleteUpgradePopup()
                                  }}
                                  disabled={completeUpgradePopup.saving}
                                >
                                  {completeUpgradePopup.saving ? 'Completing...' : '✓ Complete'}
                                </button>
                              </div>
                            </div>
                          </div>,
                          document.body,
                        ) : null
                      )}

                      {modifyUpgradePopup.open && modifyUpgradePopup.rowKey === rowState.actionRowKey && rowState.pendingUpgrade && (
                        typeof document !== 'undefined' ? createPortal(
                          <div className={styles.modifyUpgradeOverlay} onClick={closeModifyUpgradePopup}>
                            <div className={styles.modifyUpgradePopup} onClick={(event) => event.stopPropagation()}>
                              <button type="button" className={styles.modifyUpgradeCloseBtn} onClick={closeModifyUpgradePopup} aria-label="Close upgrade popup">
                                ×
                              </button>

                              <h3 className={styles.modifyUpgradeTitle}>Modify Upgrade</h3>

                              <div className={styles.modifyUpgradeImagesRow}>
                                <div className={styles.modifyUpgradeImageBlock}>
                                  <img
                                    src={getBuildingImagePath(building, rowState.pendingUpgrade.fromLevel)}
                                    alt={`${displayName} Level ${rowState.pendingUpgrade.fromLevel}`}
                                    className={styles.modifyUpgradeImage}
                                  />
                                </div>
                                <div className={styles.modifyUpgradeArrow}>→</div>
                                <div className={styles.modifyUpgradeImageBlock}>
                                  <img
                                    src={getBuildingImagePath(building, rowState.pendingUpgrade.toLevel)}
                                    alt={`${displayName} Level ${rowState.pendingUpgrade.toLevel}`}
                                    className={styles.modifyUpgradeImage}
                                  />
                                </div>
                              </div>

                              <p className={styles.modifyUpgradePrompt}>
                                Update the upgrade time of {displayName} from level {rowState.pendingUpgrade.fromLevel} to level {rowState.pendingUpgrade.toLevel}:
                              </p>

                              <div className={styles.modifyUpgradeRemainingBlock}>
                                <div className={styles.modifyUpgradeRemainingLabel}>Remaining Time:</div>
                                <div className={styles.modifyUpgradeRemainingHint}>Maximum: {formatUpgradeClock(getMaxAllowedRemainingSeconds(modifyUpgradePopup.upgrade))}</div>
                                <div className={styles.modifyUpgradeTimeGrid}>
                                  {[
                                    ['days', 'Days'],
                                    ['hours', 'Hours'],
                                    ['minutes', 'Minutes'],
                                    ['seconds', 'Seconds'],
                                  ].map(([key, label]) => (
                                    <label key={key} className={styles.modifyUpgradeTimeCell}>
                                      <span className={styles.modifyUpgradeTimeLabel}>{label}</span>
                                      <select
                                        className={styles.modifyUpgradeTimeSelect}
                                        value={modifyUpgradePopup.durationParts[key]}
                                        onChange={(event) => updateModifyUpgradeDurationPart(key, event.target.value)}
                                        aria-label={label}
                                      >
                                        {Array.from({ length: (() => {
                                          const maxAllowed = getMaxAllowedRemainingSeconds(modifyUpgradePopup.upgrade)
                                          const parts = modifyUpgradePopup.durationParts
                                          const daysMax = Math.floor(maxAllowed / 86400)
                                          const currentDayLimit = Math.max(0, Math.min(daysMax, 366))
                                          if (key === 'days') return currentDayLimit + 1

                                          const remainingAfterDays = Math.max(0, maxAllowed - (Number(parts.days) || 0) * 86400)
                                          const hoursMax = (Number(parts.days) || 0) >= daysMax ? Math.floor(remainingAfterDays / 3600) : 23
                                          if (key === 'hours') return Math.max(0, Math.min(hoursMax, 23)) + 1

                                          const remainingAfterHours = Math.max(0, remainingAfterDays - (Number(parts.hours) || 0) * 3600)
                                          const minutesMax = (Number(parts.days) || 0) >= daysMax && (Number(parts.hours) || 0) >= hoursMax ? Math.floor(remainingAfterHours / 60) : 59
                                          if (key === 'minutes') return Math.max(0, Math.min(minutesMax, 59)) + 1

                                          const remainingAfterMinutes = Math.max(0, remainingAfterHours - (Number(parts.minutes) || 0) * 60)
                                          const secondsMax = (Number(parts.days) || 0) >= daysMax && (Number(parts.hours) || 0) >= hoursMax && (Number(parts.minutes) || 0) >= minutesMax ? remainingAfterMinutes : 59
                                          return Math.max(0, Math.min(secondsMax, 59)) + 1
                                        })() }, (_, index) => index).map((optionValue) => (
                                          <option key={`${key}-${optionValue}`} value={optionValue}>{optionValue}</option>
                                        ))}
                                      </select>
                                    </label>
                                  ))}
                                </div>
                              </div>

                              <div className={styles.modifyUpgradeActions}>
                                <button type="button" className={styles.modifyUpgradeBackBtn} onClick={closeModifyUpgradePopup}>← Back</button>
                                <button
                                  type="button"
                                  className={styles.modifyUpgradeSaveBtn}
                                  onClick={() => {
                                    void saveModifiedUpgradeTime()
                                  }}
                                  disabled={modifyUpgradePopup.saving}
                                >
                                  {modifyUpgradePopup.saving ? 'Saving...' : '✓ Update Time'}
                                </button>
                                <button
                                  type="button"
                                  className={styles.modifyUpgradeCancelBtn}
                                  onClick={async () => {
                                    try {
                                      await cancelPendingUpgrade(rowState.pendingUpgrade)
                                      closeModifyUpgradePopup()
                                    } catch (cancelError) {
                                      setError(cancelError.message || 'Failed to cancel upgrade')
                                    }
                                  }}
                                >
                                  ✕ Cancel Upgrade
                                </button>
                              </div>
                            </div>
                          </div>,
                          document.body,
                        ) : null
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

                        {rowState.allRemainingNextLevels.length > 0 ? (
                          <>
                            <div className={upgradeListClassName}>
                              {getVisibleUpgradeLevels(rowState.allRemainingNextLevels).map((levelInfo) => (
                                <div key={`${building.id}-${rowState.rowIndex}-pending-lvl-${levelInfo.level}`} className={styles.readOnlyUpgradeItem}>
                                  <span className={styles.readOnlyUpgradeResourceLabel}>
                                    {upgradeResourceIcons[String(levelInfo.resource || '').trim().toLowerCase()] ? (
                                      <img
                                        src={upgradeResourceIcons[String(levelInfo.resource || '').trim().toLowerCase()]}
                                        alt={getUpgradeResourceLabel(levelInfo.resource)}
                                        className={styles.readOnlyUpgradeResourceIcon}
                                      />
                                    ) : null}
                                  </span>
                                  <span className={`${styles.readOnlyUpgradeLevel} ${isUpgradeLevelLocked(rowState, levelInfo) ? styles.readOnlyUpgradeLevelLocked : ''}`}>Lvl {levelInfo.level}:</span>
                                  {activeLoadedTab === 'equipment' && Array.isArray(levelInfo.resource_costs) && levelInfo.resource_costs.length > 0 ? (
                                    <div className={styles.equipmentCostBreakdown}>
                                      {levelInfo.resource_costs.map(({ resource, cost }) => (
                                        <span key={`${levelInfo.level}-${resource}`} className={styles.equipmentCostItem}>
                                          {equipmentResourceIcons[resource] ? (
                                            <img src={equipmentResourceIcons[resource]} alt={resource} className={styles.equipmentCostIcon} />
                                          ) : null}
                                          <span className={styles.equipmentCostValue}>{formatNumberShort(cost)}</span>
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className={`${styles.readOnlyUpgradeCost} ${getUpgradeResourceClass(levelInfo.resource)}`}>
                                      {formatNumberShort(levelInfo.cost)}
                                    </span>
                                  )}
                                  {activeLoadedTab !== 'equipment' && (
                                    <span className={styles.readOnlyUpgradeTime}>{formatUpgradeTime(levelInfo.time)}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                            <div className={styles.readOnlyUpgradeSummary}>
                              <span>{getVisibleUpgradeLevels(rowState.allRemainingNextLevels).length} Levels</span>
                              <span>-</span>
                              {activeLoadedTab === 'equipment' ? (
                                (() => {
                                  const filtered = getVisibleUpgradeLevels(rowState.allRemainingNextLevels)
                                  const agg = filtered.reduce((acc, lvl) => {
                                    if (Array.isArray(lvl.resource_costs) && lvl.resource_costs.length > 0) {
                                      lvl.resource_costs.forEach(({ resource, cost }) => {
                                        acc[resource] = (acc[resource] || 0) + Number(cost || 0)
                                      })
                                    } else {
                                      const key = String(lvl.resource || rowState.summaryResource || 'gold').trim().toLowerCase()
                                      acc[key] = (acc[key] || 0) + Number(lvl.cost || 0)
                                    }
                                    return acc
                                  }, {})
                                  const preferredKeys = equipmentResourceOrder.filter((resourceKey) => Number(agg[resourceKey] || 0) > 0)
                                  const fallbackKeys = Object.keys(agg).filter((resourceKey) => !equipmentResourceOrder.includes(resourceKey) && Number(agg[resourceKey] || 0) > 0)
                                  const keys = [...preferredKeys, ...fallbackKeys]
                                  if (keys.length === 0) return <span className={`${styles.readOnlyUpgradeCost} ${getUpgradeResourceClass(rowState.summaryResource)}`}>{formatNumberShort(0)}</span>
                                  return (
                                    <div className={styles.equipmentCostBreakdown}>
                                      {keys.map((res) => (
                                        <span key={res} className={styles.equipmentCostItem}>
                                          {equipmentResourceIcons[res] ? (
                                            <img src={equipmentResourceIcons[res]} alt={res} className={styles.equipmentCostIcon} />
                                          ) : null}
                                          <span className={styles.equipmentCostValue}>{formatNumberShort(agg[res])}</span>
                                        </span>
                                      ))}
                                    </div>
                                  )
                                })()
                              ) : (
                                <span className={`${styles.readOnlyUpgradeCost} ${getUpgradeResourceClass(rowState.summaryResource)}`}>
                                  {formatNumberShort(getVisibleUpgradeLevels(rowState.allRemainingNextLevels).reduce((total, level) => total + Number(level.cost || 0), 0))}
                                </span>
                              )}
                              {activeLoadedTab !== 'equipment' && (
                                <>
                                  <span>-</span>
                                  <span>{formatSeconds(getVisibleUpgradeLevels(rowState.allRemainingNextLevels).reduce((total, level) => total + getTimeSeconds(level.time), 0))}</span>
                                </>
                              )}
                            </div>
                            {rowState.labRequirementLevel != null && rowState.labLockedNextLevels.length > 0 && (
                              <div className={`${styles.readOnlyUpgradeSummary} ${styles.readOnlyTroopLockedSummary}`}>
                                <span>
                                  Requires {rowState.labRequirementLabel} level {rowState.labRequirementLevel} to unlock upgrades
                                </span>
                              </div>
                            )}
                          </>
                        ) : rowState.labRequirementLevel != null ? (
                          <>
                            <div className={upgradeListClassName}>
                              {getVisibleUpgradeLevels(rowState.labLockedNextLevels).map((levelInfo) => (
                                <div key={`${building.id}-${rowState.rowIndex}-locked-lvl-${levelInfo.level}`} className={styles.readOnlyUpgradeItem}>
                                  <span className={styles.readOnlyUpgradeResourceLabel}>
                                    {upgradeResourceIcons[String(levelInfo.resource || '').trim().toLowerCase()] ? (
                                      <img
                                        src={upgradeResourceIcons[String(levelInfo.resource || '').trim().toLowerCase()]}
                                        alt={getUpgradeResourceLabel(levelInfo.resource)}
                                        className={styles.readOnlyUpgradeResourceIcon}
                                      />
                                    ) : null}
                                  </span>
                                  <span className={`${styles.readOnlyUpgradeLevel} ${isUpgradeLevelLocked(rowState, levelInfo) ? styles.readOnlyUpgradeLevelLocked : ''}`}>Lvl {levelInfo.level}:</span>
                                  {activeLoadedTab === 'equipment' && Array.isArray(levelInfo.resource_costs) && levelInfo.resource_costs.length > 0 ? (
                                    <div className={styles.equipmentCostBreakdown}>
                                      {levelInfo.resource_costs.map(({ resource, cost }) => (
                                        <span key={`${levelInfo.level}-${resource}`} className={styles.equipmentCostItem}>
                                          {equipmentResourceIcons[resource] ? (
                                            <img src={equipmentResourceIcons[resource]} alt={resource} className={styles.equipmentCostIcon} />
                                          ) : null}
                                          <span className={styles.equipmentCostValue}>{formatNumberShort(cost)}</span>
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className={`${styles.readOnlyUpgradeCost} ${getUpgradeResourceClass(levelInfo.resource)}`}>
                                      {formatNumberShort(levelInfo.cost)}
                                    </span>
                                  )}
                                  {activeLoadedTab !== 'equipment' && (
                                    <span className={styles.readOnlyUpgradeTime}>{formatUpgradeTime(levelInfo.time)}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                            <div className={`${styles.readOnlyUpgradeSummary} ${styles.readOnlyTroopLockedSummary}`}>
                              <span>
                                Requires {rowState.labRequirementLabel} level {rowState.labRequirementLevel} to unlock upgrades
                              </span>
                            </div>
                          </>
                        ) : null}
                      </div>
                    ) : rowState.allRemainingNextLevels.length > 0 ? (
                      <>
                        <div className={upgradeListClassName}>
                          {getVisibleUpgradeLevels(rowState.allRemainingNextLevels).map((levelInfo) => (
                            <div key={`${building.id}-${rowState.rowIndex}-lvl-${levelInfo.level}`} className={styles.readOnlyUpgradeItem}>
                              <span className={styles.readOnlyUpgradeResourceLabel}>
                                {upgradeResourceIcons[String(levelInfo.resource || '').trim().toLowerCase()] ? (
                                  <img
                                    src={upgradeResourceIcons[String(levelInfo.resource || '').trim().toLowerCase()]}
                                    alt={getUpgradeResourceLabel(levelInfo.resource)}
                                    className={styles.readOnlyUpgradeResourceIcon}
                                  />
                                ) : null}
                              </span>
                              <span className={`${styles.readOnlyUpgradeLevel} ${isUpgradeLevelLocked(rowState, levelInfo) ? styles.readOnlyUpgradeLevelLocked : ''}`}>Lvl {levelInfo.level}:</span>
                              {activeLoadedTab === 'equipment' && Array.isArray(levelInfo.resource_costs) && levelInfo.resource_costs.length > 0 ? (
                                <div className={styles.equipmentCostBreakdown}>
                                  {levelInfo.resource_costs.map(({ resource, cost }) => (
                                    <span key={`${levelInfo.level}-${resource}`} className={styles.equipmentCostItem}>
                                      {equipmentResourceIcons[resource] ? (
                                        <img src={equipmentResourceIcons[resource]} alt={resource} className={styles.equipmentCostIcon} />
                                      ) : null}
                                      <span className={styles.equipmentCostValue}>{formatNumberShort(cost)}</span>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className={`${styles.readOnlyUpgradeCost} ${getUpgradeResourceClass(levelInfo.resource)}`}>
                                  {formatNumberShort(levelInfo.cost)}
                                </span>
                              )}
                              {activeLoadedTab !== 'equipment' && (
                                <span className={styles.readOnlyUpgradeTime}>{formatUpgradeTime(levelInfo.time)}</span>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className={styles.readOnlyUpgradeSummary}>
                          <span>{getVisibleUpgradeLevels(rowState.allRemainingNextLevels).length} Levels</span>
                          <span>-</span>
                          {activeLoadedTab === 'equipment' ? (
                            (() => {
                              const filtered = getVisibleUpgradeLevels(rowState.allRemainingNextLevels)
                              const agg = filtered.reduce((acc, lvl) => {
                                if (Array.isArray(lvl.resource_costs) && lvl.resource_costs.length > 0) {
                                  lvl.resource_costs.forEach(({ resource, cost }) => {
                                    acc[resource] = (acc[resource] || 0) + Number(cost || 0)
                                  })
                                } else {
                                  const key = String(lvl.resource || rowState.summaryResource || 'gold').trim().toLowerCase()
                                  acc[key] = (acc[key] || 0) + Number(lvl.cost || 0)
                                }
                                return acc
                              }, {})
                              const preferredKeys = equipmentResourceOrder.filter((resourceKey) => Number(agg[resourceKey] || 0) > 0)
                              const fallbackKeys = Object.keys(agg).filter((resourceKey) => !equipmentResourceOrder.includes(resourceKey) && Number(agg[resourceKey] || 0) > 0)
                              const keys = [...preferredKeys, ...fallbackKeys]
                              if (keys.length === 0) return <span className={`${styles.readOnlyUpgradeCost} ${getUpgradeResourceClass(rowState.summaryResource)}`}>{formatNumberShort(0)}</span>
                              return (
                                <div className={styles.equipmentCostBreakdown}>
                                  {keys.map((res) => (
                                    <span key={res} className={styles.equipmentCostItem}>
                                      {equipmentResourceIcons[res] ? (
                                        <img src={equipmentResourceIcons[res]} alt={res} className={styles.equipmentCostIcon} />
                                      ) : null}
                                      <span className={styles.equipmentCostValue}>{formatNumberShort(agg[res])}</span>
                                    </span>
                                  ))}
                                </div>
                              )
                            })()
                          ) : (
                            <span className={`${styles.readOnlyUpgradeCost} ${getUpgradeResourceClass(rowState.summaryResource)}`}>
                              {formatNumberShort(getVisibleUpgradeLevels(rowState.allRemainingNextLevels).reduce((total, level) => total + Number(level.cost || 0), 0))}
                            </span>
                          )}
                          {activeLoadedTab !== 'equipment' && (
                            <>
                              <span>-</span>
                              <span>{formatSeconds(getVisibleUpgradeLevels(rowState.allRemainingNextLevels).reduce((total, level) => total + getTimeSeconds(level.time), 0))}</span>
                            </>
                          )}
                        </div>
                        {rowState.labRequirementLevel != null && rowState.labLockedNextLevels.length > 0 && (
                          <div className={`${styles.readOnlyUpgradeSummary} ${styles.readOnlyTroopLockedSummary}`}>
                            <span>
                              Requires {rowState.labRequirementLabel} level {rowState.labRequirementLevel} to unlock upgrades
                            </span>
                          </div>
                        )}
                      </>
                    ) : rowState.labRequirementLevel != null ? (
                      <>
                        <div className={upgradeListClassName}>
                          {getVisibleUpgradeLevels(rowState.labLockedNextLevels).map((levelInfo) => (
                            <div key={`${building.id}-${rowState.rowIndex}-locked-lvl-${levelInfo.level}`} className={styles.readOnlyUpgradeItem}>
                              <span className={styles.readOnlyUpgradeResourceLabel}>
                                {upgradeResourceIcons[String(levelInfo.resource || '').trim().toLowerCase()] ? (
                                  <img
                                    src={upgradeResourceIcons[String(levelInfo.resource || '').trim().toLowerCase()]}
                                    alt={getUpgradeResourceLabel(levelInfo.resource)}
                                    className={styles.readOnlyUpgradeResourceIcon}
                                  />
                                ) : null}
                              </span>
                              <span className={`${styles.readOnlyUpgradeLevel} ${isUpgradeLevelLocked(rowState, levelInfo) ? styles.readOnlyUpgradeLevelLocked : ''}`}>Lvl {levelInfo.level}:</span>
                              {activeLoadedTab === 'equipment' && Array.isArray(levelInfo.resource_costs) && levelInfo.resource_costs.length > 0 ? (
                                <div className={styles.equipmentCostBreakdown}>
                                  {levelInfo.resource_costs.map(({ resource, cost }) => (
                                    <span key={`${levelInfo.level}-${resource}`} className={styles.equipmentCostItem}>
                                      {equipmentResourceIcons[resource] ? (
                                        <img src={equipmentResourceIcons[resource]} alt={resource} className={styles.equipmentCostIcon} />
                                      ) : null}
                                      <span className={styles.equipmentCostValue}>{formatNumberShort(cost)}</span>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className={`${styles.readOnlyUpgradeCost} ${getUpgradeResourceClass(levelInfo.resource)}`}>
                                  {formatNumberShort(levelInfo.cost)}
                                </span>
                              )}
                              {activeLoadedTab !== 'equipment' && (
                                <span className={styles.readOnlyUpgradeTime}>{formatUpgradeTime(levelInfo.time)}</span>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className={`${styles.readOnlyUpgradeSummary} ${styles.readOnlyTroopLockedSummary}`}>
                          <span>
                            Requires {rowState.labRequirementLabel} level {rowState.labRequirementLevel} to unlock upgrades
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className={`${styles.readOnlyUpgradeSummary} ${styles.readOnlyUpgradeSummaryComplete}`}>
                        <span>Fully upgraded for this Town Hall level.</span>
                        <CheckIcon className={styles.readOnlyUpgradeSummaryIcon} aria-label="Fully upgraded for this Town Hall level" titleAccess="Fully upgraded for this Town Hall level" />
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
    displayedLoadedTab === 'defences'
      ? 'Defense'
      : displayedLoadedTab === 'traps'
        ? 'Trap'
      : displayedLoadedTab === 'army'
        ? 'Army'
        : displayedLoadedTab === 'resources'
          ? 'Resources'
          : displayedLoadedTab === 'troops'
            ? 'Troop'
            : displayedLoadedTab === 'spells'
              ? 'Spell'
            : displayedLoadedTab === 'dark_troops'
              ? 'Dark Troop'
              : displayedLoadedTab === 'sieges'
                ? 'Siege'
                : displayedLoadedTab === 'equipment'
                  ? 'Equipment'
                : displayedLoadedTab === 'pets'
                  ? 'Pet'
            : displayedLoadedTab === 'heroes'
              ? 'Hero'
            : 'Walls'

  const loadedTabSecondaryLabel = activeLoadedTab === 'walls' ? 'Wall Quantity' : 'Level'

    const loadedTabSectionTitle =
      displayedLoadedTab === 'defences'
        ? 'Defenses'
        : displayedLoadedTab === 'traps'
          ? 'Traps'
        : displayedLoadedTab === 'army'
          ? 'Army'
          : displayedLoadedTab === 'resources'
            ? 'Resources'
            : displayedLoadedTab === 'troops'
              ? 'Troop'
              : displayedLoadedTab === 'spells'
                ? 'Spells'
              : displayedLoadedTab === 'dark_troops'
                ? 'Dark Troop'
                : displayedLoadedTab === 'sieges'
                  ? 'Sieges'
                : displayedLoadedTab === 'equipment'
                  ? 'Equipment'
                : displayedLoadedTab === 'pets'
                  ? 'Pets'
              : displayedLoadedTab === 'heroes'
                ? 'Heroes'
              : 'Walls'

  const visibleTroopBuildings = activeLoadedTab === 'troops'
    ? (structureCatalog.troops || [])
    : []

  const visibleHeroBuildings = activeLoadedTab === 'heroes'
    ? (structureCatalog.heroes || [])
    : []

  const visibleSiegesTabBuildings = activeLoadedTab === 'sieges'
    ? (structureCatalog.sieges || [])
    : []

  const tabLabels = {
    defences: 'Defenses',
    traps: 'Traps',
    army: 'Army',
    resources: 'Resources',
    troops: 'Troops',
    spells: 'Spells',
    dark_troops: 'Dark Troops',
    sieges: 'Sieges',
    heroes: 'Heroes',
    equipment: 'Equipment',
    pets: 'Pets',
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

  const isTroopCategoryComplete = (buildings = []) => {
    if (!Array.isArray(buildings) || buildings.length === 0) return false

    return buildings.every((building) => {
      const maxLevel = Math.max(...(building.levels || []).map((level) => Number(level.level || 0)), 0)
      if (maxLevel <= 0) return false

      const troopRequirement = getTroopBarracksRequirement(building)
      if (currentBarracksLevel < troopRequirement) return false

      const rowLevels = structureLevels[building.id] || []
      const rowCount = getStructureRowCount(building, rowLevels)

      return Array.from({ length: rowCount }, (_, index) => Number(rowLevels[index] || 0) >= maxLevel).every(Boolean)
    })
  }

  const isDarkTroopCategoryComplete = (buildings = []) => {
    if (!Array.isArray(buildings) || buildings.length === 0) return false

    return buildings.every((building) => {
      const maxLevel = Math.max(...(building.levels || []).map((level) => Number(level.level || 0)), 0)
      if (maxLevel <= 0) return false

      const darkTroopRequirement = getDarkTroopBarracksRequirement(building)
      if (currentDarkBarracksLevel < darkTroopRequirement) return false

      const rowLevels = structureLevels[building.id] || []
      const rowCount = getStructureRowCount(building, rowLevels)

      return Array.from({ length: rowCount }, (_, index) => Number(rowLevels[index] || 0) >= maxLevel).every(Boolean)
    })
  }

  const isSiegeCategoryComplete = (buildings = []) => {
    if (!Array.isArray(buildings) || buildings.length === 0) return false

    return buildings.every((building) => {
      const maxLevel = Math.max(...(building.levels || []).map((level) => Number(level.level || 0)), 0)
      if (maxLevel <= 0) return false

      const siegeRequirement = getSiegeWorkshopRequirement(building)
      if (currentWorkshopLevel < siegeRequirement) return false

      const rowLevels = structureLevels[building.id] || []
      const rowCount = getStructureRowCount(building, rowLevels)

      return Array.from({ length: rowCount }, (_, index) => Number(rowLevels[index] || 0) >= maxLevel).every(Boolean)
    })
  }

  const isSpellCategoryComplete = (buildings = []) => {
    if (!Array.isArray(buildings) || buildings.length === 0) return false

    return buildings.every((building) => {
      const maxLevel = Math.max(...(building.levels || []).map((level) => Number(level.level || 0)), 0)
      if (maxLevel <= 0) return false

      const isDarkSpell = DARK_SPELL_BUILDING_IDS.has(String(building?.id || ''))
      const spellRequirement = isDarkSpell ? getDarkSpellFactoryRequirement(building) : getSpellFactoryRequirement(building)
      const currentFactoryLevel = isDarkSpell ? Number(currentDarkSpellFactoryLevel || 0) : Number(currentSpellFactoryLevel || 0)
      if (currentFactoryLevel < spellRequirement) return false

      const rowLevels = structureLevels[building.id] || []
      const rowCount = getStructureRowCount(building, rowLevels)

      return Array.from({ length: rowCount }, (_, index) => Number(rowLevels[index] || 0) >= maxLevel).every(Boolean)
    })
  }

  const isEquipmentCategoryComplete = (buildings = []) => {
    if (!Array.isArray(buildings) || buildings.length === 0) return false

    return buildings.every((building) => {
      const maxLevel = Math.max(...(building.levels || []).map((level) => Number(level.level || 0)), 0)
      if (maxLevel <= 0) return false

      const blacksmithRequired = Number(building?.blacksmith_level_unlocked ?? 0)
      if (blacksmithRequired > 0 && currentBlacksmithLevel < blacksmithRequired) return false

      const rowLevels = structureLevels[building.id] || []
      const rowCount = getStructureRowCount(building, rowLevels)

      return Array.from({ length: rowCount }, (_, index) => Number(rowLevels[index] || 0) >= maxLevel).every(Boolean)
    })
  }

  const isPetCategoryComplete = (buildings = []) => {
    if (!Array.isArray(buildings) || buildings.length === 0) return false

    return buildings.every((building) => {
      const maxLevel = Math.max(...(building.levels || []).map((level) => Number(level.level || 0)), 0)
      if (maxLevel <= 0) return false

      const petRequirement = getPetHouseRequirement(building)
      if (currentPetHouseLevel < petRequirement) return false

      const rowLevels = structureLevels[building.id] || []
      const rowCount = getStructureRowCount(building, rowLevels)

      return Array.from({ length: rowCount }, (_, index) => Number(rowLevels[index] || 0) >= maxLevel).every(Boolean)
    })
  }

  const loadedTabCompletion = {
    defences: isBuildingCategoryComplete(visibleDefenseBuildings),
    traps: showTrapsTab ? isBuildingCategoryComplete(visibleTrapBuildings) : false,
    army: isBuildingCategoryComplete(visibleArmyBuildings),
    resources: isBuildingCategoryComplete(visibleResourceBuildings),
    troops: isTroopCategoryComplete(structureCatalog.troops || []),
    spells: showSpellsTab ? isSpellCategoryComplete(structureCatalog.spells || []) : false,
    dark_troops: showDarkTroopsTab ? isDarkTroopCategoryComplete(structureCatalog.dark_troops || []) : false,
    sieges: showSiegesTab ? isSiegeCategoryComplete(structureCatalog.sieges || []) : false,
    heroes: showHeroesTab ? computeHeroesCompletion() >= 100 : false,
    equipment: showEquipmentTab ? isEquipmentCategoryComplete(structureCatalog.equipment || []) : false,
    pets: showPetsTab ? isPetCategoryComplete(structureCatalog.pets || []) : false,
    walls: isWallMaxComplete,
  }
  const showTroopsProgress = currentTownHallLevel >= 3
  const showSpellsProgress = currentTownHallLevel >= 5
  const showHeroesProgress = currentTownHallLevel >= 4
  const showEquipmentProgress = currentTownHallLevel >= 8
  const showPetsProgress = currentTownHallLevel >= 14
  const townhallConstructionReady = (() => {
    const constructibleBuildings = [
      ...(structureCatalog.defences || []),
      ...(structureCatalog.traps || []),
      ...(structureCatalog.army || []),
      ...(structureCatalog.resources || []),
      ...(structureCatalog.troops || []),
      ...(structureCatalog.spells || []),
      ...(structureCatalog.dark_troops || []),
      ...(structureCatalog.sieges || []),
      ...(structureCatalog.pets || []),
    ].filter((building) => building?.id)

    if (constructibleBuildings.length === 0) return false

    return constructibleBuildings.every((building) => {
      const rowCount = getStructureRowCount(building, structureLevels[building.id] || [])
      if (rowCount <= 0) return false

      const rowLevels = structureLevels[building.id] || Array.from({ length: rowCount }, (_, index) => getDefaultRowLevel(building, index, isCopyUnlocked(building, index)))

      return Array.from({ length: rowCount }, (_, index) => Number(rowLevels[index] || 0) > 0).every(Boolean)
    })
  })()
  const activeRemainingBetaComplete = isWallsTabActive ? isWallMaxComplete : Boolean(loadedTabCompletion[activeLoadedTab])
  const canStartTownhallUpgrade = Boolean(
    townhallUpgradeInfo?.timeSeconds
    && townhallUpgradeInfo?.cost
    && !activeTownhallUpgrade
    && !hasReachedMaxTownHall,
  )

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

                          {showTroopsProgress && (
                            <div className={styles.progressRow}>
                              <div className={styles.progressBarWrap}>
                                <div className={styles.progressBarInner} style={{width: `${Math.max(0, computeTroopsCompletion())}%`}} />
                                <span className={styles.progressOverlayLabel}>{Math.max(0, computeTroopsCompletion())}%</span>
                              </div>
                              <div className={styles.progressName}>Troops</div>
                            </div>
                          )}

                          {showHeroesProgress && (
                            <div className={styles.progressRow}>
                              <div className={styles.progressBarWrap}>
                                <div className={styles.progressBarInner} style={{width: `${Math.max(0, computeHeroesCompletion())}%`}} />
                                <span className={styles.progressOverlayLabel}>{Math.max(0, computeHeroesCompletion())}%</span>
                              </div>
                              <div className={styles.progressName}>Heroes</div>
                            </div>
                          )}

                          {showEquipmentProgress && (
                            <div className={styles.progressRow}>
                              <div className={styles.progressBarWrap}>
                                <div className={styles.progressBarInner} style={{width: `${Math.max(0, computeEquipmentCompletion())}%`}} />
                                <span className={styles.progressOverlayLabel}>{Math.max(0, computeEquipmentCompletion())}%</span>
                              </div>
                              <div className={styles.progressName}>Equipment</div>
                            </div>
                          )}

                          {showPetsProgress && (
                            <div className={styles.progressRow}>
                              <div className={styles.progressBarWrap}>
                                <div className={styles.progressBarInner} style={{width: `${Math.max(0, computePetsCompletion())}%`}} />
                                <span className={styles.progressOverlayLabel}>{Math.max(0, computePetsCompletion())}%</span>
                              </div>
                              <div className={styles.progressName}>Pets</div>
                            </div>
                          )}

                        <div className={styles.progressRow}>
                          <div className={styles.progressBarWrap}>
                            <div className={styles.progressBarInner} style={{width: `${Math.max(0, computeWallsCompletion())}%`}} />
                            <span className={styles.progressOverlayLabel}>{Math.max(0, computeWallsCompletion())}%</span>
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
                    ) : activeTownhallUpgrade ? (
                      <div className={styles.nextThUpgradePreview}>
                        <div className={styles.nextThUpgradeTopRow}>
                          <div className={styles.nextThImageWrap}>
                            <img src={`/src/assets/townhall/1_${townhallUpgradeTargetLevel}.png`} alt={`TH ${townhallUpgradeTargetLevel}`} className={styles.nextThImage} />
                            <div className={styles.nextThLevel}>TH {townhallUpgradeTargetLevel}</div>
                          </div>

                          <div className={styles.nextThUpgradeActionIcons}>
                            <button type="button" className={styles.nextThUpgradeIconBtn} aria-label="Modify town hall upgrade" title="Modify town hall upgrade" onClick={openTownhallModifyPopup}>
                              <HandymanOutlinedIcon className={styles.nextThUpgradeIcon} />
                            </button>
                            <button type="button" className={styles.nextThUpgradeIconBtn} aria-label="Complete town hall upgrade" title="Complete town hall upgrade" onClick={openTownhallCompletePopup}>
                              <CheckIcon className={styles.nextThUpgradeIcon} />
                            </button>
                          </div>
                        </div>

                        <div className={styles.nextThProgressWrap}>
                          <div className={styles.nextThProgressBar}>
                            <div className={styles.nextThProgressFill} style={{ width: `${activeTownhallUpgradeProgress}%` }} />
                            <span className={styles.nextThProgressLabel}>{activeTownhallUpgradeProgress}%</span>
                          </div>

                          <div className={styles.nextThCompleteText}>Complete: {formatUpgradeClock(activeTownhallUpgradeRemainingSeconds)}</div>
                        </div>
                      </div>
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
                              <span className={`${styles.nextThStatValue} ${townhallUpgradeInfo?.cost ? styles.nextThCostValue : ''}`}>
                                {townhallUpgradeInfo?.cost != null ? (
                                  <span className={styles.nextThCostValueInner}>
                                    {upgradeResourceIcons[String(townhallUpgradeInfo.resource || '').trim().toLowerCase()] ? (
                                      <img
                                        src={upgradeResourceIcons[String(townhallUpgradeInfo.resource || '').trim().toLowerCase()]}
                                        alt={townhallUpgradeInfo.resource}
                                        className={styles.nextThCostIcon}
                                      />
                                    ) : null}
                                    {formatCost(townhallUpgradeInfo.cost)}
                                  </span>
                                ) : '—'}
                              </span>
                            </div>
                            <div className={styles.nextThStatRow}>
                              <span className={styles.nextThStatLabel}>Duration:</span>
                              <span className={styles.nextThStatValue}>{townhallUpgradeInfo?.timeSeconds ? formatSeconds(townhallUpgradeInfo.timeSeconds) : '—'}</span>
                            </div>
                          </div>

                          <div className={styles.nextThActionRow}>
                            <button className={styles.startUpgradeBtn} onClick={handleStartTownhallUpgrade} disabled={!canStartTownhallUpgrade}>
                              Start TH Upgrade
                            </button>
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
                      <button type="button" className={`${styles.massBtn} ${styles.active}`} onClick={handleSetupVillageStructures}>
                        <GridViewIcon className={styles.massButtonIcon} />
                        Structures
                      </button>
                      <button type="button" className={styles.massBtn} onClick={handleOpenWallsEditor}>
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

              {showLabAssistBox && (
                <div className={styles.labAssistBox}>
                  <div className={styles.labAssistItem}>
                    <div className={styles.labAssistLine}>
                      <span className={styles.labAssistLabel}>Lab Assistant:</span>
                      <span className={styles.labAssistStatus}>Now</span>
                    </div>
                    <button
                      type="button"
                      className={styles.labAssistUnlockBtn}
                      onClick={() => showToast('Lab Assist unlock coming soon.', 'success')}
                    >
                      Unlock
                    </button>
                  </div>

                  <div className={styles.labAssistItem}>
                    <div className={styles.labAssistLine}>
                      <span className={styles.labAssistLabel}>Builder's Apprentice:</span>
                      <span className={styles.labAssistStatus}>Now</span>
                    </div>
                    <button
                      type="button"
                      className={styles.labAssistUnlockBtn}
                      onClick={() => showToast("Builder's Apprentice unlock coming soon.", 'success')}
                    >
                      Unlock
                    </button>
                  </div>
                </div>
              )}

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
                    {['defences', ...(showTrapsTab ? ['traps'] : []), 'army', 'resources', 'troops', ...(showSpellsTab ? ['spells'] : []), ...(showDarkTroopsTab ? ['dark_troops'] : []), ...(showSiegesTab ? ['sieges'] : []), ...(showHeroesTab ? ['heroes'] : []), ...(showEquipmentTab ? ['equipment'] : []), ...(showPetsTab ? ['pets'] : []), 'walls'].map((tab) => (
                      (() => {
                        const upgradeCount = loadedTabUpgradeCounts[tab] || 0
                        const isUpgrading = upgradeCount > 0

                        return (
                      <button
                        type="button"
                        key={tab}
                          className={`${styles.loadedTabBtn} ${displayedLoadedTab === tab ? styles.loadedTabBtnActive : ''} ${isUpgrading ? styles.loadedTabBtnUpgrading : ''} ${loadedTabCompletion[tab] && !isUpgrading ? styles.loadedTabBtnComplete : ''}`}
                        onMouseDown={() => setActiveLoadedTab(tab)}
                        onTouchStart={() => setActiveLoadedTab(tab)}
                      >
                          <span className={styles.loadedTabBtnLabel}>{tabLabels[tab]}</span>
                          {isUpgrading ? (
                            <span className={styles.loadedTabBtnUpgradeMeta}>↑ ({upgradeCount})</span>
                          ) : (
                              loadedTabCompletion[tab] && (
                                <span className={styles.loadedTabBtnCompleteMeta}>
                                  <CheckIcon className={styles.loadedTabBtnIcon} />
                                </span>
                              )
                          )}
                        </button>
                        )
                      })()
                    ))}
                  </div>

                    <div className={`${styles.loadedTabBody} ${displayedLoadedTab === 'walls' ? styles.loadedTabBodyWalls : ''}`}>
                    <div className={styles.loadedTabMain}>
                      {displayedLoadedTab === 'defences' && (
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

                      {displayedLoadedTab === 'traps' && showTrapsTab && (
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
                              {editTrapBuildings.map((building, index) => renderStructureCard(building, `tab-traps-${building.id}-${index}`, { readOnly: true }))}
                            </div>
                          </div>
                        </div>
                      )}

                      {displayedLoadedTab === 'heroes' && showHeroesTab && (
                        <div className={styles.loadedTabSection}>
                          <div className={styles.loadedTabSectionHeader}>
                            <div className={styles.loadedTabHeaderLeft}>
                              <h3 className={styles.loadedTabSectionTitle}>{loadedTabSectionTitle}</h3>
                              <SettingsIcon className={styles.loadedTabSettingsIcon} />
                            </div>
                          </div>
                          <div className={styles.loadedStructureFrame}>
                            <div className={styles.loadedStructureHeader}>
                              <span>{loadedTabPrimaryLabel}</span>
                              <span>{loadedTabSecondaryLabel}</span>
                              <span>Upgrades</span>
                            </div>
                            <div className={styles.readOnlyLoadedList}>
                              {visibleHeroBuildings.map((building, index) => renderStructureCard(building, `tab-heroes-${building.id}-${index}`, { readOnly: true }))}
                            </div>
                          </div>
                        </div>
                      )}

                      {displayedLoadedTab === 'equipment' && showEquipmentTab && (
                        <div className={styles.loadedTabSection}>
                          <div className={styles.loadedTabSectionHeader}>
                            <div className={styles.loadedTabHeaderLeft}>
                              <h3 className={styles.loadedTabSectionTitle}>{loadedTabSectionTitle}</h3>
                              <SettingsIcon className={styles.loadedTabSettingsIcon} />
                            </div>
                          </div>
                          <div className={styles.loadedStructureFrame}>
                            <div className={styles.loadedStructureHeader}>
                              <span>{loadedTabPrimaryLabel}</span>
                              <span>{loadedTabSecondaryLabel}</span>
                              <span>Upgrades</span>
                            </div>
                            <div className={styles.readOnlyLoadedList}>
                              {sortedEquipmentByHeroEntries.map(([heroName, equipmentList]) => (
                                <div key={heroName} className={styles.equipmentHeroGroup}>
                                  <div className={styles.equipmentHeroGroupHeader}>
                                    {heroName}
                                  </div>
                                  <div className={styles.equipmentHeroRows}>
                                    {equipmentList.map((building, index) => renderStructureCard(building, `tab-equipment-${heroName}-${building.id}-${index}`, { readOnly: true }))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {displayedLoadedTab === 'army' && (
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

                      {displayedLoadedTab === 'resources' && (
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

                      {displayedLoadedTab === 'troops' && (
                        <div className={styles.loadedTabSection}>
                          <div className={styles.loadedTabSectionHeader}>
                            <div className={styles.loadedTabHeaderLeft}>
                              <h3 className={styles.loadedTabSectionTitle}>{loadedTabSectionTitle}</h3>
                              <SettingsIcon className={styles.loadedTabSettingsIcon} />
                            </div>
                          </div>
                          <div className={styles.loadedStructureFrame}>
                            <div className={styles.loadedStructureHeader}>
                              <span>{loadedTabPrimaryLabel}</span>
                              <span>{loadedTabSecondaryLabel}</span>
                              <span>Upgrades</span>
                            </div>
                            <div className={styles.readOnlyLoadedList}>
                              {visibleTroopBuildings.map((building, index) => renderStructureCard(building, `tab-troops-${building.id}-${index}`, { readOnly: true }))}
                            </div>
                          </div>
                        </div>
                      )}

                      {displayedLoadedTab === 'spells' && showSpellsTab && (
                        <div className={styles.loadedTabSection}>
                          <div className={styles.loadedTabSectionHeader}>
                            <div className={styles.loadedTabHeaderLeft}>
                              <h3 className={styles.loadedTabSectionTitle}>{loadedTabSectionTitle}</h3>
                              <SettingsIcon className={styles.loadedTabSettingsIcon} />
                            </div>
                          </div>
                          <div className={styles.loadedStructureFrame}>
                            <div className={styles.loadedStructureHeader}>
                              <span>{loadedTabPrimaryLabel}</span>
                              <span>{loadedTabSecondaryLabel}</span>
                              <span>Upgrades</span>
                            </div>
                            <div className={styles.readOnlyLoadedList}>
                              {visibleSpellBuildings.map((building, index) => renderStructureCard(building, `tab-spells-${building.id}-${index}`, { readOnly: true }))}
                            </div>
                          </div>
                        </div>
                      )}

                      {displayedLoadedTab === 'dark_troops' && showDarkTroopsTab && (
                        <div className={styles.loadedTabSection}>
                          <div className={styles.loadedTabSectionHeader}>
                            <div className={styles.loadedTabHeaderLeft}>
                              <h3 className={styles.loadedTabSectionTitle}>{loadedTabSectionTitle}</h3>
                              <SettingsIcon className={styles.loadedTabSettingsIcon} />
                            </div>
                          </div>
                          <div className={styles.loadedStructureFrame}>
                            <div className={styles.loadedStructureHeader}>
                              <span>{loadedTabPrimaryLabel}</span>
                              <span>{loadedTabSecondaryLabel}</span>
                              <span>Upgrades</span>
                            </div>
                            <div className={styles.readOnlyLoadedList}>
                              {visibleDarkTroopBuildings.map((building, index) => renderStructureCard(building, `tab-dark-troops-${building.id}-${index}`, { readOnly: true }))}
                            </div>
                          </div>
                        </div>
                      )}

                      {displayedLoadedTab === 'sieges' && showSiegesTab && (
                        <div className={styles.loadedTabSection}>
                          <div className={styles.loadedTabSectionHeader}>
                            <div className={styles.loadedTabHeaderLeft}>
                              <h3 className={styles.loadedTabSectionTitle}>{loadedTabSectionTitle}</h3>
                              <SettingsIcon className={styles.loadedTabSettingsIcon} />
                            </div>
                          </div>
                          <div className={styles.loadedStructureFrame}>
                            <div className={styles.loadedStructureHeader}>
                              <span>{loadedTabPrimaryLabel}</span>
                              <span>{loadedTabSecondaryLabel}</span>
                              <span>Upgrades</span>
                            </div>
                            <div className={styles.readOnlyLoadedList}>
                              {visibleSiegesTabBuildings.map((building, index) => renderStructureCard(building, `tab-sieges-${building.id}-${index}`, { readOnly: true }))}
                            </div>
                          </div>
                        </div>
                      )}

                      {displayedLoadedTab === 'pets' && showPetsTab && (
                        <div className={styles.loadedTabSection}>
                          <div className={styles.loadedTabSectionHeader}>
                            <div className={styles.loadedTabHeaderLeft}>
                              <h3 className={styles.loadedTabSectionTitle}>{loadedTabSectionTitle}</h3>
                              <SettingsIcon className={styles.loadedTabSettingsIcon} />
                            </div>
                          </div>
                          <div className={styles.loadedStructureFrame}>
                            <div className={styles.loadedStructureHeader}>
                              <span>{loadedTabPrimaryLabel}</span>
                              <span>{loadedTabSecondaryLabel}</span>
                              <span>Upgrades</span>
                            </div>
                            <div className={styles.readOnlyLoadedList}>
                              {visiblePetBuildings.map((building, index) => renderStructureCard(building, `tab-pets-${building.id}-${index}`, { readOnly: true }))}
                            </div>
                          </div>
                        </div>
                      )}

                      {displayedLoadedTab === 'walls' && (
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
                                const nextWallLevel = wallLevels
                                  .filter((levelInfo) => Number(levelInfo.level) > Number(wallLevel.level))
                                  .sort((left, right) => Number(left.level) - Number(right.level))[0] || null
                                const wallLevelCount = Number(wallCounts[wallLevel.level] || 0)
                                const hasWallsToUpgrade = wallLevelCount > 0
                                const canShowWallActions = !isWallMaxComplete && Boolean(nextWallLevel) && hasWallsToUpgrade

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
                                    {canShowWallActions ? (
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
                                              onClick={() => handleWallUpgradeOne(wallLevel.level)}
                                              disabled={Number(wallCounts[wallLevel.level] || 0) <= 0 || wallLevel.level >= wallMaxLevel}
                                            >
                                              ↑1
                                            </button>
                                            <button
                                              type="button"
                                              className={`${styles.loadedWallActionBtn} ${styles.loadedWallActionAdd}`}
                                              aria-label="Wall add action"
                                              onClick={() => openWallUpgradePopup(wallLevel.level)}
                                              disabled={Number(wallCounts[wallLevel.level] || 0) <= 0 || wallLevel.level >= wallMaxLevel}
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
                                    {isWallMaxComplete ? (
                                      <div className={styles.loadedWallCost}>
                                        <span className={styles.loadedWallMaxedLabel}>✓ All walls are maxed</span>
                                      </div>
                                    ) : nextWallLevel && hasWallsToUpgrade ? (
                                      <div className={styles.loadedWallUpgradeList}>
                                        {[nextWallLevel].map((upgradeLevel) => (
                                          <div key={`wall-upgrade-${wallLevel.level}-${upgradeLevel.level}`} className={styles.loadedWallUpgradeItem}>
                                            <div className={styles.loadedWallCostIcons}>
                                              {(() => {
                                                const resourceOptions = getLevelResourceOptions(upgradeLevel, { isWallLevel: true })
                                                const usesDualGoldElixirIcon = resourceOptions.includes('gold') && resourceOptions.includes('elixir')

                                                if (usesDualGoldElixirIcon) {
                                                  return (
                                                    <img
                                                      src="/src/assets/magic-items/goldelxir.png"
                                                      alt="Gold or Elixir"
                                                      className={styles.loadedWallCostIcon}
                                                    />
                                                  )
                                                }

                                                return resourceOptions.map((resourceKey) => (
                                                  <span key={`${wallLevel.level}-${upgradeLevel.level}-${resourceKey}`} className={styles.loadedWallCostOption}>
                                                    {upgradeResourceIcons[resourceKey] ? (
                                                      <img
                                                        src={upgradeResourceIcons[resourceKey]}
                                                        alt={getUpgradeResourceLabel(resourceKey)}
                                                        className={styles.loadedWallCostIcon}
                                                      />
                                                    ) : null}
                                                  </span>
                                                ))
                                              })()}
                                            </div>
                                            <span className={styles.loadedWallUpgradeLabel}>Lvl {upgradeLevel.level}:</span>
                                            <span className={styles.loadedWallUpgradeValue}>{formatNumberShort(upgradeLevel.cost || 0)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className={styles.loadedWallCost}>
                                        <span className={styles.loadedWallMaxedLabel}>✓ All walls are maxed</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )})}
                            </div>
                          </div>

                          {typeof document !== 'undefined' ? createPortal(wallUpgradePopupMarkup, document.body) : wallUpgradePopupMarkup}
                        </div>
                      )}

                      {townhallUpgradePopup.open && activeTownhallUpgrade && (
                        typeof document !== 'undefined' ? createPortal(
                          townhallUpgradePopup.mode === 'modify' ? (
                            <div className={styles.modifyUpgradeOverlay} onClick={closeTownhallUpgradePopup}>
                              <div className={styles.modifyUpgradePopup} onClick={(event) => event.stopPropagation()}>
                                <button type="button" className={styles.modifyUpgradeCloseBtn} onClick={closeTownhallUpgradePopup} aria-label="Close town hall upgrade popup">
                                  ×
                                </button>

                                <h3 className={styles.modifyUpgradeTitle}>Modify Upgrade</h3>

                                <div className={styles.modifyUpgradeImagesRow}>
                                  <div className={styles.modifyUpgradeImageBlock}>
                                    <img
                                      src={`/src/assets/townhall/1_${Number(activeTownhallUpgrade.fromLevel || currentTownHallLevel)}.png`}
                                      alt={`TH ${Number(activeTownhallUpgrade.fromLevel || currentTownHallLevel)}`}
                                      className={styles.modifyUpgradeImage}
                                    />
                                  </div>
                                  <div className={styles.modifyUpgradeArrow}>→</div>
                                  <div className={styles.modifyUpgradeImageBlock}>
                                    <img
                                      src={`/src/assets/townhall/1_${townhallUpgradeTargetLevel}.png`}
                                      alt={`TH ${townhallUpgradeTargetLevel}`}
                                      className={styles.modifyUpgradeImage}
                                    />
                                  </div>
                                </div>

                                <p className={styles.modifyUpgradePrompt}>
                                  Update the upgrade time of Town Hall from level {Number(activeTownhallUpgrade.fromLevel || currentTownHallLevel)} to level {townhallUpgradeTargetLevel}:
                                </p>

                                <div className={styles.modifyUpgradeRemainingBlock}>
                                  <div className={styles.modifyUpgradeRemainingLabel}>Remaining Time:</div>
                                  <div className={styles.modifyUpgradeRemainingHint}>Maximum: {formatUpgradeClock(activeTownhallUpgradeRemainingSeconds)}</div>
                                  <div className={styles.modifyUpgradeTimeGrid}>
                                    {[
                                      ['days', 'Days'],
                                      ['hours', 'Hours'],
                                      ['minutes', 'Minutes'],
                                      ['seconds', 'Seconds'],
                                    ].map(([key, label]) => (
                                      <label key={key} className={styles.modifyUpgradeTimeCell}>
                                        <span className={styles.modifyUpgradeTimeLabel}>{label}</span>
                                        <select
                                          className={styles.modifyUpgradeTimeSelect}
                                          value={townhallUpgradePopup.durationParts[key]}
                                          onChange={(event) => updateTownhallUpgradeDurationPart(key, event.target.value)}
                                          aria-label={label}
                                        >
                                          {Array.from({ length: (() => {
                                            const maxAllowed = activeTownhallUpgradeRemainingSeconds
                                            const parts = townhallUpgradePopup.durationParts
                                            const daysMax = Math.floor(maxAllowed / 86400)
                                            const currentDayLimit = Math.max(0, Math.min(daysMax, 366))
                                            if (key === 'days') return currentDayLimit + 1

                                            const remainingAfterDays = Math.max(0, maxAllowed - (Math.min(parts.days, currentDayLimit) * 86400))
                                            if (key === 'hours') return Math.max(1, Math.min(23, Math.floor(remainingAfterDays / 3600)) + 1)

                                            const remainingAfterHours = Math.max(0, remainingAfterDays - (Math.min(parts.hours, Math.max(0, Math.floor(remainingAfterDays / 3600))) * 3600))
                                            if (key === 'minutes') return Math.max(1, Math.min(59, Math.floor(remainingAfterHours / 60)) + 1)

                                            return Math.max(1, Math.min(59, remainingAfterHours) + 1)
                                          })() }, (_, index) => index).map((value) => (
                                            <option key={value} value={value}>{value}</option>
                                          ))}
                                        </select>
                                      </label>
                                    ))}
                                  </div>
                                </div>

                                <div className={styles.modifyUpgradeActions}>
                                  <button type="button" className={styles.modifyUpgradeBackBtn} onClick={closeTownhallUpgradePopup}>← Back</button>
                                  <button type="button" className={styles.modifyUpgradeSaveBtn} onClick={() => { void saveTownhallUpgradeTime() }} disabled={townhallUpgradePopup.saving}>
                                    {townhallUpgradePopup.saving ? 'Saving...' : '✓ Update Time'}
                                  </button>
                                  <button type="button" className={styles.modifyUpgradeCancelBtn} onClick={() => { void cancelTownhallUpgrade() }}>
                                    ✕ Cancel Upgrade
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className={styles.completeUpgradeOverlay} onClick={closeTownhallUpgradePopup}>
                              <div className={styles.completeUpgradePopup} onClick={(event) => event.stopPropagation()}>
                                <button type="button" className={styles.completeUpgradeCloseBtn} onClick={closeTownhallUpgradePopup} aria-label="Close town hall complete popup">
                                  ×
                                </button>

                                <h3 className={styles.completeUpgradeTitle}>Complete Upgrade</h3>

                                <div className={styles.completeUpgradeImagesRow}>
                                  <div className={styles.completeUpgradeImageBlock}>
                                    <img
                                      src={`/src/assets/townhall/1_${Number(activeTownhallUpgrade.fromLevel || currentTownHallLevel)}.png`}
                                      alt={`TH ${Number(activeTownhallUpgrade.fromLevel || currentTownHallLevel)}`}
                                      className={styles.completeUpgradeImage}
                                    />
                                  </div>
                                  <div className={styles.completeUpgradeArrow}>→</div>
                                  <div className={styles.completeUpgradeImageBlock}>
                                    <img
                                      src={`/src/assets/townhall/1_${townhallUpgradeTargetLevel}.png`}
                                      alt={`TH ${townhallUpgradeTargetLevel}`}
                                      className={styles.completeUpgradeImage}
                                    />
                                  </div>
                                </div>

                                <p className={styles.completeUpgradePrompt}>
                                  Do you wish to complete Town Hall upgrading from level {Number(activeTownhallUpgrade.fromLevel || currentTownHallLevel)} to level {townhallUpgradeTargetLevel}?
                                </p>

                                <div className={styles.completeUpgradeChoiceTitle}>Use Magic Item?</div>
                                <div className={styles.completeUpgradeChoiceNote}>This will be used for historical upgrade records.</div>

                                <div className={styles.completeUpgradeChoices} role="radiogroup" aria-label="Use magic item">
                                  {[
                                    ['none', 'None'],
                                    ['book', 'Book'],
                                    ['hammer', 'Hammer'],
                                  ].map(([value, label]) => (
                                    <label key={value} className={styles.completeUpgradeChoiceOption}>
                                      <span className={styles.completeUpgradeChoiceLabel}>{label}</span>
                                      <input
                                        type="radio"
                                        name="townhall-complete-upgrade"
                                        value={value}
                                        checked={townhallUpgradePopup.magicItem === value}
                                        onChange={() => updateTownhallUpgradeMagicItem(value)}
                                      />
                                    </label>
                                  ))}
                                </div>

                                <div className={styles.completeUpgradeActions}>
                                  <button type="button" className={styles.completeUpgradeBackBtn} onClick={closeTownhallUpgradePopup}>← Back</button>
                                  <button type="button" className={styles.completeUpgradeConfirmBtn} onClick={() => { void confirmTownhallUpgradeCompletion() }} disabled={townhallUpgradePopup.saving}>
                                    {townhallUpgradePopup.saving ? 'Completing...' : '✓ Complete'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ),
                          document.body,
                        ) : null
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
                              <span
                                className={[
                                  styles.loadedRemainingResourceValue,
                                  resource.id === 'gold'
                                    ? styles.readOnlyResourceCostGold
                                    : resource.id === 'elixir'
                                      ? styles.readOnlyResourceCostElixir
                                      : resource.id === 'dark_elixir'
                                        ? styles.readOnlyResourceCostDarkElixir
                                        : '',
                                ].filter(Boolean).join(' ')}
                              >
                                {formatNumberShort(resource.total)}
                              </span>
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
                            // For equipment tab we only show resource rows; hide time/builders
                            activeLoadedTab === 'equipment' ? null : (
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
                                      <span className={styles.loadedRemainingTimeValue}>{formatSeconds(remainingBetaTimeSeconds)}</span>
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
                            )
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

                    {editTrapBuildings.length > 0 && (
                      <>
                        <h2 className={styles.structuresDatabaseTitle}>Traps</h2>
                        <div className={styles.structuresDatabaseGrid}>
                          {editTrapBuildings.map((building, index) => renderStructureCard(building, `traps-${building.id}-${index}`))}
                        </div>
                      </>
                    )}
                  </div>
                </section>

                <div className={styles.structuresProceedBar}>
                  <button className={styles.structuresDangerBtn} onClick={handleCancelStructuresEdit} disabled={structuresLoading}>
                    Cancel
                  </button>
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
                    <button className={styles.wallsUpdateBtn} onClick={() => handleUpdateWalls(wallCounts, { returnToLoaded: true })} disabled={wallLoading}>
                      {wallLoading ? 'Saving...' : '✓ Update'}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          ) : null}
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
