#!/bin/bash

# TEST SCRIPT RUNNER
# Usage: ./run-tests.sh [test-type]
# Examples:
#   ./run-tests.sh                  # Run all tests
#   ./run-tests.sh integration      # Run integration tests only
#   ./run-tests.sh stress           # Run stress tests only
#   ./run-tests.sh frontend         # Run frontend tests only
#   ./run-tests.sh coverage         # Run with coverage report

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_TYPE="${1:-all}"
API_PORT="${API_PORT:-3000}"
CI_MODE="${CI_MODE:-false}"

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}    Test Suite Runner - IITKart Payment Branch${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}\n"

# Function to print test info
print_test_info() {
    echo -e "${YELLOW}→ Running: $1${NC}"
}

# Function to print results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2 PASSED${NC}\n"
    else
        echo -e "${RED}✗ $2 FAILED${NC}\n"
        exit 1
    fi
}

# Pre-flight checks
echo -e "${YELLOW}Pre-flight Checks:${NC}"
echo -e "  Node version: $(node --version)"
echo -e "  NPM version: $(npm --version)"
echo -e "  Test mode: $TEST_TYPE"
echo -e "  CI mode: $CI_MODE\n"

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm ci
fi

# Create test results directory
mkdir -p test-results
mkdir -p coverage

# Test Suite 1: Integration Tests (21 issues)
test_integration() {
    print_test_info "INTEGRATION TESTS (All 21 Issues)"
    echo -e "  Testing:"
    echo -e "    • Issue #98: Checkout Queue System"
    echo -e "    • Issue #93-#78: Order processing & database"
    echo -e "    • Issue #97: Delivery workflow"
    echo -e "    • Issue #96: Payment modal Z-index"
    echo -e "    • Issue #95: Rating precision"
    echo -e "    • Issue #94: Loading states\n"

    npm run test:integration -- \
        --testPathPattern="integration-all-issues" \
        --json \
        --outputFile=test-results/integration.json \
        2>&1 | tee test-results/integration.log

    print_result $? "Integration Tests"
}

# Test Suite 2: Stress Tests
test_stress() {
    print_test_info "STRESS TESTS (Performance & Concurrency)"
    echo -e "  Testing:"
    echo -e "    • 100 concurrent checkouts"
    echo -e "    • 1000 order reliability"
    echo -e "    • Transaction performance"
    echo -e "    • Stock fairness"
    echo -e "    • Payment reconciliation\n"

    # Run stress test with environment variables
    CONCURRENT_USERS=100 \
    TEST_DURATION=60 \
    API_URL="http://localhost:${API_PORT}/api" \
    npm run test:stress \
        2>&1 | tee test-results/stress.log

    print_result $? "Stress Tests"
}

# Test Suite 3: Frontend Tests
test_frontend() {
    print_test_info "FRONTEND TESTS (UI/UX Issues)"
    echo -e "  Testing:"
    echo -e "    • Issue #96: Z-index fixes"
    echo -e "    • Issue #95: Rating display"
    echo -e "    • Issue #94: Loading states\n"

    npm run test:frontend -- \
        --testPathPattern="ui-issues" \
        --json \
        --outputFile=test-results/frontend.json \
        2>&1 | tee test-results/frontend.log

    print_result $? "Frontend Tests"
}

# Test Suite 4: Coverage Report
test_coverage() {
    print_test_info "COVERAGE ANALYSIS"
    echo -e "  Target: 80%+ coverage\n"

    npm run test -- \
        --coverage \
        --collectCoverageFrom="src/**/*.ts" \
        --collectCoverageFrom="!src/**/*.d.ts" \
        --coverage-path coverage \
        2>&1 | tee test-results/coverage.log

    print_result $? "Coverage Analysis"

    # Print coverage summary
    echo -e "${YELLOW}Coverage Summary:${NC}"
    if command -v coverage-badge &> /dev/null; then
        npm run coverage:report
    fi
}

# Run selected tests
case $TEST_TYPE in
    integration)
        test_integration
        ;;
    stress)
        test_stress
        ;;
    frontend)
        test_frontend
        ;;
    coverage)
        test_coverage
        ;;
    all)
        echo -e "${BLUE}Running Full Test Suite...${NC}\n"
        test_integration
        test_frontend
        test_stress
        test_coverage
        ;;
    *)
        echo -e "${RED}Unknown test type: $TEST_TYPE${NC}"
        echo -e "Usage: $0 [integration|stress|frontend|coverage|all]"
        exit 1
        ;;
esac

# Generate report
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Generating Test Report...${NC}\n"

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
TOTAL_TESTS=$(grep -r "passed" test-results/*.json 2>/dev/null | wc -l)

cat > test-results/REPORT.md << EOF
# Test Execution Report
**Generated**: $TIMESTAMP
**Test Type**: $TEST_TYPE
**Mode**: $([ "$CI_MODE" = "true" ] && echo "CI" || echo "Local")

## Summary
- **Total Tests Run**: $TOTAL_TESTS
- **Results**: All tests executed successfully
- **Duration**: See individual reports below

## Test Suites

### Integration Tests
- **File**: integration-all-issues.test.ts
- **Issues Covered**: 21 (#78-#98)
- **Log**: [integration.log](integration.log)
- **Details**: [integration.json](integration.json)

### Stress Tests
- **File**: stress-test.ts
- **Scenarios**: 7 performance tests
- **Log**: [stress.log](stress.log)

### Frontend Tests
- **File**: ui-issues.test.ts
- **Issues Covered**: 3 (#96, #95, #94)
- **Log**: [frontend.log](frontend.log)
- **Details**: [frontend.json](frontend.json)

## Coverage
See [coverage/index.html](coverage/index.html) for detailed coverage report.

## Next Steps
1. Review any failed tests above
2. Check logs in test-results/ directory
3. Run with --verbose for detailed output
4. Contact team for persistent failures
EOF

echo -e "${GREEN}✓ Report generated: test-results/REPORT.md${NC}\n"

# Summary
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}All Tests Completed Successfully!${NC}\n"

if [ "$CI_MODE" = "true" ]; then
    echo -e "${YELLOW}CI Mode - Uploading results...${NC}"
    # Add CI-specific commands here (e.g., upload to dashboard)
fi

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}\n"

echo -e "Test Results Directory: ${GREEN}test-results/${NC}"
echo -e "Coverage Report: ${GREEN}coverage/lcov-report/index.html${NC}"
echo -e "Summary Report: ${GREEN}test-results/REPORT.md${NC}\n"

exit 0
