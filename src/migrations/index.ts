import * as migration_20260407_211532 from './20260407_211532';
import * as migration_20260409_201612 from './20260409_201612';
import * as migration_20260504_173908 from './20260504_173908';
import * as migration_20260505_214603 from './20260505_214603';
import * as migration_20260512_115220 from './20260512_115220';
import * as migration_20260701_200131 from './20260701_200131';
import * as migration_20260705_150532 from './20260705_150532';
import * as migration_20260727_181500 from './20260727_181500';
import * as migration_20260728_001000 from './20260728_001000';
import * as migration_20260728_002000 from './20260728_002000';

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
  {
    up: migration_20260701_200131.up,
    down: migration_20260701_200131.down,
    name: '20260701_200131',
  },
  {
    up: migration_20260705_150532.up,
    down: migration_20260705_150532.down,
    name: '20260705_150532',
  },
  {
    up: migration_20260727_181500.up,
    down: migration_20260727_181500.down,
    name: '20260727_181500',
  },
  {
    up: migration_20260728_001000.up,
    down: migration_20260728_001000.down,
    name: '20260728_001000',
  },
  {
    up: migration_20260728_002000.up,
    down: migration_20260728_002000.down,
    name: '20260728_002000',
  },
];
