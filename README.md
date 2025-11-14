# Secret Key Generator

A simple, cross-platform tool to generate cryptographically secure random keys.

## Installation

### Option 1: Download Pre-built Binary

Download the latest release from [Releases](https://github.com/ibodev1/secret-key-generator/releases).

### Option 2: Use via JSR

```bash
deno install -A -n secret-key-generator jsr:@ibodev/secret-key-generator
```

### Option 3: Run Directly

```bash
deno run -A jsr:@ibodev/secret-key-generator
```

## Usage

```bash
# Generate 32 bytes (default)
secret-key-generator

# Generate 64 bytes
secret-key-generator 64

# Output in base64 format
secret-key-generator --format base64

# Save to file
secret-key-generator -o key.txt

# Append to .env file
secret-key-generator --env

# Combine options
secret-key-generator 64 -f base64url --env
```

## Options

- `-f, --format` - Output format: `hex`, `base64`, `base64url` (default: hex)
- `-o, --output` - Write to file instead of stdout
- `-e, --env` - Append to `.env` file as `SECRET_KEY="..."`
- `-h, --help` - Show help message

## Examples

```bash
# Generate hex key for JWT
secret-key-generator 32

# Generate base64 key and save to .env
secret-key-generator --format base64 --env

# Generate 128-byte key to file
secret-key-generator 128 -o secret.key
```

## License

MIT
