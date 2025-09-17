#!/bin/bash

# Reset PostgreSQL database (removes container and volume)
echo "🗑️  Resetting PostgreSQL database..."

# Stop and remove container
if podman ps -a --format "{{.Names}}" | grep -q "yellow-postgres"; then
    podman stop yellow-postgres 2>/dev/null
    podman rm yellow-postgres
    echo "📦 Container removed"
fi

# Remove volume
if podman volume ls --format "{{.Name}}" | grep -q "yellow_postgres_data"; then
    podman volume rm yellow_postgres_data
    echo "💾 Volume removed"
fi

echo "✅ Database reset complete"
echo "💡 Run 'bun run db:start' to create a fresh database"