#!/bin/bash

# NFL Pick'Ems - Test Setup Script
# This script sets up the testing environment for local development

set -e

echo "🏈 NFL Pick'Ems - Test Setup"
echo "=============================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "Please install Node.js 18.x or 20.x from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node --version) found"

# Check if Yarn is installed
if ! command -v yarn &> /dev/null; then
    echo "⚠️  Yarn is not installed"
    echo "Installing Yarn..."
    
    # Try corepack first (comes with Node 16.10+)
    if command -v corepack &> /dev/null; then
        corepack enable
        echo "✅ Yarn installed via corepack"
    else
        echo "Installing Yarn via npm..."
        npm install -g yarn
        echo "✅ Yarn installed"
    fi
else
    echo "✅ Yarn $(yarn --version) found"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
yarn install

# Run tests
echo ""
echo "🧪 Running tests..."
yarn test

echo ""
echo "=============================="
echo "✅ Setup complete!"
echo ""
echo "Available commands:"
echo "  yarn test          - Run all tests"
echo "  yarn test:watch    - Run tests in watch mode"
echo ""
echo "Note: 66 tests covering all core functionality"
echo "Coverage metrics unavailable due to GAS architecture"
echo "=============================="

