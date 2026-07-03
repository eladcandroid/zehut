# cobalt-api on Fly.io

Self-hosted [cobalt](https://github.com/imputnet/cobalt) instance — primary download resolver for the Zehut app.

## Deploy

```bash
export FLY_API_TOKEN=$(grep '^access_token:' ~/.fly/config.yml | sed 's/^access_token: //')
fly deploy
```

## Env vars in the parent Next.js app

```
COBALT_URL=https://zehut-cobalt.fly.dev
COBALT_API_KEY=<value of .key-uuid>
```

## Rotate API key

```bash
NEW=$(uuidgen | tr 'A-Z' 'a-z')
echo "$NEW" > .key-uuid
# Edit keys.json, replace the old UUID with $NEW
fly deploy
# Update COBALT_API_KEY in Vercel + .env.local
```
