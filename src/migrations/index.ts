import * as migration_20260226_153534 from './20260226_153534';
import * as migration_20260303_202852 from './20260303_202852';

export const migrations = [
  {
    up: migration_20260226_153534.up,
    down: migration_20260226_153534.down,
    name: '20260226_153534',
  },
  {
    up: migration_20260303_202852.up,
    down: migration_20260303_202852.down,
    name: '20260303_202852',
  },
];
