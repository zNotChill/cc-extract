
// Request Attributes

type RequestMethod = "GET" | "POST" | "PUT" | "DELETE";

interface Endpoints {
  "login": string,
  "dashboard": string,
  "account": string,
  "console": string,
  "properties": string,
  "queries": string,
}

// User Attributes

interface User {
  username: string,
  uuid: string,
  servers: Server[],
  online: boolean,
  activity: {
    first_login: number,
    last_login: number,
  },
  points: number,
  level: {
    exp: number,
    level: number,
  },
  version: {
    protocol: number,
    display: string,
  },
  current_server: string,
  guild: string,
  groups: string[],
  selected_server: Server,
  minigames: {
    warzone: {
      kills: number,
      deaths: number,
      wins: number,
      score: number,
      coins: number,
      wool_destroyed: number,
      activity: {
        first_login: number,
        last_login: number,
        playtime: number,
      },
    },
    tntwars: {
      coins: number,
      kills: number,
      deaths: number,
      wins: number,
      score: number,
      activity: {
        first_login: number,
        last_login: number,
        playtime: number,
      },
    },
    xrun: {
      wins: number,
      plays: number,
      score: number,
      activity: {
        first_login: number,
        last_login: number,
        // there is no playtime.
        // this is completely stupid
        // and inconsistent with the other minigames
      },
      maps: xrunMap[],
    },
    bedwars: {
      coins: number,
      kills: number,
      deaths: number,
      wins: number,
      score: number,
      beds: number,
      activity: {
        first_login: number,
        last_login: number,
        playtime: number,
      },
    },
    arcade: {
      activity: {
        first_login: number,
        last_login: number,
        playtime: number,
      },
      maps: arcadeMap[],
    },
    kitpvp: {
      coins: number,
      kills: number,
      deaths: number,
      score: number,
      activity: {
        first_login: number,
        last_login: number,
        playtime: number,
      },
    },

  }
}

// Server Attributes

// TODO: add more plans
type Plan = {
  "God": 12,
  "Royal": 11,
  "Noble": 10,
  "Level-6": 6,
  "Level-5": 5,
  "Level-4": 4,
  "Level-3": 3,
  "Level-2": 2,
  "Level-1": 1,
  "Free": 0,
}

type ServerIcon = "DIAMOND" | "DIAMOND_SWORD" | "DIAMOND_CHESTPLATE" | "DIAMOND_PICKAXE" | "BOW" | "BED" |
                  "CHEST" | "TNT" | "BEDROCK" | "MOB_SPAWNER" | "SLIME_BLOCK" | "ELYTRA" | "LADDER" | "APPLE" |
                  "REDSTONE" | "WHEAT" | "HAY_BLOCK" | "NONE"

interface Server {
  name: string,
  id: number,
  port: 25565,
  plan?: Plan,
  motd?: string,
  version?: string,
  icon?: ServerIcon,
  visible?: boolean,
  isOwner?: boolean,
}

// Minigame Attributes

interface xrunMap {
  map: string,
  wins: number,
  plays: number,
  best_time: number,
}

interface arcadeMap {
  game: string,
  kills: number,
  deaths: number,
  wins: number,
  plays: number,
  score: number,
  last_played: number,
}

// Server Attributes

type ServerAttribute = "motd" | "version" | "icon" | "visibility" | "stop" |
                      "who-can-start";

type ServerVersion =  "spigot-1.8" | "paper-1.8" |
                      "spigot-1.12" | "paper-1.12" |
                      "spigot-1.16" | "paper-1.16" |
                      "spigot-1.17" | "paper-1.17" |
                      "spigot-1.18" | "paper-1.18" |
                      "spigot-1.19" | "paper-1.19" |
                      "spigot-1.20" | "paper-1.20";
                    
type ServerStartPermissions = {
  "everyone": 1,
  "owner": 2,
  "friends": 3,
}

type LevelType = "default" | "flat" | "largebiomes" | "amplified";

type Gamemode = {
  "survival": 0,
  "creative": 1,
  "adventure": 2,
  "spectator": 3,
}
type Difficulty = {
  "peaceful": 0,
  "easy": 1,
  "normal": 2,
  "hard": 3,
}

interface ServerProperty {
  commandBlocks: {
    name: "command_blocks",
    value: 0 | 1,
  },
  pvp: {
    name: "pvp",
    value: 0 | 1,
  },
  monsterSpawning: {
    name: "monster_spawning",
    value: 0 | 1,
  },
  animalSpawning: {
    name: "animal_spawning",
    value: 0 | 1,
  },
  allowNether: {
    name: "allow_nether",
    value: 0 | 1,
  },
  allowFlight: {
    name: "allow_flight",
    value: 0 | 1,
  },
  difficulty: {
    name: "difficulty",
    value: 0 | 1 | 2 | 3,
  },
  structures: {
    name: "structures",
    value: 0 | 1,
  },
  gamemode: {
    name: "gamemode",
    value: 0 | 1 | 2 | 3,
  },
  forceGamemode: {
    name: "force_gamemode",
    value: 0 | 1,
  },
  levelType: {
    name: "level_type",
    value: LevelType,
  },
  resourcePack: {
    name: "resource-pack",
    value: string,
  },
  generatorSettings: {
    name: "generator-settings",
    value: object,
  },
  spawnProtection: {
    name: "spawn-protection",
    value: number,
  },
  seed: {
    name: "level-seed",
    value: number,
  },
  broadcastConsoleToOps: {
    name: "broadcast-console-to-ops",
    value: boolean,
  },
  levelName: {
    name: "level-name",
    value: string,
  },
}

type ServerPropertyValueMap = {
  [K in keyof ServerProperty]: ServerProperty[K]['value'];
};

// Event Emitter

type Events = "login" | "motd" | "command" | "boostCommand" | "voteCommand" | "plugin" | "stop" | "file"
