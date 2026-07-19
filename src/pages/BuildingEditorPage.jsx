import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import styles from './BuildingEditorPage.module.css'
import { supabase } from '../supabaseClient'
import Header from '../components/Header'
import ToastNotification from '../components/ToastNotification'
import { getTownhallSnapshotForLevel } from '../utils/townhallSnapshot'
import { ALL_BUILDINGS, BUILDING_SECTIONS, DARK_SPELL_BUILDING_IDS, getBuildingCategory, getDefaultBuildingData } from '../data/buildings'
import { formatResourceCostBreakdown, getLevelResourceOptions, normalizeResourceCosts } from '../utils/resourceCosts'

const EQUIPMENT_RESOURCE_KEYS = ['shiny_ore', 'glowy_ore', 'starry_ore']
const EQUIPMENT_HERO_OPTIONS = BUILDING_SECTIONS.heroes.map((building) => building.name)
const EQUIPMENT_LEVELS_CLIPBOARD_KEY = 'clash_tracker_equipment_levels_clipboard'

const RESOURCE_ICONS = {
  gold: '/src/assets/magic-items/gold.png',
  elixir: '/src/assets/magic-items/elixir.png',
  dark_elixir: '/src/assets/magic-items/de.png',
  glowy_ore: '/src/assets/magic-items/ore-glowy.png',
  shiny_ore: '/src/assets/magic-items/ore-shiny.png',
  starry_ore: '/src/assets/magic-items/ore-starry.png',
}

const EQUIPMENT_BUILDINGS = {
  barbarian_puppet: { id: 'barbarian_puppet', name: 'Barbarian Puppet', hero: 'Barbarian King', image: '/src/assets/Equipment/Barbarian_King/Barbarian_puppet/157.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  rage_vial: { id: 'rage_vial', name: 'Rage Vial', hero: 'Barbarian King', image: '/src/assets/Equipment/Barbarian_King/Rage_Vial/158.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  earthquake_boots: { id: 'earthquake_boots', name: 'Earthquake Boots', hero: 'Barbarian King', image: '/src/assets/Equipment/Barbarian_King/Earthquake_Boots/159.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  vampstache: { id: 'vampstache', name: 'Vampstache', hero: 'Barbarian King', image: '/src/assets/Equipment/Barbarian_King/Vampstache/160.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  archer_puppet: { id: 'archer_puppet', name: 'Archer Puppet', hero: 'Archer Queen', image: '/src/assets/Equipment/Archer_Queen/Archer_Puppet/161.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  invisibility_vial: { id: 'invisibility_vial', name: 'Invisibility Vial', hero: 'Archer Queen', image: '/src/assets/Equipment/Archer_Queen/Invisibility_vial/162.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  giant_arrow: { id: 'giant_arrow', name: 'Giant Arrow', hero: 'Archer Queen', image: '/src/assets/Equipment/Archer_Queen/Giant_Arrow/163.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  healer_puppet: { id: 'healer_puppet', name: 'Healer Puppet', hero: 'Archer Queen', image: '/src/assets/Equipment/Archer_Queen/Healer_Puppet/164.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  eternal_tome: { id: 'eternal_tome', name: 'Eternal Tome', hero: 'Grand Warden', image: '/src/assets/Equipment/Grand_Warden/Eternal_Tome/165.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  life_gem: { id: 'life_gem', name: 'Life Gem', hero: 'Grand Warden', image: '/src/assets/Equipment/Grand_Warden/Life_Gem/166.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  healing_tome: { id: 'healing_tome', name: 'Healing Tome', hero: 'Grand Warden', image: '/src/assets/Equipment/Grand_Warden/Healing_Tome/167.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  rage_gem: { id: 'rage_gem', name: 'Rage Gem', hero: 'Grand Warden', image: '/src/assets/Equipment/Grand_Warden/Rage_Gem/168.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  royal_gem: { id: 'royal_gem', name: 'Royal Gem', hero: 'Royal Champion', image: '/src/assets/Equipment/Royal_Champion/Royal_Gem/169.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  seeking_shield: { id: 'seeking_shield', name: 'Seeking Shield', hero: 'Royal Champion', image: '/src/assets/Equipment/Royal_Champion/Seeking_Shield/170.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  giant_gauntlet: { id: 'giant_gauntlet', name: 'Giant Gauntlet', hero: 'Barbarian King', image: '/src/assets/Equipment/Barbarian_King/Gaint_Gauntlet/171.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  spiky_ball: { id: 'spiky_ball', name: 'Spiky Ball', hero: 'Barbarian King', image: '/src/assets/Equipment/Barbarian_King/Spiky_Ball/194.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  frozen_arrow: { id: 'frozen_arrow', name: 'Frozen Arrow', hero: 'Archer Queen', image: '/src/assets/Equipment/Archer_Queen/Fronzen_Arrow/172.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  hog_rider_puppet: { id: 'hog_rider_puppet', name: 'Hog Rider Puppet', hero: 'Royal Champion', image: '/src/assets/Equipment/Royal_Champion/Hog_Rider_Puppet/173.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  haste_vial: { id: 'haste_vial', name: 'Haste Vial', hero: 'Royal Champion', image: '/src/assets/Equipment/Royal_Champion/Haste_Vial/174.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  fireball: { id: 'fireball', name: 'Fireball', hero: 'Grand Warden', image: '/src/assets/Equipment/Grand_Warden/Fireball/176.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  magic_mirror: { id: 'magic_mirror', name: 'Magic Mirror', hero: 'Archer Queen', image: '/src/assets/Equipment/Archer_Queen/Magic_Mirror/198.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  lavaloon_puppet: { id: 'lavaloon_puppet', name: 'Lavaloon Puppet', hero: 'Grand Warden', image: '/src/assets/Equipment/Grand_Warden/Lavaloon_Puppet/199.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  dark_orb: { id: 'dark_orb', name: 'Dark Orb', hero: 'Minion Prince', image: '/src/assets/Equipment/Minion_Prince/Dark_Orb/209.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  henchmen_puppet: { id: 'henchmen_puppet', name: 'Henchmen Puppet', hero: 'Minion Prince', image: '/src/assets/Equipment/Minion_Prince/Henchmen_Puppet/210.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  electro_boots: { id: 'electro_boots', name: 'Electro Boots', hero: 'Royal Champion', image: '/src/assets/Equipment/Royal_Champion/Electro_Boots/211.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  snake_bracelet: { id: 'snake_bracelet', name: 'Snake Bracelet', hero: 'Barbarian King', image: '/src/assets/Equipment/Barbarian_King/Snake_Bracelet/213.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  rocket_spear: { id: 'rocket_spear', name: 'Rocket Spear', hero: 'Royal Champion', image: '/src/assets/Equipment/Royal_Champion/Rocket_Spear/195.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  metal_pants: { id: 'metal_pants', name: 'Metal Pants', hero: 'Minion Prince', image: '/src/assets/Equipment/Minion_Prince/Metal_pants/216_0.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  noble_iron: { id: 'noble_iron', name: 'Noble Iron', hero: 'Minion Prince', image: '/src/assets/Equipment/Minion_Prince/Noble_Iron/219_0.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  action_figure: { id: 'action_figure', name: 'Action Figure', hero: 'Archer Queen', image: '/src/assets/Equipment/Archer_Queen/Action_Figure/220.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  dark_crown: { id: 'dark_crown', name: 'Dark Crown', hero: 'Minion Prince', image: '/src/assets/Equipment/Minion_Prince/Dark_Crown/222.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  heroic_torch: { id: 'heroic_torch', name: 'Heroic Torch', hero: 'Grand Warden', image: '/src/assets/Equipment/Grand_Warden/Heroic_Torch/237.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  meteor_staff: { id: 'meteor_staff', name: 'Meteor Staff', hero: 'Minion Prince', image: '/src/assets/Equipment/Minion_Prince/Meteor_Staff/238.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  frost_flake: { id: 'frost_flake', name: 'Frost Flake', hero: 'Royal Champion', image: '/src/assets/Equipment/Royal_Champion/Frost_Flake/257.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  stick_horse: { id: 'stick_horse', name: 'Stick Horse', hero: 'Barbarian King', image: '/src/assets/Equipment/Barbarian_King/Stick_Horse/258.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  fire_heart: { id: 'fire_heart', name: 'Fire Heart', hero: 'Dragon Duke', image: '/src/assets/Equipment/Dragon_Duke/Fire_Heart/261.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  flame_blower: { id: 'flame_blower', name: 'Flame Blower', hero: 'Dragon Duke', image: '/src/assets/Equipment/Dragon_Duke/Flame_Blower/262.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  stun_blaster: { id: 'stun_blaster', name: 'Stun Blaster', hero: 'Dragon Duke', image: '/src/assets/Equipment/Dragon_Duke/Stun_Blaster/263.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  rocket_backpack: { id: 'rocket_backpack', name: 'Rocket Backpack', hero: 'Dragon Duke', image: '/src/assets/Equipment/Dragon_Duke/Rocket_Backpack/276.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
  monolith_arrow: { id: 'monolith_arrow', name: 'Monolith Arrow', hero: 'Archer Queen', image: '/src/assets/Equipment/Archer_Queen/Monolith_Arrow/280.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1 },
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

const formatEquipmentResourceLabel = (resource) => {
  if (resource === 'glowy_ore') return 'Glowy'
  if (resource === 'shiny_ore') return 'Shiny'
  if (resource === 'starry_ore') return 'Starry'
  return String(resource || '').replace(/_/g, ' ')
}

const formatEquipmentResourceName = (resource) => {
  if (resource === 'glowy_ore') return 'Glowy Ore'
  if (resource === 'shiny_ore') return 'Shiny Ore'
  if (resource === 'starry_ore') return 'Starry Ore'
  return String(resource || '').replace(/_/g, ' ')
}

const getEquipmentCostBreakdown = (levelInfo) => normalizeResourceCosts(levelInfo, 'glowy_ore')

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

const normalizeEquipmentType = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  return normalized === 'passive' ? 'passive' : 'active'
}

const normalizeEquipmentRarity = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  return normalized === 'epic' ? 'epic' : 'common'
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
  pet_house_level_unlocked: Number(sourceLevel.pet_house_level_unlocked ?? 0),
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

const createEquipmentLevelDraft = (levelNumber, sourceLevel = {}) => ({
  level: levelNumber,
  cost: Number(sourceLevel.cost ?? 0),
  costDisplay: Number(sourceLevel.costDisplay ?? sourceLevel.cost ?? 0),
  costMagnitude: sourceLevel.costMagnitude || '',
  resource: String(sourceLevel.resource || 'glowy_ore').trim().toLowerCase() || 'glowy_ore',
  resource_options: getLevelResourceOptions(sourceLevel, { isEquipmentLevel: true, fallbackResource: 'glowy_ore' }),
  resource_costs: normalizeResourceCosts(sourceLevel, 'glowy_ore'),
  blacksmith_level_unlocked: Number(sourceLevel.blacksmith_level_unlocked ?? levelNumber ?? 0),
  time: '0sec',
})

const getEquipmentResourceAmounts = (levelInfo = {}) => {
  const amounts = {
    glowy_ore: 0,
    shiny_ore: 0,
    starry_ore: 0,
  }

  const normalizedCosts = normalizeResourceCosts(levelInfo, 'glowy_ore')
  if (Array.isArray(levelInfo?.resource_costs) && normalizedCosts.length > 0) {
    normalizedCosts.forEach(({ resource, cost }) => {
      if (resource in amounts) {
        amounts[resource] = Math.max(0, Number(cost) || 0)
      }
    })
    return amounts
  }

  const primaryResource = String(levelInfo?.resource || 'glowy_ore').trim().toLowerCase() || 'glowy_ore'
  amounts[primaryResource] = Math.max(0, Number(levelInfo?.cost ?? 0) || 0)
  return amounts
}

const getEquipmentBlacksmithLevel = (levelInfo = {}) => Number(levelInfo?.blacksmith_level_unlocked ?? levelInfo?.level ?? 0)

const updateEquipmentResourceCosts = (levelInfo, resourceKey, amountValue) => {
  const nextAmounts = getEquipmentResourceAmounts(levelInfo)
  nextAmounts[resourceKey] = Math.max(0, Number(amountValue) || 0)

  const nextResourceCosts = EQUIPMENT_RESOURCE_KEYS
    .map((key) => ({ resource: key, cost: nextAmounts[key] }))
    .filter((entry) => entry.cost > 0)

  const totalCost = Object.values(nextAmounts).reduce((total, amount) => total + Number(amount || 0), 0)
  const primaryResource = EQUIPMENT_RESOURCE_KEYS.find((key) => nextAmounts[key] > 0) || 'glowy_ore'

  return {
    ...levelInfo,
    cost: totalCost,
    costDisplay: totalCost,
    resource: primaryResource,
    resource_options: nextResourceCosts.map((entry) => entry.resource),
    resource_costs: nextResourceCosts,
  }
}

const normalizeEquipmentLevels = (count, sourceLevels = []) =>
  Array.from({ length: Math.max(0, count) }, (_, index) => {
    const source = sourceLevels[index]
    // Preserve explicit level numbers from source (allow level 0). If not provided, default to index+1.
    const levelNumber = (source && typeof source.level === 'number') ? source.level : (index + 1)
    const fallback = [
      { cost: 0, resource: 'glowy_ore', resource_costs: [{ resource: 'glowy_ore', cost: 0 }], blacksmith_level_unlocked: 1 },
      { cost: 1800, resource: 'shiny_ore', resource_costs: [{ resource: 'shiny_ore', cost: 1800 }], blacksmith_level_unlocked: 2 },
      { cost: 2300, resource: 'shiny_ore', resource_options: ['glowy_ore', 'shiny_ore'], resource_costs: [{ resource: 'shiny_ore', cost: 2200 }, { resource: 'glowy_ore', cost: 100 }], blacksmith_level_unlocked: 3 },
      { cost: 5000, resource: 'starry_ore', resource_costs: [{ resource: 'starry_ore', cost: 5000 }], blacksmith_level_unlocked: 4 },
    ][index] || {
      cost: 5000,
      resource: 'starry_ore',
      resource_costs: [{ resource: 'starry_ore', cost: 5000 }],
      blacksmith_level_unlocked: index + 1,
    }
    return createEquipmentLevelDraft(levelNumber, source || fallback)
  })

const serializeEquipmentLevelsForClipboard = (levels = []) =>
  (Array.isArray(levels) ? levels : []).map((levelInfo, index) => {
    const normalizedLevel = createEquipmentLevelDraft(
      Number(levelInfo?.level ?? index + 1) || (index + 1),
      levelInfo || {},
    )

    return {
      level: Number(normalizedLevel.level || index + 1) || (index + 1),
      cost: Number(normalizedLevel.cost ?? 0),
      costDisplay: Number(normalizedLevel.costDisplay ?? normalizedLevel.cost ?? 0),
      costMagnitude: normalizedLevel.costMagnitude || '',
      resource: String(normalizedLevel.resource || 'glowy_ore').trim().toLowerCase() || 'glowy_ore',
      resource_options: Array.isArray(normalizedLevel.resource_options) ? [...normalizedLevel.resource_options] : [],
      resource_costs: normalizeResourceCosts(normalizedLevel, 'glowy_ore'),
      blacksmith_level_unlocked: Number(normalizedLevel.blacksmith_level_unlocked ?? 0),
      time: '0sec',
    }
  })

const readEquipmentLevelsClipboard = () => {
  if (typeof window === 'undefined') return null

  try {
    const rawValue = window.localStorage.getItem(EQUIPMENT_LEVELS_CLIPBOARD_KEY)
    if (!rawValue) return null

    const parsedValue = JSON.parse(rawValue)
    if (!Array.isArray(parsedValue?.levels) || parsedValue.levels.length === 0) return null

    return {
      sourceBuildingId: String(parsedValue.sourceBuildingId || '').trim(),
      sourceBuildingName: String(parsedValue.sourceBuildingName || '').trim(),
      levels: serializeEquipmentLevelsForClipboard(parsedValue.levels),
      copiedAt: parsedValue.copiedAt || null,
    }
  } catch {
    return null
  }
}

const writeEquipmentLevelsClipboard = (payload) => {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(EQUIPMENT_LEVELS_CLIPBOARD_KEY, JSON.stringify(payload))
}

const getDefaultEquipmentData = (buildingId) => {
  const equipment = EQUIPMENT_BUILDINGS[buildingId]
  if (!equipment) return {}

  return {
    [buildingId]: {
      id: equipment.id,
      image_path: equipment.image,
      hero: equipment.hero,
      buildings_unlocked: 1,
      copy_unlocks: [true],
      unlock_source: equipment.unlock_source || 'blacksmith',
      blacksmith_level_unlocked: Number(equipment.blacksmith_level_unlocked || 1) || 1,
      levels: normalizeEquipmentLevels(Number(equipment.levelCount || 4), []),
    },
  }
}

const createBuildingLevelDraft = (levelNumber, sourceLevel = {}) => ({
  level: levelNumber,
  cost: Number(sourceLevel.cost ?? 0),
  costDisplay: Number(sourceLevel.costDisplay ?? sourceLevel.cost ?? 0),
  costMagnitude: sourceLevel.costMagnitude || '',
  resource: sourceLevel.resource || 'gold',
  resource_options: Array.isArray(sourceLevel.resource_options) ? [...sourceLevel.resource_options] : [],
  resource_costs: Array.isArray(sourceLevel.resource_costs)
    ? sourceLevel.resource_costs.map((entry) => ({
      resource: String(entry?.resource || '').trim().toLowerCase(),
      cost: Number(entry?.cost ?? 0),
    })).filter((entry) => Boolean(entry.resource))
    : [],
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
  const isBuilderHutBuilding = buildingId === 'builder_hut'
  const isDarkTroopBuilding = BUILDING_SECTIONS.dark_troops.some((building) => building.id === buildingId)
  const isSiegeBuilding = BUILDING_SECTIONS.sieges.some((building) => building.id === buildingId)
  const isPetBuilding = BUILDING_SECTIONS.pets.some((building) => building.id === buildingId)
  const isDarkSpellBuilding = DARK_SPELL_BUILDING_IDS.has(buildingId)
  const isTroopBuilding = BUILDING_SECTIONS.troops.some((building) => building.id === buildingId) || isDarkTroopBuilding || isSiegeBuilding || isPetBuilding
  const isSpellBuilding = BUILDING_SECTIONS.spells.some((building) => building.id === buildingId) || isDarkSpellBuilding
  const spellFactoryUnlockKey = isDarkSpellBuilding ? 'dark_spell_factory_level_unlocked' : 'spell_factory_level_unlocked'
  const troopUnlockKey = isPetBuilding ? 'pet_house_level_unlocked' : isSiegeBuilding ? 'workshop_level_unlocked' : isDarkTroopBuilding ? 'dark_barracks_level_unlocked' : 'barracks_level_unlocked'
  const troopUnlockSourceLabel = isPetBuilding ? 'Pet House' : isSiegeBuilding ? 'Workshop' : isDarkTroopBuilding ? 'Dark Barracks' : 'Barracks'
  const troopUnlockMinTownhall = isPetBuilding ? 14 : isSiegeBuilding ? 12 : isDarkTroopBuilding ? 7 : 3
  const isTroopLikeBuilding = isTroopBuilding || isSpellBuilding
  const isHeroBuilding = BUILDING_SECTIONS.heroes.some((building) => building.id === buildingId)
  const equipmentMeta = EQUIPMENT_BUILDINGS[buildingId]
  const isEquipmentBuilding = Boolean(equipmentMeta)

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
  const [editingEquipmentUnlockSource, setEditingEquipmentUnlockSource] = useState('blacksmith')
  const [editingEquipmentHero, setEditingEquipmentHero] = useState('')
  const [editingEquipmentType, setEditingEquipmentType] = useState('active')
  const [editingEquipmentRarity, setEditingEquipmentRarity] = useState('common')
  const [editingBlacksmithLevelUnlocked, setEditingBlacksmithLevelUnlocked] = useState(1)
  const [equipmentLevelsClipboard, setEquipmentLevelsClipboard] = useState(() => readEquipmentLevelsClipboard())
  const [savingLoading, setSavingLoading] = useState(false)
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' })
  const equipmentUnlockSource = isEquipmentBuilding
    ? String(editingEquipmentUnlockSource || 'blacksmith').trim().toLowerCase() || 'blacksmith'
    : 'blacksmith'
  const equipmentUnlockLabel = equipmentUnlockSource === 'blacksmith'
    ? `Blacksmith Lvl: ${editingBlacksmithLevelUnlocked}`
    : 'Gems'

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

  const defence = ALL_BUILDINGS.find((d) => d.id === buildingId) || equipmentMeta || { id: buildingId, name: buildingId, image: '' }

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
        const categoryField = isEquipmentBuilding ? 'equipment' : getBuildingCategory(buildingId)
        // Fetch dynamic data from database
        const selectedTownhall = parseInt(townhallLevel)
        // Load static data
        const defaultData = isEquipmentBuilding ? getDefaultEquipmentData(buildingId) : getDefaultBuildingData(selectedTownhall)
        const { data: rows, error } = await supabase
          .from('townhall_buildings')
          .select('*')
          .lte('townhall_level', selectedTownhall)
          .order('townhall_level', { ascending: true })

        if (error) throw error

        const inheritedTownhallData = getTownhallSnapshotForLevel(rows || [], selectedTownhall, defaultData)
        const staticBuildingData = categoryField === 'walls'
          ? inheritedTownhallData.walls || { buildings_unlocked: 0, levels: [] }
          : categoryField === 'equipment'
            ? (Array.isArray(inheritedTownhallData.equipment) ? inheritedTownhallData.equipment : []).find((entry) => entry?.id === buildingId)
              || defaultData[buildingId]
              || { buildings_unlocked: 0, levels: [] }
          : (inheritedTownhallData[categoryField] || []).find((entry) => entry?.id === buildingId)
            || defaultData[buildingId]
            || { buildings_unlocked: 0, levels: [] }
        setStaticData(staticBuildingData)

        const categoryData = categoryField === 'walls'
          ? inheritedTownhallData.walls
          : inheritedTownhallData[categoryField]

        const buildingData = categoryField === 'walls'
          ? categoryData
          : categoryField === 'equipment'
            ? (Array.isArray(categoryData) ? categoryData : []).find((entry) => entry?.id === buildingId)
          : Array.isArray(categoryData)
            ? categoryData.find((entry) => entry?.id === buildingId)
            : categoryData?.[buildingId]

        const hasSavedLevels = Array.isArray(buildingData?.levels) && buildingData.levels.length > 0
        const resolvedLevels = hasSavedLevels
          ? JSON.parse(JSON.stringify(buildingData.levels))
          : JSON.parse(JSON.stringify(staticBuildingData.levels || []))
        const initialLevelCount = isTroopLikeBuilding
          ? normalizeTroopLevelCount(resolvedLevels, buildingData?.buildings_unlocked || staticBuildingData.buildings_unlocked || 0)
          : isHeroBuilding || isEquipmentBuilding
            ? 1
            : Number(buildingData?.buildings_unlocked || staticBuildingData.buildings_unlocked || 0)
        const initialBuildingLevelCount = isTroopLikeBuilding
          ? initialLevelCount
          : isHeroBuilding || isEquipmentBuilding
            ? normalizeTroopLevelCount(resolvedLevels, resolvedLevels.length || 1)
            : Math.max(1, resolvedLevels.length || 1)
        const initialBarracksLevelUnlocked = Number(buildingData?.[troopUnlockKey] ?? staticBuildingData[troopUnlockKey] ?? 1) || 1
        const initialSpellFactoryLevelUnlocked = Number(buildingData?.[spellFactoryUnlockKey] ?? staticBuildingData[spellFactoryUnlockKey] ?? 1) || 1
        const initialHeroHallLevelUnlocked = Number(buildingData?.hero_hall_level_unlocked ?? staticBuildingData.hero_hall_level_unlocked ?? 1) || 1
        const initialBlacksmithLevelUnlocked = Number(buildingData?.blacksmith_level_unlocked ?? staticBuildingData.blacksmith_level_unlocked ?? 0) || 0
        const initialEquipmentUnlockSource = String(buildingData?.unlock_source ?? staticBuildingData.unlock_source ?? 'blacksmith').trim().toLowerCase() || 'blacksmith'
        const initialEquipmentHero = String(buildingData?.hero ?? staticBuildingData.hero ?? equipmentMeta?.hero ?? '').trim()
        const initialEquipmentType = normalizeEquipmentType(buildingData?.equipment_type ?? staticBuildingData.equipment_type)
        const initialEquipmentRarity = normalizeEquipmentRarity(buildingData?.equipment_rarity ?? staticBuildingData.equipment_rarity)
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
                  : isEquipmentBuilding
                    ? normalizeEquipmentLevels(initialBuildingLevelCount, resolvedLevels)
                    : normalizeBuildingLevels(initialBuildingLevelCount, resolvedLevels)
            )
            setEditingBuildingCount(initialLevelCount)
            setEditingLevelCount(initialBuildingLevelCount)
            setEditingBarracksLevelUnlocked(initialBarracksLevelUnlocked)
            setEditingSpellFactoryLevelUnlocked(initialSpellFactoryLevelUnlocked)
            setEditingHeroHallLevelUnlocked(initialHeroHallLevelUnlocked)
            setEditingBlacksmithLevelUnlocked(initialBlacksmithLevelUnlocked)
            setEditingEquipmentUnlockSource(initialEquipmentUnlockSource)
            setEditingEquipmentHero(initialEquipmentHero)
            setEditingEquipmentType(initialEquipmentType)
            setEditingEquipmentRarity(initialEquipmentRarity)
            setEditingCopyUnlocks(
              isTroopLikeBuilding
                ? createCopyUnlocks(1, 1)
                : normalizeCopyUnlocks(
                    initialLevelCount,
                    buildingData.copy_unlocks || staticBuildingData.copy_unlocks || [],
                    buildingData.starts_unlocked ?? staticBuildingData.starts_unlocked ?? true,
                  )
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
                    : isEquipmentBuilding
                      ? normalizeEquipmentLevels(draftLevelCount, draftLevels)
                      : normalizeBuildingLevels(draftLevelCount, draftLevels),
              ...(isTroopBuilding
                ? { [troopUnlockKey]: Number(staticBuildingData[troopUnlockKey] ?? 1) || 1 }
                : {}),
              ...(isSpellBuilding ? { [spellFactoryUnlockKey]: Number(staticBuildingData[spellFactoryUnlockKey] ?? 1) || 1 } : {}),
              ...(isHeroBuilding ? { hero_hall_level_unlocked: Number(staticBuildingData.hero_hall_level_unlocked ?? 1) || 1 } : {}),
              ...(isEquipmentBuilding ? {
                blacksmith_level_unlocked: Number(staticBuildingData.blacksmith_level_unlocked ?? 1) || 1,
                unlock_source: String(staticBuildingData.unlock_source ?? 'blacksmith').trim().toLowerCase() || 'blacksmith',
                hero: initialEquipmentHero || staticBuildingData.hero || equipmentMeta?.hero || '',
                equipment_type: normalizeEquipmentType(staticBuildingData.equipment_type),
                equipment_rarity: normalizeEquipmentRarity(staticBuildingData.equipment_rarity),
              } : {}),
            })
            setEditingLevels(
              isTroopBuilding
                ? normalizeTroopLevels(draftCount, draftLevels)
                : isSpellBuilding
                  ? normalizeSpellLevels(draftCount, draftLevels)
                  : isHeroBuilding
                    ? normalizeHeroLevels(draftLevelCount, draftLevels)
                    : isEquipmentBuilding
                      ? normalizeEquipmentLevels(draftLevelCount, draftLevels)
                      : normalizeBuildingLevels(draftLevelCount, draftLevels)
            )
            setEditingBuildingCount(draftCount)
            setEditingLevelCount(draftLevelCount)
            setEditingBarracksLevelUnlocked(
              Number(staticBuildingData[troopUnlockKey] ?? 1) || 1
            )
            setEditingSpellFactoryLevelUnlocked(Number(staticBuildingData[spellFactoryUnlockKey] ?? 1) || 1)
            setEditingHeroHallLevelUnlocked(Number(staticBuildingData.hero_hall_level_unlocked ?? 1) || 1)
            setEditingBlacksmithLevelUnlocked(Number(staticBuildingData.blacksmith_level_unlocked ?? 1) || 1)
            setEditingEquipmentUnlockSource(String(staticBuildingData.unlock_source ?? 'blacksmith').trim().toLowerCase() || 'blacksmith')
            setEditingEquipmentHero(initialEquipmentHero)
            setEditingEquipmentType(normalizeEquipmentType(staticBuildingData.equipment_type))
            setEditingEquipmentRarity(normalizeEquipmentRarity(staticBuildingData.equipment_rarity))
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
  }, [townhallLevel, buildingId, troopUnlockKey, spellFactoryUnlockKey])

  const isLevelMatching = (staticLevel, dynamicLevel) => {
    if (!staticLevel || !dynamicLevel) return false
    return (
      staticLevel.cost === dynamicLevel.cost &&
      staticLevel.time === dynamicLevel.time &&
      staticLevel.resource === dynamicLevel.resource &&
      Number(staticLevel.lab_level_unlocked ?? 0) === Number(dynamicLevel.lab_level_unlocked ?? 0) &&
      Number(staticLevel.pet_house_level_unlocked ?? 0) === Number(dynamicLevel.pet_house_level_unlocked ?? 0) &&
      Number(staticLevel.hero_hall_level_unlocked ?? 0) === Number(dynamicLevel.hero_hall_level_unlocked ?? 0) &&
      Number(staticLevel.blacksmith_level_unlocked ?? 0) === Number(dynamicLevel.blacksmith_level_unlocked ?? 0)
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
    } else if (isEquipmentBuilding && field === 'equipmentResourceCost') {
      toUpdate[levelIndex] = updateEquipmentResourceCosts(toUpdate[levelIndex], value.resource, value.amount)
    } else {
      toUpdate[levelIndex] = {
        ...toUpdate[levelIndex],
        [field]: value,
      }
    }
    setEditingLevels(toUpdate)
  }

  const handleEditingBuildingCountChange = (value) => {
    if (isBuilderHutBuilding) return
    const minimumCount = isSpellBuilding || (!isTroopLikeBuilding && !isWallBuilding && !isHeroBuilding && !isEquipmentBuilding) ? 1 : 0
    const nextCount = Math.max(minimumCount, parseInt(value) || 0)
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
    const minCount = 1
    const nextCount = Math.max(minCount, parseInt(value) || 0)
    setEditingLevelCount(nextCount)
    if (isHeroBuilding) {
      setEditingLevels((current) => normalizeHeroLevels(nextCount, current))
    } else if (isEquipmentBuilding) {
      setEditingLevels((current) => normalizeEquipmentLevels(nextCount, current))
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

  const handleEditingBlacksmithLevelUnlockedChange = (value) => {
    setEditingBlacksmithLevelUnlocked(Math.max(0, parseInt(value) || 0))
  }

  const handleEditingEquipmentUnlockSourceChange = (value) => {
    setEditingEquipmentUnlockSource(String(value || 'blacksmith').trim().toLowerCase() || 'blacksmith')
  }

  const handleEditingEquipmentHeroChange = (value) => {
    setEditingEquipmentHero(String(value || '').trim())
  }

  const handleEditingEquipmentTypeChange = (value) => {
    setEditingEquipmentType(normalizeEquipmentType(value))
  }

  const handleEditingEquipmentRarityChange = (value) => {
    setEditingEquipmentRarity(normalizeEquipmentRarity(value))
  }

  const handleCopyEquipmentLevels = () => {
    const sourceLevels = serializeEquipmentLevelsForClipboard(editingLevels.length > 0 ? editingLevels : currentDynamicLevel)

    if (sourceLevels.length === 0) {
      showToast('No equipment levels available to copy.', 'error')
      return
    }

    const clipboardPayload = {
      sourceBuildingId: String(buildingId || '').trim(),
      sourceBuildingName: String(defence?.name || buildingId || 'Equipment').trim(),
      levels: sourceLevels,
      copiedAt: new Date().toISOString(),
    }

    writeEquipmentLevelsClipboard(clipboardPayload)
    setEquipmentLevelsClipboard(clipboardPayload)
    showToast(`Copied ${sourceLevels.length} equipment levels from ${clipboardPayload.sourceBuildingName}.`, 'success')
  }

  const handlePasteEquipmentLevels = () => {
    const clipboardPayload = readEquipmentLevelsClipboard()

    if (!clipboardPayload?.levels?.length) {
      showToast('No copied equipment levels found to paste.', 'error')
      return
    }

    const normalizedClipboardLevels = normalizeEquipmentLevels(clipboardPayload.levels.length, clipboardPayload.levels)
    setEditingLevelCount(normalizedClipboardLevels.length)
    setEditingLevels(normalizedClipboardLevels)
    setEquipmentLevelsClipboard(clipboardPayload)
    showToast(`Pasted ${normalizedClipboardLevels.length} equipment levels from ${clipboardPayload.sourceBuildingName || 'clipboard'}.`, 'success')
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

      const inheritedTownhallData = getTownhallSnapshotForLevel(rows || [], selectedTownhall, isEquipmentBuilding ? getDefaultEquipmentData(buildingId) : getDefaultBuildingData(selectedTownhall))

      const categoryField = isEquipmentBuilding ? 'equipment' : getBuildingCategory(buildingId)
      const normalizedLevels = isTroopBuilding
        ? normalizeTroopLevels(editingBuildingCount, editingLevels)
        : isSpellBuilding
          ? normalizeSpellLevels(editingBuildingCount, editingLevels)
        : isHeroBuilding
          ? normalizeHeroLevels(editingLevelCount, editingLevels)
          : isEquipmentBuilding
            ? normalizeEquipmentLevels(editingLevelCount, editingLevels)
            : normalizeBuildingLevels(editingLevelCount, editingLevels)
      let normalizedLevelsWithWallResources = isWallBuilding
        ? normalizedLevels.map((levelInfo) => Number(levelInfo.level || 0) >= 5
          ? {
            ...levelInfo,
            resource: 'goldelixir',
            resource_options: ['gold', 'elixir'],
          }
          : isEquipmentBuilding
            ? {
              level: levelInfo.level,
              resource: String(levelInfo.resource || 'glowy_ore').trim().toLowerCase() || 'glowy_ore',
              resource_options: getLevelResourceOptions(levelInfo, { isEquipmentLevel: true, fallbackResource: 'glowy_ore' }),
              resource_costs: Array.isArray(levelInfo.resource_costs) ? levelInfo.resource_costs.map((entry) => ({
                resource: String(entry?.resource || '').trim().toLowerCase(),
                cost: Number(entry?.cost ?? 0),
              })).filter((entry) => entry.resource) : [],
              blacksmith_level_unlocked: Number(levelInfo.blacksmith_level_unlocked ?? 0),
              time: '0sec',
            }
          : {
            ...levelInfo,
            resource_options: Array.isArray(levelInfo.resource_options) ? [...levelInfo.resource_options] : [],
          })
        : normalizedLevels
      const troopLevelCount = isTroopLikeBuilding
        ? normalizedLevelsWithWallResources.length
        : isHeroBuilding || isEquipmentBuilding
          ? 1
          : editingBuildingCount
      const updatedBuildingData = {
        buildings_unlocked: troopLevelCount,
        starts_unlocked: editingCopyUnlocks[0] ?? true,
        copy_unlocks: isTroopLikeBuilding ? createCopyUnlocks(1, 1) : normalizeCopyUnlocks(editingBuildingCount, editingCopyUnlocks, true),
        levels: normalizedLevelsWithWallResources,
        ...(isTroopBuilding
          ? { [troopUnlockKey]: editingBarracksLevelUnlocked }
          : {}),
        ...(isSpellBuilding ? { [spellFactoryUnlockKey]: editingSpellFactoryLevelUnlocked } : {}),
        ...(isHeroBuilding ? { hero_hall_level_unlocked: editingHeroHallLevelUnlocked } : {}),
        ...(isEquipmentBuilding ? {
          hero: editingEquipmentHero || staticData.hero || equipmentMeta?.hero || '',
          equipment_type: normalizeEquipmentType(editingEquipmentType),
          equipment_rarity: normalizeEquipmentRarity(editingEquipmentRarity),
          unlock_source: editingEquipmentUnlockSource,
          blacksmith_level_unlocked: String(editingEquipmentUnlockSource || '').trim().toLowerCase() === 'gems' ? 0 : editingBlacksmithLevelUnlocked,
        } : {}),
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
        sieges: inheritedTownhallData.sieges || [],
        heroes: inheritedTownhallData.heroes || [],
        pets: inheritedTownhallData.pets || [],
        equipment: inheritedTownhallData.equipment || [],
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
          ? { [troopUnlockKey]: editingBarracksLevelUnlocked }
          : {}),
        ...(isSpellBuilding ? { [spellFactoryUnlockKey]: editingSpellFactoryLevelUnlocked } : {}),
        ...(isHeroBuilding ? { hero_hall_level_unlocked: editingHeroHallLevelUnlocked } : {}),
        ...(isEquipmentBuilding ? {
          hero: editingEquipmentHero || staticData.hero || equipmentMeta?.hero || '',
          equipment_type: normalizeEquipmentType(editingEquipmentType),
          equipment_rarity: normalizeEquipmentRarity(editingEquipmentRarity),
          unlock_source: editingEquipmentUnlockSource,
          blacksmith_level_unlocked: editingBlacksmithLevelUnlocked,
        } : {}),
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
    ? Number(dynamicData[troopUnlockKey] || staticData[troopUnlockKey] || 1)
    : 0
  const spellFactoryUnlockLevel = isSpellBuilding
    ? Number(dynamicData[spellFactoryUnlockKey] || staticData[spellFactoryUnlockKey] || 1)
    : 0
  const heroHallUnlockLevel = isHeroBuilding
    ? Number(dynamicData.hero_hall_level_unlocked || staticData.hero_hall_level_unlocked || 1)
    : 0

  // Detect if there are changes
  const hasChanges = () => {
    if (!isBuilderHutBuilding && editingBuildingCount !== (dynamicData.buildings_unlocked || 0)) {
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
    if (isTroopBuilding && Number(editingBarracksLevelUnlocked) !== Number(dynamicData[troopUnlockKey] || 1)) {
      return true
    }
    if (isSpellBuilding && Number(editingSpellFactoryLevelUnlocked) !== Number(dynamicData[spellFactoryUnlockKey] || 1)) {
      return true
    }
    if (isHeroBuilding && Number(editingHeroHallLevelUnlocked) !== Number(dynamicData.hero_hall_level_unlocked || 1)) {
      return true
    }
    if (isEquipmentBuilding && (
      String(editingEquipmentUnlockSource || 'blacksmith') !== String(dynamicData.unlock_source || 'blacksmith')
      || String(editingEquipmentHero || '') !== String(dynamicData.hero || '')
      || normalizeEquipmentType(editingEquipmentType) !== normalizeEquipmentType(dynamicData.equipment_type)
      || normalizeEquipmentRarity(editingEquipmentRarity) !== normalizeEquipmentRarity(dynamicData.equipment_rarity)
      || Number(editingBlacksmithLevelUnlocked) !== Number(dynamicData.blacksmith_level_unlocked || 1)
    )) {
      return true
    }
    return editingLevels.some((level, idx) => {
      const original = (dynamicData.levels || [])[idx]
      if (!original) return true
      if (isEquipmentBuilding) {
        const currentCosts = JSON.stringify(level.resource_costs || [])
        const originalCosts = JSON.stringify(original.resource_costs || [])
        return (
          currentCosts !== originalCosts
          || JSON.stringify(level.resource_options || []) !== JSON.stringify(original.resource_options || [])
          || String(level.resource || 'glowy_ore') !== String(original.resource || 'glowy_ore')
          || Number(level.blacksmith_level_unlocked ?? 0) !== Number(original.blacksmith_level_unlocked ?? 0)
        )
      }
      return (
        level.cost !== original.cost ||
        level.time !== original.time ||
        level.resource !== original.resource ||
        Number(level.lab_level_unlocked ?? 0) !== Number(original.lab_level_unlocked ?? 0) ||
        Number(level.pet_house_level_unlocked ?? 0) !== Number(original.pet_house_level_unlocked ?? 0) ||
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
                if (isEquipmentBuilding) return ''
                if (defence.id === 'archer_tower') return `16_${maxLevel}`
                if (defence.id === 'builder_hut') return `127_${maxLevel}`
                if (defence.id === 'canon') return `18_${maxLevel}`
                if (defence.id === 'bomb') return `27_${maxLevel}`
                if (defence.id === 'giant_bomb') return `28_${maxLevel}`
                if (defence.id === 'skeleton_trap') return `64_${maxLevel}`
                if (defence.id === 'air_bomb') return `26_${maxLevel}`
                if (defence.id === 'seeking_air_mine') return `29_${maxLevel}`
                if (defence.id === 'spring_trap') return `30_${maxLevel}`
                if (defence.id === 'tornado_trap') return `108_${maxLevel}`
                if (defence.id === 'mortar') return `23_${maxLevel}`
                if (defence.id === 'bomb_tower') return `17_${maxLevel}`
                if (defence.id === 'wizard_tower') return `24_${maxLevel}`
                if (defence.id === 'air_defense') return `14_${maxLevel}`
                if (defence.id === 'air_sweeper') return `15_${maxLevel}`
                if (defence.id === 'hidden_tesla') return `21_${maxLevel}`
                if (defence.id === 'x_bow') return `25_${maxLevel}`
                if (defence.id === 'eagle_artillery') return `20_${maxLevel}`
                if (defence.id === 'inferno_tower') return `22_${maxLevel}`
                if (defence.id === 'scattershot') return `119_${maxLevel}`
                if (defence.id === 'lab') return `13_${maxLevel}`
                if (defence.id === 'hero_hall') return `202_${maxLevel}`
                if (defence.id === 'army_camp') return `10_${maxLevel}`
                if (defence.id === 'spell_factory') return `11_${maxLevel}`
                if (defence.id === 'dark_spell_factory') return `12_${maxLevel}`
                if (defence.id === 'workshop') return `104_${maxLevel}`
                if (defence.id === 'barracks') return `8_${maxLevel}`
                if (defence.id === 'dark_barracks') return `9_${maxLevel}`
                if (defence.id === 'clan_castle') return `19_${maxLevel}`
                if (defence.id === 'pet_house') return `128_${maxLevel}`
                if (defence.id === 'walls') return `60_${maxLevel}`
                if (defence.id === 'gold_mine') return `2_${maxLevel}`
                if (defence.id === 'elixir_collector') return `3_${maxLevel}`
                if (defence.id === 'dark_elixir_driller') return `4_${maxLevel}`
                if (defence.id === 'gold_storage') return `5_${maxLevel}`
                if (defence.id === 'elixir_storage') return `6_${maxLevel}`
                if (defence.id === 'dark_elixir_storage') return `7_${maxLevel}`
                if (defence.id === 'helper_hut') return `206_${maxLevel}`
                if (defence.id === 'barbarian') return `31_${maxLevel}`
                if (defence.id === 'archer') return `32_${maxLevel}`
                if (defence.id === 'giant') return `33_${maxLevel}`
                if (defence.id === 'goblin') return `34_${maxLevel}`
                if (defence.id === 'wall_breaker') return `35_${maxLevel}`
                if (defence.id === 'balloon') return `36_${maxLevel}`
                if (defence.id === 'wizard') return `37_${maxLevel}`
                if (defence.id === 'healer') return `38_${maxLevel}`
                if (defence.id === 'dragon') return `39_${maxLevel}`
                if (defence.id === 'pekka') return `40_${maxLevel}`
                if (defence.id === 'baby_dragon') return `41_${maxLevel}`
                if (defence.id === 'miner') return `42_${maxLevel}`
                if (defence.id === 'electro_dragon') return `103_${maxLevel}`
                if (defence.id === 'electro_titan') return `138_${maxLevel}`
                if (defence.id === 'yeti') return `121_${maxLevel}`
                if (defence.id === 'dragon_rider') return `133_${maxLevel}`
                if (defence.id === 'minion') return `53_${maxLevel}`
                if (defence.id === 'hog_rider') return `54_${maxLevel}`
                if (defence.id === 'valkyrie') return `55_${maxLevel}`
                if (defence.id === 'golem') return `56_${maxLevel}`
                if (defence.id === 'witch') return `57_${maxLevel}`
                if (defence.id === 'lava_hound') return `58_${maxLevel}`
                if (defence.id === 'bowler') return `59_${maxLevel}`
                if (defence.id === 'ice_golem') return `111_${maxLevel}`
                if (defence.id === 'head_hunter') return `123_${maxLevel}`
                if (defence.id === 'apprentice_warden') return `151_${maxLevel}`
                if (defence.id === 'druid') return `197_${maxLevel}`
                if (defence.id === 'wall_wrecker') return `105_${maxLevel}`
                if (defence.id === 'battle_blimp') return `106_${maxLevel}`
                if (defence.id === 'stone_slammer') return `109_${maxLevel}`
                if (defence.id === 'siege_barracks') return `120_${maxLevel}`
                if (defence.id === 'log_launcher') return `125_${maxLevel}`
                if (defence.id === 'flame_flinger') return `134_${maxLevel}`
                if (defence.id === 'battle_drill') return `139_${maxLevel}`
                if (defence.id === 'troop_launcher') return `215_${maxLevel}`
                if (defence.id === 'blacksmith') return `152_${maxLevel}`
                if (defence.id === 'lightning_spell') return '43'
                if (defence.id === 'healing_spell') return '44'
                if (defence.id === 'rage_spell') return '45'
                if (defence.id === 'jump_spell') return '46'
                if (defence.id === 'freeze_spell') return '47'
                if (defence.id === 'clone_spell') return '48'
                if (defence.id === 'poison_spell') return '49'
                if (defence.id === 'earthquake_spell') return '50'
                if (defence.id === 'haste_spell') return '51'
                if (defence.id === 'skeleton_spell') return '52'
                if (defence.id === 'bat_spell') return '110'
                if (defence.id === 'ice_block_spell') return '236'
                if (defence.id === 'overgrowth_spell') return '175'
                if (defence.id === 'invisibility_spell') return '124'
                if (defence.id === 'recall_spell') return '140'
                if (defence.id === 'barbarian_king') return '61'
                if (defence.id === 'archer_queen') return '62'
                if (defence.id === 'grand_warden') return '63'
                if (defence.id === 'royal_champion') return '122'
                if (defence.id === 'minion_prince') return '208'
                if (defence.id === 'dragon_duke') return '260'
                if (defence.id === 'lassi') return '129'
                if (defence.id === 'electro_owl') return '130'
                if (defence.id === 'mighty_yak') return '131'
                if (defence.id === 'unicorn') return '132'
                return '18_3'
              }
              
              const imageSource = isEquipmentBuilding ? defence.image : `${defence.image}/${getImagePath()}.png`

              return (
                <img
                  src={imageSource}
                  alt={defence.name}
                  className={styles.buildingImage}
                />
              )
            })()}
            <p className={styles.buildingNameLabel}>{defence.name}</p>
            {isEquipmentBuilding && (editingEquipmentHero || dynamicData.hero || staticData.hero || equipmentMeta?.hero) && (
              <p className={styles.buildingNameLabel} style={{ marginTop: '4px', fontSize: '0.8rem', opacity: 0.8 }}>
                {editingEquipmentHero || dynamicData.hero || staticData.hero || equipmentMeta?.hero}
              </p>
            )}
            {isEquipmentBuilding && (
              <p className={styles.buildingNameLabel} style={{ marginTop: '4px', fontSize: '0.75rem', opacity: 0.75 }}>
                Unlock: {equipmentUnlockLabel}
              </p>
            )}
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
                {!isHeroBuilding && !isEquipmentBuilding && (
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
                    {troopUnlockSourceLabel} level needed: {troopBarracksLevel}
                  </span>
                )}
              </div>
              {isEquipmentBuilding && isEditing && (
                <div className={styles.equipmentEditControls}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Hero:</span>
                  <select
                    value={editingEquipmentHero}
                    onChange={(e) => handleEditingEquipmentHeroChange(e.target.value)}
                    className={styles.equipmentHeroSelect}
                  >
                    {EQUIPMENT_HERO_OPTIONS.map((heroName) => (
                      <option key={heroName} value={heroName}>{heroName}</option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Type:</span>
                  <select
                    value={editingEquipmentType}
                    onChange={(e) => handleEditingEquipmentTypeChange(e.target.value)}
                    className={styles.unlockSourceSelect}
                  >
                    <option value="active">Active</option>
                    <option value="passive">Passive</option>
                  </select>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Rarity:</span>
                  <select
                    value={editingEquipmentRarity}
                    onChange={(e) => handleEditingEquipmentRarityChange(e.target.value)}
                    className={styles.unlockSourceSelect}
                  >
                    <option value="common">Common</option>
                    <option value="epic">Epic</option>
                  </select>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Unlock source:</span>
                  <select
                    value={editingEquipmentUnlockSource}
                    onChange={(e) => handleEditingEquipmentUnlockSourceChange(e.target.value)}
                    className={styles.unlockSourceSelect}
                  >
                    <option value="blacksmith">Blacksmith</option>
                    <option value="gems">Gems</option>
                  </select>
                    {editingEquipmentUnlockSource === 'blacksmith' && (
                    <>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Blacksmith level:</span>
                      <input
                        type="number"
                        value={editingBlacksmithLevelUnlocked}
                        onChange={(e) => handleEditingBlacksmithLevelUnlockedChange(e.target.value)}
                        min="0"
                        className={styles.headingCountInput}
                      />
                    </>
                  )}
                  <button
                    type="button"
                    className={styles.levelClipboardBtn}
                    onClick={handleCopyEquipmentLevels}
                  >
                    Copy Levels
                  </button>
                  <button
                    type="button"
                    className={styles.levelClipboardBtn}
                    onClick={handlePasteEquipmentLevels}
                    disabled={!equipmentLevelsClipboard?.levels?.length}
                  >
                    Paste Levels
                  </button>
                  {equipmentLevelsClipboard?.levels?.length > 0 && (
                    <span className={styles.levelClipboardMeta}>
                      Source: {equipmentLevelsClipboard.sourceBuildingName || 'Copied equipment'} ({equipmentLevelsClipboard.levels.length} levels)
                    </span>
                  )}
                </div>
              )}
              <div className={styles.levelsList}>
                {currentStaticLevel.map((level) => (
                  <div key={`static-${level.level}`} className={styles.levelRow}>
                    {!isEquipmentBuilding && (
                      <div className={styles.resourceIconsWrap}>
                        {(() => {
                          const resourceOptions = getLevelResourceOptions(level, { isWallLevel: isWallBuilding, isEquipmentLevel: isEquipmentBuilding })
                          const usesDualGoldElixirIcon = resourceOptions.includes('gold') && resourceOptions.includes('elixir')

                          if (usesDualGoldElixirIcon) {
                            return (
                              <img
                                src="/src/assets/magic-items/goldelxir.png"
                                alt="Gold or Elixir"
                                className={`${styles.resourceIcon} ${styles.resourceDualIcon}`}
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
                    )}
                    <div className={styles.levelLabel}>
                      Lvl {level.level}:
                    </div>
                    {isEquipmentBuilding ? (
                      <div className={styles.equipmentCostBreakdown}>
                        {getEquipmentCostBreakdown(level).map(({ resource, cost }) => (
                          <span key={`static-${level.level}-${resource}`} className={styles.equipmentCostItem}>
                            {RESOURCE_ICONS[resource] ? (
                              <img
                                src={RESOURCE_ICONS[resource]}
                                alt={formatEquipmentResourceName(resource)}
                                className={styles.equipmentCostIcon}
                              />
                            ) : null}
                            <span className={styles.equipmentCostValue}>{formatCost(cost)}</span>
                          </span>
                        ))}
                        <span className={styles.equipmentRequirementBadge}>Blacksmith Lvl: {getEquipmentBlacksmithLevel(level)}</span>
                      </div>
                    ) : (
                      <>
                        <span className={`${styles.costValue} ${styles[level.resource]}`}>{formatCost(level.cost)}</span>
                        <span className={styles.timeValue}>{level.time}</span>
                      </>
                    )}
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
                    {!isHeroBuilding && !isEquipmentBuilding && !isBuilderHutBuilding && (
                      <>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{troopCountLabel}:</span>
                        <input
                          type="number"
                          value={editingBuildingCount}
                          onChange={(e) => handleEditingBuildingCountChange(e.target.value)}
                          min={isSpellBuilding || (!isTroopLikeBuilding && !isWallBuilding && !isHeroBuilding && !isEquipmentBuilding) ? '1' : '0'}
                          className={styles.headingCountInput}
                        />
                      </>
                    )}
                    {isBuilderHutBuilding && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        Count is managed from user village builder count.
                      </span>
                    )}
                    {!isTroopLikeBuilding && (
                      <>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '12px' }}>{levelCountLabel}:</span>
                        <input
                          type="number"
                          value={editingLevelCount}
                          onChange={(e) => handleEditingLevelCountChange(e.target.value)}
                          min="1"
                          className={styles.headingCountInput}
                        />
                      </>
                    )}
                    {isTroopBuilding && Number(townhallLevel) >= troopUnlockMinTownhall && (
                      <>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '12px' }}>{troopUnlockSourceLabel} level:</span>
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
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '12px' }}>{isDarkSpellBuilding ? 'Dark Spell Factory level:' : 'Spell Factory level:'}</span>
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
                    {troopUnlockSourceLabel} level needed: {troopBarracksLevel}
                  </span>
                )}
                {isSpellBuilding && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '8px' }}>
                    {isDarkSpellBuilding ? 'Dark Spell Factory' : 'Spell Factory'} level needed: {spellFactoryUnlockLevel}
                  </span>
                )}
                {isHeroBuilding && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '8px' }}>
                    Hero Hall level needed: {heroHallUnlockLevel}
                  </span>
                )}
                {!isTroopLikeBuilding && !isEditing && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '8px' }}>
                    {levelCountLabel}: {Math.max(1, Number(dynamicData.levels?.length || 0))}
                  </span>
                )}
              </div>
              {isEditing && !isWallBuilding && !isTroopLikeBuilding && !isHeroBuilding && !isEquipmentBuilding && editingBuildingCount > 0 && (
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
                        {!isEquipmentBuilding && (
                          <div className={styles.resourceIconsWrap}>
                            {(() => {
                              const resourceOptions = getLevelResourceOptions(level, { isWallLevel: isWallBuilding, isEquipmentLevel: isEquipmentBuilding })
                              const usesDualGoldElixirIcon = resourceOptions.includes('gold') && resourceOptions.includes('elixir')

                              if (usesDualGoldElixirIcon) {
                                return (
                                  <img
                                    src="/src/assets/magic-items/goldelxir.png"
                                    alt="Gold or Elixir"
                                    className={`${styles.resourceIcon} ${styles.resourceDualIcon}`}
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
                        )}
                        <div className={styles.levelLabel}>
                          Lvl {level.level}:
                        </div>
                        {isEquipmentBuilding ? (
                          <div className={styles.equipmentCostBreakdown}>
                            {getEquipmentCostBreakdown(level).map(({ resource, cost }) => (
                              <span key={`dynamic-${level.level}-${resource}`} className={styles.equipmentCostItem}>
                                {RESOURCE_ICONS[resource] ? (
                                  <img
                                    src={RESOURCE_ICONS[resource]}
                                    alt={formatEquipmentResourceName(resource)}
                                    className={styles.equipmentCostIcon}
                                  />
                                ) : null}
                                <span className={styles.equipmentCostValue}>{formatCost(cost)}</span>
                              </span>
                            ))}
                            <span className={styles.equipmentRequirementBadge}>Blacksmith Lvl: {getEquipmentBlacksmithLevel(level)}</span>
                          </div>
                        ) : (
                          <>
                            <span className={`${styles.costValue} ${styles[level.resource]}`}>{formatCost(level.cost)}</span>
                            <span className={styles.timeValue}>{level.time}</span>
                          </>
                        )}
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
                      {!isEquipmentBuilding && (
                        <div className={styles.resourceIconsWrap}>
                          {(() => {
                            const resourceOptions = getLevelResourceOptions(level, { isWallLevel: isWallBuilding, isEquipmentLevel: isEquipmentBuilding })
                            const usesDualGoldElixirIcon = resourceOptions.includes('gold') && resourceOptions.includes('elixir')

                            if (usesDualGoldElixirIcon) {
                              return (
                                <img
                                  src="/src/assets/magic-items/goldelxir.png"
                                  alt="Gold or Elixir"
                                  className={`${styles.resourceIcon} ${styles.resourceDualIcon}`}
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
                      )}
                      <span className={styles.levelLabel}>Lvl {level.level}:</span>
                      {!isEquipmentBuilding && (
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
                      )}
                      {isWallBuilding && Number(level.level || 0) >= 5 ? (
                        <span className={styles.wallDualResourceLabel}>Gold or Elixir</span>
                      ) : (
                        !isEquipmentBuilding && (
                          <select
                            value={level.resource}
                            onChange={(e) => handleEditLevel(idx, 'resource', e.target.value)}
                            className={styles.resourceSelect}
                          >
                            <>
                              <option value="gold">Gold</option>
                              <option value="elixir">Elixir</option>
                              <option value="dark_elixir">Dark Elixir</option>
                            </>
                          </select>
                        )
                      )}
                      {isEquipmentBuilding && (
                        <div className={styles.equipmentResourceGrid}>
                          {EQUIPMENT_RESOURCE_KEYS.map((resourceKey) => (
                            <div key={`edit-${level.level}-${resourceKey}`} className={styles.equipmentResourceField}>
                              {RESOURCE_ICONS[resourceKey] ? (
                                <img
                                  src={RESOURCE_ICONS[resourceKey]}
                                  alt={formatEquipmentResourceLabel(resourceKey)}
                                  className={styles.equipmentResourceIcon}
                                />
                              ) : null}
                              <input
                                type="number"
                                min="0"
                                value={getEquipmentResourceAmounts(level)[resourceKey]}
                                onChange={(e) => handleEditLevel(idx, 'equipmentResourceCost', { resource: resourceKey, amount: e.target.value })}
                                className={styles.equipmentResourceInput}
                              />
                            </div>
                          ))}
                          <div className={styles.equipmentRequirementField}>
                            <span className={styles.equipmentRequirementLabel}>Blacksmith</span>
                            <input
                              type="number"
                              value={level.blacksmith_level_unlocked ?? 0}
                              onChange={(e) => handleEditLevel(idx, 'blacksmith_level_unlocked', Math.max(0, parseInt(e.target.value) || 0))}
                              min="0"
                              className={styles.equipmentRequirementInput}
                            />
                          </div>
                        </div>
                      )}
                      {!isEquipmentBuilding && (
                        <button
                          onClick={() => openTimeModal(idx)}
                          className={styles.timeModalBtn}
                          title="Click to set time"
                        >
                          {level.time}
                        </button>
                      )}
                      {isTroopBuilding && isPetBuilding && Number(townhallLevel) >= 14 && (
                        <div className={styles.troopLabGroup}>
                          <span className={styles.troopLabLabel}>Pet House:</span>
                          <input
                            type="number"
                            value={level.pet_house_level_unlocked ?? 0}
                            onChange={(e) => handleEditLevel(idx, 'pet_house_level_unlocked', Math.max(0, parseInt(e.target.value) || 0))}
                            min="0"
                            className={`${styles.headingCountInput} ${styles.troopLabInput}`}
                          />
                        </div>
                      )}
                      {(isTroopBuilding || isSpellBuilding) && !isPetBuilding && Number(townhallLevel) >= 3 && (
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
