#!/bin/bash

###############################################################################
# TEST RUNNER WITH DEV SERVER
# 
# This script starts the dev server automatically, waits for it to be ready,
# runs the test suite, and then gracefully shuts down the server.
#
# Usage:
#   ./scripts/test-with-dev.sh [test-type]
#   
# Examples:
#   ./scripts/test-with-dev.sh                  # Run all tests
#   ./scripts/test-with-dev.sh integration      # Run integration tests
#   ./scripts/test-with-dev.sh stress           # Run stress tests
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_TYPE="${1:-}"
API_PORT="${API_PORT:-5001}"
STARTUP_TIMEOUT=90
DEV_PID=""
EXIT_CODE=0

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

log_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

log_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

# Check if port is available
check_port() {
    if lsof -Pi :$API_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Wait for API to be ready
wait_for_api() {
    local counter=0
    log_info "Waiting for API to start on port $API_PORT..."
    
    while [ $counter -lt $STARTUP_TIMEOUT ]; do
        if check_port; then
            log_success "API is ready!"
            return 0
        fi
        counter=$((counter + 1))
        sleep 1
    done
    
    log_error "API failed to start within $STARTUP_TIMEOUT seconds"
    return 1
}

# Kill dev server gracefully
cleanup() {
    if [ -n "$DEV_PID" ] && kill -0 $DEV_PID 2>/dev/null; then
        log_info "Shutting down dev server (PID: $DEV_PID)..."
        kill -TERM $DEV_PID 2>/dev/null || true
        wait $DEV_PID 2>/dev/null || true
        log_success "Dev server stopped"
    fi
    exit $EXIT_CODE
}

# Setup exit trap
trap cleanup EXIT

# Main execution
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Test Runner With Dev Server - IITKart Payment Branch${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}\n"

# Check Node environment
log_info "Environment setup:"
echo "  Node version: $(node --version)"
echo "  NPM version: $(npm --version)"

# Kill any existing process on the port
if check_port; then
    log_warn "Port $API_PORT is already in use. Attempting to free it..."
    lsof -Pi :$API_PORT -sTCP:LISTEN -t | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Start dev server in background
log_info "Starting dev server..."
npm run dev > /tmp/iitkart-dev.log 2>&1 &
DEV_PID=$!
log_success "Dev server started (PID: $DEV_PID)"

# Wait for API to be ready
if ! wait_for_api; then
    log_error "Failed to start API server"
    EXIT_CODE=1
    exit 1
fi

# Run appropriate test suite
echo -e "\n${BLUE}Running Test Suite${NC}\n"

case ${TEST_TYPE} in
    integration)
        log_info "Running integration tests..."
        API_URL="http://localhost:${API_PORT}/api" npm run test:integration
        EXIT_CODE=$?
        ;;
    stress)
        log_info "Running stress tests..."
        API_URL="http://localhost:${API_PORT}/api" npm run test:stress
        EXIT_CODE=$?
        ;;
    frontend)
        log_info "Running frontend tests..."
        npm run test:frontend
        EXIT_CODE=$?
        ;;
    watch)
        log_info "Running tests in watch mode..."
        API_URL="http://localhost:${API_PORT}/api" npm run test:watch
        EXIT_CODE=$?
        ;;
    coverage)
        log_info "Running tests with coverage report..."
        API_URL="http://localhost:${API_PORT}/api" npm run test:coverage
        EXIT_CODE=$?
        ;;
    *)
        log_info "Running all tests with coverage..."
        API_URL="http://localhost:${API_PORT}/api" npm test
        EXIT_CODE=$?
        ;;
esac

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✓ All Tests Passed Successfully!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════${NC}\n"
else
    echo -e "\n${RED}════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}  ✗ Tests Failed${NC}"
    echo -e "${RED}════════════════════════════════════════════════════════${NC}\n"
fi

exit $EXIT_CODE
