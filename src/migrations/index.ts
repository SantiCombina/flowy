import * as migration_20260226_153534 from './20260226_153534';
import * as migration_20260303_202852 from './20260303_202852';
import * as migration_20260306_000000_add_cost_price_profit_margin from './20260306_000000_add_cost_price_profit_margin';
import * as migration_20260306_100000_remove_min_stock from './20260306_100000_remove_min_stock';
import * as migration_20260306_200000_add_province_locality_to_clients from './20260306_200000_add_province_locality_to_clients';

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
  {
    up: migration_20260306_000000_add_cost_price_profit_margin.up,
    down: migration_20260306_000000_add_cost_price_profit_margin.down,
    name: '20260306_000000_add_cost_price_profit_margin',
  },
  {
    up: migration_20260306_100000_remove_min_stock.up,
    down: migration_20260306_100000_remove_min_stock.down,
    name: '20260306_100000_remove_min_stock',
  },
  {
    up: migration_20260306_200000_add_province_locality_to_clients.up,
    down: migration_20260306_200000_add_province_locality_to_clients.down,
    name: '20260306_200000_add_province_locality_to_clients',
  },
];
