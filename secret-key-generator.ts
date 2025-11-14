#!/usr/bin/env -S deno run --allow-write --allow-read

import { crypto } from '@std/crypto';
import { parseArgs } from '@std/cli';
import { encodeHex } from '@std/encoding';
import { encodeBase64, encodeBase64Url } from '@std/encoding';
import * as path from '@std/path';

interface Options {
  bytes: number;
  format: 'hex' | 'base64' | 'base64url';
  output?: string;
  env: boolean;
  help: boolean;
}

const HELP_TEXT = `
Secret Key Generator - Cryptographically secure random key generator

USAGE:
  secret-key-generator [OPTIONS] [BYTES]

ARGUMENTS:
  [BYTES]           Number of random bytes to generate (default: 32, max: 1024)

OPTIONS:
  -f, --format      Output format: hex, base64, base64url (default: hex)
  -o, --output      Write output to file instead of stdout
  -e, --env         Append to .env file in current directory
  -h, --help        Show this help message

EXAMPLES:
  secret-key-generator                    # Generate 32 bytes in hex
  secret-key-generator 64                 # Generate 64 bytes in hex
  secret-key-generator --format base64    # Generate in base64 format
  secret-key-generator -o key.txt         # Write to file
  secret-key-generator --env              # Append to .env file
  secret-key-generator 16 -f base64url -o secret.key

EQUIVALENT TO:
  openssl rand -hex 32
`;

const DEFAULT_BYTES = 32;
const MAX_BYTES = 1024;

function parseCliArgs(args: string[]): Options {
  const parsed = parseArgs(args, {
    string: ['format', 'output'],
    boolean: ['help', 'env'],
    alias: {
      f: 'format',
      o: 'output',
      e: 'env',
      h: 'help',
    },
    default: {
      format: 'hex',
    },
  });

  if (parsed.help) {
    return { bytes: DEFAULT_BYTES, format: 'hex', env: false, help: true };
  }

  const format = parsed.format;
  if (format !== 'hex' && format !== 'base64' && format !== 'base64url') {
    console.error(
      `Error: Invalid format '${format}'. Must be: hex, base64, or base64url`,
    );
    Deno.exit(1);
  }

  let bytes = DEFAULT_BYTES;
  if (Array.isArray(parsed._) && parsed._.length > 0) {
    const bytesArg = Number(parsed._[0]);
    if (!Number.isInteger(bytesArg) || bytesArg <= 0) {
      console.error(
        `Error: Invalid byte length '${parsed._[0]}'. Must be a positive integer.`,
      );
      Deno.exit(1);
    }
    if (bytesArg > MAX_BYTES) {
      console.error(
        `Error: Byte length ${bytesArg} exceeds maximum ${MAX_BYTES}`,
      );
      Deno.exit(1);
    }
    bytes = bytesArg;
  }

  return {
    bytes,
    format: format,
    output: parsed.output,
    env: parsed.env,
    help: false,
  };
}

function generateKey(
  bytes: number,
  format: 'hex' | 'base64' | 'base64url',
): string {
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

async function writeOutput(key: string, output: string): Promise<void> {
  try {
    await Deno.writeTextFile(output, key + '\n');
    console.error(`✓ Key written to ${output}`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`Error writing to file: ${errorMessage}`);
    Deno.exit(1);
  }
}

async function writeEnv(key: string): Promise<void> {
  try {
    const envPath = path.resolve(Deno.cwd(), '.env');
    const envContent = `\n# Secret Key\nSECRET_KEY="${key}"\n`;
    await Deno.writeTextFile(envPath, envContent, { append: true });
    console.error(`✓ Key appended to .env file`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`Error writing to .env file: ${errorMessage}`);
    Deno.exit(1);
  }
}

async function main(): Promise<void> {
  const options = parseCliArgs(Deno.args);

  if (options.help) {
    console.log(HELP_TEXT);
    Deno.exit(0);
  }

  const key = generateKey(options.bytes, options.format);

  if (options.output) {
    await writeOutput(key, options.output);
  }

  if (options.env) {
    await writeEnv(key);
  }

  if (!options.output && !options.env) {
    console.log(key);
  }
}

if (import.meta.main) {
  main();
}
