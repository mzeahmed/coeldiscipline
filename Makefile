SHELL := /bin/bash

# Color settings
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NO_COLOR := \033[0m

.DEFAULT_GOAL := help

.PHONY: help check lint lintf format formatf env start ensure-metro open-devtools dev install logs clean kill

# Sourced first by every recipe that needs Node, Java or adb
ENV := source scripts/env.sh

# 8081 is left to other React Native projects
METRO_PORT ?= 8082
METRO_LOG := /tmp/coeldiscipline-metro.log

# ======================================================
# 🧭 Daily usage (simple)
#
#   make start
#     → Start the Metro server (JS) only
#
#   make dev
#     → Build + install + launch the Android app (debug, through Metro)
#
#   make install
#     → Build + install the standalone app on the phone (no Metro)
#
#   make logs
#     → Show Android logs (React Native JS)
# ======================================================

help:
	@printf "\n$(YELLOW)🛠️  Available commands:$(NO_COLOR)\n\n"
	@printf "$(GREEN)📱 Build & Run:$(NO_COLOR)\n"
	@printf "  make dev              → Clean + Build + Run DEV (requires Metro)\n\n"
	@printf "$(GREEN)📲 Install on the phone:$(NO_COLOR)\n"
	@printf "  make install          → Build + install the standalone APK (without uninstalling)\n\n"
	@printf "$(GREEN)🔧 Utilities:$(NO_COLOR)\n"
	@printf "  make check            → Formatting, types, lint and tests\\n"
	@printf "  make lint             → Check with ESLint\\n"
	@printf "  make lintf            → Fix with ESLint (--fix)\\n"
	@printf "  make format           → Check formatting (no changes)\\n"
	@printf "  make formatf          → Reformat (ESLint --fix then Prettier)\\n"
	@printf "  make start            → Start Metro (JS only)\n"
	@printf "  make logs             → Android React Native logs\n"
	@printf "  make clean            → Clean Gradle + caches\n"
	@printf "  make kill             → Kill Metro + restart ADB\n\n"

# 🔹 Same verifications as the CI
check:
	$(ENV) && npm run check

lint:
	@printf "$(YELLOW)Checking with ESLint...$(NO_COLOR)\n"
	@$(ENV) && npm run lint
	@printf "$(GREEN)ESLint check done$(NO_COLOR)\n"

lintf:
	@printf "$(YELLOW)Fixing with ESLint...$(NO_COLOR)\n"
	@$(ENV) && npm run lint:fix
	@printf "$(GREEN)ESLint fix done$(NO_COLOR)\n"

# ESLint adds the blank lines, which Prettier only preserves
formatf:
	@printf "$(YELLOW)Reformatting...$(NO_COLOR)\n"
	@$(ENV) && npm run lint:fix && npm run format
	@printf "$(GREEN)Reformatting done$(NO_COLOR)\n"

format:
	@printf "$(YELLOW)Checking formatting...$(NO_COLOR)\n"
	@$(ENV) && npm run format:check
	@printf "$(GREEN)Formatting check done$(NO_COLOR)\n"

env:
	@$(ENV) && echo "Environment loaded"

# 🔹 Metro only (useful when the app is already installed)
start:
	@printf "$(YELLOW)Starting Metro...$(NO_COLOR)\n"
	@rm -rf node_modules/.cache
	@rm -rf /tmp/metro-*
	@$(ENV) && npx react-native start --port $(METRO_PORT) --reset-cache

# 🔹 Makes sure Metro is running before `dev`: `react-native run-android`
#   tries to start its own Metro in a new graphical terminal, which fails
#   silently outside a regular interactive terminal (SSH, IDE, CI). So we
#   start it ourselves in the background and wait until it responds.
ensure-metro:
	@if curl -s -o /dev/null http://localhost:$(METRO_PORT)/status; then \
		printf "$(GREEN)✅ Metro already running on port $(METRO_PORT)$(NO_COLOR)\\n" ; \
	else \
		printf "$(YELLOW)🚀 Starting Metro in the background (log: $(METRO_LOG))...$(NO_COLOR)\\n" ; \
		rm -rf node_modules/.cache /tmp/metro-* ; \
		$(ENV) ; \
		( nohup npx react-native start --port $(METRO_PORT) --reset-cache > $(METRO_LOG) 2>&1 & ) ; \
		for i in $$(seq 1 30); do \
			curl -s -o /dev/null http://localhost:$(METRO_PORT)/status && break ; \
			sleep 1 ; \
		done ; \
		curl -s -o /dev/null http://localhost:$(METRO_PORT)/status || { \
			printf "$(RED)❌ Metro did not start, see $(METRO_LOG)$(NO_COLOR)\\n" ; exit 1 ; \
		} ; \
	fi

# 🔹 Opens React Native DevTools on the target connected to Metro (same as
#   the "j" key). The target only shows up in /json/list once the JS bundle
#   is loaded on the device, hence the polling.
open-devtools:
	@printf "$(YELLOW)🔍 Waiting for the app to connect to Metro before opening DevTools...$(NO_COLOR)\\n" ; \
	TARGET_ID="" ; \
	for i in $$(seq 1 30); do \
		TARGET_ID=$$(curl -s -X POST http://localhost:$(METRO_PORT)/json/list | jq -r '.[0].id // empty' 2>/dev/null) ; \
		if [ -n "$$TARGET_ID" ]; then break ; fi ; \
		sleep 1 ; \
	done ; \
	if [ -z "$$TARGET_ID" ]; then \
		printf "$(YELLOW)⚠️  No debug target found, React Native DevTools not opened (app not connected to Metro yet?)$(NO_COLOR)\\n" ; \
	else \
		curl -s -X POST "http://localhost:$(METRO_PORT)/open-debugger?target=$$TARGET_ID" -o /dev/null ; \
		printf "$(GREEN)🐞 React Native DevTools opened$(NO_COLOR)\\n" ; \
	fi

# 🔹 Full DEV: build + install + launch + open React Native DevTools
dev: clean ensure-metro
	@printf "$(YELLOW)Launching the Android development app...$(NO_COLOR)\n"
	$(ENV) && npx react-native run-android --no-packager --port $(METRO_PORT) --appIdSuffix debug
	@$(MAKE) open-devtools
	@printf "$(GREEN)Android development app launched$(NO_COLOR)\n"

# Release APK (embedded JS, signed with the personal key) installed on the
# connected phone, app data preserved. Runs without the computer or Metro.
install:
	@printf "$(YELLOW)Building and installing the APK...$(NO_COLOR)\n"
	$(ENV) && cd android && ./gradlew assembleRelease
	$(ENV) && adb install -r android/app/build/outputs/apk/release/app-release.apk
	@printf "$(GREEN)APK installed$(NO_COLOR)\n"

logs:
	@printf "$(YELLOW)Showing Android React Native logs...$(NO_COLOR)\n"
	@bash scripts/logs-android.sh

# No `adb uninstall` here: it would wipe the app data on the phone
clean:
	@printf "$(YELLOW)Cleaning Gradle and caches...$(NO_COLOR)\n"
	rm -rf android/app/.cxx node_modules/*/android/.cxx
	$(ENV) && cd android && ./gradlew clean
	rm -rf node_modules/.cache
	rm -rf /tmp/metro-*
	@printf "$(GREEN)Cleaning done$(NO_COLOR)\n"

kill:
	@printf "$(YELLOW)Stopping Metro and restarting ADB...$(NO_COLOR)\n"
	-pkill -f "[r]eact-native start --port $(METRO_PORT)"
	$(ENV) && adb kill-server && adb start-server && adb devices
	@printf "$(GREEN)Metro stopped and ADB restarted$(NO_COLOR)\n"
