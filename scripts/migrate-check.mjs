import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '../src/migrations');
const isForce = process.argv.includes('--force');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const DESTRUCTIVE_PATTERNS = [
  { regex: /drop\s+table(?!\s+type)/i, label: 'DROP TABLE' },
  { regex: /drop\s+column/i, label: 'DROP COLUMN' },
  { regex: /delete\s+from/i, label: 'DELETE FROM' },
  { regex: /truncate(?:\s+table)?/i, label: 'TRUNCATE' },
];

const files = (await readdir(migrationsDir))
  .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
  .sort();

if (files.length === 0) {
  console.log(`${YELLOW}No hay archivos de migración en src/migrations/${RESET}`);
  process.exit(0);
}

const latest = files[files.length - 1];
const content = await readFile(join(migrationsDir, latest), 'utf-8');

// Extraer solo la función up() — entre "export async function up" y "export async function down"
const upMatch = content.match(/export async function up[\s\S]*?(?=export async function down)/);
const upContent = upMatch?.[0] ?? content;

// Excluir bloques DO $$ BEGIN ... END $$ (patrones seguros de Payload para enums)
const upWithoutSafeBlocks = upContent.replace(/DO\s*\$\$[\s\S]*?END\s*\$\$\s*;/gi, '');

const found = DESTRUCTIVE_PATTERNS.filter(({ regex }) => regex.test(upWithoutSafeBlocks));

console.log(`\n${BOLD}━━━ Revisión de migración ━━━${RESET}`);
console.log(`Archivo: ${BOLD}${latest}${RESET}\n`);
console.log(`${BOLD}Contenido de up():${RESET}`);
console.log('─'.repeat(60));
console.log(upContent.trim());
console.log('─'.repeat(60));

if (found.length > 0) {
  console.log(`\n${RED}${BOLD}⚠️  OPERACIONES DESTRUCTIVAS DETECTADAS EN up():${RESET}`);
  for (const { label } of found) {
    console.log(`  ${RED}• ${label}${RESET}`);
  }
  console.log(
    `\n${YELLOW}Esta migración puede eliminar datos permanentemente.${RESET}`,
  );
  console.log(`Si es intencional y ya revisaste el SQL, usá: ${BOLD}pnpm migrate:force${RESET}\n`);

  if (!isForce) {
    process.exit(1);
  }

  console.log(`${YELLOW}--force activado, continuando de todas formas...${RESET}\n`);
} else {
  console.log(`\n${GREEN}${BOLD}✅ Migración segura — no se detectaron operaciones destructivas en up()${RESET}\n`);
}
