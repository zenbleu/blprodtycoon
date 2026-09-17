# Quick Commands Reference

This is a quick copy-paste guide for building your APK. Just follow the commands in order.

## 🚀 THE FASTEST WAY TO BUILD YOUR APK

### Copy & paste these commands one at a time:

```bash
# 1. Navigate to your project
cd blprodtycoon

# 2. Clean install (fixes most pnpm errors)
rm -rf node_modules pnpm-lock.yaml
pnpm install

# 3. Build the web version
pnpm run build

# 4. Initialize Capacitor (only if first time)
pnpm exec cap init

# 5. Add Android support (only if first time)
pnpm exec cap add android

# 6. Sync files to Android
pnpm run cap:sync

# 7. Build the APK (DEBUG version - fastest for testing)
pnpm run build:android
```

### ✅ Your APK is ready at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 📦 If You Get Errors

### Most Common Error: "pnpm install fails"
```bash
# Solution:
pnpm store prune
rm -rf node_modules
pnpm install
```

### Error: "gradle not found" or "JAVA_HOME not set"
- **Windows users:** Search for "Environment Variables" in Windows → Add JAVA_HOME and ANDROID_SDK_ROOT
- **Mac/Linux users:** Add to `~/.bash_profile`:
```bash
export JAVA_HOME=$(/usr/libexec/java_home)
export ANDROID_SDK_ROOT=$HOME/Library/Android/sdk
```
Then restart your terminal.

### Error: "Android SDK not found"
- Open Android Studio
- Go to Tools → SDK Manager
- Install Android SDK API 34
- Copy your SDK path and set ANDROID_SDK_ROOT environment variable

### Error: "Build fails after sync"
```bash
# Clean and rebuild:
cd android
./gradlew clean
cd ..
pnpm run build:android
```

---

## 🎯 RELEASE APK (For Distribution)

If you want a smaller, production-ready APK:

```bash
# 1. First, build web
pnpm run build

# 2. Sync files
pnpm run cap:sync

# 3. Build release APK
cd android
./gradlew assembleRelease
cd ..
```

### ✅ Your Release APK is at:
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## 📱 INSTALL & TEST ON PHONE

### Prerequisites:
- Phone connected via USB
- USB debugging enabled on phone
- ADB installed (comes with Android Studio)

### Commands:
```bash
# List connected devices
adb devices

# Install debug APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Uninstall app
adb uninstall com.blproductiontycoon.app

# View logs (if app crashes)
adb logcat
```

---

## 🔄 QUICK REBUILD (After Code Changes)

After you modify your code:

```bash
pnpm run build
pnpm run cap:sync
pnpm run build:android
```

---

## 💡 Pro Tips

### If APK installs but app crashes:
1. Check Android Studio for build errors
2. Run: `cd android && ./gradlew clean && cd ..`
3. Try again: `pnpm run build && pnpm run cap:sync && pnpm run build:android`

### Make it smaller:
- Use release build instead of debug
- Clean unused assets
- Minify code (already enabled)

### Test on emulator (no phone needed):
- Open Android Studio
- Create Virtual Device (AVD)
- Run: `pnpm run build:android`
- Choose emulator when prompted

---

## 🆘 Still Stuck?

**Step 1:** Check the full guide: `ANDROID_BUILD_GUIDE.md`

**Step 2:** Verify environment variables are set:
- Windows: Type `echo %JAVA_HOME%` in cmd
- Mac/Linux: Type `echo $JAVA_HOME` in terminal

**Step 3:** Make sure you have:
- ✅ Node.js installed
- ✅ Java JDK 17 installed
- ✅ Android Studio installed
- ✅ Android SDK API 34 installed

**Step 4:** If all else fails:
```bash
# Nuclear option - complete fresh start
rm -rf node_modules android dist
pnpm install
pnpm run build
pnpm exec cap add android
pnpm run cap:sync
pnpm run build:android
```

---

## 📋 File Locations

After successful build:
- **Debug APK:** `android/app/build/outputs/apk/debug/app-debug.apk`
- **Release APK:** `android/app/build/outputs/apk/release/app-release.apk`
- **Web build:** `dist/` folder
- **Android project:** `android/` folder

---

## ✨ That's it!

Your APK is now ready to:
- 📲 Install on Android phones
- 🎮 Test your game
- 📤 Share with others
- 🚀 Upload to Google Play Store (requires signing)

Good luck! 🎉
