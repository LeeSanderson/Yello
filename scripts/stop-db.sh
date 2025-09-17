#!/bin/bash

# Stop PostgreSQL database container
echo "🛑 Stopping PostgreSQL database..."

if podman ps --format "{{.Names}}" | grep -q "yellow-postgres"; then
    podman stop yellow-postgres
    echo "✅ Database stopped"
else
    echo "ℹ️  Database container is not running"
fi