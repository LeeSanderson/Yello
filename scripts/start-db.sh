#!/bin/bash

# Start PostgreSQL database using Podman
echo "🐘 Starting PostgreSQL database with Podman..."

# Check if container already exists
if podman ps -a --format "{{.Names}}" | grep -q "yellow-postgres"; then
    echo "📦 Container exists, starting..."
    podman start yellow-postgres
else
    echo "📦 Creating new container..."
    podman run -d \
        --name yellow-postgres \
        -e POSTGRES_DB=yellow_dev \
        -e POSTGRES_USER=yellow_user \
        -e POSTGRES_PASSWORD=yellow_password \
        -p 5432:5432 \
        -v yellow_postgres_data:/var/lib/postgresql/data \
        -v "$(pwd)/scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql" \
        postgres:15-alpine
fi

echo "⏳ Waiting for database to be ready..."
sleep 5

# Test connection
until podman exec yellow-postgres pg_isready -U yellow_user -d yellow_dev; do
    echo "⏳ Waiting for database..."
    sleep 2
done

echo "✅ Database is ready!"
echo "📊 Connection: postgresql://yellow_user:yellow_password@localhost:5432/yellow_dev"