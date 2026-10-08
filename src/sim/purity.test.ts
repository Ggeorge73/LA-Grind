import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SIM_DIR = join(__dirname);
const FORBIDDEN = [/from ['"]react/, /from ['"]@capacitor/, /Math\.random\(/, /Date\.now\(/, /\bfetch\(/, /\bwindow\./, /\bdocument\./];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return name.endsWith('.ts') && !name.endsWith('.test.ts') ? [path] : [];
  });
}

describe('src/sim stays pure', () => {
  it.each(files(SIM_DIR))('%s has no React, Capacitor, DOM, network, Math.random or Date.now', (path) => {
    const source = readFileSync(path, 'utf8');
    for (const pattern of FORBIDDEN) expect(source).not.toMatch(pattern);
  });
});
