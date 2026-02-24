#!/bin/bash

# API Monitor - Quick Setup Script
# This script sets up the development environment

set -e

echo "API Monitor - Development Setup"
echo "================================"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js 20+ first."
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✓ Node.js $(node --version)"
echo "✓ Docker $(docker --version)"
echo "✓ Docker Compose $(docker-compose --version)"
echo ""

# Setup server
echo "Setting up server..."
cd server

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✓ Created server/.env (please configure before running)"
else
    echo "✓ server/.env already exists"
fi

echo "Installing server dependencies..."
npm install

echo "Generating Prisma client..."
npx prisma generate

cd ..

# Setup dashboard
echo ""
echo "Setting up dashboard..."
cd dashboard

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✓ Created dashboard/.env"
else
    echo "✓ dashboard/.env already exists"
fi

echo "Installing dashboard dependencies..."
npm install

cd ..

# Start Docker services
echo ""
echo "Starting Docker services (PostgreSQL, Redis)..."
docker-compose up -d postgres redis

echo "Waiting for services to be ready..."
sleep 10

# Run migrations
echo ""
echo "Running database migrations..."
cd server
npx prisma migrate dev --name init

echo ""
echo "Seeding database with demo data..."
npm run prisma:seed

cd ..

echo ""
echo "================================"
echo "✓ Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Configure server/.env with your SMTP credentials (optional)"
echo "2. Start the server: cd server && npm run dev"
echo "3. Start the dashboard: cd dashboard && npm run dev"
echo "4. Visit http://localhost:5173"
echo "5. Login with: demo@apimonitor.dev / demo123"
echo ""
echo "Or use Docker Compose:"
echo "  docker-compose up"
echo ""
echo "API Documentation: http://localhost:3001/api-docs"
echo "Health Check: http://localhost:3001/health"
echo ""
