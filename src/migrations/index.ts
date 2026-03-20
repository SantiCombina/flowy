import * as migration_20260226_153534 from './20260226_153534';
import * as migration_20260303_202852 from './20260303_202852';
import * as migration_20260306_000000_add_cost_price_profit_margin from './20260306_000000_add_cost_price_profit_margin';
import * as migration_20260306_100000_remove_min_stock from './20260306_100000_remove_min_stock';
import * as migration_20260306_200000_add_province_locality_to_clients from './20260306_200000_add_province_locality_to_clients';
import * as migration_20260308_000000_add_minimum_stock_to_variants from './20260308_000000_add_minimum_stock_to_variants';
import * as migration_20260317_000000_add_amount_paid_to_sales from './20260317_000000_add_amount_paid_to_sales';
import * as migration_20260320_000000_make_payment_method_optional from './20260320_000000_make_payment_method_optional';
import * as migration_20260320_100000_add_owner_payment_fields from './20260320_100000_add_owner_payment_fields';

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
  {
    up: migration_20260308_000000_add_minimum_stock_to_variants.up,
    down: migration_20260308_000000_add_minimum_stock_to_variants.down,
    name: '20260308_000000_add_minimum_stock_to_variants',
  },
  {
    up: migration_20260317_000000_add_amount_paid_to_sales.up,
    down: migration_20260317_000000_add_amount_paid_to_sales.down,
    name: '20260317_000000_add_amount_paid_to_sales',
  },
  {
    up: migration_20260320_000000_make_payment_method_optional.up,
    down: migration_20260320_000000_make_payment_method_optional.down,
    name: '20260320_000000_make_payment_method_optional',
  },
  {
    up: migration_20260320_100000_add_owner_payment_fields.up,
    down: migration_20260320_100000_add_owner_payment_fields.down,
    name: '20260320_100000_add_owner_payment_fields',
  },
];
