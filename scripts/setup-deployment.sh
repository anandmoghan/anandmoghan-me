#!/bin/bash

# Deployment Setup Script
# This script helps configure Cloudflare Pages deployment

set -e

echo "🚀 Cloudflare Pages Deployment Setup"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if required tools are installed
check_dependencies() {
    echo "📦 Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm is not installed${NC}"
        exit 1
    fi
    
    if ! command -v wrangler &> /dev/null; then
        echo -e "${YELLOW}⚠️  Wrangler CLI is not installed globally${NC}"
        echo "   Using local wrangler from node_modules"
    fi
    
    echo -e "${GREEN}✅ All dependencies are installed${NC}"
    echo ""
}

# Verify environment variables
check_env_vars() {
    echo "🔐 Checking environment variables..."
    
    if [ ! -f .env ]; then
        echo -e "${YELLOW}⚠️  .env file not found${NC}"
        echo "   Creating from .env.example..."
        cp .env.example .env
        echo -e "${YELLOW}   Please update .env with your credentials${NC}"
        return 1
    fi
    
    # Source the .env file
    set -a
    source .env
    set +a
    
    # Check required variables
    REQUIRED_VARS=(
        "CLOUDFLARE_ACCOUNT_ID"
        "R2_ACCESS_KEY_ID"
        "R2_SECRET_ACCESS_KEY"
        "R2_BUCKET_NAME"
        "NEXT_PUBLIC_MEDIA_URL"
    )
    
    MISSING_VARS=()
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ] || [ "${!var}" == "your_"* ]; then
            MISSING_VARS+=("$var")
        fi
    done
    
    if [ ${#MISSING_VARS[@]} -ne 0 ]; then
        echo -e "${RED}❌ Missing or incomplete environment variables:${NC}"
        for var in "${MISSING_VARS[@]}"; do
            echo "   - $var"
        done
        echo ""
        echo "Please update .env file with your credentials"
        return 1
    fi
    
    echo -e "${GREEN}✅ All environment variables are set${NC}"
    echo ""
    return 0
}

# Test build
test_build() {
    echo "🔨 Testing build process..."
    
    if npm run build; then
        echo -e "${GREEN}✅ Build successful${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}❌ Build failed${NC}"
        echo "   Please fix build errors before deploying"
        return 1
    fi
}

# Setup Cloudflare Pages project
setup_pages_project() {
    echo "📄 Setting up Cloudflare Pages project..."
    
    if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
        echo -e "${YELLOW}⚠️  CLOUDFLARE_API_TOKEN not set${NC}"
        echo "   Please set it in your environment or .env file"
        echo "   You can create a token at: https://dash.cloudflare.com/profile/api-tokens"
        return 1
    fi
    
    # Check if project exists
    if npx wrangler pages project list | grep -q "anandmoghan-me"; then
        echo -e "${GREEN}✅ Cloudflare Pages project already exists${NC}"
    else
        echo "Creating Cloudflare Pages project..."
        npx wrangler pages project create anandmoghan-me --production-branch=main
        echo -e "${GREEN}✅ Cloudflare Pages project created${NC}"
    fi
    
    echo ""
}

# Setup R2 bucket
setup_r2_bucket() {
    echo "🪣 Setting up R2 bucket..."
    
    # Check if bucket exists
    if npx wrangler r2 bucket list | grep -q "$R2_BUCKET_NAME"; then
        echo -e "${GREEN}✅ R2 bucket already exists${NC}"
    else
        echo "Creating R2 bucket..."
        npx wrangler r2 bucket create "$R2_BUCKET_NAME"
        echo -e "${GREEN}✅ R2 bucket created${NC}"
    fi
    
    echo ""
}

# Display next steps
show_next_steps() {
    echo ""
    echo "✨ Setup Complete!"
    echo "================="
    echo ""
    echo "Next steps:"
    echo ""
    echo "1. Configure GitHub Secrets (for CI/CD):"
    echo "   - CLOUDFLARE_API_TOKEN"
    echo "   - CLOUDFLARE_ACCOUNT_ID"
    echo "   - R2_ACCESS_KEY_ID"
    echo "   - R2_SECRET_ACCESS_KEY"
    echo "   - R2_BUCKET_NAME"
    echo "   - CLOUDFLARE_PROJECT_NAME"
    echo ""
    echo "2. Configure custom domain in Cloudflare Pages:"
    echo "   - Main site: anandmoghan.me"
    echo "   - Media subdomain: media.anandmoghan.me"
    echo ""
    echo "3. Deploy to production:"
    echo "   npm run deploy"
    echo ""
    echo "4. Or push to main branch for automatic deployment via GitHub Actions"
    echo ""
    echo "📚 For more information, see docs/DEPLOYMENT.md"
    echo ""
}

# Main execution
main() {
    check_dependencies
    
    if check_env_vars; then
        if test_build; then
            setup_pages_project
            setup_r2_bucket
            show_next_steps
        else
            echo -e "${RED}❌ Setup failed: Build errors${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Setup failed: Missing environment variables${NC}"
        echo ""
        echo "Please update .env file and run this script again"
        exit 1
    fi
}

# Run main function
main
