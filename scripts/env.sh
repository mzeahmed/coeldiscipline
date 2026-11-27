#!/bin/bash

# ===============================
# Environnement React Native Android (Ubuntu)
# ===============================

export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME=$HOME/Android/Sdk

export PATH=$JAVA_HOME/bin:\
$ANDROID_HOME/platform-tools:\
$ANDROID_HOME/emulator:\
$ANDROID_HOME/cmdline-tools/latest/bin:\
$PATH

# React Native 0.88 exige Node >= 22.11
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  source "$NVM_DIR/nvm.sh" --no-use
  nvm use 22 > /dev/null
fi
