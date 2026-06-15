#!/usr/bin/env -S deno run --allow-write --allow-read

import { parseArgs } from '@std/cli';
import { encodeBase64, encodeBase64Url, encodeHex } from '@std/encoding';
import * as path from '@std/path';
import denoConfig from './deno.json' with { type: 'json' };

type Format = 'hex' | 'base64' | 'base64url';

interface Options {
  bytes: number;
  format: Format;
  output?: string;
  env: boolean;
  envName: string;
  help: boolean;
  version: boolean;
}

const HELP_TEXT = `
Secret Key Generator - Cryptographically secure random key generator

USAGE:
  secret-key-generator [OPTIONS] [BYTES]

ARGUMENTS:
  [BYTES]           Number of random bytes to generate (default: 32, max: 1024)

OPTIONS:
  -f, --format      Output format: hex, base64, base64url (default: hex)
  -o, --output      Append output to a file instead of stdout
  -e, --env         Append to .env file in current directory
      --env-name    Variable name used with --env (default: SECRET_KEY)
  -v, --version     Show version
  -h, --help        Show this help message

EXAMPLES:
  secret-key-generator                    # Generate 32 bytes in hex
  secret-key-generator 64                 # Generate 64 bytes in hex
  secret-key-generator --format base64    # Generate in base64 format
  secret-key-generator -o key.txt         # Write to file
  secret-key-generator --env              # Append to .env file
  secret-key-generator --env --env-name JWT_SECRET
  secret-key-generator 16 -f base64url -o secret.key

EQUIVALENT TO:
  openssl rand -hex 32

PERMISSIONS:
  Printing to stdout needs no permissions; run with:
    deno run jsr:@ibodev/secret-key-generator
  Only --output / --env require --allow-write (and --allow-read).
`;

const DEFAULT_BYTES = 32;
const MAX_BYTES = 1024;
const SECRET_FILE_MODE = 0o600;

function isFormat(value: string): value is Format {
  return value === 'hex' || value === 'base64' || value === 'base64url';
}

function parseCliArgs(args: string[]): Options {
  const parsed = parseArgs(args, {
    string: ['format', 'output', 'env-name'],
    boolean: ['help', 'env', 'force', 'version'],
    alias: {
      f: 'format',
      o: 'output',
      e: 'env',
      v: 'version',
      h: 'help',
    },
    default: {
      format: 'hex',
      'env-name': 'SECRET_KEY',
    },
  });

  if (parsed.help) {
    return baseOptions({ help: true });
  }

  if (parsed.version) {
    return baseOptions({ version: true });
  }

  const format = parsed.format;
  if (!isFormat(format)) {
    throw new Error(
      `Invalid format '${format}'. Must be: hex, base64, or base64url`,
    );
  }

  let bytes = DEFAULT_BYTES;
  if (Array.isArray(parsed._) && parsed._.length > 0) {
    const bytesArg = Number(parsed._[0]);
    if (!Number.isInteger(bytesArg) || bytesArg <= 0) {
      throw new Error(
        `Invalid byte length '${parsed._[0]}'. Must be a positive integer.`,
      );
    }
    if (bytesArg > MAX_BYTES) {
      throw new Error(`Byte length ${bytesArg} exceeds maximum ${MAX_BYTES}`);
    }
    bytes = bytesArg;
  }

  return {
    bytes,
    format,
    output: parsed.output,
    env: parsed.env,
    envName: parsed['env-name'],
    help: false,
    version: false,
  };
}

function baseOptions(overrides: Partial<Options>): Options {
  return {
    bytes: DEFAULT_BYTES,
    format: 'hex',
    env: false,
    envName: 'SECRET_KEY',
    help: false,
    version: false,
    ...overrides,
  };
}

function generateKey(bytes: number, format: Format): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);

  switch (format) {
    case 'hex':
      return encodeHex(buf);
    case 'base64':
      return encodeBase64(buf);
    case 'base64url':
      return encodeBase64Url(buf);
  }
}

async function fileExists(target: string): Promise<boolean> {
  try {
    await Deno.lstat(target);
    return true;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return false;
    }
    throw err;
  }
}

async function writeOutput(key: string, output: string): Promise<void> {
  if (await fileExists(output)) {
    if (!confirm(`'${output}' already exists. Append anyway?`)) {
      console.error('Aborted.');
      return;
    }
  }
  await Deno.writeTextFile(output, key + '\n', {
    append: true,
    mode: SECRET_FILE_MODE,
  });
  console.error(`Key appended to ${output}`);
}

async function writeEnv(key: string, envName: string): Promise<void> {
  const envPath = path.resolve(Deno.cwd(), '.env');
  if (await fileExists(envPath)) {
    if (!confirm(`'.env' already exists. Append anyway?`)) {
      console.error('Aborted.');
      return;
    }
  }
  const entry = `\n# Secret Key\n${envName}="${key}"\n`;
  await Deno.writeTextFile(envPath, entry, {
    append: true,
    mode: SECRET_FILE_MODE,
  });
  console.error(`Key appended to .env as ${envName}`);
}

async function run(args: string[]): Promise<void> {
  const options = parseCliArgs(args);

  if (options.help) {
    console.log(HELP_TEXT);
    return;
  }

  if (options.version) {
    console.log(denoConfig.version);
    return;
  }

  const key = generateKey(options.bytes, options.format);

  if (options.output) {
    await writeOutput(key, options.output);
  }

  if (options.env) {
    await writeEnv(key, options.envName);
  }

  if (!options.output && !options.env) {
    console.log(key);
  }
}

if (import.meta.main) {
  try {
    await run(Deno.args);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    Deno.exit(1);
  }
}
