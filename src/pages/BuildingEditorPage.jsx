import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import styles from './BuildingEditorPage.module.css'
import { supabase } from '../supabaseClient'
import Header from '../components/Header'

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

const getDefaultBuildingData = (townhallLevel) => {
  if (townhallLevel === 2) {
    return {
      canon: {
        buildings_unlocked: 2,
        levels: [
          { level: 1, cost: 250, resource: 'gold', time: '5s' },
          { level: 2, cost: 1000, resource: 'gold', time: '30s' },
          { level: 3, cost: 4000, resource: 'gold', time: '2m' },
        ],
      },
    }
  }
  return {}
}

export default function BuildingEditorPage({ username, onLogout }) {
  const { townhallLevel, buildingId } = useParams()
  const navigate = useNavigate()

  const [staticData, setStaticData] = useState({})
  const [dynamicData, setDynamicData] = useState({})
  const [isEditing, setIsEditing] = useState(false)
  const [editingLevels, setEditingLevels] = useState([])
  const [editingBuildingCount, setEditingBuildingCount] = useState(0)
  const [savingLoading, setSavingLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  const defence = AVAILABLE_DEFENCES.find((d) => d.id === buildingId)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Load static data
        const defaultData = getDefaultBuildingData(parseInt(townhallLevel))
        let staticBuildingData = defaultData[buildingId] || { buildings_unlocked: 0, levels: [] }
        setStaticData(staticBuildingData)
        
        // Initialize editing levels with static data immediately
        setEditingLevels(JSON.parse(JSON.stringify(staticBuildingData.levels || [])))
        setEditingBuildingCount(staticBuildingData.buildings_unlocked || 0)

        // Fetch dynamic data from database
        const { data, error } = await supabase
          .from('townhall_buildings')
          .select('defences')
          .eq('townhall_level', parseInt(townhallLevel))
          .single()

        if (error && error.code !== 'PGRST116') throw error
        
        if (data && data.defences?.[buildingId]) {
          const buildingData = data.defences[buildingId]
          setDynamicData(buildingData)
          // Override with database data if it exists
          setEditingLevels(JSON.parse(JSON.stringify(buildingData.levels)))
          setEditingBuildingCount(buildingData.buildings_unlocked)
        } else {
          // No database record yet - use static data as initial dynamic data
          setDynamicData({
            buildings_unlocked: staticBuildingData.buildings_unlocked || 0,
            levels: staticBuildingData.levels || []
          })
        }
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
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
    
    toUpdate[levelIndex] = {
      ...toUpdate[levelIndex],
      [field]: field === 'cost' ? parseInt(value) || 0 : value,
    }
    setEditingLevels(toUpdate)
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

      // Build defences object
      const defences = currentData?.defences || {}
      defences[buildingId] = {
        buildings_unlocked: editingBuildingCount,
        levels: editingLevels,
      }

      // Prepare complete record
      const recordToSave = {
        townhall_level: parseInt(townhallLevel),
        defences: defences,
        army: currentData?.army || {},
        resources: currentData?.resources || {},
        troops: currentData?.troops || {},
        walls: currentData?.walls || {},
      }

      // Upsert with proper conflict handling
      const { error: upsertError } = await supabase
        .from('townhall_buildings')
        .upsert(recordToSave, { onConflict: 'townhall_level' })

      if (upsertError) throw upsertError

      alert('Building data saved successfully!')
      
      // Update dynamic data with what we just saved
      setDynamicData({
        buildings_unlocked: editingBuildingCount,
        levels: editingLevels,
      })
      setIsEditing(false)
    } catch (err) {
      console.error('Error saving:', err)
      alert('Error saving building data: ' + err.message)
    } finally {
      setSavingLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <Header username={username} onLogout={onLogout} />
        <div className={styles.container}>
          <div>Loading...</div>
        </div>
      </div>
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

  // Detect if there are changes
  const hasChanges = () => {
    if (editingBuildingCount !== (dynamicData.buildings_unlocked || 0)) {
      return true
    }
    if (editingLevels.length !== (dynamicData.levels || []).length) {
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
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          ← Back
        </button>

        {/* Building Card: Image | Divider | Data */}
        <div className={styles.buildingCard}>
          {/* Left: Image + Name */}
          <div className={styles.buildingImageSection}>
            <img
              src={`${defence.image}/18_3.png`}
              alt={defence.name}
              className={styles.buildingImage}
            />
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
                Static <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '8px' }}>Count: {staticData.buildings_unlocked || 0}</span>
              </div>
              <div className={styles.levelsList}>
                {currentStaticLevel.map((level) => (
                  <div key={`static-${level.level}`} className={styles.levelRow}>
                    <div className={styles.levelLabel}>Lvl {level.level}:</div>
                    <span className={styles.costValue}>{formatCost(level.cost)}</span>
                    <img
                      src={RESOURCE_ICONS[level.resource]}
                      alt={level.resource}
                      className={styles.resourceIcon}
                    />
                    <span className={styles.timeValue}>{level.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamic/Edit Data Section */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(102, 227, 196, 0.2)' }}>
              <div className={styles.sectionHeading}>
                Dynamic {!isEditing && <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '8px' }}>Count: {dynamicData.buildings_unlocked || 0}</span>}
                {isEditing && (
                  <input
                    type="number"
                    value={editingBuildingCount}
                    onChange={(e) => setEditingBuildingCount(parseInt(e.target.value) || 0)}
                    min="0"
                    className={styles.headingCountInput}
                  />
                )}
              </div>
              
              {!isEditing && currentDynamicLevel.length > 0 && (
                <div className={styles.levelsList}>
                  {currentDynamicLevel.map((level) => {
                    const staticLevel = currentStaticLevel.find((l) => l.level === level.level)
                    const isMatching = isLevelMatching(staticLevel, level)

                    return (
                      <div key={`dynamic-${level.level}`} className={styles.levelRow}>
                        <div className={styles.levelLabel}>Lvl {level.level}:</div>
                        <span className={styles.costValue}>{formatCost(level.cost)}</span>
                        <img
                          src={RESOURCE_ICONS[level.resource]}
                          alt={level.resource}
                          className={styles.resourceIcon}
                        />
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
                      <span className={styles.levelLabel}>Lvl {level.level}:</span>
                      <input
                        type="number"
                        value={level.cost}
                        onChange={(e) => handleEditLevel(idx, 'cost', e.target.value)}
                        className={styles.costInput}
                        placeholder="Cost"
                      />
                      <select
                        value={level.resource}
                        onChange={(e) => handleEditLevel(idx, 'resource', e.target.value)}
                        className={styles.resourceSelect}
                      >
                        <option value="gold">Gold</option>
                        <option value="elixir">Elixir</option>
                        <option value="dark_elixir">Dark Elixir</option>
                      </select>
                      <input
                        type="text"
                        value={level.time}
                        onChange={(e) => handleEditLevel(idx, 'time', e.target.value)}
                        className={styles.timeInput}
                        placeholder="5s, 30s, 2m"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
