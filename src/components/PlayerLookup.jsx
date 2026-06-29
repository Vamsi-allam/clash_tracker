import { useEffect, useMemo, useState } from 'react'
import styles from './PlayerLookup.module.css'
import { supabase } from '../supabaseClient'
import xpIcon from '../assets/exp/xp.png'

const townhallImages = import.meta.glob('../assets/townhall/*.png', {
  eager: true,
  import: 'default',
})

const builderHutImages = import.meta.glob('../assets/BuilderHut/*.png', {
  eager: true,
  import: 'default',
})

function normalizeTag(input) {
  const trimmed = input.trim().toUpperCase()
  if (!trimmed) {
    return ''
  }

  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`
}

export default function PlayerLookup({ userId }) {
  const [playerTag, setPlayerTag] = useState('')
  const [loading, setLoading] = useState(false)
  const [switchLoading, setSwitchLoading] = useState(false)
  const [activePanel, setActivePanel] = useState('switch')
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [player, setPlayer] = useState(null)
  const [stage, setStage] = useState('search')
  const [builderCount, setBuilderCount] = useState(2)
  const [bobUnlocked, setBobUnlocked] = useState(false)
  const [villages, setVillages] = useState([])

  const getCacheKey = (tag) => `clash_player_${tag.replace('#', '')}`
  const getSessionKey = () => `clash_player_session_${userId || 'guest'}`

  const getTownhallImage = (townHallLevel) => {
    const level = Number(townHallLevel)
    if (!Number.isFinite(level) || level < 2) {
      return townhallImages['../assets/townhall/1_2.png'] || null
    }

    const path = `../assets/townhall/1_${level}.png`
    return townhallImages[path] || null
  }

  const builderHutImage = useMemo(() => {
    return (
      builderHutImages['../assets/BuilderHut/Bob.png'] ||
      builderHutImages['../assets/BuilderHut/Builder_Hut.png'] ||
      null
    )
  }, [])

  const getVillageIcon = (village) => {
    const data = village?.player_data || {}
    const townhallLevel = Number(data.townHallLevel)

    return getTownhallImage(townhallLevel) || townhallImages['../assets/townhall/1_2.png'] || null
  }

  const readLocalCache = (tag) => {
    try {
      const cached = localStorage.getItem(getCacheKey(tag))
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  }

  const writeLocalCache = (tag, data) => {
    try {
      localStorage.setItem(getCacheKey(tag), JSON.stringify({ ...data, _cachedAt: Date.now() }))
    } catch {
      // Ignore local storage quota errors.
    }
  }

  const persistSessionState = (nextState) => {
    try {
      localStorage.setItem(getSessionKey(), JSON.stringify(nextState))
    } catch {
      // Ignore local storage quota errors.
    }
  }

  const readSessionState = () => {
    try {
      const raw = localStorage.getItem(getSessionKey())
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  const fetchFromDatabase = async (tag) => {
    const { data, error } = await supabase
      .from('player_lookups')
      .select('player_data, player_tag, player_name, updated_at')
      .eq('user_id', userId)
      .eq('player_tag', tag)
      .maybeSingle()

    if (error) {
      throw error
    }

    return data?.player_data ?? null
  }

  const fetchVillages = async () => {
    if (!userId) {
      return
    }

    const { data, error } = await supabase
      .from('player_lookups')
      .select('player_tag, player_name, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      throw error
    }

    setVillages(data || [])
  }

  const fetchFromApi = async (tag) => {
    const encodedTag = encodeURIComponent(tag)
    const response = await fetch(`/api/coc/players/${encodedTag}`)

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload?.reason || payload?.message || 'Failed to fetch player details')
    }

    return response.json()
  }

  const saveToDatabase = async (tag, data) => {
    if (!userId) {
      return
    }

    const { error } = await supabase.from('player_lookups').upsert(
      {
        user_id: userId,
        player_tag: tag,
        player_name: data.name,
        player_data: data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,player_tag' },
    )

    if (error) {
      throw error
    }

    await fetchVillages()
  }

  useEffect(() => {
    const storedState = readSessionState()
    if (!storedState) {
      return
    }

    if (storedState.player) {
      setPlayer(storedState.player)
    }

    if (storedState.playerTag) {
      setPlayerTag(storedState.playerTag)
    }

    if (storedState.stage) {
      setStage(storedState.stage)
    }

    if (typeof storedState.builderCount === 'number') {
      setBuilderCount(storedState.builderCount)
    }

    if (typeof storedState.bobUnlocked === 'boolean') {
      setBobUnlocked(storedState.bobUnlocked)
    }

    if (storedState.infoMessage) {
      setInfoMessage(storedState.infoMessage)
    }
  }, [userId])

  useEffect(() => {
    void fetchVillages()
  }, [userId])

  const loadVillageByTag = async (tag) => {
    const normalized = normalizeTag(tag)
    if (!normalized) {
      return
    }

    setSwitchLoading(true)
    setErrorMessage('')
    setInfoMessage('')

    try {
      setPlayerTag(normalized)
      const cached = readLocalCache(normalized)
      if (cached) {
        setPlayer(cached)
        setStage('loaded')
        setInfoMessage('Village loaded from local cache.')
        return
      }

      const dbData = await fetchFromDatabase(normalized)
      if (dbData) {
        setPlayer(dbData)
        setStage('loaded')
        writeLocalCache(normalized, dbData)
        setInfoMessage('Village loaded from Supabase.')
      }
    } catch (error) {
      setErrorMessage(error?.message || 'Could not load selected village')
    } finally {
      setSwitchLoading(false)
    }
  }

  const openAddVillage = () => {
    setActivePanel('add')
    setStage('search')
    setErrorMessage('')
    setInfoMessage('')
    setPlayer(null)
  }

  const openRemoveVillage = () => {
    setActivePanel('remove')
    setErrorMessage('')
    setInfoMessage('')
  }

  const openSwitchVillage = () => {
    setActivePanel('switch')
    setErrorMessage('')
    setInfoMessage('')
  }

  const removeVillage = async (tag) => {
    if (!userId) {
      return
    }

    setSwitchLoading(true)
    setErrorMessage('')

    try {
      const normalized = normalizeTag(tag)
      const { error } = await supabase.from('player_lookups').delete().eq('user_id', userId).eq('player_tag', normalized)
      if (error) {
        throw error
      }

      localStorage.removeItem(getCacheKey(normalized))

      const sessionKey = getSessionKey()
      const storedRaw = localStorage.getItem(sessionKey)
      if (storedRaw) {
        const stored = JSON.parse(storedRaw)
        if (stored?.playerTag === normalized) {
          localStorage.removeItem(sessionKey)
          setPlayer(null)
          setPlayerTag('')
          setStage('search')
          setInfoMessage('Village removed.')
        }
      }

      await fetchVillages()
    } catch (error) {
      setErrorMessage(error?.message || 'Could not remove village')
    } finally {
      setSwitchLoading(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const normalized = normalizeTag(playerTag)
    if (!normalized.startsWith('#')) {
      setErrorMessage('Player tag must start with #')
      setPlayer(null)
      return
    }

    setLoading(true)
    setErrorMessage('')
    setInfoMessage('')

    try {
      const cached = readLocalCache(normalized)
      if (cached) {
        setPlayer(cached)
        setStage('loaded')
        setInfoMessage('Village loaded from local cache. Click Proceed to continue.')
        persistSessionState({
          stage: 'loaded',
          playerTag: normalized,
          player: cached,
          builderCount,
          bobUnlocked,
          infoMessage: 'Village loaded from local cache. Click Proceed to continue.',
        })
        return
      }

      if (userId) {
        const dbData = await fetchFromDatabase(normalized)
        if (dbData) {
          setPlayer(dbData)
          setStage('loaded')
          writeLocalCache(normalized, dbData)
          setInfoMessage('Village loaded from Supabase and cached locally.')
          persistSessionState({
            stage: 'loaded',
            playerTag: normalized,
            player: dbData,
            builderCount,
            bobUnlocked,
            infoMessage: 'Village loaded from Supabase and cached locally.',
          })
          return
        }
      }

      const apiData = await fetchFromApi(normalized)
      setPlayer(apiData)
      setStage('loaded')
      writeLocalCache(normalized, apiData)
      setInfoMessage('Village loaded from Clash API and cached locally.')
      persistSessionState({
        stage: 'loaded',
        playerTag: normalized,
        player: apiData,
        builderCount,
        bobUnlocked,
        infoMessage: 'Village loaded from Clash API and cached locally.',
      })
    } catch (error) {
      setPlayer(null)
      setErrorMessage(error?.message || 'Could not fetch player details')
    } finally {
      setLoading(false)
    }
  }

  const handleProceed = async () => {
    if (!player) {
      return
    }

    const tag = player.tag || normalizeTag(playerTag)
    if (!tag) {
      return
    }

    setErrorMessage('')

    try {
      writeLocalCache(tag, player)
      await saveToDatabase(tag, player)
      setInfoMessage('Village loaded. Click Setup Village Structures to continue.')
      setStage('setup')
      persistSessionState({
        stage: 'setup',
        playerTag: tag,
        player,
        builderCount,
        bobUnlocked,
        infoMessage: 'Village loaded. Click Setup Village Structures to continue.',
      })
    } catch (error) {
      setErrorMessage(error?.message || 'Could not save player details')
    }
  }

  const handleSetupVillageStructures = () => {
    setStage('setup')
    setInfoMessage('')
    setErrorMessage('')
    persistSessionState({
      stage: 'setup',
      playerTag: player?.tag || playerTag,
      player,
      builderCount,
      bobUnlocked,
      infoMessage: '',
    })
  }

  const handleSetupAndSaveVillage = async () => {
    if (!player) {
      return
    }

    try {
      await saveToDatabase(player.tag || normalizeTag(playerTag), {
        ...player,
        builderCount,
        bobUnlocked,
        setupStage: 'setup',
      })
      handleSetupVillageStructures()
    } catch (error) {
      setErrorMessage(error?.message || 'Could not save setup details')
    }
  }

  useEffect(() => {
    if (!player) {
      return
    }

    persistSessionState({
      stage,
      playerTag: player?.tag || playerTag,
      player,
      builderCount,
      bobUnlocked,
      infoMessage,
    })
  }, [builderCount, bobUnlocked, infoMessage, player, playerTag, stage, userId])

  return (
    <section className={styles.lookupShell}>
      {villages.length ? (
        <div className={styles.switchBar} data-panel={activePanel}>
          <div className={styles.switchHeaderRow}>
            <button className={styles.switchButton} type="button" onClick={openSwitchVillage}>
              ↔ Switch Village
            </button>
            <button className={styles.headerVillageButton} type="button" onClick={openAddVillage}>
              + Add New Village
            </button>
            <button className={styles.headerVillageButtonDanger} type="button" onClick={openRemoveVillage}>
              − Remove Village
            </button>
          </div>
          {activePanel !== 'add' ? (
            <div className={styles.switchMenu} role="menu" aria-label={activePanel === 'remove' ? 'Remove village menu' : 'Switch village menu'}>
              <div className={styles.switchMenuHeader}>
                <span>{activePanel === 'remove' ? 'Remove a village' : 'Switch Village'}</span>
                <span>{villages.length} saved</span>
              </div>
              {villages.map((village) => (
                <button
                  key={village.player_tag}
                  className={activePanel === 'remove' ? styles.switchListItemDanger : styles.switchListItem}
                  type="button"
                  onClick={() =>
                    activePanel === 'remove'
                      ? removeVillage(village.player_tag)
                      : loadVillageByTag(village.player_tag)
                  }
                  disabled={switchLoading}
                >
                  <span className={styles.switchVillageIconWrap}>
                    {getVillageIcon(village) ? (
                      <img className={styles.switchVillageIcon} src={getVillageIcon(village)} alt="Town hall" />
                    ) : (
                      <span className={styles.switchVillageIconFallback} />
                    )}
                  </span>
                  <span className={styles.switchVillageTextWrap}>
                    <span className={styles.switchVillageName}>{village.player_name || village.player_tag.replace('#', '')}</span>
                    <span className={styles.switchVillageTag}>{village.player_tag}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {stage === 'search' || activePanel === 'add' ? (
        <div className={styles.lookupCard}>
          <h2>Enter Your Player Tag</h2>
          <p>Enter your player tag starting with # and fetch live village details.</p>

          <form className={styles.lookupForm} onSubmit={handleSubmit}>
            <label className={styles.field}>
              Player Tag
              <input
                className={styles.input}
                type="text"
                value={playerTag}
                onChange={(event) => setPlayerTag(event.target.value)}
                placeholder="#YR9080LL9"
                required
              />
            </label>

            <button className={styles.primaryButton} type="submit" disabled={loading}>
              {loading ? 'Fetching...' : 'Load Player Details'}
            </button>
          </form>

          {errorMessage ? <p className={styles.errorBanner}>{errorMessage}</p> : null}
          {infoMessage ? <p className={styles.infoBanner}>{infoMessage}</p> : null}
        </div>
      ) : null}

      {player ? (
        <article className={styles.playerCard}>
          {stage === 'loaded' || stage === 'setup' ? (
            <>
              {stage === 'loaded' ? (
                <div className={styles.loadedHero}>
                  <p className={styles.loadedEyebrow}>Village Loaded</p>
                  <h3>Village Loaded</h3>
                  <p>
                    Your village has been successfully loaded. Click the button below to setup the structures:
                  </p>
                  <div className={styles.loadedPreviewGrid}>
                    <div className={styles.loadedPreviewTile}>
                      <span>Player</span>
                      <strong>{player.name}</strong>
                      <p>Town Hall Level {player.townHallLevel ?? 'N/A'}</p>
                    </div>
                    <div className={styles.loadedPreviewTile}>
                      <span>Clan</span>
                      <strong>{player.clan?.name ?? 'Player is not in a clan'}</strong>
                      <p>{player.clan ? `Clan Level ${player.clan.clanLevel ?? 'N/A'}` : 'Player is not in a clan'}</p>
                    </div>
                  </div>
                  <button className={styles.setupButton} type="button" onClick={handleSetupAndSaveVillage}>
                    Setup Village Structures
                  </button>
                </div>
              ) : null}

              {stage === 'setup' ? (
                <>
                  <div className={styles.setupIntroCard}>
                    <p className={styles.loadedEyebrow}>NEW: Upload your Village Export</p>
                    <h3>Update all the levels in your village and active upgrades with a press of a button!</h3>
                    <button className={styles.uploadButton} type="button">
                      Upload Export
                    </button>
                  </div>

                  <div className={styles.setupGrid}>
                    <section className={styles.buildersCard}>
                      <h3>Builders (Excluding B.O.B)</h3>
                      <div className={styles.builderRow}>
                        {builderHutImage ? (
                          <img className={styles.builderIcon} src={builderHutImage} alt="Builder hut" />
                        ) : null}
                        <input
                          className={styles.builderSlider}
                          type="range"
                          min="2"
                          max="5"
                          value={builderCount}
                          onChange={(event) => setBuilderCount(Number(event.target.value))}
                        />
                        <input
                          className={styles.builderNumber}
                          type="number"
                          min="2"
                          max="5"
                          value={builderCount}
                          onChange={(event) => setBuilderCount(Number(event.target.value))}
                        />
                      </div>
                    </section>

                    <section className={styles.bobCard}>
                      <h3>B.O.B</h3>
                      {player.builderHallLevel >= 9 ? (
                        <ul>
                          <li>Gear Up 3 buildings</li>
                          <li>Upgrade any troop to level 18</li>
                          <li>Upgrade the Hero Machines to level 45</li>
                        </ul>
                      ) : (
                        <p className={styles.bobUnavailable}>B.O.B is available at Builder Hall 9</p>
                      )}
                      <label className={styles.checkboxRow}>
                        <input
                          type="checkbox"
                          checked={bobUnlocked}
                          onChange={(event) => setBobUnlocked(event.target.checked)}
                        />
                        B.O.B Unlocked?
                      </label>
                    </section>
                  </div>

                  <p className={styles.noteText}>
                    Please note: Reducing the number of builders can affect builder plans and active upgrade tasks, so be sure this is correct!
                  </p>

                  <section className={styles.maxSection}>
                    <h3>Already fully upgraded?</h3>
                    <p>Save time setting your levels using the buttons below:</p>
                    <div className={styles.maxButtons}>
                      <button className={styles.zeroButton} type="button">
                        Set all levels to 0
                      </button>
                      <button className={styles.maxButton} type="button">
                        Set all to TH16 max
                      </button>
                      <button className={styles.maxButton} type="button">
                        Set all to max
                      </button>
                    </div>
                  </section>
                </>
              ) : null}
            </>
          ) : (
            <div className={styles.nextStageCard}>
              <p className={styles.nextStageLabel}>Stage</p>
              <h3>Saved successfully</h3>
              <p>Your player details are now stored in Supabase and local cache.</p>
              <button className={styles.backButton} type="button" onClick={() => setStage('loaded')}>
                Back to village loaded
              </button>
            </div>
          )}
        </article>
      ) : null}
    </section>
  )
}
