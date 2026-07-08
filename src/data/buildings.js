const createCopyUnlocks = (count, unlockedCount = 1) =>
  Array.from({ length: count }, (_, index) => index < unlockedCount)

export const BUILDING_SECTIONS = {
  defences: [
    { id: 'canon', name: 'Canon', image: '/src/assets/Defences/canon' },
    { id: 'archer_tower', name: 'Archer Tower', image: '/src/assets/Defences/Archer_Tower' },
    { id: 'mortar', name: 'Mortar', image: '/src/assets/Defences/mortar' },
    { id: 'wizard_tower', name: 'Wizard Tower', image: '/src/assets/Defences/wizard_tower' },
    { id: 'air_defense', name: 'Air Defense', image: '/src/assets/Defences/air_defense' },
    { id: 'inferno_tower', name: 'Inferno Tower', image: '/src/assets/Defences/Inferno_tower' },
    { id: 'x_bow', name: 'X-Bow', image: '/src/assets/Defences/x-bow' },
    { id: 'eagle_artillery', name: 'Eagle Artillery', image: '/src/assets/Defences/Eagle_Artillery' },
  ],
  traps: [
    { id: 'bomb', name: 'Bomb', image: '/src/assets/Traps/Bomb' },
    { id: 'air_bomb', name: 'Air Bomb', image: '/src/assets/Traps/Air_Bomb' },
    { id: 'spring_trap', name: 'Spring Trap', image: '/src/assets/Traps/Spring_Trap' },
  ],
  army: [
    { id: 'army_camp', name: 'Army Camp', image: '/src/assets/Army/Army_Camp' },
    { id: 'barracks', name: 'Barracks', image: '/src/assets/Army/Barracks' },
    { id: 'clan_castle', name: 'Clan Castle', image: '/src/assets/Army/clan_castle' },
    { id: 'spell_factory', name: 'Spell Factory', image: '/src/assets/Army/Spell_Factory' },
    { id: 'lab', name: 'Lab', image: '/src/assets/Army/Lab' },
    { id: 'hero_hall', name: 'Hero Hall', image: '/src/assets/Army/Hero_Hall' },
  ],
  resources: [
    { id: 'gold_mine', name: 'Gold Mine', image: '/src/assets/Resources/goldmine' },
    { id: 'elixir_collector', name: 'Elixir Collector', image: '/src/assets/Resources/elixir_collector' },
    { id: 'gold_storage', name: 'Gold Storage', image: '/src/assets/Resources/gold_storage' },
    { id: 'elixir_storage', name: 'Elixir Storage', image: '/src/assets/Resources/elixi_storage' },
  ],
  troops: [
    { id: 'barbarian', name: 'Barbarian', image: '/src/assets/Troops/Barbarian' },
    { id: 'archer', name: 'Archer', image: '/src/assets/Troops/Archer' },
    { id: 'giant', name: 'Giant', image: '/src/assets/Troops/Giant' },
    { id: 'goblin', name: 'Goblin', image: '/src/assets/Troops/Goblin' },
    { id: 'wall_breaker', name: 'Wall Breaker', image: '/src/assets/Troops/Wall_breaker' },
    { id: 'balloon', name: 'Balloon', image: '/src/assets/Troops/Ballon' },
    { id: 'wizard', name: 'Wizard', image: '/src/assets/Troops/wizard' },
  ],
  spells: [
    { id: 'lightning_spell', name: 'Lightning Spell', image: '/src/assets/spells/Lightning_Spell' },
  ],
  heroes: [
    { id: 'barbarian_king', name: 'Barbarian King', image: '/src/assets/Heros/Barbarian_King' },
    { id: 'archer_queen', name: 'Archer Queen', image: '/src/assets/Heros/Archer_Queen' },
    { id: 'grand_warden', name: 'Grand Warden', image: '/src/assets/Heros/Grand_Warden' },
    { id: 'royal_champion', name: 'Royal Champion', image: '/src/assets/Heros/Royal_Champion' },
    { id: 'minion_prince', name: 'Minion Prince', image: '/src/assets/Heros/Minion_Prince' },
    { id: 'dragon_duke', name: 'Dragon Duke', image: '/src/assets/Heros/Dragon_Duke' },
  ],
  walls: [
    { id: 'walls', name: 'Walls', image: '/src/assets/Walls' },
  ],
}

export const ADMIN_BUILDINGS_BY_CATEGORY = {
  defenses: BUILDING_SECTIONS.defences,
  traps: BUILDING_SECTIONS.traps,
  army: BUILDING_SECTIONS.army,
  resources: BUILDING_SECTIONS.resources,
  troops: BUILDING_SECTIONS.troops,
  spells: BUILDING_SECTIONS.spells,
  heroes: BUILDING_SECTIONS.heroes,
  walls: BUILDING_SECTIONS.walls,
}

export const ALL_BUILDINGS = [
  ...BUILDING_SECTIONS.defences,
  ...BUILDING_SECTIONS.traps,
  ...BUILDING_SECTIONS.army,
  ...BUILDING_SECTIONS.resources,
  ...BUILDING_SECTIONS.troops,
  ...BUILDING_SECTIONS.spells,
  ...BUILDING_SECTIONS.heroes,
  ...BUILDING_SECTIONS.walls,
]

export const TROOP_BUILDING_IDS = new Set(BUILDING_SECTIONS.troops.map((building) => building.id))
export const SPELL_BUILDING_IDS = new Set(BUILDING_SECTIONS.spells.map((building) => building.id))
export const HERO_BUILDING_IDS = new Set(BUILDING_SECTIONS.heroes.map((building) => building.id))

export const TROOP_BARRACKS_REQUIREMENTS = Object.fromEntries(
  BUILDING_SECTIONS.troops.map((building, index) => [building.id, index + 1]),
)

export const SPELL_FACTORY_REQUIREMENTS = Object.fromEntries(
  BUILDING_SECTIONS.spells.map((building, index) => [building.id, index + 1]),
)

export const getBuildingCategory = (buildingId) => {
  if (BUILDING_SECTIONS.defences.some((building) => building.id === buildingId)) return 'defences'
  if (BUILDING_SECTIONS.traps.some((building) => building.id === buildingId)) return 'traps'
  if (BUILDING_SECTIONS.army.some((building) => building.id === buildingId)) return 'army'
  if (BUILDING_SECTIONS.resources.some((building) => building.id === buildingId)) return 'resources'
  if (BUILDING_SECTIONS.troops.some((building) => building.id === buildingId)) return 'troops'
  if (BUILDING_SECTIONS.spells.some((building) => building.id === buildingId)) return 'spells'
  if (BUILDING_SECTIONS.heroes.some((building) => building.id === buildingId)) return 'heroes'
  if (BUILDING_SECTIONS.walls.some((building) => building.id === buildingId)) return 'walls'
  return 'defences'
}

export const getDefaultBuildingData = (townhallLevel) => {
  if (Number(townhallLevel) === 3) {
    return {
      lab: {
        id: 'lab',
        image_path: '/src/assets/Army/Lab/13_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 5000, resource: 'elixir', time: '1hr' },
        ],
      },
      mortar: {
        id: 'mortar',
        image_path: '/src/assets/Defences/mortar/23_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 4000, resource: 'gold', time: '30min' },
        ],
      },
      bomb: {
        id: 'bomb',
        image_path: '/src/assets/Traps/Bomb/27_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 200, resource: 'gold', time: '30sec' },
        ],
      },
      wall_breaker: {
        id: 'wall_breaker',
        image_path: '/src/assets/Troops/Wall_breaker/35_',
        copy_unlocks: [true],
        barracks_level_unlocked: 2,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec', lab_level_unlocked: 1 },
          { level: 2, cost: 1000, resource: 'elixir', time: '1min', lab_level_unlocked: 2 },
        ],
      },
    }
  }

  if (Number(townhallLevel) === 4) {
    return {
      air_defense: {
        id: 'air_defense',
        image_path: '/src/assets/Defences/air_defense/14_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 0, resource: 'gold', time: '0sec' },
        ],
      },
      hero_hall: {
        id: 'hero_hall',
        image_path: '/src/assets/Army/Hero_Hall/202_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec' },
        ],
      },
      spring_trap: {
        id: 'spring_trap',
        image_path: '/src/assets/Traps/Spring_Trap/30_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 2000, resource: 'gold', time: '1min' },
        ],
      },
      balloon: {
        id: 'balloon',
        image_path: '/src/assets/Troops/Ballon/36_',
        copy_unlocks: [true],
        barracks_level_unlocked: 6,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      barbarian_king: {
        id: 'barbarian_king',
        image_path: '/src/assets/Heros/Barbarian_King/61_',
        copy_unlocks: [true],
        hero_hall_level_unlocked: 1,
        levels: [
          { level: 1, cost: 0, resource: 'dark_elixir', time: '0sec', hero_hall_level_unlocked: 1 },
        ],
      },
    }
  }

  if (Number(townhallLevel) === 5) {
    return {
      lightning_spell: {
        id: 'lightning_spell',
        image_path: '/src/assets/spells/Lightning_Spell/43_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        spell_factory_level_unlocked: 1,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      spell_factory: {
        id: 'spell_factory',
        image_path: '/src/assets/Army/Spell_Factory/11_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec' },
        ],
      },
      air_bomb: {
        id: 'air_bomb',
        image_path: '/src/assets/Traps/Air_Bomb/26_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 0, resource: 'gold', time: '0sec' },
        ],
      },
      wizard_tower: {
        id: 'wizard_tower',
        image_path: '/src/assets/Defences/wizard_tower/24_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 0, resource: 'gold', time: '0sec' },
        ],
      },
      wizard: {
        id: 'wizard',
        image_path: '/src/assets/Troops/wizard/37_',
        copy_unlocks: [true],
        barracks_level_unlocked: 7,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
    }
  }

  if (Number(townhallLevel) !== 2) return {}

  return {
    canon: {
      id: 'canon',
      image_path: '/src/assets/Defences/canon/18_',
      buildings_unlocked: 2,
      copy_unlocks: createCopyUnlocks(2, 1),
      levels: [
        { level: 1, cost: 250, resource: 'gold', time: '5sec' },
        { level: 2, cost: 1000, resource: 'gold', time: '30sec' },
        { level: 3, cost: 4000, resource: 'gold', time: '2min' },
      ],
    },
    archer_tower: {
      id: 'archer_tower',
      image_path: '/src/assets/Defences/Archer_Tower/16_',
      buildings_unlocked: 1,
      copy_unlocks: createCopyUnlocks(1, 1),
      levels: [
        { level: 1, cost: 1000, resource: 'gold', time: '15sec' },
        { level: 2, cost: 2000, resource: 'gold', time: '2min' },
      ],
    },
    army_camp: {
      id: 'army_camp',
      image_path: '/src/assets/Army/Army_Camp/10_',
      buildings_unlocked: 1,
      copy_unlocks: createCopyUnlocks(1, 1),
      levels: [
        { level: 1, cost: 200, resource: 'elixir', time: '1min' },
        { level: 2, cost: 2000, resource: 'elixir', time: '5min' },
      ],
    },
    barracks: {
      id: 'barracks',
      image_path: '/src/assets/Army/Barracks/8_',
      buildings_unlocked: 1,
      copy_unlocks: createCopyUnlocks(1, 1),
      levels: [
        { level: 1, cost: 100, resource: 'elixir', time: '10sec' },
        { level: 2, cost: 500, resource: 'elixir', time: '15sec' },
        { level: 3, cost: 2500, resource: 'elixir', time: '2min' },
        { level: 4, cost: 5000, resource: 'elixir', time: '30min' },
      ],
    },
    clan_castle: {
      id: 'clan_castle',
      image_path: '/src/assets/Army/clan_castle/19_',
      buildings_unlocked: 1,
      copy_unlocks: createCopyUnlocks(1, 1),
      levels: [{ level: 1, cost: 10000, resource: 'elixir', time: '0sec' }],
    },
    gold_mine: {
      id: 'gold_mine',
      image_path: '/src/assets/Resources/goldmine/2_',
      buildings_unlocked: 2,
      copy_unlocks: createCopyUnlocks(2, 1),
      levels: [
        { level: 1, cost: 150, resource: 'elixir', time: '5sec' },
        { level: 2, cost: 300, resource: 'elixir', time: '15sec' },
        { level: 3, cost: 700, resource: 'elixir', time: '1min' },
        { level: 4, cost: 1400, resource: 'elixir', time: '2min' },
      ],
    },
    elixir_collector: {
      id: 'elixir_collector',
      image_path: '/src/assets/Resources/elixir_collector/3_',
      buildings_unlocked: 2,
      copy_unlocks: createCopyUnlocks(2, 1),
      levels: [
        { level: 1, cost: 150, resource: 'gold', time: '5sec' },
        { level: 2, cost: 300, resource: 'gold', time: '15sec' },
        { level: 3, cost: 700, resource: 'gold', time: '1min' },
        { level: 4, cost: 1400, resource: 'gold', time: '2min' },
      ],
    },
    gold_storage: {
      id: 'gold_storage',
      image_path: '/src/assets/Resources/gold_storage/5_',
      buildings_unlocked: 1,
      copy_unlocks: createCopyUnlocks(1, 1),
      levels: [
        { level: 1, cost: 300, resource: 'elixir', time: '10sec' },
        { level: 2, cost: 750, resource: 'elixir', time: '2min' },
        { level: 3, cost: 1500, resource: 'elixir', time: '5min' },
      ],
    },
    elixir_storage: {
      id: 'elixir_storage',
      image_path: '/src/assets/Resources/elixi_storage/6_',
      buildings_unlocked: 1,
      copy_unlocks: createCopyUnlocks(1, 1),
      levels: [
        { level: 1, cost: 300, resource: 'gold', time: '10sec' },
        { level: 2, cost: 750, resource: 'gold', time: '2min' },
        { level: 3, cost: 1500, resource: 'gold', time: '5min' },
      ],
    },
    walls: {
      id: 'walls',
      image_path: '/src/assets/Walls/60_',
      buildings_unlocked: 25,
      copy_unlocks: createCopyUnlocks(25, 1),
      levels: [
        { level: 1, cost: 0, resource: 'gold', time: '0sec' },
        { level: 2, cost: 1000, resource: 'gold', time: '0sec' },
      ],
    },
    barbarian: {
      id: 'barbarian',
      image_path: '/src/assets/Troops/Barbarian/31_',
      copy_unlocks: [true],
      barracks_level_unlocked: 1,
      levels: [
        { level: 1, cost: 0, resource: 'elixir', time: '0sec' },
        { level: 2, cost: 2000, resource: 'elixir', time: '1min' },
      ],
    },
    archer: {
      id: 'archer',
      image_path: '/src/assets/Troops/Archer/32_',
      copy_unlocks: [true],
      barracks_level_unlocked: 1,
      levels: [
        { level: 1, cost: 0, resource: 'elixir', time: '0sec' },
        { level: 2, cost: 300, resource: 'elixir', time: '1min' },
      ],
    },
    giant: {
      id: 'giant',
      image_path: '/src/assets/Troops/Giant/33_',
      copy_unlocks: [true],
      barracks_level_unlocked: 1,
      levels: [
        { level: 1, cost: 0, resource: 'elixir', time: '0sec' },
        { level: 2, cost: 2000, resource: 'elixir', time: '5min' },
      ],
    },
    goblin: {
      id: 'goblin',
      image_path: '/src/assets/Troops/Goblin/34_',
      copy_unlocks: [true],
      barracks_level_unlocked: 1,
      levels: [
        { level: 1, cost: 0, resource: 'elixir', time: '0sec' },
        { level: 2, cost: 1500, resource: 'elixir', time: '2min' },
      ],
    },
  }
}