#!/bin/bash

# Setup and Test Script for Retell Form Integration
# Run this script to quickly set up and test your project

echo "🚀 Retell Form Integration - Setup & Test Script"
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [[ ! -f "backend/package.json" || ! -f "frontend/package.json" ]]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Starting setup process..."

# Backend setup
print_status "Setting up backend..."
cd backend

# Install backend dependencies
if ! npm install; then
    print_error "Failed to install backend dependencies"
    exit 1
fi
print_success "Backend dependencies installed"

# Check if .env file exists
if [[ ! -f ".env" ]]; then
    if [[ -f ".env.example" ]]; then
        print_warning ".env file not found. Copying from .env.example..."
        cp .env.example .env
        print_warning "Please edit backend/.env file with your actual credentials before proceeding"
        echo ""
        echo "Required environment variables:"
        echo "- RETELL_API_KEY=your_retell_api_key_here"
        echo "- RETELL_AGENT_ID=your_retell_agent_id_here"
        echo "- EMAIL_PASS=your_gmail_app_password_here"
        echo ""
        read -p "Press Enter after you've updated the .env file..."
    else
        print_error ".env.example file not found"
        exit 1
    fi
fi

# Check for required environment variables
source .env
if [[ -z "$RETELL_API_KEY" || "$RETELL_API_KEY" == "your_retell_api_key_here" ]]; then
    print_error "RETELL_API_KEY not set in .env file"
    exit 1
fi

if [[ -z "$RETELL_AGENT_ID" || "$RETELL_AGENT_ID" == "your_retell_agent_id_here" ]]; then
    print_error "RETELL_AGENT_ID not set in .env file"
    exit 1
fi

if [[ -z "$EMAIL_PASS" || "$EMAIL_PASS" == "your_gmail_app_password_here" ]]; then
    print_error "EMAIL_PASS not set in .env file"
    exit 1
fi

print_success "Environment variables configured"

# Frontend setup
print_status "Setting up frontend..."
cd ../frontend

# Install frontend dependencies
if ! npm install; then
    print_error "Failed to install frontend dependencies"
    exit 1
fi
print_success "Frontend dependencies installed"

# Return to project root
cd ..

print_success "Setup completed successfully!"
echo ""

# Test options
echo "🧪 Test Options:"
echo "1. Start backend server (development mode)"
echo "2. Start frontend server (development mode)"
echo "3. Test backend health endpoint"
echo "4. Test backend status endpoint"
echo "5. Start both servers (in background)"
echo "6. Exit"
echo ""

while true; do
    read -p "Choose an option (1-6): " choice
    case $choice in
        1)
            print_status "Starting backend server..."
            cd backend && npm run dev
            break
            ;;
        2)
            print_status "Starting frontend server..."
            cd frontend && npm run dev
            break
            ;;
        3)
            print_status "Testing backend health endpoint..."
            if command -v curl &> /dev/null; then
                # Start backend in background for testing
                cd backend && npm start &
                BACKEND_PID=$!
                sleep 3
                
                # Test health endpoint
                if curl -s http://localhost:3000/health > /dev/null; then
                    print_success "Health endpoint is working!"
                    curl -s http://localhost:3000/health | jq . 2>/dev/null || curl -s http://localhost:3000/health
                else
                    print_error "Health endpoint test failed"
                fi
                
                # Cleanup
                kill $BACKEND_PID 2>/dev/null
            else
                print_warning "curl not found. Please install curl to test endpoints"
            fi
            ;;
        4)
            print_status "Testing backend status endpoint..."
            if command -v curl &> /dev/null; then
                # Start backend in background for testing
                cd backend && npm start &
                BACKEND_PID=$!
                sleep 3
                
                # Test status endpoint
                if curl -s http://localhost:3000/api/status > /dev/null; then
                    print_success "Status endpoint is working!"
                    curl -s http://localhost:3000/api/status | jq . 2>/dev/null || curl -s http://localhost:3000/api/status
                else
                    print_error "Status endpoint test failed"
                fi
                
                # Cleanup
                kill $BACKEND_PID 2>/dev/null
            else
                print_warning "curl not found. Please install curl to test endpoints"
            fi
            ;;
        5)
            print_status "Starting both servers..."
            
            # Start backend in background
            cd backend && npm run dev &
            BACKEND_PID=$!
            
            # Give backend time to start
            sleep 3
            
            # Start frontend in background
            cd ../frontend && npm run dev &
            FRONTEND_PID=$!
            
            print_success "Both servers started!"
            echo ""
            echo "📊 Server Information:"
            echo "Backend: http://localhost:3000"
            echo "Frontend: http://localhost:5173 (typical Vite port)"
            echo "Health Check: http://localhost:3000/health"
            echo ""
            echo "Press Ctrl+C to stop both servers"
            
            # Wait for user to stop servers
            trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; print_status 'Servers stopped'; exit 0" SIGINT
            wait
            ;;
        6)
            print_status "Exiting..."
            exit 0
            ;;
        *)
            print_warning "Invalid option. Please choose 1-6."
            ;;
    esac
done
