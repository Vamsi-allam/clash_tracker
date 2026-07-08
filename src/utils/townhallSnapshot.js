const cloneLevelList = (levels = []) =>
  Array.isArray(levels)
    ? levels.map((level) => ({ ...(level || {}) }))
    : []

const cloneUnlockList = (copyUnlocks = []) =>
  Array.isArray(copyUnlocks) ? [...copyUnlocks] : []

const cloneBuildingEntry = (entry = {}) => ({
  ...(entry || {}),
  ...(Array.isArray(entry?.levels) ? { levels: cloneLevelList(entry.levels) } : {}),
  ...(Array.isArray(entry?.copy_unlocks) ? { copy_unlocks: cloneUnlockList(entry.copy_unlocks) } : {}),
})

const mergeLevelLists = (previousLevels = [], nextLevels = []) => {
  const mergedByLevel = new Map()

  cloneLevelList(previousLevels).forEach((level) => {
    if (level?.level != null) {
      mergedByLevel.set(Number(level.level), level)
    }
  })

  cloneLevelList(nextLevels).forEach((level) => {
    if (level?.level != null) {
      mergedByLevel.set(Number(level.level), level)
    }
  })

  return Array.from(mergedByLevel.values()).sort((left, right) => Number(left.level) - Number(right.level))
}

const mergeUnlockLists = (previousUnlocks = [], nextUnlocks = []) => {
  const length = Math.max(previousUnlocks.length, nextUnlocks.length)
  return Array.from({ length }, (_, index) => Boolean(nextUnlocks[index] ?? previousUnlocks[index] ?? false))
}

const normalizeCategoryEntries = (category) => {
  if (!category) return []

  if (Array.isArray(category)) {
    return category
      .map((entry) => cloneBuildingEntry(entry))
      .filter((entry) => entry.id)
  }

  if (typeof category === 'object') {
    return Object.entries(category).map(([id, value]) => cloneBuildingEntry({ id, ...(value || {}) }))
  }

  return []
}

const mergeBuildingEntry = (previousEntry = {}, nextEntry = {}) => {
  const merged = {
    ...cloneBuildingEntry(previousEntry),
    ...cloneBuildingEntry(nextEntry),
  }

  if (Array.isArray(nextEntry?.levels)) {
    merged.levels = mergeLevelLists(previousEntry?.levels || [], nextEntry.levels || [])
  } else if (Array.isArray(previousEntry?.levels)) {
    merged.levels = cloneLevelList(previousEntry.levels)
  }

  if (Array.isArray(nextEntry?.copy_unlocks)) {
    merged.copy_unlocks = mergeUnlockLists(previousEntry?.copy_unlocks || [], nextEntry.copy_unlocks || [])
  } else if (Array.isArray(previousEntry?.copy_unlocks)) {
    merged.copy_unlocks = cloneUnlockList(previousEntry.copy_unlocks)
  }

  if (previousEntry?.buildings_unlocked != null || nextEntry?.buildings_unlocked != null) {
    merged.buildings_unlocked = Math.max(Number(previousEntry?.buildings_unlocked || 0), Number(nextEntry?.buildings_unlocked || 0))
  }

  return merged
}

const mergeArrayCategory = (previousCategory = [], nextCategory = []) => {
  const previousEntries = normalizeCategoryEntries(previousCategory)
  const nextEntries = normalizeCategoryEntries(nextCategory)

  if (nextEntries.length === 0) return previousEntries

  const mergedById = new Map(previousEntries.map((entry) => [entry.id, entry]))

  nextEntries.forEach((entry) => {
    const existingEntry = mergedById.get(entry.id) || {}
    mergedById.set(entry.id, mergeBuildingEntry(existingEntry, entry))
  })

  return Array.from(mergedById.values())
}

const mergeObjectCategory = (previousCategory = {}, nextCategory = {}) => {
  const previousObject = previousCategory && typeof previousCategory === 'object' && !Array.isArray(previousCategory)
    ? { ...previousCategory }
    : {}
  const nextObject = nextCategory && typeof nextCategory === 'object' && !Array.isArray(nextCategory)
    ? { ...nextCategory }
    : {}

  if (Object.keys(nextObject).length === 0) return previousObject

  return mergeBuildingEntry(previousObject, nextObject)
}

const pruneBuildingEntryToSeed = (entry = {}, seedEntry = {}) => {
  const prunedEntry = {
    ...cloneBuildingEntry(entry),
  }

  if (Array.isArray(seedEntry?.levels)) {
    prunedEntry.levels = mergeLevelLists([], prunedEntry.levels || []).slice(0, seedEntry.levels.length)
  }

  if (Array.isArray(seedEntry?.copy_unlocks)) {
    prunedEntry.copy_unlocks = cloneUnlockList(prunedEntry.copy_unlocks || []).slice(0, seedEntry.copy_unlocks.length)
  }

  if (seedEntry?.buildings_unlocked != null) {
    prunedEntry.buildings_unlocked = Math.min(
      Number(prunedEntry.buildings_unlocked || 0),
      Number(seedEntry.buildings_unlocked || 0),
    )
  }

  return prunedEntry
}

const pruneArrayCategoryToSeed = (category = [], seedCategory = {}) => {
  const seedEntries = normalizeCategoryEntries(seedCategory)
  const seedEntriesById = new Map(seedEntries.map((entry) => [entry.id, entry]))

  return normalizeCategoryEntries(category)
    .filter((entry) => seedEntriesById.has(entry.id))
    .map((entry) => pruneBuildingEntryToSeed(entry, seedEntriesById.get(entry.id)))
}

const pruneObjectCategoryToSeed = (category = {}, seedCategory = {}) => {
  const seedObject = seedCategory && typeof seedCategory === 'object' && !Array.isArray(seedCategory)
    ? seedCategory
    : {}
  const entryId = category?.id

  if (!entryId || !seedObject[entryId]) return {}

  return pruneBuildingEntryToSeed(category, seedObject[entryId])
}

export const pruneTownhallSnapshotToSeed = (snapshot = {}, seedSnapshot = {}) => ({
  ...snapshot,
  defences: pruneArrayCategoryToSeed(snapshot.defences, seedSnapshot.defences),
  traps: pruneArrayCategoryToSeed(snapshot.traps, seedSnapshot.traps),
  army: pruneArrayCategoryToSeed(snapshot.army, seedSnapshot.army),
  resources: pruneArrayCategoryToSeed(snapshot.resources, seedSnapshot.resources),
  troops: pruneArrayCategoryToSeed(snapshot.troops, seedSnapshot.troops),
  spells: pruneArrayCategoryToSeed(snapshot.spells, seedSnapshot.spells),
  dark_troops: pruneArrayCategoryToSeed(snapshot.dark_troops, seedSnapshot.dark_troops),
  heroes: pruneArrayCategoryToSeed(snapshot.heroes, seedSnapshot.heroes),
  walls: pruneObjectCategoryToSeed(snapshot.walls, seedSnapshot.walls),
})

export const mergeTownhallSnapshot = (previousSnapshot = {}, nextSnapshot = {}) => ({
  ...previousSnapshot,
  ...nextSnapshot,
  defences: mergeArrayCategory(previousSnapshot.defences, nextSnapshot.defences),
  traps: mergeArrayCategory(previousSnapshot.traps, nextSnapshot.traps),
  army: mergeArrayCategory(previousSnapshot.army, nextSnapshot.army),
  resources: mergeArrayCategory(previousSnapshot.resources, nextSnapshot.resources),
  troops: mergeArrayCategory(previousSnapshot.troops, nextSnapshot.troops),
  spells: mergeArrayCategory(previousSnapshot.spells, nextSnapshot.spells),
  dark_troops: mergeArrayCategory(previousSnapshot.dark_troops, nextSnapshot.dark_troops),
  heroes: mergeArrayCategory(previousSnapshot.heroes, nextSnapshot.heroes),
  walls: mergeObjectCategory(previousSnapshot.walls, nextSnapshot.walls),
})

export const buildTownhallSnapshotFromRows = (rows = [], seedSnapshot = {}) =>
  [...rows]
    .sort((left, right) => Number(left?.townhall_level || 0) - Number(right?.townhall_level || 0))
    .reduce((snapshot, row) => mergeTownhallSnapshot(snapshot, row), seedSnapshot || {})

export const getTownhallSnapshotForLevel = (rows = [], townhallLevel, seedSnapshot = {}) => {
  const selectedTownhallLevel = Number(townhallLevel)
  if (!Number.isFinite(selectedTownhallLevel) || selectedTownhallLevel <= 0) {
    return seedSnapshot || {}
  }

  const exactTownhallRow = Array.isArray(rows)
    ? rows.find((row) => Number(row?.townhall_level) === selectedTownhallLevel) || null
    : null

  if (exactTownhallRow) {
    const exactSnapshot = mergeTownhallSnapshot(seedSnapshot || {}, exactTownhallRow)
    const prunedSnapshot = pruneTownhallSnapshotToSeed(exactSnapshot, seedSnapshot || {})
    const hasPrunedContent = ['defences', 'traps', 'army', 'resources', 'troops', 'spells', 'dark_troops', 'heroes'].some((key) => Array.isArray(prunedSnapshot[key]) && prunedSnapshot[key].length > 0)

    return hasPrunedContent ? prunedSnapshot : exactSnapshot
  }

  const inheritedSnapshot = buildTownhallSnapshotFromRows(rows, seedSnapshot)
  const prunedInheritedSnapshot = pruneTownhallSnapshotToSeed(inheritedSnapshot, seedSnapshot || {})
  const hasPrunedInheritedContent = ['defences', 'traps', 'army', 'resources', 'troops', 'spells', 'dark_troops', 'heroes'].some((key) => Array.isArray(prunedInheritedSnapshot[key]) && prunedInheritedSnapshot[key].length > 0)

  return hasPrunedInheritedContent ? prunedInheritedSnapshot : inheritedSnapshot
}
