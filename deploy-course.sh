#!/bin/bash

echo "🚀 Deploying Course Service with displayName fix..."

# Build the application
echo "📦 Building application..."
npm run build

# Copy production env
echo "📋 Setting up production environment..."
cp .env.production dist/apps/course/

echo "✅ Build complete! Ready to deploy to server."
echo ""
echo "📋 Next steps:"
echo "1. Upload dist/apps/course folder to your server"
echo "2. Set AUTH_BASE_URL=https://api.skllracademy.com/s1/api in server environment"
echo "3. Restart the course service"
echo ""
echo "🎯 After deployment, displayName should not be null!"
