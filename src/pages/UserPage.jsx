import { useState, useEffect } from 'react'
import styles from './UserPage.module.css'
import Header from '../components/Header'
import { supabase } from '../supabaseClient'

export default function UserPage({ username, onLogout, userId }) {
  const [tag, setTag] = useState('')
  const [playerData, setPlayerData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [villages, setVillages] = useState([])
  const [activeVillage, setActiveVillage] = useState(null)
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    loadVillages()
  }, [userId])

  const loadVillages = async () => {
    if (!userId) return
    const { data } = await supabase
      .from('user_villages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    if (data && data.length > 0) {
      setVillages(data)
      if (!activeVillage) setActiveVillage(data[0])
    } else {
      setShowSearch(true)
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
    const villageRow = {
      user_id: userId,
      player_tag: playerData.tag,
      player_name: playerData.name,
      townhall_level: playerData.townHallLevel,
      exp_level: playerData.expLevel,
      clan_name: playerData.clan?.name || null,
      clan_badge_url: playerData.clan?.badgeUrls?.small || null,
      clan_level: playerData.clan?.clanLevel || null,
    }
    const { data, error: saveError } = await supabase
      .from('user_villages')
      .upsert(villageRow, { onConflict: 'user_id,player_tag' })
      .select()
      .single()

    if (!saveError && data) {
      await loadVillages()
      setActiveVillage(data)
      setShowSearch(false)
      setPlayerData(null)
      setTag('')
    }
    setSaving(false)
  }

  const handleSelectVillage = (village) => {
    setActiveVillage(village)
    setShowSearch(false)
    setPlayerData(null)
    setTag('')
  }

  const handleAddVillage = () => {
    setShowSearch(true)
    setPlayerData(null)
    setTag('')
    setActiveVillage(null)
  }

  const showingSearch = showSearch || villages.length === 0

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
            <>
              {/* Search */}
              <div className={styles.searchSection}>
                <p className={styles.searchLabel}>Enter your Clash of Clans player tag</p>
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
                  <button
                    className={styles.searchBtn}
                    onClick={handleSearch}
                    disabled={loading}
                  >
                    {loading ? 'Searching...' : 'Search'}
                  </button>
                </div>
                {error && <p className={styles.errorMsg}>{error}</p>}
              </div>

              {/* Player Card */}
              {playerData && (
                <div className={styles.playerCard}>
                  <div className={styles.thSection}>
                    <img
                      src={`/src/assets/townhall/1_${playerData.townHallLevel}.png`}
                      alt={`TH ${playerData.townHallLevel}`}
                      className={styles.thImage}
                    />
                    <span className={styles.thLabel}>TH {playerData.townHallLevel}</span>
                  </div>
                  <div className={styles.cardDivider} />
                  <div className={styles.playerInfo}>
                    <div className={styles.nameRow}>
                      <h2 className={styles.playerName}>{playerData.name}</h2>
                      <div className={styles.expBadge}>
                        <img src="/src/assets/exp/xp.png" alt="xp" className={styles.expIcon} />
                        <span className={styles.expLevel}>{playerData.expLevel}</span>
                      </div>
                    </div>
                    {playerData.clan ? (
                      <div className={styles.clanRow}>
                        <img src={playerData.clan.badgeUrls?.small} alt={playerData.clan.name} className={styles.clanBadge} />
                        <span className={styles.clanName}>{playerData.clan.name}</span>
                        <span className={styles.clanLevel}>Lv.{playerData.clan.clanLevel}</span>
                      </div>
                    ) : (
                      <div className={styles.notInClan}>⚠️ Player is not in a clan</div>
                    )}
                    <button className={styles.proceedBtn} onClick={handleProceed} disabled={saving}>
                      {saving ? 'Saving...' : 'Proceed →'}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Active Village Display */
            activeVillage && (
              <div className={styles.playerCard}>
                <div className={styles.thSection}>
                  <img
                    src={`/src/assets/townhall/1_${activeVillage.townhall_level}.png`}
                    alt={`TH ${activeVillage.townhall_level}`}
                    className={styles.thImage}
                  />
                  <span className={styles.thLabel}>TH {activeVillage.townhall_level}</span>
                </div>
                <div className={styles.cardDivider} />
                <div className={styles.playerInfo}>
                  <div className={styles.nameRow}>
                    <h2 className={styles.playerName}>{activeVillage.player_name}</h2>
                    <div className={styles.expBadge}>
                      <img src="/src/assets/exp/xp.png" alt="xp" className={styles.expIcon} />
                      <span className={styles.expLevel}>{activeVillage.exp_level}</span>
                    </div>
                  </div>
                  {activeVillage.clan_name && (
                    <div className={styles.clanRow}>
                      {activeVillage.clan_badge_url && (
                        <img src={activeVillage.clan_badge_url} alt={activeVillage.clan_name} className={styles.clanBadge} />
                      )}
                      <span className={styles.clanName}>{activeVillage.clan_name}</span>
                      {activeVillage.clan_level && (
                        <span className={styles.clanLevel}>Lv.{activeVillage.clan_level}</span>
                      )}
                    </div>
                  )}
                  <span className={styles.playerTag}>{activeVillage.player_tag}</span>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </>
  )
}
