import { useState, useEffect } from 'react'
import styles from './BuildingPopup.module.css'
import { supabase } from '../supabaseClient'

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
]

const AVAILABLE_RESOURCES = [
  { id: 'elixir_collector', name: 'Elixir Collector', image: '/src/assets/Resources/elixir_collector' },
  { id: 'gold_mine', name: 'Gold Mine', image: '/src/assets/Resources/goldmine' },
  { id: 'gold_storage', name: 'Gold Storage', image: '/src/assets/Resources/gold_storage' },
  { id: 'elixir_storage', name: 'Elixir Storage', image: '/src/assets/Resources/elixi_storage' },
]

const AVAILABLE_TROOPS = [
  { id: 'barbarian', name: 'Barbarian', image: '/src/assets/Troops/Barbarian' },
  { id: 'archer', name: 'Archer', image: '/src/assets/Troops/Archer' },
  { id: 'giant', name: 'Giant', image: '/src/assets/Troops/Giant' },
  { id: 'goblin', name: 'Goblin', image: '/src/assets/Troops/Goblin' },
  { id: 'wall_breaker', name: 'Wall Breaker', image: '/src/assets/Troops/Wall_Breaker' },
]

const AVAILABLE_WALLS = [
  { id: 'wall_level_1', name: 'Wall Level 1', image: '/src/assets/Walls/Wall' },
]

const RESOURCE_ICONS = {
  gold: '/src/assets/magic-items/gold.png',
  elixir: '/src/assets/magic-items/elixir.png',
  dark_elixir: '/src/assets/magic-items/de.png',
}

// Helper functions for formatting cost and time
const formatCost = (value) => {
  if (!value) return '0'
  if (value >= 1000000) {
    return (value / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'm'
  } else if (value >= 1000) {
    return (value / 1000).toFixed(2).replace(/\.?0+$/, '') + 'k'
  }
  return value.toString()
}

const parseCost = (value) => {
  if (typeof value === 'number') return value
  const str = value.toString().trim().toLowerCase()
  const match = str.match(/^([\d.]+)([km])?$/)
  if (!match) return 0
  let num = parseFloat(match[1])
  if (match[2] === 'k') num *= 1000
  if (match[2] === 'm') num *= 1000000
  return Math.floor(num)
}

const parseTime = (value) => {
  return value.toString().trim()
}

// Default data for Town Hall 2 with Canon as example
const getDefaultBuildingData = (townhallLevel) => {
  if (townhallLevel === 2) {
    return {
      townhall_level: 2,
      defences: {
        canon: {
          buildings_unlocked: 2,
          levels: [
            { level: 1, cost: 250, resource: 'gold', time: '5s' },
            { level: 2, cost: 1000, resource: 'gold', time: '30s' },
            { level: 3, cost: 4000, resource: 'gold', time: '2m' },
          ],
        },
      },
      army: {},
      resources: {},
      troops: {},
      walls: {},
    }
  }
  return {
    townhall_level: townhallLevel,
    defences: {},
    army: {},
    resources: {},
    troops: {},
    walls: {},
  }
}

export default function BuildingPopup({
  townhallLevel,
  buildingData,
  loading,
  onClose,
  onSave,
}) {
  const [defences, setDefences] = useState(buildingData?.defences || (townhallLevel === 2 ? getDefaultBuildingData(townhallLevel).defences : {}))
  const [army, setArmy] = useState(buildingData?.army || {})
  const [resources, setResources] = useState(buildingData?.resources || {})
  const [troops, setTroops] = useState(buildingData?.troops || {})
  const [walls, setWalls] = useState(buildingData?.walls || {})
  const [expandedDefence, setExpandedDefence] = useState(null)
  const [expandedArmy, setExpandedArmy] = useState(null)
  const [expandedResource, setExpandedResource] = useState(null)
  const [expandedTroop, setExpandedTroop] = useState(null)
  const [expandedWall, setExpandedWall] = useState(null)
  const [editingDefence, setEditingDefence] = useState(null)
  const [savingLoading, setSavingLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('defence')
  const [showAddDefence, setShowAddDefence] = useState(false)
  const [showAddArmy, setShowAddArmy] = useState(false)
  const [showAddResource, setShowAddResource] = useState(false)
  const [showAddTroop, setShowAddTroop] = useState(false)
  const [showAddWall, setShowAddWall] = useState(false)
  
  // Set expanded Canon for TH2 on load
  useEffect(() => {
    if (townhallLevel === 2 && Object.keys(defences).includes('canon')) {
      setExpandedDefence('canon')
    }
  }, [])

  const addDefence = (defenceId) => {
    if (!defences[defenceId]) {
      setDefences({
        ...defences,
        [defenceId]: {
          buildings_unlocked: 1,
          levels: [
            { level: 1, cost: 100, resource: 'gold', time: '1h' },
          ],
        },
      })
      setExpandedDefence(defenceId)
    }
  }

  const removeDefence = (defenceId) => {
    const newDefences = { ...defences }
    delete newDefences[defenceId]
    setDefences(newDefences)
  }

  const updateDefence = (defenceId, field, value) => {
    setDefences({
      ...defences,
      [defenceId]: {
        ...defences[defenceId],
        [field]: value,
      },
    })
  }

  const addLevel = (defenceId) => {
    const defenceData = defences[defenceId]
    const maxLevel = Math.max(...defenceData.levels.map((l) => l.level), 0)
    setDefences({
      ...defences,
      [defenceId]: {
        ...defenceData,
        levels: [
          ...defenceData.levels,
          {
            level: maxLevel + 1,
            cost: 100,
            resource: 'gold',
            time: '1h',
          },
        ],
      },
    })
  }

  const removeLevel = (defenceId, levelNumber) => {
    const defenceData = defences[defenceId]
    setDefences({
      ...defences,
      [defenceId]: {
        ...defenceData,
        levels: defenceData.levels.filter((l) => l.level !== levelNumber),
      },
    })
  }

  const updateLevel = (defenceId, levelNumber, field, value) => {
    const defenceData = defences[defenceId]
    setDefences({
      ...defences,
      [defenceId]: {
        ...defenceData,
        levels: defenceData.levels.map((l) =>
          l.level === levelNumber ? { ...l, [field]: value } : l
        ),
      },
    })
  }

  // Army functions
  const addArmy = (armyId) => {
    if (!army[armyId]) {
      setArmy({
        ...army,
        [armyId]: {
          buildings_unlocked: 1,
          levels: [
            { level: 1, cost: 100, resource: 'gold', time: '1h' },
          ],
        },
      })
      setExpandedArmy(armyId)
    }
  }

  const removeArmy = (armyId) => {
    const newArmy = { ...army }
    delete newArmy[armyId]
    setArmy(newArmy)
  }

  const updateArmy = (armyId, field, value) => {
    setArmy({
      ...army,
      [armyId]: {
        ...army[armyId],
        [field]: value,
      },
    })
  }

  const addArmyLevel = (armyId) => {
    const armyData = army[armyId]
    const maxLevel = Math.max(...armyData.levels.map((l) => l.level), 0)
    setArmy({
      ...army,
      [armyId]: {
        ...armyData,
        levels: [
          ...armyData.levels,
          {
            level: maxLevel + 1,
            cost: 100,
            resource: 'gold',
            time: '1h',
          },
        ],
      },
    })
  }

  const removeArmyLevel = (armyId, levelNumber) => {
    const armyData = army[armyId]
    setArmy({
      ...army,
      [armyId]: {
        ...armyData,
        levels: armyData.levels.filter((l) => l.level !== levelNumber),
      },
    })
  }

  const updateArmyLevel = (armyId, levelNumber, field, value) => {
    const armyData = army[armyId]
    setArmy({
      ...army,
      [armyId]: {
        ...armyData,
        levels: armyData.levels.map((l) =>
          l.level === levelNumber ? { ...l, [field]: value } : l
        ),
      },
    })
  }

  // Resource functions
  const addResource = (resourceId) => {
    if (!resources[resourceId]) {
      setResources({
        ...resources,
        [resourceId]: {
          buildings_unlocked: 1,
          levels: [
            { level: 1, cost: 100, resource: 'gold', time: '1h' },
          ],
        },
      })
      setExpandedResource(resourceId)
    }
  }

  const removeResource = (resourceId) => {
    const newResources = { ...resources }
    delete newResources[resourceId]
    setResources(newResources)
  }

  const updateResource = (resourceId, field, value) => {
    setResources({
      ...resources,
      [resourceId]: {
        ...resources[resourceId],
        [field]: value,
      },
    })
  }

  const addResourceLevel = (resourceId) => {
    const resourceData = resources[resourceId]
    const maxLevel = Math.max(...resourceData.levels.map((l) => l.level), 0)
    setResources({
      ...resources,
      [resourceId]: {
        ...resourceData,
        levels: [
          ...resourceData.levels,
          {
            level: maxLevel + 1,
            cost: 100,
            resource: 'gold',
            time: '1h',
          },
        ],
      },
    })
  }

  const removeResourceLevel = (resourceId, levelNumber) => {
    const resourceData = resources[resourceId]
    setResources({
      ...resources,
      [resourceId]: {
        ...resourceData,
        levels: resourceData.levels.filter((l) => l.level !== levelNumber),
      },
    })
  }

  const updateResourceLevel = (resourceId, levelNumber, field, value) => {
    const resourceData = resources[resourceId]
    setResources({
      ...resources,
      [resourceId]: {
        ...resourceData,
        levels: resourceData.levels.map((l) =>
          l.level === levelNumber ? { ...l, [field]: value } : l
        ),
      },
    })
  }

  // Troops functions
  const addTroop = (troopId) => {
    if (!troops[troopId]) {
      setTroops({
        ...troops,
        [troopId]: {
          buildings_unlocked: 1,
          levels: [
            { level: 1, cost: 100, resource: 'gold', time: '1h' },
          ],
        },
      })
      setExpandedTroop(troopId)
    }
  }

  const removeTroop = (troopId) => {
    const newTroops = { ...troops }
    delete newTroops[troopId]
    setTroops(newTroops)
  }

  const updateTroop = (troopId, field, value) => {
    setTroops({
      ...troops,
      [troopId]: {
        ...troops[troopId],
        [field]: value,
      },
    })
  }

  const addTroopLevel = (troopId) => {
    const troopData = troops[troopId]
    const maxLevel = Math.max(...troopData.levels.map((l) => l.level), 0)
    setTroops({
      ...troops,
      [troopId]: {
        ...troopData,
        levels: [
          ...troopData.levels,
          {
            level: maxLevel + 1,
            cost: 100,
            resource: 'gold',
            time: '1h',
          },
        ],
      },
    })
  }

  const removeTroopLevel = (troopId, levelNumber) => {
    const troopData = troops[troopId]
    setTroops({
      ...troops,
      [troopId]: {
        ...troopData,
        levels: troopData.levels.filter((l) => l.level !== levelNumber),
      },
    })
  }

  const updateTroopLevel = (troopId, levelNumber, field, value) => {
    const troopData = troops[troopId]
    setTroops({
      ...troops,
      [troopId]: {
        ...troopData,
        levels: troopData.levels.map((l) =>
          l.level === levelNumber ? { ...l, [field]: value } : l
        ),
      },
    })
  }

  // Walls functions
  const addWall = (wallId) => {
    if (!walls[wallId]) {
      setWalls({
        ...walls,
        [wallId]: {
          buildings_unlocked: 1,
          levels: [
            { level: 1, cost: 100, resource: 'gold', time: '1h' },
          ],
        },
      })
      setExpandedWall(wallId)
    }
  }

  const removeWall = (wallId) => {
    const newWalls = { ...walls }
    delete newWalls[wallId]
    setWalls(newWalls)
  }

  const updateWall = (wallId, field, value) => {
    setWalls({
      ...walls,
      [wallId]: {
        ...walls[wallId],
        [field]: value,
      },
    })
  }

  const addWallLevel = (wallId) => {
    const wallData = walls[wallId]
    const maxLevel = Math.max(...wallData.levels.map((l) => l.level), 0)
    setWalls({
      ...walls,
      [wallId]: {
        ...wallData,
        levels: [
          ...wallData.levels,
          {
            level: maxLevel + 1,
            cost: 100,
            resource: 'gold',
            time: '1h',
          },
        ],
      },
    })
  }

  const removeWallLevel = (wallId, levelNumber) => {
    const wallData = walls[wallId]
    setWalls({
      ...walls,
      [wallId]: {
        ...wallData,
        levels: wallData.levels.filter((l) => l.level !== levelNumber),
      },
    })
  }

  const updateWallLevel = (wallId, levelNumber, field, value) => {
    const wallData = walls[wallId]
    setWalls({
      ...walls,
      [wallId]: {
        ...wallData,
        levels: wallData.levels.map((l) =>
          l.level === levelNumber ? { ...l, [field]: value } : l
        ),
      },
    })
  }

  const handleSave = async () => {
    setSavingLoading(true)
    try {
      const { error } = await supabase
        .from('townhall_buildings')
        .upsert({
          townhall_level: townhallLevel,
          defences: defences,
          army: army,
          resources: resources,
          troops: troops,
          walls: walls,
        }, { onConflict: 'townhall_level' })

      if (error) throw error

      onSave({
        townhall_level: townhallLevel,
        defences: defences,
        army: army,
        resources: resources,
        troops: troops,
        walls: walls,
      })
      onClose()
    } catch (err) {
      console.error(err)
      alert('Error saving building data')
    } finally {
      setSavingLoading(false)
    }
  }

  const saveDefence = async (defenceId) => {
    setSavingLoading(true)
    try {
      const { error } = await supabase
        .from('townhall_buildings')
        .upsert({
          townhall_level: townhallLevel,
          defences: defences,
          army: army,
          resources: resources,
          troops: troops,
          walls: walls,
        }, { onConflict: 'townhall_level' })

      if (error) throw error
      
      alert('Defence data saved successfully!')
      setEditingDefence(null)
    } catch (err) {
      console.error(err)
      alert('Error saving defence data')
    } finally {
      setSavingLoading(false)
    }
  }

  if (loading) return <div className={styles.overlay}></div>

  const addedDefenceIds = Object.keys(defences)
  const availableDefences = AVAILABLE_DEFENCES.filter(
    (d) => !addedDefenceIds.includes(d.id)
  )

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Town Hall {townhallLevel}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Tab Buttons */}
        <div className={styles.tabBar}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'defence' ? styles.active : ''}`}
            onClick={() => setActiveTab('defence')}
          >
            Defence
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'army' ? styles.active : ''}`}
            onClick={() => setActiveTab('army')}
          >
            Army
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'resource' ? styles.active : ''}`}
            onClick={() => setActiveTab('resource')}
          >
            Resource
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'troops' ? styles.active : ''}`}
            onClick={() => setActiveTab('troops')}
          >
            Troops
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'walls' ? styles.active : ''}`}
            onClick={() => setActiveTab('walls')}
          >
            Walls
          </button>
        </div>

        <div className={styles.content}>
          {/* Defence Tab */}
          {activeTab === 'defence' && (
            <>
              <div className={styles.section}>
                {Object.keys(defences).length > 0 ? (
                  <div className={styles.defencesList}>
                    {Object.keys(defences).map((defenceId) => {
                      const defence = AVAILABLE_DEFENCES.find((d) => d.id === defenceId)
                      const defenceData = defences[defenceId]
                      const isEditing = editingDefence === defenceId

                      return (
                        <div key={defenceId} className={styles.buildingCard}>
                          <div className={styles.buildingLeftWrapper}>
                            <div className={styles.buildingLeft}>
                              <img
                                src={`${defence.image}/18_5.png`}
                                alt={defence.name}
                                className={styles.buildingImage}
                              />
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={defenceData.buildings_unlocked}
                                  onChange={(e) =>
                                    updateDefence(defenceId, 'buildings_unlocked', parseInt(e.target.value) || 0)
                                  }
                                  className={styles.buildingCountInput}
                                  min="0"
                                />
                              ) : (
                                <div className={styles.buildingCount}>
                                  {defence.name} {defenceData.buildings_unlocked}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className={styles.buildingDivider}></div>
                          <div className={styles.buildingRight}>
                            <button
                              className={styles.editBtn}
                              onClick={() => setEditingDefence(isEditing ? null : defenceId)}
                              title={isEditing ? 'Cancel' : 'Edit'}
                            >
                              {isEditing ? '✕' : '✏️'}
                            </button>
                            <div className={styles.levelsList}>
                              {defenceData.levels
                                .sort((a, b) => a.level - b.level)
                                .map((level) => (
                                  <div key={level.level} className={styles.levelInfoRow}>
                                    {isEditing ? (
                                      <>
                                        <div className={styles.levelEditRow}>
                                          <span className={styles.levelLabel}>Lvl {level.level}:</span>
                                          <input
                                            type="number"
                                            value={level.cost}
                                            onChange={(e) =>
                                              updateLevel(defenceId, level.level, 'cost', parseInt(e.target.value) || 0)
                                            }
                                            className={styles.costInput}
                                            placeholder="Cost"
                                          />
                                          <select
                                            value={level.resource}
                                            onChange={(e) =>
                                              updateLevel(defenceId, level.level, 'resource', e.target.value)
                                            }
                                            className={styles.resourceSelect}
                                          >
                                            <option value="gold">Gold</option>
                                            <option value="elixir">Elixir</option>
                                            <option value="dark_elixir">Dark Elixir</option>
                                          </select>
                                          <input
                                            type="text"
                                            value={level.time}
                                            onChange={(e) =>
                                              updateLevel(defenceId, level.level, 'time', e.target.value)
                                            }
                                            className={styles.timeInput}
                                            placeholder="5s, 30s, 2m"
                                          />
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div className={styles.levelLabelWithIcon}>
                                          <img
                                            src={RESOURCE_ICONS[level.resource]}
                                            alt={level.resource}
                                            className={styles.resourceIconSmall}
                                          />
                                          <span className={styles.levelLabel}>Lvl {level.level}:</span>
                                        </div>
                                        <span className={styles.costValue}>{formatCost(level.cost)}</span>
                                        <span className={styles.timeValue}>{level.time}</span>
                                      </>
                                    )}
                                  </div>
                                ))}
                            </div>
                            {isEditing && (
                              <div className={styles.editActions}>
                                <button
                                  className={styles.saveBtn}
                                  onClick={() => saveDefence(defenceId)}
                                  disabled={savingLoading}
                                >
                                  {savingLoading ? 'Saving...' : 'Save'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <p>No defences data available.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Army Tab */}
          {activeTab === 'army' && (
            <>
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>Army</h3>
                  <button
                    className={styles.addDefenceBtn}
                    onClick={() => setShowAddArmy(true)}
                  >
                    + Add Army
                  </button>
                </div>

                {Object.keys(army).length > 0 ? (
                  <div className={styles.defencesList}>
                    {Object.keys(army).map((armyId) => {
                      const armyBuilding = AVAILABLE_ARMY.find((d) => d.id === armyId)
                      const armyData = army[armyId]
                      const maxLevel = Math.max(...armyData.levels.map((l) => l.level), 0)

                      return (
                        <div key={armyId} className={styles.defenceCard}>
                          <div
                            className={styles.defenceHeader}
                            onClick={() =>
                              setExpandedArmy(
                                expandedArmy === armyId ? null : armyId
                              )
                            }
                          >
                            <div className={styles.defenceInfo}>
                              <img
                                src={`${armyBuilding.image}/18_5.png`}
                                alt={armyBuilding.name}
                                className={styles.defenceThumb}
                              />
                              <div className={styles.defenceMeta}>
                                <h4>{armyBuilding.name}</h4>
                                <div className={styles.defenceStats}>
                                  <span>Buildings: {armyData.buildings_unlocked}</span>
                                  <span>Max Level: {maxLevel}</span>
                                </div>
                              </div>
                            </div>
                            <div className={styles.defenceActions}>
                              <button
                                className={styles.deleteBtn}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeArmy(armyId)
                                }}
                              >
                                Remove
                              </button>
                              <span className={styles.expandIcon}>
                                {expandedArmy === armyId ? '▼' : '▶'}
                              </span>
                            </div>
                          </div>

                          {expandedArmy === armyId && (
                            <div className={styles.defenceDetails}>
                              <div className={styles.fieldGroup}>
                                <label>Buildings Unlocked</label>
                                <input
                                  type="number"
                                  value={armyData.buildings_unlocked}
                                  onChange={(e) =>
                                    updateArmy(
                                      armyId,
                                      'buildings_unlocked',
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className={styles.input}
                                  min="0"
                                />
                              </div>

                              <div className={styles.levelsList}>
                                <h5>Upgrade Levels</h5>
                                {armyData.levels
                                  .sort((a, b) => a.level - b.level)
                                  .map((level) => (
                                    <div key={level.level} className={styles.levelRow}>
                                      <span className={styles.levelBadge}>Lvl {level.level}</span>
                                      <input
                                        type="text"
                                        value={formatCost(level.cost)}
                                        onChange={(e) =>
                                          updateArmyLevel(
                                            armyId,
                                            level.level,
                                            'cost',
                                            parseCost(e.target.value)
                                          )
                                        }
                                        placeholder="Cost (e.g., 1k, 10m)"
                                        className={styles.smallInput}
                                      />
                                      <div className={styles.resourceGroup}>
                                        <img
                                          src={RESOURCE_ICONS[level.resource]}
                                          alt={level.resource}
                                          className={styles.resourceIcon}
                                        />
                                        <select
                                          value={level.resource}
                                          onChange={(e) =>
                                            updateArmyLevel(
                                              armyId,
                                              level.level,
                                              'resource',
                                              e.target.value
                                            )
                                          }
                                          className={styles.smallInput}
                                        >
                                          <option value="gold">Gold</option>
                                          <option value="elixir">Elixir</option>
                                          <option value="dark_elixir">Dark Elixir</option>
                                        </select>
                                      </div>
                                      <input
                                        type="text"
                                        value={level.time}
                                        onChange={(e) =>
                                          updateArmyLevel(
                                            armyId,
                                            level.level,
                                            'time',
                                            parseTime(e.target.value)
                                          )
                                        }
                                        placeholder="e.g., 9 days 10h 30m 20s"
                                        className={styles.smallInput}
                                      />
                                      <button
                                        className={styles.removeBtn}
                                        onClick={() => removeArmyLevel(armyId, level.level)}
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ))}
                              </div>

                              <button
                                className={styles.addLevelBtn}
                                onClick={() => addArmyLevel(armyId)}
                              >
                                + Add Level
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <p>No army added yet. Click "Add Army" to get started.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Resource Tab */}
          {activeTab === 'resource' && (
            <>
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>Resources</h3>
                  <button
                    className={styles.addDefenceBtn}
                    onClick={() => setShowAddResource(true)}
                  >
                    + Add Resource
                  </button>
                </div>

                {Object.keys(resources).length > 0 ? (
                  <div className={styles.defencesList}>
                    {Object.keys(resources).map((resourceId) => {
                      const resourceBuilding = AVAILABLE_RESOURCES.find((d) => d.id === resourceId)
                      const resourceData = resources[resourceId]
                      const maxLevel = Math.max(...resourceData.levels.map((l) => l.level), 0)

                      return (
                        <div key={resourceId} className={styles.defenceCard}>
                          <div
                            className={styles.defenceHeader}
                            onClick={() =>
                              setExpandedResource(
                                expandedResource === resourceId ? null : resourceId
                              )
                            }
                          >
                            <div className={styles.defenceInfo}>
                              <img
                                src={`${resourceBuilding.image}/18_5.png`}
                                alt={resourceBuilding.name}
                                className={styles.defenceThumb}
                              />
                              <div className={styles.defenceMeta}>
                                <h4>{resourceBuilding.name}</h4>
                                <div className={styles.defenceStats}>
                                  <span>Buildings: {resourceData.buildings_unlocked}</span>
                                  <span>Max Level: {maxLevel}</span>
                                </div>
                              </div>
                            </div>
                            <div className={styles.defenceActions}>
                              <button
                                className={styles.deleteBtn}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeResource(resourceId)
                                }}
                              >
                                Remove
                              </button>
                              <span className={styles.expandIcon}>
                                {expandedResource === resourceId ? '▼' : '▶'}
                              </span>
                            </div>
                          </div>

                          {expandedResource === resourceId && (
                            <div className={styles.defenceDetails}>
                              <div className={styles.fieldGroup}>
                                <label>Buildings Unlocked</label>
                                <input
                                  type="number"
                                  value={resourceData.buildings_unlocked}
                                  onChange={(e) =>
                                    updateResource(
                                      resourceId,
                                      'buildings_unlocked',
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className={styles.input}
                                  min="0"
                                />
                              </div>

                              <div className={styles.levelsList}>
                                <h5>Upgrade Levels</h5>
                                {resourceData.levels
                                  .sort((a, b) => a.level - b.level)
                                  .map((level) => (
                                    <div key={level.level} className={styles.levelRow}>
                                      <span className={styles.levelBadge}>Lvl {level.level}</span>
                                      <input
                                        type="text"
                                        value={formatCost(level.cost)}
                                        onChange={(e) =>
                                          updateResourceLevel(
                                            resourceId,
                                            level.level,
                                            'cost',
                                            parseCost(e.target.value)
                                          )
                                        }
                                        placeholder="Cost (e.g., 1k, 10m)"
                                        className={styles.smallInput}
                                      />
                                      <div className={styles.resourceGroup}>
                                        <img
                                          src={RESOURCE_ICONS[level.resource]}
                                          alt={level.resource}
                                          className={styles.resourceIcon}
                                        />
                                        <select
                                          value={level.resource}
                                          onChange={(e) =>
                                            updateResourceLevel(
                                              resourceId,
                                              level.level,
                                              'resource',
                                              e.target.value
                                            )
                                          }
                                          className={styles.smallInput}
                                        >
                                          <option value="gold">Gold</option>
                                          <option value="elixir">Elixir</option>
                                          <option value="dark_elixir">Dark Elixir</option>
                                        </select>
                                      </div>
                                      <input
                                        type="text"
                                        value={level.time}
                                        onChange={(e) =>
                                          updateResourceLevel(
                                            resourceId,
                                            level.level,
                                            'time',
                                            parseTime(e.target.value)
                                          )
                                        }
                                        placeholder="e.g., 9 days 10h 30m 20s"
                                        className={styles.smallInput}
                                      />
                                      <button
                                        className={styles.removeBtn}
                                        onClick={() => removeResourceLevel(resourceId, level.level)}
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ))}
                              </div>

                              <button
                                className={styles.addLevelBtn}
                                onClick={() => addResourceLevel(resourceId)}
                              >
                                + Add Level
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <p>No resources added yet. Click "Add Resource" to get started.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Troops Tab */}
          {activeTab === 'troops' && (
            <>
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>Troops</h3>
                  <button
                    className={styles.addDefenceBtn}
                    onClick={() => setShowAddTroop(true)}
                  >
                    + Add Troop
                  </button>
                </div>

                {Object.keys(troops).length > 0 ? (
                  <div className={styles.defencesList}>
                    {Object.keys(troops).map((troopId) => {
                      const troopBuilding = AVAILABLE_TROOPS.find((d) => d.id === troopId)
                      const troopData = troops[troopId]
                      const maxLevel = Math.max(...troopData.levels.map((l) => l.level), 0)

                      return (
                        <div key={troopId} className={styles.defenceCard}>
                          <div
                            className={styles.defenceHeader}
                            onClick={() =>
                              setExpandedTroop(
                                expandedTroop === troopId ? null : troopId
                              )
                            }
                          >
                            <div className={styles.defenceInfo}>
                              <img
                                src={`${troopBuilding.image}/18_5.png`}
                                alt={troopBuilding.name}
                                className={styles.defenceThumb}
                              />
                              <div className={styles.defenceMeta}>
                                <h4>{troopBuilding.name}</h4>
                                <div className={styles.defenceStats}>
                                  <span>Buildable: {troopData.buildings_unlocked}</span>
                                  <span>Max Level: {maxLevel}</span>
                                </div>
                              </div>
                            </div>
                            <div className={styles.defenceActions}>
                              <button
                                className={styles.deleteBtn}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeTroop(troopId)
                                }}
                              >
                                Remove
                              </button>
                              <span className={styles.expandIcon}>
                                {expandedTroop === troopId ? '▼' : '▶'}
                              </span>
                            </div>
                          </div>

                          {expandedTroop === troopId && (
                            <div className={styles.defenceDetails}>
                              <div className={styles.fieldGroup}>
                                <label>Buildable In</label>
                                <input
                                  type="number"
                                  value={troopData.buildings_unlocked}
                                  onChange={(e) =>
                                    updateTroop(
                                      troopId,
                                      'buildings_unlocked',
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className={styles.input}
                                  min="0"
                                />
                              </div>

                              <div className={styles.levelsList}>
                                <h5>Upgrade Levels</h5>
                                {troopData.levels
                                  .sort((a, b) => a.level - b.level)
                                  .map((level) => (
                                    <div key={level.level} className={styles.levelRow}>
                                      <span className={styles.levelBadge}>Lvl {level.level}</span>
                                      <input
                                        type="text"
                                        value={formatCost(level.cost)}
                                        onChange={(e) =>
                                          updateTroopLevel(
                                            troopId,
                                            level.level,
                                            'cost',
                                            parseCost(e.target.value)
                                          )
                                        }
                                        placeholder="Cost (e.g., 1k, 10m)"
                                        className={styles.smallInput}
                                      />
                                      <div className={styles.resourceGroup}>
                                        <img
                                          src={RESOURCE_ICONS[level.resource]}
                                          alt={level.resource}
                                          className={styles.resourceIcon}
                                        />
                                        <select
                                          value={level.resource}
                                          onChange={(e) =>
                                            updateTroopLevel(
                                              troopId,
                                              level.level,
                                              'resource',
                                              e.target.value
                                            )
                                          }
                                          className={styles.smallInput}
                                        >
                                          <option value="gold">Gold</option>
                                          <option value="elixir">Elixir</option>
                                          <option value="dark_elixir">Dark Elixir</option>
                                        </select>
                                      </div>
                                      <input
                                        type="text"
                                        value={level.time}
                                        onChange={(e) =>
                                          updateTroopLevel(
                                            troopId,
                                            level.level,
                                            'time',
                                            parseTime(e.target.value)
                                          )
                                        }
                                        placeholder="e.g., 9 days 10h 30m 20s"
                                        className={styles.smallInput}
                                      />
                                      <button
                                        className={styles.removeBtn}
                                        onClick={() => removeTroopLevel(troopId, level.level)}
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ))}
                              </div>

                              <button
                                className={styles.addLevelBtn}
                                onClick={() => addTroopLevel(troopId)}
                              >
                                + Add Level
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <p>No troops added yet. Click "Add Troop" to get started.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Walls Tab */}
          {activeTab === 'walls' && (
            <>
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>Walls</h3>
                  <button
                    className={styles.addDefenceBtn}
                    onClick={() => setShowAddWall(true)}
                  >
                    + Add Wall
                  </button>
                </div>

                {Object.keys(walls).length > 0 ? (
                  <div className={styles.defencesList}>
                    {Object.keys(walls).map((wallId) => {
                      const wallBuilding = AVAILABLE_WALLS.find((d) => d.id === wallId)
                      const wallData = walls[wallId]
                      const maxLevel = Math.max(...wallData.levels.map((l) => l.level), 0)

                      return (
                        <div key={wallId} className={styles.defenceCard}>
                          <div
                            className={styles.defenceHeader}
                            onClick={() =>
                              setExpandedWall(
                                expandedWall === wallId ? null : wallId
                              )
                            }
                          >
                            <div className={styles.defenceInfo}>
                              <img
                                src={`${wallBuilding.image}/18_5.png`}
                                alt={wallBuilding.name}
                                className={styles.defenceThumb}
                              />
                              <div className={styles.defenceMeta}>
                                <h4>{wallBuilding.name}</h4>
                                <div className={styles.defenceStats}>
                                  <span>Count: {wallData.buildings_unlocked}</span>
                                  <span>Max Level: {maxLevel}</span>
                                </div>
                              </div>
                            </div>
                            <div className={styles.defenceActions}>
                              <button
                                className={styles.deleteBtn}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeWall(wallId)
                                }}
                              >
                                Remove
                              </button>
                              <span className={styles.expandIcon}>
                                {expandedWall === wallId ? '▼' : '▶'}
                              </span>
                            </div>
                          </div>

                          {expandedWall === wallId && (
                            <div className={styles.defenceDetails}>
                              <div className={styles.fieldGroup}>
                                <label>Wall Segments</label>
                                <input
                                  type="number"
                                  value={wallData.buildings_unlocked}
                                  onChange={(e) =>
                                    updateWall(
                                      wallId,
                                      'buildings_unlocked',
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className={styles.input}
                                  min="0"
                                />
                              </div>

                              <div className={styles.levelsList}>
                                <h5>Upgrade Levels</h5>
                                {wallData.levels
                                  .sort((a, b) => a.level - b.level)
                                  .map((level) => (
                                    <div key={level.level} className={styles.levelRow}>
                                      <span className={styles.levelBadge}>Lvl {level.level}</span>
                                      <input
                                        type="text"
                                        value={formatCost(level.cost)}
                                        onChange={(e) =>
                                          updateWallLevel(
                                            wallId,
                                            level.level,
                                            'cost',
                                            parseCost(e.target.value)
                                          )
                                        }
                                        placeholder="Cost (e.g., 1k, 10m)"
                                        className={styles.smallInput}
                                      />
                                      <div className={styles.resourceGroup}>
                                        <img
                                          src={RESOURCE_ICONS[level.resource]}
                                          alt={level.resource}
                                          className={styles.resourceIcon}
                                        />
                                        <select
                                          value={level.resource}
                                          onChange={(e) =>
                                            updateWallLevel(
                                              wallId,
                                              level.level,
                                              'resource',
                                              e.target.value
                                            )
                                          }
                                          className={styles.smallInput}
                                        >
                                          <option value="gold">Gold</option>
                                          <option value="elixir">Elixir</option>
                                          <option value="dark_elixir">Dark Elixir</option>
                                        </select>
                                      </div>
                                      <input
                                        type="text"
                                        value={level.time}
                                        onChange={(e) =>
                                          updateWallLevel(
                                            wallId,
                                            level.level,
                                            'time',
                                            parseTime(e.target.value)
                                          )
                                        }
                                        placeholder="e.g., 9 days 10h 30m 20s"
                                        className={styles.smallInput}
                                      />
                                      <button
                                        className={styles.removeBtn}
                                        onClick={() => removeWallLevel(wallId, level.level)}
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ))}
                              </div>

                              <button
                                className={styles.addLevelBtn}
                                onClick={() => addWallLevel(wallId)}
                              >
                                + Add Level
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <p>No walls added yet. Click "Add Wall" to get started.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Add Defence Modal */}
        {showAddDefence && (
          <div className={styles.defenceSelector} onClick={() => setShowAddDefence(false)}>
            <div className={styles.defenceSelectorContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.defenceSelectorHeader}>
                <h3>Select Defence</h3>
                <button
                  className={styles.closeSelectorBtn}
                  onClick={() => setShowAddDefence(false)}
                >
                  ✕
                </button>
              </div>
              <div className={styles.defenceSelectionGrid}>
                {AVAILABLE_DEFENCES.filter((d) => !Object.keys(defences).includes(d.id)).map(
                  (defence) => (
                    <button
                      key={defence.id}
                      className={styles.defenceSelectionBox}
                      onClick={() => {
                        addDefence(defence.id)
                        setShowAddDefence(false)
                      }}
                    >
                      <img
                        src={`${defence.image}/18_5.png`}
                        alt={defence.name}
                        className={styles.selectionImage}
                      />
                      <span className={styles.selectionName}>{defence.name}</span>
                      <span className={styles.selectionPlus}>+</span>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {showAddArmy && (
          <div className={styles.defenceSelector} onClick={() => setShowAddArmy(false)}>
            <div className={styles.defenceSelectorContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.defenceSelectorHeader}>
                <h3>Select Army</h3>
                <button
                  className={styles.closeSelectorBtn}
                  onClick={() => setShowAddArmy(false)}
                >
                  ✕
                </button>
              </div>
              <div className={styles.defenceSelectionGrid}>
                {AVAILABLE_ARMY.filter((d) => !Object.keys(army).includes(d.id)).map(
                  (armyBuilding) => (
                    <button
                      key={armyBuilding.id}
                      className={styles.defenceSelectionBox}
                      onClick={() => {
                        addArmy(armyBuilding.id)
                        setShowAddArmy(false)
                      }}
                    >
                      <img
                        src={`${armyBuilding.image}/18_5.png`}
                        alt={armyBuilding.name}
                        className={styles.selectionImage}
                      />
                      <span className={styles.selectionName}>{armyBuilding.name}</span>
                      <span className={styles.selectionPlus}>+</span>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {showAddResource && (
          <div className={styles.defenceSelector} onClick={() => setShowAddResource(false)}>
            <div className={styles.defenceSelectorContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.defenceSelectorHeader}>
                <h3>Select Resource</h3>
                <button
                  className={styles.closeSelectorBtn}
                  onClick={() => setShowAddResource(false)}
                >
                  ✕
                </button>
              </div>
              <div className={styles.defenceSelectionGrid}>
                {AVAILABLE_RESOURCES.filter((d) => !Object.keys(resources).includes(d.id)).map(
                  (resourceBuilding) => (
                    <button
                      key={resourceBuilding.id}
                      className={styles.defenceSelectionBox}
                      onClick={() => {
                        addResource(resourceBuilding.id)
                        setShowAddResource(false)
                      }}
                    >
                      <img
                        src={`${resourceBuilding.image}/18_5.png`}
                        alt={resourceBuilding.name}
                        className={styles.selectionImage}
                      />
                      <span className={styles.selectionName}>{resourceBuilding.name}</span>
                      <span className={styles.selectionPlus}>+</span>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {showAddTroop && (
          <div className={styles.defenceSelector} onClick={() => setShowAddTroop(false)}>
            <div className={styles.defenceSelectorContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.defenceSelectorHeader}>
                <h3>Select Troop</h3>
                <button
                  className={styles.closeSelectorBtn}
                  onClick={() => setShowAddTroop(false)}
                >
                  ✕
                </button>
              </div>
              <div className={styles.defenceSelectionGrid}>
                {AVAILABLE_TROOPS.filter((d) => !Object.keys(troops).includes(d.id)).map(
                  (troopBuilding) => (
                    <button
                      key={troopBuilding.id}
                      className={styles.defenceSelectionBox}
                      onClick={() => {
                        addTroop(troopBuilding.id)
                        setShowAddTroop(false)
                      }}
                    >
                      <img
                        src={`${troopBuilding.image}/18_5.png`}
                        alt={troopBuilding.name}
                        className={styles.selectionImage}
                      />
                      <span className={styles.selectionName}>{troopBuilding.name}</span>
                      <span className={styles.selectionPlus}>+</span>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {showAddWall && (
          <div className={styles.defenceSelector} onClick={() => setShowAddWall(false)}>
            <div className={styles.defenceSelectorContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.defenceSelectorHeader}>
                <h3>Select Wall</h3>
                <button
                  className={styles.closeSelectorBtn}
                  onClick={() => setShowAddWall(false)}
                >
                  ✕
                </button>
              </div>
              <div className={styles.defenceSelectionGrid}>
                {AVAILABLE_WALLS.filter((d) => !Object.keys(walls).includes(d.id)).map(
                  (wallBuilding) => (
                    <button
                      key={wallBuilding.id}
                      className={styles.defenceSelectionBox}
                      onClick={() => {
                        addWall(wallBuilding.id)
                        setShowAddWall(false)
                      }}
                    >
                      <img
                        src={`${wallBuilding.image}/18_5.png`}
                        alt={wallBuilding.name}
                        className={styles.selectionImage}
                      />
                      <span className={styles.selectionName}>{wallBuilding.name}</span>
                      <span className={styles.selectionPlus}>+</span>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={savingLoading}
          >
            {savingLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
