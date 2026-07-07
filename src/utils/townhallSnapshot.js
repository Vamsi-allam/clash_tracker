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
    merged.levels = cloneLevelList(nextEntry.levels)
  } else if (Array.isArray(previousEntry?.levels)) {
    merged.levels = cloneLevelList(previousEntry.levels)
  }

  if (Array.isArray(nextEntry?.copy_unlocks)) {
    merged.copy_unlocks = cloneUnlockList(nextEntry.copy_unlocks)
  } else if (Array.isArray(previousEntry?.copy_unlocks)) {
    merged.copy_unlocks = cloneUnlockList(previousEntry.copy_unlocks)
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

export const mergeTownhallSnapshot = (previousSnapshot = {}, nextSnapshot = {}) => ({
  ...previousSnapshot,
  ...nextSnapshot,
  defences: mergeArrayCategory(previousSnapshot.defences, nextSnapshot.defences),
  army: mergeArrayCategory(previousSnapshot.army, nextSnapshot.army),
  resources: mergeArrayCategory(previousSnapshot.resources, nextSnapshot.resources),
  troops: mergeArrayCategory(previousSnapshot.troops, nextSnapshot.troops),
  walls: mergeObjectCategory(previousSnapshot.walls, nextSnapshot.walls),
})

export const buildTownhallSnapshotFromRows = (rows = [], seedSnapshot = {}) =>
  [...rows]
    .sort((left, right) => Number(left?.townhall_level || 0) - Number(right?.townhall_level || 0))
    .reduce((snapshot, row) => mergeTownhallSnapshot(snapshot, row), seedSnapshot || {})
