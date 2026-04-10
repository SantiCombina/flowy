import * as migration_20260407_211532 from './20260407_211532';
import * as migration_20260409_201612 from './20260409_201612';

export const migrations = [
  {
    up: migration_20260407_211532.up,
    down: migration_20260407_211532.down,
    name: '20260407_211532',
  },
  {
    up: migration_20260409_201612.up,
    down: migration_20260409_201612.down,
    name: '20260409_201612',
  },
];
