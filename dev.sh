#!/bin/bash

# Simple development script to run docker-compose with git information
export GIT_TAG=$(git describe --tags --exact-match 2>/dev/null || git describe --tags --abbrev=0 2>/dev/null || echo "dev-local")
export GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "dev-local")
export LAST_COMMIT_DATE=$(git log -1 --format=%cd --date=short 2>/dev/null || echo "dev-local")

echo "Git Info: Tag=$GIT_TAG, Branch=$GIT_BRANCH, Date=$LAST_COMMIT_DATE"
docker compose "$@"
