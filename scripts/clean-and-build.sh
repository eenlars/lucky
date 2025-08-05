#!/bin/bash

# Script to clean node_modules and replicate Vercel build process
# This helps identify missing dependencies that might cause build errors

echo "🧹 Starting clean build process..."

# Save current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$SCRIPT_DIR/.."
APP_DIR="$ROOT_DIR/app"

echo "📍 Working from: $APP_DIR"

# Function to clean a directory
clean_directory() {
    local dir=$1
    local name=$2
    
    echo ""
    echo "🗑️  Cleaning $name..."
    
    if [ -d "$dir/node_modules" ]; then
        echo "  Removing $dir/node_modules..."
        rm -rf "$dir/node_modules"
    fi
    
    if [ -f "$dir/bun.lockb" ]; then
        echo "  Removing $dir/bun.lockb..."
        rm -f "$dir/bun.lockb"
    fi
    
    if [ -d "$dir/.next" ]; then
        echo "  Removing $dir/.next..."
        rm -rf "$dir/.next"
    fi
    
    if [ -d "$dir/dist" ]; then
        echo "  Removing $dir/dist..."
        rm -rf "$dir/dist"
    fi
}

# Clean all directories
clean_directory "$ROOT_DIR" "root"
clean_directory "$ROOT_DIR/runtime" "runtime"
clean_directory "$ROOT_DIR/shared" "shared"
clean_directory "$APP_DIR" "app"

echo ""
echo "✅ All directories cleaned!"
echo ""
echo "📦 Installing dependencies..."

# Install root dependencies
cd "$ROOT_DIR"
echo "  Installing root dependencies..."
bun install

# Install runtime dependencies
cd "$ROOT_DIR/runtime"
echo "  Installing runtime dependencies..."
bun install

# Install shared dependencies
cd "$ROOT_DIR/shared"
echo "  Installing shared dependencies..."
bun install

# Install app dependencies
cd "$APP_DIR"
echo "  Installing app dependencies..."
bun install

echo ""
echo "🔨 Running build process (mimicking Vercel)..."

# Build shared first
cd "$ROOT_DIR/shared"
echo "  Building shared..."
bun run build

# Then build app
cd "$APP_DIR"
echo "  Building app..."
bun run build

echo ""
echo "✨ Build process complete!"