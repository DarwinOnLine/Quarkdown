import { buildOGPages } from './src/og-builder.js';
import { readFileSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(new URL('./quarkdown.json', import.meta.url), 'utf-8'));
config.rootDir = __dirname;

buildOGPages(config);
