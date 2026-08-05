# =============================================================================
# AI-Powered Real-Time Chat Platform — Makefile
#
# All commands delegate to start.sh for consistent behaviour.
#
# Usage:
#   make           — start the full stack (default)
#   make start     — same as above
#   make stop      — stop all containers
#   make restart   — stop + start
#   make build     — build images only
#   make logs      — tail logs
#   make status    — show container health
#   make test      — run all tests
#   make clean     — stop + remove volumes (wipes DB data)
# =============================================================================

.PHONY: all start stop restart build logs status test clean help

SHELL := /bin/bash

all: start

start:
	@chmod +x start.sh && bash start.sh start

stop:
	@bash start.sh stop

restart:
	@bash start.sh restart

build:
	@bash start.sh build

logs:
	@bash start.sh logs

status:
	@bash start.sh status

test:
	@bash start.sh test

clean:
	@bash start.sh clean

help:
	@bash start.sh help
