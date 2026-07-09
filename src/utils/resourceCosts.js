const normalizeResourceKey = (resource, fallbackResource = '') => {
  const normalized = String(resource ?? fallbackResource).trim().toLowerCase()
  if (normalized === 'goldelixir' || normalized === 'gold_elixir' || normalized === 'goldorelixir' || normalized === 'gold_or_elixir') {
    return 'goldelixir'
  }
  return normalized || String(fallbackResource || '').trim().toLowerCase()
}

const normalizeResourceCostEntry = (entry, fallbackResource = '') => {
  if (!entry || typeof entry !== 'object') return null

  const resource = normalizeResourceKey(entry.resource, fallbackResource)
  const amount = Number(entry.cost ?? entry.amount ?? entry.value ?? 0)

  if (!resource || !Number.isFinite(amount)) return null

  return {
    resource,
    cost: amount,
  }
}

export const normalizeResourceCosts = (levelInfo, fallbackResource = 'gold') => {
  const fallback = normalizeResourceKey(fallbackResource, 'gold') || 'gold'
  const resourceCosts = Array.isArray(levelInfo?.resource_costs)
    ? levelInfo.resource_costs
        .map((entry) => normalizeResourceCostEntry(entry, fallback))
        .filter(Boolean)
    : []

  if (resourceCosts.length > 0) return resourceCosts

  const resource = normalizeResourceKey(levelInfo?.resource, fallback)
  const cost = Number(levelInfo?.cost ?? 0)

  if (!resource) return []

  return [{
    resource,
    cost: Number.isFinite(cost) ? cost : 0,
  }]
}

export const getLevelResourceOptions = (levelInfo, { isWallLevel = false, isEquipmentLevel = false, fallbackResource = 'gold' } = {}) => {
  const normalizedResourceCosts = normalizeResourceCosts(levelInfo, isEquipmentLevel ? 'glowy_ore' : fallbackResource)
  if (Array.isArray(levelInfo?.resource_costs) && levelInfo.resource_costs.length > 0 && normalizedResourceCosts.length > 0) {
    return normalizedResourceCosts
      .map((entry) => entry.resource)
      .filter((resource, index, collection) => Boolean(resource) && collection.indexOf(resource) === index)
  }

  if (normalizeResourceKey(levelInfo?.resource, fallbackResource) === 'goldelixir') {
    return ['gold', 'elixir']
  }

  // Walls level 5+ can always be paid with either gold or elixir.
  // Prefer the dual-resource presentation even if older saved rows only carry a single resource field.
  if (isWallLevel && Number(levelInfo?.level || 0) >= 5) {
    return ['gold', 'elixir']
  }

  const normalizedFromOptions = Array.isArray(levelInfo?.resource_options)
    ? levelInfo.resource_options
      .map((resource) => String(resource || '').trim().toLowerCase())
      .filter((resource, index, collection) => Boolean(resource) && collection.indexOf(resource) === index)
    : []

  if (normalizedFromOptions.length > 0) return normalizedFromOptions

  return [normalizeResourceKey(levelInfo?.resource, fallbackResource) || fallbackResource]
}

export const formatResourceCostBreakdown = (levelInfo, { formatCost = (value) => `${value}`, formatResourceLabel = (resource) => String(resource || '') } = {}, fallbackResource = 'gold') => {
  return normalizeResourceCosts(levelInfo, fallbackResource)
    .map(({ resource, cost }) => `${formatCost(cost)} ${formatResourceLabel(resource)}`)
    .join(' + ')
}

export const getPrimaryResource = (levelInfo, fallbackResource = 'gold') => {
  return normalizeResourceCosts(levelInfo, fallbackResource)[0]?.resource || normalizeResourceKey(levelInfo?.resource, fallbackResource) || fallbackResource
}