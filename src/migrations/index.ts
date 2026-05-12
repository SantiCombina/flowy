import * as migration_20260407_211532 from './20260407_211532';
import * as migration_20260409_201612 from './20260409_201612';
import * as migration_20260504_173908 from './20260504_173908';
import * as migration_20260505_214603 from './20260505_214603';
import * as migration_20260512_115220 from './20260512_115220';

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
  {
    up: migration_20260504_173908.up,
    down: migration_20260504_173908.down,
    name: '20260504_173908',
  },
  {
    up: migration_20260505_214603.up,
    down: migration_20260505_214603.down,
    name: '20260505_214603',
  },
  {
    up: migration_20260512_115220.up,
    down: migration_20260512_115220.down,
    name: '20260512_115220',
  },
];
