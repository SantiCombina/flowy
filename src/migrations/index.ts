import * as migration_20261002_initial from './20261002_initial';
import * as migration_20261021_tenant_plan_control_date from './20261021_tenant_plan_control_date';
import * as migration_20261021_tenant_plan_payments from './20261021_tenant_plan_payments';

export const migrations = [
  {
    up: migration_20261002_initial.up,
    down: migration_20261002_initial.down,
    name: '20261002_initial',
  },
  {
    up: migration_20261021_tenant_plan_control_date.up,
    down: migration_20261021_tenant_plan_control_date.down,
    name: '20261021_tenant_plan_control_date',
  },
  {
    up: migration_20261021_tenant_plan_payments.up,
    down: migration_20261021_tenant_plan_payments.down,
    name: '20261021_tenant_plan_payments',
  },
];
