#!/bin/bash

source "$(dirname "$0")/env.sh"

echo "📡 Logs Android (React Native JS)"

adb logcat | grep ReactNativeJS
