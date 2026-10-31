#!/usr/bin/env bash
# Build and run a mobile app on the Android emulator (Linux).
#
#   ./scripts/run-android.sh parent      # mobile-frontend (Parent Notification)
#   ./scripts/run-android.sh student     # mobile-students (Student Notification)
#
# Starts the emulator, frees port 8081 from another app's Metro, then:
#   - app not installed yet (or CLEAN=1 / BUILD=1): full native build + install
#   - app already installed: no Gradle at all, just Metro + open the app (fast)
#
# Options (env vars):
#   AVD=<name>        emulator to start when no device is connected (default: first AVD)
#   EMULATOR_GPU=<m>  emulator GPU mode (default swangle_indirect; try "host" for speed)
#   VARIANT=<name>    development | preview | production (sets APP_VARIANT, package name)
#                     Default: production for parent (local google-services.json only
#                     has that package), development for student
#   BUILD=1           force a native rebuild (after adding a native library)
#   CLEAN=1           regenerate the native android/ folder, then rebuild
#   JAVA_HOME=<path>  JDK 17-21 to use (default: ~/.local/share/jdk-21 if present)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

case "${1:-}" in
  parent)
    APP_DIR="$ROOT/mobile-frontend"
    VARIANT="${VARIANT:-production}"
    PACKAGE_BASE="com.jduapp.parentnotification"
    ;;
  student)
    APP_DIR="$ROOT/mobile-students"
    VARIANT="${VARIANT:-development}"
    PACKAGE_BASE="com.jduapp.studentnotification"
    ;;
  *)
    echo "Usage: $0 parent|student" >&2
    exit 1
    ;;
esac

# --- Android SDK -----------------------------------------------------------
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
if [ ! -d "$ANDROID_HOME" ]; then
  echo "Android SDK not found at $ANDROID_HOME (set ANDROID_HOME)" >&2
  exit 1
fi

# --- JDK (Gradle 8.x needs Java 17-21, not newer) --------------------------
if [ -z "${JAVA_HOME:-}" ] && [ -x "$HOME/.local/share/jdk-21/bin/java" ]; then
  export JAVA_HOME="$HOME/.local/share/jdk-21"
fi
if [ -n "${JAVA_HOME:-}" ]; then
  export PATH="$JAVA_HOME/bin:$PATH"
fi
JAVA_MAJOR="$(java -version 2>&1 | head -1 | sed -E 's/.*version "([0-9]+).*/\1/')"
if [ "$JAVA_MAJOR" -lt 17 ] || [ "$JAVA_MAJOR" -gt 21 ]; then
  echo "Java $JAVA_MAJOR found, but the Android build needs JDK 17-21." >&2
  echo "Install one (e.g. sudo dnf install java-21-openjdk-devel) and set JAVA_HOME." >&2
  exit 1
fi

# --- Emulator --------------------------------------------------------------
if ! adb devices | grep -qE '\sdevice$'; then
  AVD="${AVD:-$(emulator -list-avds | head -1)}"
  if [ -z "$AVD" ]; then
    echo "No emulator found. Create one in Android Studio (Device Manager)." >&2
    exit 1
  fi
  echo "Starting emulator $AVD ..."
  # Software rendering (SwiftShader via ANGLE): host GPU mode garbles text in Chrome
  # on some Linux drivers, and plain swiftshader_indirect crashes on emulator 36.x.
  # Cold boot: a quick-boot snapshot saved under another GPU mode can crash the emulator.
  EMULATOR_LOG="${TMPDIR:-/tmp}/emulator-$AVD.log"
  setsid nohup emulator -avd "$AVD" -gpu "${EMULATOR_GPU:-swangle_indirect}" \
    -no-snapshot-load -netdelay none -netspeed full >"$EMULATOR_LOG" 2>&1 &
  EMULATOR_PID=$!
  echo "Waiting for Android to boot (log: $EMULATOR_LOG) ..."
  until [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do
    if ! kill -0 "$EMULATOR_PID" 2>/dev/null; then
      echo "Emulator exited early. Last lines of $EMULATOR_LOG:" >&2
      tail -n 15 "$EMULATOR_LOG" >&2
      exit 1
    fi
    sleep 2
  done
  echo "Emulator is ready."
fi

# --- Build & run -----------------------------------------------------------
cd "$APP_DIR"
export APP_VARIANT="$VARIANT"
case "$VARIANT" in
  production) PACKAGE="$PACKAGE_BASE" ;;
  *) PACKAGE="$PACKAGE_BASE.$([ "$VARIANT" = development ] && echo dev || echo "$VARIANT")" ;;
esac
[ -d node_modules ] || npm install

# Only one Metro can use port 8081; stop the other app's Metro if it is running
METRO_PID="$(ss -ltnp 'sport = :8081' 2>/dev/null | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2 || true)"
if [ -n "$METRO_PID" ]; then
  if ps -o args= -p "$METRO_PID" | grep -q "$APP_DIR"; then
    echo "Metro for this app is already running (pid $METRO_PID), restarting it."
  else
    echo "Stopping Metro of another app on port 8081 (pid $METRO_PID)."
  fi
  kill "$METRO_PID" 2>/dev/null || true
  while ss -ltn 'sport = :8081' | grep -q LISTEN; do sleep 1; done
fi
adb reverse tcp:8081 tcp:8081 >/dev/null

# Keep Gradle's memory in check: by default it runs one worker per CPU core
# plus separate Gradle/Kotlin daemons, which can exhaust RAM next to the emulator.
#   GRADLE_WORKERS=<n>  parallel build workers (default 4)
#   GRADLE_DAEMON=1     keep the Gradle daemon alive between builds (faster, uses more RAM)
export GRADLE_OPTS="${GRADLE_OPTS:-} \
  -Dorg.gradle.workers.max=${GRADLE_WORKERS:-4} \
  -Dorg.gradle.daemon=$([ "${GRADLE_DAEMON:-0}" = "1" ] && echo true || echo false) \
  -Dkotlin.compiler.execution.strategy=in-process"

if [ "${CLEAN:-0}" = "1" ]; then
  npx expo prebuild --platform android --clean
  BUILD=1
fi

if [ "${BUILD:-0}" = "1" ] || ! adb shell pm path "$PACKAGE" >/dev/null 2>&1; then
  echo "Building and installing $PACKAGE ..."
  npx expo run:android
else
  echo "$PACKAGE is installed, starting Metro and opening the app (no rebuild)."
  npx expo start --dev-client --android
fi
