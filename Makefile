SHELL := /bin/bash

# Color settings
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NO_COLOR := \033[0m

.DEFAULT_GOAL := help

.PHONY: help env start ensure-metro open-devtools dev install logs clean kill

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
	@printf "\n$(YELLOW)🛠️  Commandes disponibles :$(NO_COLOR)\n\n"
	@printf "$(GREEN)📱 Build & Run:$(NO_COLOR)\n"
	@printf "  make dev              → Clean + Build + Run DEV (nécessite Metro)\n\n"
	@printf "$(GREEN)📲 Installation sur le téléphone:$(NO_COLOR)\n"
	@printf "  make install          → Build + installer l'APK autonome (sans désinstaller)\n\n"
	@printf "$(GREEN)🔧 Utilitaires:$(NO_COLOR)\n"
	@printf "  make start            → Lancer Metro (JS only)\n"
	@printf "  make logs             → Logs Android React Native\n"
	@printf "  make clean            → Clean Gradle + caches\n"
	@printf "  make kill             → Kill Metro + restart ADB\n\n"

env:
	@$(ENV) && echo "Environnement chargé"

# 🔹 Metro only (useful when the app is already installed)
start:
	@printf "$(YELLOW)Démarrage de Metro...$(NO_COLOR)\n"
	@rm -rf node_modules/.cache
	@rm -rf /tmp/metro-*
	@$(ENV) && npx react-native start --port $(METRO_PORT) --reset-cache

# 🔹 Makes sure Metro is running before `dev`: `react-native run-android`
#   tries to start its own Metro in a new graphical terminal, which fails
#   silently outside a regular interactive terminal (SSH, IDE, CI). So we
#   start it ourselves in the background and wait until it responds.
ensure-metro:
	@if curl -s -o /dev/null http://localhost:$(METRO_PORT)/status; then \
		printf "$(GREEN)✅ Metro déjà lancé sur le port $(METRO_PORT)$(NO_COLOR)\\n" ; \
	else \
		printf "$(YELLOW)🚀 Démarrage de Metro en arrière-plan (log: $(METRO_LOG))...$(NO_COLOR)\\n" ; \
		rm -rf node_modules/.cache /tmp/metro-* ; \
		$(ENV) ; \
		( nohup npx react-native start --port $(METRO_PORT) --reset-cache > $(METRO_LOG) 2>&1 & ) ; \
		for i in $$(seq 1 30); do \
			curl -s -o /dev/null http://localhost:$(METRO_PORT)/status && break ; \
			sleep 1 ; \
		done ; \
		curl -s -o /dev/null http://localhost:$(METRO_PORT)/status || { \
			printf "$(RED)❌ Metro n'a pas démarré, voir $(METRO_LOG)$(NO_COLOR)\\n" ; exit 1 ; \
		} ; \
	fi

# 🔹 Opens React Native DevTools on the target connected to Metro (same as
#   the "j" key). The target only shows up in /json/list once the JS bundle
#   is loaded on the device, hence the polling.
open-devtools:
	@printf "$(YELLOW)🔍 Attente de la connexion de l'app à Metro pour ouvrir DevTools...$(NO_COLOR)\\n" ; \
	TARGET_ID="" ; \
	for i in $$(seq 1 30); do \
		TARGET_ID=$$(curl -s -X POST http://localhost:$(METRO_PORT)/json/list | jq -r '.[0].id // empty' 2>/dev/null) ; \
		if [ -n "$$TARGET_ID" ]; then break ; fi ; \
		sleep 1 ; \
	done ; \
	if [ -z "$$TARGET_ID" ]; then \
		printf "$(YELLOW)⚠️  Aucune cible de débogage trouvée, React Native DevTools non ouvert (app pas encore connectée à Metro ?)$(NO_COLOR)\\n" ; \
	else \
		curl -s -X POST "http://localhost:$(METRO_PORT)/open-debugger?target=$$TARGET_ID" -o /dev/null ; \
		printf "$(GREEN)🐞 React Native DevTools ouvert$(NO_COLOR)\\n" ; \
	fi

# 🔹 Full DEV: build + install + launch + open React Native DevTools
dev: clean ensure-metro
	@printf "$(YELLOW)Lancement de l'application Android de développement...$(NO_COLOR)\n"
	$(ENV) && npx react-native run-android --no-packager --port $(METRO_PORT)
	@$(MAKE) open-devtools
	@printf "$(GREEN)Application Android de développement lancée$(NO_COLOR)\n"

# Release APK (embedded JS, signed with the debug key) installed on the
# connected phone, app data preserved. Runs without the computer or Metro.
install:
	@printf "$(YELLOW)Construction et installation de l'APK...$(NO_COLOR)\n"
	$(ENV) && cd android && ./gradlew assembleRelease
	$(ENV) && adb install -r android/app/build/outputs/apk/release/app-release.apk
	@printf "$(GREEN)APK installée$(NO_COLOR)\n"

logs:
	@printf "$(YELLOW)Affichage des logs Android React Native...$(NO_COLOR)\n"
	@bash scripts/logs-android.sh

# No `adb uninstall` here: it would wipe the app data on the phone
clean:
	@printf "$(YELLOW)Nettoyage de Gradle et des caches...$(NO_COLOR)\n"
	rm -rf android/app/.cxx node_modules/*/android/.cxx
	$(ENV) && cd android && ./gradlew clean
	rm -rf node_modules/.cache
	rm -rf /tmp/metro-*
	@printf "$(GREEN)Nettoyage terminé$(NO_COLOR)\n"

kill:
	@printf "$(YELLOW)Arrêt de Metro et redémarrage d'ADB...$(NO_COLOR)\n"
	-pkill -f "[r]eact-native start --port $(METRO_PORT)"
	$(ENV) && adb kill-server && adb start-server && adb devices
	@printf "$(GREEN)Metro arrêté et ADB redémarré$(NO_COLOR)\n"
