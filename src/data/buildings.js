const createCopyUnlocks = (count, unlockedCount = 1) =>
  Array.from({ length: count }, (_, index) => index < unlockedCount)

const createEquipmentResourceCosts = (...entries) => entries.map(([resource, cost]) => ({ resource, cost }))

export const BUILDING_SECTIONS = {
  defences: [
    { id: 'canon', name: 'Canon', image: '/src/assets/Defences/canon' },
    { id: 'archer_tower', name: 'Archer Tower', image: '/src/assets/Defences/Archer_Tower' },
    { id: 'builder_hut', name: 'Builder Hut', image: '/src/assets/Defences/Builder_hut' },
    { id: 'mortar', name: 'Mortar', image: '/src/assets/Defences/mortar' },
    { id: 'bomb_tower', name: 'Bomb Tower', image: '/src/assets/Defences/Bomb_tower' },
    { id: 'wizard_tower', name: 'Wizard Tower', image: '/src/assets/Defences/wizard_tower' },
    { id: 'air_defense', name: 'Air Defense', image: '/src/assets/Defences/air_defense' },
    { id: 'air_sweeper', name: 'Air Sweeper', image: '/src/assets/Defences/air_sweeper' },
    { id: 'hidden_tesla', name: 'Hidden Tesla', image: '/src/assets/Defences/hidden_tesla' },
    { id: 'inferno_tower', name: 'Inferno Tower', image: '/src/assets/Defences/Inferno_tower' },
    { id: 'x_bow', name: 'X-Bow', image: '/src/assets/Defences/x-bow' },
    { id: 'eagle_artillery', name: 'Eagle Artillery', image: '/src/assets/Defences/Eagle_Artillery' },
    { id: 'scattershot', name: 'Scattershot', image: '/src/assets/Defences/scattershot' },
  ],
  traps: [
    { id: 'bomb', name: 'Bomb', image: '/src/assets/Traps/Bomb' },
    { id: 'giant_bomb', name: 'Giant Bomb', image: '/src/assets/Traps/Gaint_Bomb' },
    { id: 'skeleton_trap', name: 'Skeleton Trap', image: '/src/assets/Traps/Skeleton_Trap' },
    { id: 'air_bomb', name: 'Air Bomb', image: '/src/assets/Traps/Air_Bomb' },
    { id: 'seeking_air_mine', name: 'Seeking Air Mine', image: '/src/assets/Traps/Seeking_Air_Mine' },
    { id: 'spring_trap', name: 'Spring Trap', image: '/src/assets/Traps/Spring_Trap' },
    { id: 'tornado_trap', name: 'Tornado Trap', image: '/src/assets/Traps/Tornado_Trap' },
  ],
  army: [
    { id: 'army_camp', name: 'Army Camp', image: '/src/assets/Army/Army_Camp' },
    { id: 'barracks', name: 'Barracks', image: '/src/assets/Army/Barracks' },
    { id: 'dark_barracks', name: 'Dark Barracks', image: '/src/assets/Army/Dark_Barracks' },
    { id: 'clan_castle', name: 'Clan Castle', image: '/src/assets/Army/clan_castle' },
    { id: 'spell_factory', name: 'Spell Factory', image: '/src/assets/Army/Spell_Factory' },
    { id: 'dark_spell_factory', name: 'Dark Spell Factory', image: '/src/assets/Army/Dark_Spell_Factory' },
    { id: 'workshop', name: 'Workshop', image: '/src/assets/Army/Workshop' },
    { id: 'lab', name: 'Lab', image: '/src/assets/Army/Lab' },
    { id: 'hero_hall', name: 'Hero Hall', image: '/src/assets/Army/Hero_Hall' },
    { id: 'pet_house', name: 'Pet House', image: '/src/assets/Army/Pet_House' },
    { id: 'blacksmith', name: 'Blacksmith', image: '/src/assets/Army/Blacksmith' },
  ],
  resources: [
    { id: 'gold_mine', name: 'Gold Mine', image: '/src/assets/Resources/goldmine' },
    { id: 'elixir_collector', name: 'Elixir Collector', image: '/src/assets/Resources/elixir_collector' },
    { id: 'gold_storage', name: 'Gold Storage', image: '/src/assets/Resources/gold_storage' },
    { id: 'elixir_storage', name: 'Elixir Storage', image: '/src/assets/Resources/elixi_storage' },
    { id: 'dark_elixir_driller', name: 'Dark Elixir Drill', image: '/src/assets/Resources/dark_elixir_driller' },
    { id: 'dark_elixir_storage', name: 'Dark Elixir Storage', image: '/src/assets/Resources/dark_elixir_storage' },
    { id: 'helper_hut', name: 'Helper Hut', image: '/src/assets/Resources/Helper_hut' },
  ],
  troops: [
    { id: 'barbarian', name: 'Barbarian', image: '/src/assets/Troops/Barbarian' },
    { id: 'archer', name: 'Archer', image: '/src/assets/Troops/Archer' },
    { id: 'giant', name: 'Giant', image: '/src/assets/Troops/Giant' },
    { id: 'goblin', name: 'Goblin', image: '/src/assets/Troops/Goblin' },
    { id: 'wall_breaker', name: 'Wall Breaker', image: '/src/assets/Troops/Wall_breaker' },
    { id: 'balloon', name: 'Balloon', image: '/src/assets/Troops/Ballon' },
    { id: 'wizard', name: 'Wizard', image: '/src/assets/Troops/wizard' },
    { id: 'healer', name: 'Healer', image: '/src/assets/Troops/Healer' },
    { id: 'dragon', name: 'Dragon', image: '/src/assets/Troops/Dragon' },
    { id: 'pekka', name: 'P.E.K.K.A', image: '/src/assets/Troops/P.E.K.K.A' },
    { id: 'baby_dragon', name: 'Baby Dragon', image: '/src/assets/Troops/Baby_Dragon' },
    { id: 'miner', name: 'Miner', image: '/src/assets/Troops/Miner' },
    { id: 'electro_dragon', name: 'Electro Dragon', image: '/src/assets/Troops/Electro_Dragon' },
    { id: 'yeti', name: 'Yeti', image: '/src/assets/Troops/Yeti' },
    { id: 'dragon_rider', name: 'Dragon Rider', image: '/src/assets/Troops/DragonRider' },
    { id: 'electro_titan', name: 'Electro Titan', image: '/src/assets/Troops/Electro_Titan' },
  ],
  spells: [
    { id: 'lightning_spell', name: 'Lightning Spell', image: '/src/assets/spells/Lightning_Spell' },
    { id: 'healing_spell', name: 'Healing Spell', image: '/src/assets/spells/Healing_Spell' },
    { id: 'rage_spell', name: 'Rage Spell', image: '/src/assets/spells/Rage_Spell' },
    { id: 'jump_spell', name: 'Jump Spell', image: '/src/assets/spells/Jump_Spell' },
    { id: 'freeze_spell', name: 'Freeze Spell', image: '/src/assets/spells/Freeze_Spell' },
    { id: 'clone_spell', name: 'Clone Spell', image: '/src/assets/spells/Clone_Spell' },
    { id: 'invisibility_spell', name: 'Invisibility Spell', image: '/src/assets/spells/Invisibility_Spell' },
    { id: 'recall_spell', name: 'Recall Spell', image: '/src/assets/spells/Recall_Spell' },
  ],
  dark_spells: [
    { id: 'poison_spell', name: 'Poison Spell', image: '/src/assets/spells/Poison_Spell' },
    { id: 'earthquake_spell', name: 'Earthquake Spell', image: '/src/assets/spells/Earthquake_Spell' },
    { id: 'haste_spell', name: 'Haste Spell', image: '/src/assets/spells/Haste_Spell' },
    { id: 'skeleton_spell', name: 'Skeleton Spell', image: '/src/assets/spells/Skeleton_Spell' },
    { id: 'bat_spell', name: 'Bat Spell', image: '/src/assets/spells/Bat_spell' },
    { id: 'overgrowth_spell', name: 'Overgrowth Spell', image: '/src/assets/spells/Overgrowth_Spell' },
    { id: 'ice_block_spell', name: 'Ice Block Spell', image: '/src/assets/spells/Ice_Block_spell' },
  ],
  dark_troops: [
    { id: 'minion', name: 'Minion', image: '/src/assets/Dark_Troops/Minion' },
    { id: 'hog_rider', name: 'Hog Rider', image: '/src/assets/Dark_Troops/Hog_rider' },
    { id: 'valkyrie', name: 'Valkyrie', image: '/src/assets/Dark_Troops/Valkyrie' },
    { id: 'golem', name: 'Golem', image: '/src/assets/Dark_Troops/Golem' },
    { id: 'witch', name: 'Witch', image: '/src/assets/Dark_Troops/Witch' },
    { id: 'lava_hound', name: 'Lava Hound', image: '/src/assets/Dark_Troops/Lava_Hound' },
    { id: 'bowler', name: 'Bowler', image: '/src/assets/Dark_Troops/Bowler' },
    { id: 'ice_golem', name: 'Ice Golem', image: '/src/assets/Dark_Troops/Ice_Golem' },
    { id: 'head_hunter', name: 'Head Hunter', image: '/src/assets/Dark_Troops/HeadHunter' },
    { id: 'apprentice_warden', name: 'Apprentice Warden', image: '/src/assets/Dark_Troops/Apprentice_Warden' },
    { id: 'druid', name: 'Druid', image: '/src/assets/Dark_Troops/Druid' },
  ],
  sieges: [
    { id: 'wall_wrecker', name: 'Wall Wrecker', image: '/src/assets/Seige_machines/Wall_Wrecker' },
    { id: 'battle_blimp', name: 'Battle Blimp', image: '/src/assets/Seige_machines/Battle_Blimp' },
    { id: 'stone_slammer', name: 'Stone Slammer', image: '/src/assets/Seige_machines/Stone_Slammer' },
    { id: 'siege_barracks', name: 'Siege Barracks', image: '/src/assets/Seige_machines/Siege_Barracks' },
    { id: 'log_launcher', name: 'Log Launcher', image: '/src/assets/Seige_machines/Log_Launcher' },
    { id: 'flame_flinger', name: 'Flame Flinger', image: '/src/assets/Seige_machines/Flame_Flinger' },
    { id: 'battle_drill', name: 'Battle Drill', image: '/src/assets/Seige_machines/Battle_Drill' },
    { id: 'troop_launcher', name: 'Troop Launcher', image: '/src/assets/Seige_machines/Troop_Launcher' },
  ],
  heroes: [
    { id: 'barbarian_king', name: 'Barbarian King', image: '/src/assets/Heros/Barbarian_King' },
    { id: 'archer_queen', name: 'Archer Queen', image: '/src/assets/Heros/Archer_Queen' },
    { id: 'grand_warden', name: 'Grand Warden', image: '/src/assets/Heros/Grand_Warden' },
    { id: 'royal_champion', name: 'Royal Champion', image: '/src/assets/Heros/Royal_Champion' },
    { id: 'minion_prince', name: 'Minion Prince', image: '/src/assets/Heros/Minion_Prince' },
    { id: 'dragon_duke', name: 'Dragon Duke', image: '/src/assets/Heros/Dragon_Duke' },
  ],
  pets: [
    { id: 'lassi', name: 'L.A.S.S.I', image: '/src/assets/pets/L.A.S.S.I' },
  ],
  equipment: [
    { id: 'barbarian_puppet', name: 'Barbarian Puppet', hero: 'Barbarian King', image: '/src/assets/Equipment/Barbarian_King/Barbarian_puppet/157.png', levelCount: 4, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'active', equipment_rarity: 'common' },
    { id: 'rage_vial', name: 'Rage Vial', hero: 'Barbarian King', image: '/src/assets/Equipment/Barbarian_King/Rage_Vial/158.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'active', equipment_rarity: 'epic' },
    { id: 'earthquake_boots', name: 'Earthquake Boots', hero: 'Barbarian King', image: '/src/assets/Equipment/Barbarian_King/Earthquake_Boots/159.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'passive', equipment_rarity: 'common' },
    { id: 'vampstache', name: 'Vampstache', hero: 'Barbarian King', image: '/src/assets/Equipment/Barbarian_King/Vampstache/160.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'passive', equipment_rarity: 'common' },
    { id: 'giant_gauntlet', name: 'Giant Gauntlet', hero: 'Barbarian King', image: '/src/assets/Equipment/Barbarian_King/Gaint_Gauntlet/171.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'active', equipment_rarity: 'epic' },
    { id: 'spiky_ball', name: 'Spiky Ball', hero: 'Barbarian King', image: '/src/assets/Equipment/Barbarian_King/Spiky_Ball/194.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'active', equipment_rarity: 'epic' },
    { id: 'snake_bracelet', name: 'Snake Bracelet', hero: 'Barbarian King', image: '/src/assets/Equipment/Barbarian_King/Snake_Bracelet/213.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'passive', equipment_rarity: 'common' },
    { id: 'stick_horse', name: 'Stick Horse', hero: 'Barbarian King', image: '/src/assets/Equipment/Barbarian_King/Stick_Horse/258.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'passive', equipment_rarity: 'common' },
    { id: 'archer_puppet', name: 'Archer Puppet', hero: 'Archer Queen', image: '/src/assets/Equipment/Archer_Queen/Archer_Puppet/161.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'active', equipment_rarity: 'common' },
    { id: 'invisibility_vial', name: 'Invisibility Vial', hero: 'Archer Queen', image: '/src/assets/Equipment/Archer_Queen/Invisibility_vial/162.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'active', equipment_rarity: 'common' },
    { id: 'giant_arrow', name: 'Giant Arrow', hero: 'Archer Queen', image: '/src/assets/Equipment/Archer_Queen/Giant_Arrow/163.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'active', equipment_rarity: 'epic' },
    { id: 'healer_puppet', name: 'Healer Puppet', hero: 'Archer Queen', image: '/src/assets/Equipment/Archer_Queen/Healer_Puppet/164.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'active', equipment_rarity: 'common' },
    { id: 'frozen_arrow', name: 'Frozen Arrow', hero: 'Archer Queen', image: '/src/assets/Equipment/Archer_Queen/Fronzen_Arrow/172.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'active', equipment_rarity: 'epic' },
    { id: 'magic_mirror', name: 'Magic Mirror', hero: 'Archer Queen', image: '/src/assets/Equipment/Archer_Queen/Magic_Mirror/198.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'active', equipment_rarity: 'epic' },
    { id: 'action_figure', name: 'Action Figure', hero: 'Archer Queen', image: '/src/assets/Equipment/Archer_Queen/Action_Figure/220.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'passive', equipment_rarity: 'common' },
    { id: 'monolith_arrow', name: 'Monolith Arrow', hero: 'Archer Queen', image: '/src/assets/Equipment/Archer_Queen/Monolith_Arrow/280.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'active', equipment_rarity: 'epic' },
    { id: 'dark_orb', name: 'Dark Orb', hero: 'Minion Prince', image: '/src/assets/Equipment/Minion_Prince/Dark_Orb/209.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'active', equipment_rarity: 'common' },
    { id: 'henchmen_puppet', name: 'Henchmen Puppet', hero: 'Minion Prince', image: '/src/assets/Equipment/Minion_Prince/Henchmen_Puppet/210.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'active', equipment_rarity: 'common' },
    { id: 'metal_pants', name: 'Metal Pants', hero: 'Minion Prince', image: '/src/assets/Equipment/Minion_Prince/Metal_pants/216_0.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'passive', equipment_rarity: 'common' },
    { id: 'noble_iron', name: 'Noble Iron', hero: 'Minion Prince', image: '/src/assets/Equipment/Minion_Prince/Noble_Iron/219_0.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'passive', equipment_rarity: 'common' },
    { id: 'dark_crown', name: 'Dark Crown', hero: 'Minion Prince', image: '/src/assets/Equipment/Minion_Prince/Dark_Crown/222.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'passive', equipment_rarity: 'common' },
    { id: 'meteor_staff', name: 'Meteor Staff', hero: 'Minion Prince', image: '/src/assets/Equipment/Minion_Prince/Meteor_Staff/238.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'active', equipment_rarity: 'epic' },
    { id: 'eternal_tome', name: 'Eternal Tome', hero: 'Grand Warden', image: '/src/assets/Equipment/Grand_Warden/Eternal_Tome/165.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'active', equipment_rarity: 'common' },
    { id: 'life_gem', name: 'Life Gem', hero: 'Grand Warden', image: '/src/assets/Equipment/Grand_Warden/Life_Gem/166.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'passive', equipment_rarity: 'common' },
    { id: 'healing_tome', name: 'Healing Tome', hero: 'Grand Warden', image: '/src/assets/Equipment/Grand_Warden/Healing_Tome/167.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'active', equipment_rarity: 'common' },
    { id: 'heroic_torch', name: 'Heroic Torch', hero: 'Grand Warden', image: '/src/assets/Equipment/Grand_Warden/Heroic_Torch/237.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'active', equipment_rarity: 'epic' },
    { id: 'fireball', name: 'Fireball', hero: 'Grand Warden', image: '/src/assets/Equipment/Grand_Warden/Fireball/176.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'active', equipment_rarity: 'epic' },
    { id: 'lavaloon_puppet', name: 'Lavaloon Puppet', hero: 'Grand Warden', image: '/src/assets/Equipment/Grand_Warden/Lavaloon_Puppet/199.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'active', equipment_rarity: 'epic' },
    { id: 'rage_gem', name: 'Rage Gem', hero: 'Grand Warden', image: '/src/assets/Equipment/Grand_Warden/Rage_Gem/168.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'passive', equipment_rarity: 'common' },
    { id: 'royal_gem', name: 'Royal Gem', hero: 'Royal Champion', image: '/src/assets/Equipment/Royal_Champion/Royal_Gem/169.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'passive', equipment_rarity: 'common' },
    { id: 'seeking_shield', name: 'Seeking Shield', hero: 'Royal Champion', image: '/src/assets/Equipment/Royal_Champion/Seeking_Shield/170.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'active', equipment_rarity: 'common' },
    { id: 'hog_rider_puppet', name: 'Hog Rider Puppet', hero: 'Royal Champion', image: '/src/assets/Equipment/Royal_Champion/Hog_Rider_Puppet/173.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'active', equipment_rarity: 'common' },
    { id: 'rocket_spear', name: 'Rocket Spear', hero: 'Royal Champion', image: '/src/assets/Equipment/Royal_Champion/Rocket_Spear/195.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'active', equipment_rarity: 'epic' },
    { id: 'electro_boots', name: 'Electro Boots', hero: 'Royal Champion', image: '/src/assets/Equipment/Royal_Champion/Electro_Boots/211.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'passive', equipment_rarity: 'common' },
    { id: 'frost_flake', name: 'Frost Flake', hero: 'Royal Champion', image: '/src/assets/Equipment/Royal_Champion/Frost_Flake/257.png', levelCount: 1, unlock_source: 'blacksmith', blacksmith_level_unlocked: 1, equipment_type: 'passive', equipment_rarity: 'common' },
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
  dark_spells: BUILDING_SECTIONS.dark_spells,
  dark_troops: BUILDING_SECTIONS.dark_troops,
  sieges: BUILDING_SECTIONS.sieges,
  heroes: BUILDING_SECTIONS.heroes,
  pets: BUILDING_SECTIONS.pets,
  equipment: BUILDING_SECTIONS.equipment,
  walls: BUILDING_SECTIONS.walls,
}

export const ALL_BUILDINGS = [
  ...BUILDING_SECTIONS.defences,
  ...BUILDING_SECTIONS.traps,
  ...BUILDING_SECTIONS.army,
  ...BUILDING_SECTIONS.resources,
  ...BUILDING_SECTIONS.troops,
  ...BUILDING_SECTIONS.spells,
  ...BUILDING_SECTIONS.dark_spells,
  ...BUILDING_SECTIONS.dark_troops,
  ...BUILDING_SECTIONS.sieges,
  ...BUILDING_SECTIONS.heroes,
  ...BUILDING_SECTIONS.pets,
  ...BUILDING_SECTIONS.walls,
]

export const TROOP_BUILDING_IDS = new Set(BUILDING_SECTIONS.troops.map((building) => building.id))
export const DARK_TROOP_BUILDING_IDS = new Set(BUILDING_SECTIONS.dark_troops.map((building) => building.id))
export const SIEGE_BUILDING_IDS = new Set(BUILDING_SECTIONS.sieges.map((building) => building.id))
export const SPELL_BUILDING_IDS = new Set([
  ...BUILDING_SECTIONS.spells.map((building) => building.id),
  ...BUILDING_SECTIONS.dark_spells.map((building) => building.id),
])
export const DARK_SPELL_BUILDING_IDS = new Set(BUILDING_SECTIONS.dark_spells.map((building) => building.id))
export const HERO_BUILDING_IDS = new Set(BUILDING_SECTIONS.heroes.map((building) => building.id))
export const PET_BUILDING_IDS = new Set(BUILDING_SECTIONS.pets.map((building) => building.id))
export const EQUIPMENT_BUILDING_IDS = new Set(BUILDING_SECTIONS.equipment.map((building) => building.id))

export const TROOP_BARRACKS_REQUIREMENTS = Object.fromEntries(
  BUILDING_SECTIONS.troops.map((building, index) => [building.id, index + 1]),
)

export const DARK_TROOP_BARRACKS_REQUIREMENTS = Object.fromEntries(
  BUILDING_SECTIONS.dark_troops.map((building, index) => [building.id, index + 1]),
)

export const SIEGE_WORKSHOP_REQUIREMENTS = Object.fromEntries(
  BUILDING_SECTIONS.sieges.map((building, index) => [building.id, index + 1]),
)

export const PET_HOUSE_REQUIREMENTS = Object.fromEntries(
  BUILDING_SECTIONS.pets.map((building, index) => [building.id, index + 1]),
)

export const SPELL_FACTORY_REQUIREMENTS = Object.fromEntries(
  BUILDING_SECTIONS.spells.map((building, index) => [building.id, index + 1]),
)

export const DARK_SPELL_FACTORY_REQUIREMENTS = Object.fromEntries(
  BUILDING_SECTIONS.dark_spells.map((building, index) => [building.id, index + 1]),
)

export const getBuildingCategory = (buildingId) => {
  if (BUILDING_SECTIONS.defences.some((building) => building.id === buildingId)) return 'defences'
  if (BUILDING_SECTIONS.traps.some((building) => building.id === buildingId)) return 'traps'
  if (BUILDING_SECTIONS.army.some((building) => building.id === buildingId)) return 'army'
  if (BUILDING_SECTIONS.resources.some((building) => building.id === buildingId)) return 'resources'
  if (BUILDING_SECTIONS.troops.some((building) => building.id === buildingId)) return 'troops'
  if (BUILDING_SECTIONS.dark_spells.some((building) => building.id === buildingId)) return 'spells'
  if (BUILDING_SECTIONS.spells.some((building) => building.id === buildingId)) return 'spells'
  if (BUILDING_SECTIONS.dark_troops.some((building) => building.id === buildingId)) return 'dark_troops'
  if (BUILDING_SECTIONS.sieges.some((building) => building.id === buildingId)) return 'sieges'
  if (BUILDING_SECTIONS.heroes.some((building) => building.id === buildingId)) return 'heroes'
  if (BUILDING_SECTIONS.pets.some((building) => building.id === buildingId)) return 'pets'
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

  if (Number(townhallLevel) === 6) {
    return {
      air_sweeper: {
        id: 'air_sweeper',
        image_path: '/src/assets/Defences/air_sweeper/15_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 0, resource: 'gold', time: '0sec' },
          { level: 2, cost: 5000, resource: 'gold', time: '30min' },
          { level: 3, cost: 25000, resource: 'gold', time: '2hr' },
          { level: 4, cost: 50000, resource: 'gold', time: '4hr' },
          { level: 5, cost: 100000, resource: 'gold', time: '6hr' },
          { level: 6, cost: 200000, resource: 'gold', time: '8hr' },
          { level: 7, cost: 400000, resource: 'gold', time: '12hr' },
        ],
      },
      giant_bomb: {
        id: 'giant_bomb',
        image_path: '/src/assets/Traps/Gaint_Bomb/28_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 5000, resource: 'gold', time: '1hr' },
          { level: 2, cost: 10000, resource: 'gold', time: '2hr' },
          { level: 3, cost: 20000, resource: 'gold', time: '4hr' },
          { level: 4, cost: 40000, resource: 'gold', time: '6hr' },
          { level: 5, cost: 80000, resource: 'gold', time: '8hr' },
          { level: 6, cost: 160000, resource: 'gold', time: '10hr' },
          { level: 7, cost: 320000, resource: 'gold', time: '12hr' },
        ],
      },
      healer: {
        id: 'healer',
        image_path: '/src/assets/Troops/Healer/38_',
        copy_unlocks: [true],
        barracks_level_unlocked: 8,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      healing_spell: {
        id: 'healing_spell',
        image_path: '/src/assets/spells/Healing_Spell/44_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        spell_factory_level_unlocked: 2,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
    }
  }

  if (Number(townhallLevel) === 7) {
    return {
      dark_barracks: {
        id: 'dark_barracks',
        image_path: '/src/assets/Army/Dark_Barracks/9_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec' },
          { level: 2, cost: 25000, resource: 'elixir', time: '2hr' },
          { level: 3, cost: 60000, resource: 'elixir', time: '4hr' },
          { level: 4, cost: 120000, resource: 'elixir', time: '6hr' },
          { level: 5, cost: 250000, resource: 'elixir', time: '8hr' },
          { level: 6, cost: 500000, resource: 'elixir', time: '12hr' },
          { level: 7, cost: 900000, resource: 'elixir', time: '16hr' },
        ],
      },
      minion: {
        id: 'minion',
        image_path: '/src/assets/Dark_Troops/Minion/53_',
        buildings_unlocked: 1,
        copy_unlocks: [true],
        dark_barracks_level_unlocked: 1,
        levels: [
          { level: 1, cost: 0, resource: 'dark_elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      hog_rider: {
        id: 'hog_rider',
        image_path: '/src/assets/Dark_Troops/Hog_rider/54_',
        copy_unlocks: [true],
        dark_barracks_level_unlocked: 2,
        levels: [
          { level: 1, cost: 0, resource: 'dark_elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      dragon: {
        id: 'dragon',
        image_path: '/src/assets/Troops/Dragon/39_',
        buildings_unlocked: 1,
        copy_unlocks: [true],
        barracks_level_unlocked: 9,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      rage_spell: {
        id: 'rage_spell',
        image_path: '/src/assets/spells/Rage_Spell/45_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        spell_factory_level_unlocked: 3,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      dark_elixir_driller: {
        id: 'dark_elixir_driller',
        image_path: '/src/assets/Resources/dark_elixir_driller/4_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec' },
        ],
      },
      dark_elixir_storage: {
        id: 'dark_elixir_storage',
        image_path: '/src/assets/Resources/dark_elixir_storage/7_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec' },
        ],
      },
      hidden_tesla: {
        id: 'hidden_tesla',
        image_path: '/src/assets/Defences/hidden_tesla/21_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 0, resource: 'gold', time: '0sec' },
        ],
      },
      seeking_air_mine: {
        id: 'seeking_air_mine',
        image_path: '/src/assets/Traps/Seeking_Air_Mine/29_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 0, resource: 'gold', time: '0sec' },
        ],
      },
    }
  }

  if (Number(townhallLevel) === 8) {
    return {
      bomb_tower: {
        id: 'bomb_tower',
        image_path: '/src/assets/Defences/Bomb_tower/17_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 0, resource: 'gold', time: '0sec' },
        ],
      },
      skeleton_trap: {
        id: 'skeleton_trap',
        image_path: '/src/assets/Traps/Skeleton_Trap/64_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 0, resource: 'gold', time: '0sec' },
        ],
      },
      archer_queen: {
        id: 'archer_queen',
        image_path: '/src/assets/Heros/Archer_Queen/62_',
        copy_unlocks: [true],
        hero_hall_level_unlocked: 1,
        levels: [
          { level: 1, cost: 0, resource: 'dark_elixir', time: '0sec', hero_hall_level_unlocked: 1 },
        ],
      },
      blacksmith: {
        id: 'blacksmith',
        image_path: '/src/assets/Army/Blacksmith/152_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec' },
          { level: 2, cost: 500000, resource: 'elixir', time: '1hr' },
          { level: 3, cost: 1000000, resource: 'elixir', time: '2hr' },
          { level: 4, cost: 2000000, resource: 'elixir', time: '4hr' },
          { level: 5, cost: 4000000, resource: 'elixir', time: '8hr' },
          { level: 6, cost: 8000000, resource: 'elixir', time: '12hr' },
          { level: 7, cost: 12000000, resource: 'elixir', time: '18hr' },
          { level: 8, cost: 16000000, resource: 'elixir', time: '1d' },
          { level: 9, cost: 20000000, resource: 'elixir', time: '1d 12hr' },
        ],
      },
      dark_spell_factory: {
        id: 'dark_spell_factory',
        image_path: '/src/assets/Army/Dark_Spell_Factory/12_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec' },
        ],
      },
      poison_spell: {
        id: 'poison_spell',
        image_path: '/src/assets/spells/Poison_Spell/49_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        dark_spell_factory_level_unlocked: 1,
        levels: [
          { level: 1, cost: 0, resource: 'dark_elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      earthquake_spell: {
        id: 'earthquake_spell',
        image_path: '/src/assets/spells/Earthquake_Spell/50_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        dark_spell_factory_level_unlocked: 2,
        levels: [
          { level: 1, cost: 0, resource: 'dark_elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      valkyrie: {
        id: 'valkyrie',
        image_path: '/src/assets/Dark_Troops/Valkyrie/55_',
        copy_unlocks: [true],
        dark_barracks_level_unlocked: 3,
        levels: [
          { level: 1, cost: 0, resource: 'dark_elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      golem:{
        id: 'golem',
        image_path: '/src/assets/Troops/Golem/41_',
        copy_unlocks: [true],
        dark_barracks_level_unlocked: 4,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      pekka: {
        id: 'pekka',
        image_path: '/src/assets/Troops/P.E.K.K.A/40_',
        copy_unlocks: [true],
        barracks_level_unlocked: 10,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      barbarian_puppet: {
        id: 'barbarian_puppet',
        image_path: '/src/assets/Equipment/Barbarian_King/Barbarian_puppet/157.png',
        hero: 'Barbarian King',
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'active',
        equipment_rarity: 'common',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
          { level: 2, cost: 1800, resource: 'shiny_ore', resource_options: ['shiny_ore'], resource_costs: createEquipmentResourceCosts(['shiny_ore', 1800]), time: '0sec' },
          { level: 3, cost: 2300, resource: 'shiny_ore', resource_options: ['glowy_ore', 'shiny_ore'], resource_costs: createEquipmentResourceCosts(['shiny_ore', 2200], ['glowy_ore', 100]), time: '0sec' },
          { level: 4, cost: 5000, resource: 'starry_ore', resource_options: ['starry_ore'], resource_costs: createEquipmentResourceCosts(['starry_ore', 5000]), time: '0sec' },
        ],
      },
      rage_vial: {
        id: 'rage_vial',
        image_path: '/src/assets/Equipment/Barbarian_King/Rage_Vial/158.png',
        hero: 'Barbarian King',
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'active',
        equipment_rarity: 'epic',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
      earthquake_boots: {
        id: 'earthquake_boots',
        image_path: '/src/assets/Equipment/Barbarian_King/Earthquake_Boots/159.png',
        hero: 'Barbarian King',
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'passive',
        equipment_rarity: 'common',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
      giant_gauntlet: {
        id: 'giant_gauntlet',
        image_path: '/src/assets/Equipment/Barbarian_King/Gaint_Gauntlet/171.png',
        hero: 'Barbarian King',
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'active',
        equipment_rarity: 'epic',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
      spiky_ball: {
        id: 'spiky_ball',
        image_path: '/src/assets/Equipment/Barbarian_King/Spiky_Ball/194.png',
        hero: 'Barbarian King',
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'active',
        equipment_rarity: 'epic',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
      snake_bracelet: {
        id: 'snake_bracelet',
        image_path: '/src/assets/Equipment/Barbarian_King/Snake_Bracelet/213.png',
        hero: 'Barbarian King',
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'passive',
        equipment_rarity: 'common',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
      stick_horse: {
        id: 'stick_horse',
        image_path: '/src/assets/Equipment/Barbarian_King/Stick_Horse/258.png',
        hero: 'Barbarian King',
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'passive',
        equipment_rarity: 'common',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
      archer_puppet: {
        id: 'archer_puppet',
        image_path: '/src/assets/Equipment/Archer_Queen/Archer_Puppet/161.png',
        hero: 'Archer Queen',
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'active',
        equipment_rarity: 'common',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
      invisibility_vial: {
        id: 'invisibility_vial',
        image_path: '/src/assets/Equipment/Archer_Queen/Invisibility_vial/162.png',
        hero: 'Archer Queen',
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'active',
        equipment_rarity: 'common',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
      frozen_arrow: {
        id: 'frozen_arrow',
        image_path: '/src/assets/Equipment/Archer_Queen/Fronzen_Arrow/172.png',
        hero: 'Archer Queen',
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'active',
        equipment_rarity: 'epic',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
      magic_mirror: {
        id: 'magic_mirror',
        image_path: '/src/assets/Equipment/Archer_Queen/Magic_Mirror/198.png',
        hero: 'Archer Queen',
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'active',
        equipment_rarity: 'epic',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
      action_figure: {
        id: 'action_figure',
        image_path: '/src/assets/Equipment/Archer_Queen/Action_Figure/220.png',
        hero: 'Archer Queen',
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'passive',
        equipment_rarity: 'common',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
      monolith_arrow: {
        id: 'monolith_arrow',
        image_path: '/src/assets/Equipment/Archer_Queen/Monolith_Arrow/280.png',
        hero: 'Archer Queen',
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'active',
        equipment_rarity: 'epic',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
    }
  }

  if (Number(townhallLevel) === 9) {
    return {
      helper_hut:{
        id: 'helper_hut',
        image_path: '/src/assets/Resources/Helper_hut/206_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec' },
        ],
      },
      x_bow: {
        id: 'x_bow',
        image_path: '/src/assets/Defences/x-bow/25_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 0, resource: 'gold', time: '0sec' },
        ],
      },
      baby_dragon: {
        id: 'baby_dragon',
        image_path: '/src/assets/Troops/Baby_Dragon/41_',
        copy_unlocks: [true],
        barracks_level_unlocked: 11,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      witch: {
        id: 'witch',
        image_path: '/src/assets/Dark_Troops/Witch/57_',
        copy_unlocks: [true],
        dark_barracks_level_unlocked: 5,
        levels: [
          { level: 1, cost: 0, resource: 'dark_elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      lava_hound: {
        id: 'lava_hound',
        image_path: '/src/assets/Dark_Troops/Lava_Hound/56_',
        copy_unlocks: [true],
        dark_barracks_level_unlocked: 6,
        levels: [
          { level: 1, cost: 0, resource: 'dark_elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      jump_spell: {
        id: 'jump_spell',
        image_path: '/src/assets/spells/Jump_Spell/46_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        spell_factory_level_unlocked: 4,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      freeze_spell: {
        id: 'freeze_spell',
        image_path: '/src/assets/spells/Freeze_Spell/47_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        spell_factory_level_unlocked: 5,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      haste_spell: {
        id: 'haste_spell',
        image_path: '/src/assets/spells/Haste_Spell/51_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        dark_spell_factory_level_unlocked: 3,
        levels: [
          { level: 1, cost: 0, resource: 'dark_elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      skeleton_spell: {
        id: 'skeleton_spell',
        image_path: '/src/assets/spells/Skeleton_Spell/52_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        dark_spell_factory_level_unlocked: 4,
        levels: [
          { level: 1, cost: 0, resource: 'dark_elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      minion_prince: {
        id: 'minion_prince',
        image_path: '/src/assets/Heros/Minion_Prince/208_',
        copy_unlocks: [true],
        hero_hall_level_unlocked: 1,
        levels: [
          { level: 1, cost: 0, resource: 'dark_elixir', time: '0sec', hero_hall_level_unlocked: 1 },
        ],
      },
      giant_arrow: {
        id: 'giant_arrow',
        image_path: '/src/assets/Equipment/Archer_Queen/Giant_Arrow/163.png',
        hero: 'Archer Queen',
        priority: 3,
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'active',
        equipment_rarity: 'epic',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
      dark_orb: {
        id: 'dark_orb',
        image_path: '/src/assets/Equipment/Minion_Prince/Dark_Orb/209.png',
        hero: 'Minion Prince',
        priority: 1,
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'active',
        equipment_rarity: 'common',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
      henchmen_puppet: {
        id: 'henchmen_puppet',
        image_path: '/src/assets/Equipment/Minion_Prince/Henchmen_Puppet/210.png',
        hero: 'Minion Prince',
        priority: 2,
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'active',
        equipment_rarity: 'common',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
      dark_crown: {
        id: 'dark_crown',
        image_path: '/src/assets/Equipment/Minion_Prince/Dark_Crown/222.png',
        hero: 'Minion Prince',
        priority: 3,
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'passive',
        equipment_rarity: 'common',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
      meteor_staff: {
        id: 'meteor_staff',
        image_path: '/src/assets/Equipment/Minion_Prince/Meteor_Staff/238.png',
        hero: 'Minion Prince',
        priority: 4,
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'active',
        equipment_rarity: 'epic',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
    }
  }
  if (Number(townhallLevel) === 10) {
    return {
      inferno_tower: {
        id: 'inferno_tower',
        image_path: '/src/assets/Defences/Inferno_tower/22_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 0, resource: 'gold', time: '0sec' },
        ],
      },
      miner: {
        id: 'miner',
        image_path: '/src/assets/Troops/Miner/42_',
        copy_unlocks: [true],
        barracks_level_unlocked: 12,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      clone_spell: {
        id: 'clone_spell',
        image_path: '/src/assets/spells/Clone_Spell/48_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        spell_factory_level_unlocked: 6,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      bat_spell: {
        id: 'bat_spell',
        image_path: '/src/assets/spells/Bat_spell/110_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        dark_spell_factory_level_unlocked: 5,
        levels: [
          { level: 1, cost: 0, resource: 'dark_elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      bowler: {
        id: 'bowler',
        image_path: '/src/assets/Dark_Troops/Bowler/59_',
        copy_unlocks: [true],
        dark_barracks_level_unlocked: 7,
        levels: [
          { level: 1, cost: 0, resource: 'dark_elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      metal_pants: {
        id: 'metal_pants',
        image_path: '/src/assets/Equipment/Minion_Prince/Metal_pants/216_0.png',
        hero: 'Minion Prince',
        priority: 5,
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'passive',
        equipment_rarity: 'common',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
      vampstache: {
        id: 'vampstache',
        image_path: '/src/assets/Equipment/Barbarian_King/Vampstache/160.png',
        hero: 'Barbarian King',
        priority: 3,
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'passive',
        equipment_rarity: 'common',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
    }
  }

  if (Number(townhallLevel) === 11) {
    return {
      eagle_artillery: {
        id: 'eagle_artillery',
        image_path: '/src/assets/Defences/Eagle_Artillery/20_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 0, resource: 'gold', time: '0sec' },
        ],
      },
      tornado_trap: {
        id: 'tornado_trap',
        image_path: '/src/assets/Traps/Tornado_Trap/108_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 0, resource: 'gold', time: '0sec' },
        ],
      },
      electro_dragon: {
        id: 'electro_dragon',
        image_path: '/src/assets/Troops/Electro_Dragon/103_',
        copy_unlocks: [true],
        barracks_level_unlocked: 13,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      ice_golem: {
        id: 'ice_golem',
        image_path: '/src/assets/Dark_Troops/Ice_Golem/111_',
        copy_unlocks: [true],
        dark_barracks_level_unlocked: 8,
        levels: [
          { level: 1, cost: 0, resource: 'dark_elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      invisibility_spell: {
        id: 'invisibility_spell',
        image_path: '/src/assets/spells/Invisibility_Spell/124_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        spell_factory_level_unlocked: 7,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      grand_warden: {
        id: 'grand_warden',
        image_path: '/src/assets/Heros/Grand_Warden/63_',
        copy_unlocks: [true],
        hero_hall_level_unlocked: 2,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec', hero_hall_level_unlocked: 2 },
        ],
      },
      eternal_tome: {
        id: 'eternal_tome',
        image_path: '/src/assets/Equipment/Grand_Warden/Eternal_Tome/165.png',
        hero: 'Grand Warden',
        priority: 1,
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'active',
        equipment_rarity: 'common',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
      life_gem: {
        id: 'life_gem',
        image_path: '/src/assets/Equipment/Grand_Warden/Life_Gem/166.png',
        hero: 'Grand Warden',
        priority: 2,
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'passive',
        equipment_rarity: 'common',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
      heroic_torch: {
        id: 'heroic_torch',
        image_path: '/src/assets/Equipment/Grand_Warden/Heroic_Torch/237.png',
        hero: 'Grand Warden',
        priority: 3,
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'active',
        equipment_rarity: 'epic',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
      fireball: {
        id: 'fireball',
        image_path: '/src/assets/Equipment/Grand_Warden/Fireball/176.png',
        hero: 'Grand Warden',
        priority: 4,
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'active',
        equipment_rarity: 'epic',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
      lavaloon_puppet: {
        id: 'lavaloon_puppet',
        image_path: '/src/assets/Equipment/Grand_Warden/Lavaloon_Puppet/199.png',
        hero: 'Grand Warden',
        priority: 5,
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'active',
        equipment_rarity: 'epic',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
      rage_gem: {
        id: 'rage_gem',
        image_path: '/src/assets/Equipment/Grand_Warden/Rage_Gem/168.png',
        hero: 'Grand Warden',
        priority: 6,
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'passive',
        equipment_rarity: 'common',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
    }
  }

  if (Number(townhallLevel) === 12) {
    return {
      workshop: {
        id: 'workshop',
        image_path: '/src/assets/Army/Workshop/104_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec' },
          { level: 2, cost: 5000000, resource: 'elixir', time: '12hr' },
          { level: 3, cost: 6000000, resource: 'elixir', time: '14hr' },
          { level: 4, cost: 7000000, resource: 'elixir', time: '16hr' },
          { level: 5, cost: 8000000, resource: 'elixir', time: '18hr' },
          { level: 6, cost: 10000000, resource: 'elixir', time: '1d' },
          { level: 7, cost: 12000000, resource: 'elixir', time: '1d 6hr' },
          { level: 8, cost: 14000000, resource: 'elixir', time: '1d 12hr' },
        ],
      },
      wall_wrecker: {
        id: 'wall_wrecker',
        image_path: '/src/assets/Seige_machines/Wall_Wrecker/105_',
        copy_unlocks: [true],
        workshop_level_unlocked: 1,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      battle_blimp: {
        id: 'battle_blimp',
        image_path: '/src/assets/Seige_machines/Battle_Blimp/106_',
        copy_unlocks: [true],
        workshop_level_unlocked: 2,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      stone_slammer: {
        id: 'stone_slammer',
        image_path: '/src/assets/Seige_machines/Stone_Slammer/109_',
        copy_unlocks: [true],
        workshop_level_unlocked: 3,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      yeti: {
        id: 'yeti',
        image_path: '/src/assets/Troops/Yeti/121_',
        copy_unlocks: [true],
        barracks_level_unlocked: 14,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      head_hunter: {
        id: 'head_hunter',
        image_path: '/src/assets/Dark_Troops/HeadHunter/123_',
        copy_unlocks: [true],
        dark_barracks_level_unlocked: 9,
        levels: [
          { level: 1, cost: 0, resource: 'dark_elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      overgrowth_spell: {
        id: 'overgrowth_spell',
        image_path: '/src/assets/spells/Overgrowth_Spell/175_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        dark_spell_factory_level_unlocked: 6,
        levels: [
          { level: 1, cost: 0, resource: 'dark_elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      healer_puppet: {
        id: 'healer_puppet',
        image_path: '/src/assets/Equipment/Archer_Queen/Healer_Puppet/164.png',
        hero: 'Archer Queen',
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'active',
        equipment_rarity: 'common',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
      noble_iron: {
        id: 'noble_iron',
        image_path: '/src/assets/Equipment/Minion_Prince/Noble_Iron/219_0.png',
        hero: 'Minion Prince',
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'passive',
        equipment_rarity: 'common',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
    }
  }

  if (Number(townhallLevel) === 13) {
    return {
      scattershot: {
        id: 'scattershot',
        image_path: '/src/assets/Defences/scattershot/119_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 0, resource: 'gold', time: '0sec' },
        ],
      },
      royal_champion: {
        id: 'royal_champion',
        image_path: '/src/assets/Heros/Royal_Champion/122_',
        copy_unlocks: [true],
        hero_hall_level_unlocked: 3,
        levels: [
          { level: 1, cost: 0, resource: 'dark_elixir', time: '0sec', hero_hall_level_unlocked: 3 },
        ],
      },
      apprentice_warden: {
        id: 'apprentice_warden',
        image_path: '/src/assets/Dark_Troops/Apprentice_Warden/151_',
        copy_unlocks: [true],
        dark_barracks_level_unlocked: 10,
        levels: [
          { level: 1, cost: 0, resource: 'dark_elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      dragon_rider: {
        id: 'dragon_rider',
        image_path: '/src/assets/Troops/DragonRider/133_',
        copy_unlocks: [true],
        barracks_level_unlocked: 15,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      recall_spell: {
        id: 'recall_spell',
        image_path: '/src/assets/spells/Recall_Spell/140_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        spell_factory_level_unlocked: 8,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      siege_barracks: {
        id: 'siege_barracks',
        image_path: '/src/assets/Seige_machines/Siege_Barracks/120_',
        copy_unlocks: [true],
        workshop_level_unlocked: 4,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      log_launcher: {
        id: 'log_launcher',
        image_path: '/src/assets/Seige_machines/Log_Launcher/125_',
        copy_unlocks: [true],
        workshop_level_unlocked: 5,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      healing_tome: {
        id: 'healing_tome',
        image_path: '/src/assets/Equipment/Grand_Warden/Healing_Tome/167.png',
        hero: 'Grand Warden',
        priority: 3,
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'active',
        equipment_rarity: 'common',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
      seeking_shield: {
        id: 'seeking_shield',
        image_path: '/src/assets/Equipment/Royal_Champion/Seeking_Shield/170.png',
        hero: 'Royal Champion',
        priority: 1,
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'active',
        equipment_rarity: 'common',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
      royal_gem: {
        id: 'royal_gem',
        image_path: '/src/assets/Equipment/Royal_Champion/Royal_Gem/169.png',
        hero: 'Royal Champion',
        priority: 2,
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'passive',
        equipment_rarity: 'common',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
      rocket_spear: {
        id: 'rocket_spear',
        image_path: '/src/assets/Equipment/Royal_Champion/Rocket_Spear/195.png',
        hero: 'Royal Champion',
        priority: 3,
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'active',
        equipment_rarity: 'epic',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
      electro_boots: {
        id: 'electro_boots',
        image_path: '/src/assets/Equipment/Royal_Champion/Electro_Boots/211.png',
        hero: 'Royal Champion',
        priority: 4,
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'passive',
        equipment_rarity: 'common',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
      frost_flake: {
        id: 'frost_flake',
        image_path: '/src/assets/Equipment/Royal_Champion/Frost_Flake/257.png',
        hero: 'Royal Champion',
        priority: 5,
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'passive',
        equipment_rarity: 'common',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec' },
        ],
      },
    }
  }

  if (Number(townhallLevel) === 14) {
    return {
      builder_hut: {
        id: 'builder_hut',
        image_path: '/src/assets/Defences/Builder_hut/127_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 0, resource: 'gold', time: '0sec' },
        ],
      },
      pet_house: {
        id: 'pet_house',
        image_path: '/src/assets/Army/Pet_House/128_',
        buildings_unlocked: 1,
        copy_unlocks: createCopyUnlocks(1, 1),
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec' },
        ],
      },
      lassi: {
        id: 'lassi',
        image_path: '/src/assets/pets/L.A.S.S.I/129',
        copy_unlocks: [true],
        pet_house_level_unlocked: 1,
        levels: [
          { level: 1, cost: 0, resource: 'dark_elixir', time: '0sec', pet_house_level_unlocked: 1 },
        ],
      },
      electro_titan: {
        id: 'electro_titan',
        image_path: '/src/assets/Troops/Electro_Titan/138_',
        copy_unlocks: [true],
        barracks_level_unlocked: 1,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      druid: {
        id: 'druid',
        image_path: '/src/assets/Dark_Troops/Druid/197_',
        copy_unlocks: [true],
        dark_barracks_level_unlocked: 1,
        levels: [
          { level: 1, cost: 0, resource: 'dark_elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      ice_block_spell: {
        id: 'ice_block_spell',
        image_path: '/src/assets/spells/Ice_Block_spell/236',
        copy_unlocks: [true],
        dark_spell_factory_level_unlocked: 1,
        levels: [
          { level: 1, cost: 0, resource: 'dark_elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      flame_flinger: {
        id: 'flame_flinger',
        image_path: '/src/assets/Seige_machines/Flame_Flinger/134_',
        copy_unlocks: [true],
        workshop_level_unlocked: 6,
        levels: [
          { level: 1, cost: 0, resource: 'elixir', time: '0sec', lab_level_unlocked: 1 },
        ],
      },
      hog_rider_puppet: {
        id: 'hog_rider_puppet',
        image_path: '/src/assets/Equipment/Royal_Champion/Hog_Rider_Puppet/173.png',
        hero: 'Royal Champion',
        buildings_unlocked: 1,
        copy_unlocks: [true],
        unlock_source: 'blacksmith',
        blacksmith_level_unlocked: 1,
        equipment_type: 'active',
        equipment_rarity: 'common',
        levels: [
          { level: 1, cost: 0, resource: 'glowy_ore', resource_options: ['glowy_ore'], resource_costs: createEquipmentResourceCosts(['glowy_ore', 0]), time: '0sec', blacksmith_level_unlocked: 1 },
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