#!/usr/bin/env bash
# =============================================================================
# AI-Powered Real-Time Chat Platform — One-Command Startup Script
#
# Usage:
#   ./start.sh            — full start (setup .env if missing, build, run)
#   ./start.sh stop       — stop all containers
#   ./start.sh restart    — stop + start
#   ./start.sh logs       — tail all container logs
#   ./start.sh test       — run backend + frontend tests
#   ./start.sh clean      — stop containers and remove volumes (wipe data)
#   ./start.sh status     — show container health status
#   ./start.sh build      — build images only (no start)
#
# Requirements: Docker Desktop (with Compose v2), bash
# =============================================================================

set -euo pipefail

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${BLUE}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }
header()  { echo -e "\n${BOLD}${CYAN}═══ $* ═══${RESET}\n"; }

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
ENV_EXAMPLE="$SCRIPT_DIR/.env.example"
COMPOSE_FILE="$SCRIPT_DIR/infra/docker-compose.yml"
COMPOSE_CMD="docker compose -f $COMPOSE_FILE --env-file $ENV_FILE"

# ── Prerequisite checks ───────────────────────────────────────────────────────
check_prerequisites() {
    header "Checking prerequisites"

    if ! command -v docker &>/dev/null; then
        error "Docker is not installed. Please install Docker Desktop from https://docker.com"
        exit 1
    fi
    success "Docker found: $(docker --version)"

    if ! docker compose version &>/dev/null 2>&1; then
        error "Docker Compose v2 not found. Please update Docker Desktop."
        exit 1
    fi
    success "Docker Compose found: $(docker compose version --short 2>/dev/null || echo 'v2')"

    if ! docker info &>/dev/null 2>&1; then
        error "Docker daemon is not running. Please start Docker Desktop."
        exit 1
    fi
    success "Docker daemon is running"
}

# ── .env setup ────────────────────────────────────────────────────────────────
setup_env() {
    if [[ -f "$ENV_FILE" ]]; then
        success ".env file already exists"
        return
    fi

    header "Setting up environment"
    warn ".env file not found. Creating from .env.example..."

    if [[ ! -f "$ENV_EXAMPLE" ]]; then
        error ".env.example not found. Cannot create .env automatically."
        exit 1
    fi

    cp "$ENV_EXAMPLE" "$ENV_FILE"

    # Auto-generate secure random secrets
    if command -v python3 &>/dev/null; then
        JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
        JWT_REFRESH=$(python3 -c "import secrets; print(secrets.token_hex(32))")
        FLASK_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(24))")
        DJANGO_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")

        # Replace placeholder values in .env
        sed -i.bak \
            -e "s|JWT_SECRET_KEY=change-me-jwt-access-secret-key|JWT_SECRET_KEY=$JWT_SECRET|" \
            -e "s|JWT_REFRESH_SECRET_KEY=change-me-jwt-refresh-secret-key|JWT_REFRESH_SECRET_KEY=$JWT_REFRESH|" \
            -e "s|FLASK_SECRET_KEY=change-me-to-a-random-32-char-string|FLASK_SECRET_KEY=$FLASK_SECRET|" \
            -e "s|DJANGO_SECRET_KEY=change-me-django-secret-key-long-random-string|DJANGO_SECRET_KEY=$DJANGO_SECRET|" \
            "$ENV_FILE" 2>/dev/null || true
        rm -f "$ENV_FILE.bak"
        success "Generated random secrets for JWT, Flask, and Django"
    fi

    echo ""
    warn "╔══════════════════════════════════════════════════════════════╗"
    warn "║  IMPORTANT: Edit .env and add your API keys before running   ║"
    warn "║  Required for full AI features:                              ║"
    warn "║    GROQ_API_KEY      — https://console.groq.com              ║"
    warn "║    AWS_* vars        — for S3 file uploads (optional)        ║"
    warn "║    LANGSMITH_API_KEY — for AI tracing (optional)             ║"
    warn "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    read -r -p "Press Enter to continue with defaults, or Ctrl+C to edit .env first... "
}

# ── Build ─────────────────────────────────────────────────────────────────────
build_images() {
    header "Building Docker images"
    info "This may take 5-15 minutes on first run (downloading base images + dependencies)..."
    $COMPOSE_CMD build --parallel
    success "All images built successfully"
}

# ── Start ─────────────────────────────────────────────────────────────────────
start_services() {
    header "Starting all services"
    $COMPOSE_CMD up -d --remove-orphans
    success "All containers started"
    wait_for_healthy
}

# ── Health wait ───────────────────────────────────────────────────────────────
wait_for_healthy() {
    header "Waiting for services to become healthy"
    info "Checking: postgres, redis, mysql, backend-flask, backend-django, nginx..."

    local services=("postgres" "redis" "mysql" "backend-flask" "backend-django")
    local max_wait=120  # seconds
    local interval=5
    local elapsed=0

    for svc in "${services[@]}"; do
        local waited=0
        echo -n "  Waiting for $svc "
        while true; do
            local status
            status=$(docker inspect --format='{{.State.Health.Status}}' \
                     "$(docker compose -f "$COMPOSE_FILE" ps -q "$svc" 2>/dev/null)" \
                     2>/dev/null || echo "starting")

            if [[ "$status" == "healthy" ]]; then
                echo -e " ${GREEN}✓${RESET}"
                break
            fi

            if [[ $waited -ge $max_wait ]]; then
                echo -e " ${YELLOW}(timeout — may still be starting)${RESET}"
                break
            fi

            echo -n "."
            sleep $interval
            waited=$((waited + interval))
        done
    done

    echo ""
    success "Services are ready"
}

# ── Print access URLs ─────────────────────────────────────────────────────────
print_urls() {
    header "Platform is running"
    echo -e "  ${BOLD}React App${RESET}       →  ${GREEN}http://localhost${RESET}"
    echo -e "  ${BOLD}REST API${RESET}        →  ${GREEN}http://localhost/api/v1/${RESET}"
    echo -e "  ${BOLD}WebSocket${RESET}       →  ${GREEN}ws://localhost/socket.io/${RESET}"
    echo -e "  ${BOLD}Django Admin${RESET}    →  ${GREEN}http://localhost/admin/${RESET}  (admin / adminpass)"
    echo -e "  ${BOLD}Health check${RESET}    →  ${GREEN}http://localhost/health${RESET}"
    echo ""
    echo -e "  ${BOLD}Useful commands:${RESET}"
    echo -e "    ${CYAN}./start.sh logs${RESET}    — tail all logs"
    echo -e "    ${CYAN}./start.sh status${RESET}  — container health"
    echo -e "    ${CYAN}./start.sh test${RESET}    — run test suites"
    echo -e "    ${CYAN}./start.sh stop${RESET}    — stop everything"
    echo ""
}

# ── Stop ──────────────────────────────────────────────────────────────────────
stop_services() {
    header "Stopping all services"
    $COMPOSE_CMD down
    success "All containers stopped (data volumes preserved)"
}

# ── Clean ─────────────────────────────────────────────────────────────────────
clean_all() {
    header "Cleaning up (stop + remove volumes)"
    warn "This will DELETE all database data. Press Ctrl+C to cancel..."
    sleep 3
    $COMPOSE_CMD down -v --remove-orphans
    success "All containers and volumes removed"
}

# ── Logs ──────────────────────────────────────────────────────────────────────
show_logs() {
    info "Tailing logs for all services (Ctrl+C to stop)..."
    $COMPOSE_CMD logs -f --tail=50
}

# ── Status ────────────────────────────────────────────────────────────────────
show_status() {
    header "Container Status"
    $COMPOSE_CMD ps
}

# ── Tests ─────────────────────────────────────────────────────────────────────
run_tests() {
    header "Running test suites"

    # Backend pytest
    echo -e "\n${BOLD}→ Backend tests (pytest)${RESET}"
    if [[ -d "$SCRIPT_DIR/backend-flask" ]]; then
        if command -v python3 &>/dev/null; then
            cd "$SCRIPT_DIR/backend-flask"
            if [[ -f "requirements.txt" ]]; then
                python3 -m pip install -q -r requirements.txt 2>/dev/null || true
            fi
            python3 -m pytest tests/ -v --tb=short --timeout=30 2>&1 | tail -30 || true
            cd "$SCRIPT_DIR"
        else
            # Run inside the running Flask container
            $COMPOSE_CMD exec backend-flask pytest tests/ -v --tb=short 2>&1 | tail -30 || true
        fi
    fi

    # Frontend vitest
    echo -e "\n${BOLD}→ Frontend tests (Vitest)${RESET}"
    if [[ -d "$SCRIPT_DIR/frontend" ]]; then
        if command -v npm &>/dev/null; then
            cd "$SCRIPT_DIR/frontend"
            npm ci --silent 2>/dev/null || true
            npm run test -- --run 2>&1 | tail -30 || true
            cd "$SCRIPT_DIR"
        else
            warn "npm not found — skipping frontend tests"
        fi
    fi

    success "Test run complete"
}

# ── Main entrypoint ───────────────────────────────────────────────────────────
main() {
    echo -e "${BOLD}${CYAN}"
    echo "╔═══════════════════════════════════════════════════╗"
    echo "║   AI-Powered Real-Time Chat Platform              ║"
    echo "║   Full-Stack Portfolio Capstone                   ║"
    echo "╚═══════════════════════════════════════════════════╝"
    echo -e "${RESET}"

    local cmd="${1:-start}"

    case "$cmd" in
        start)
            check_prerequisites
            setup_env
            build_images
            start_services
            print_urls
            ;;
        stop)
            $COMPOSE_CMD down
            success "Stopped"
            ;;
        restart)
            $COMPOSE_CMD down
            setup_env
            build_images
            start_services
            print_urls
            ;;
        build)
            check_prerequisites
            setup_env
            build_images
            ;;
        logs)
            show_logs
            ;;
        status)
            show_status
            ;;
        test)
            run_tests
            ;;
        clean)
            clean_all
            ;;
        help|--help|-h)
            echo "Usage: ./start.sh [command]"
            echo ""
            echo "Commands:"
            echo "  start    (default) — setup, build, and run the full stack"
            echo "  stop               — stop all containers"
            echo "  restart            — stop + start"
            echo "  build              — build images only"
            echo "  logs               — tail all container logs"
            echo "  status             — show container health"
            echo "  test               — run backend + frontend test suites"
            echo "  clean              — stop + remove all volumes (wipes DB data)"
            echo "  help               — show this message"
            ;;
        *)
            error "Unknown command: $cmd"
            echo "Run ./start.sh help for usage"
            exit 1
            ;;
    esac
}

main "$@"
