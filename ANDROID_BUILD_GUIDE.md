# BL Production Tycoon - Android APK Build Guide

## Quick Start: Building Your APK

This guide will help you convert your React/Vite web app into an installable Android APK file using Capacitor.

---

## Prerequisites

Before starting, make sure you have these installed:

### 1. **Node.js & npm**
- Download from: https://nodejs.org/
- Verify installation:
```bash
node --version
npm --version
```

### 2. **Java Development Kit (JDK) 17**
- Download from: https://www.oracle.com/java/technologies/downloads/
- Set JAVA_HOME environment variable (see below)

### 3. **Android Studio**
- Download from: https://developer.android.com/studio
- Install Android SDK (API 34 recommended)

### 4. **Gradle** (comes with Android Studio)
- Verify: `gradle --version`

---

## Environment Setup

### Windows:

1. **Set JAVA_HOME**
   - Right-click "This PC" → Properties → Advanced system settings
   - Click "Environment Variables"
   - New System Variable:
     - Variable name: `JAVA_HOME`
     - Variable value: `C:\Program Files\Java\jdk-17` (adjust path to your JDK)
   - Add to PATH: `%JAVA_HOME%\bin`

2. **Set ANDROID_SDK_ROOT**
   - New System Variable:
     - Variable name: `ANDROID_SDK_ROOT`
     - Variable value: `C:\Users\YourUsername\AppData\Local\Android\Sdk`
   - Restart your terminal after adding these

### Mac/Linux:

Add to `~/.bash_profile` or `~/.zshrc`:
```bash
export JAVA_HOME=$(/usr/libexec/java_home)
export ANDROID_SDK_ROOT=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_SDK_ROOT/tools:$ANDROID_SDK_ROOT/platform-tools
```

Then run: `source ~/.bash_profile` or `source ~/.zshrc`

---

## Step-by-Step Build Instructions

### Step 1: Clean Install Dependencies

```bash
# Navigate to your project directory
cd blprodtycoon

# Remove old lock files and node_modules
rm -rf node_modules package-lock.json pnpm-lock.yaml

# Install fresh dependencies
npm install
```

### Step 2: Build for Web

```bash
npm run build
```

This creates the `dist/` folder that will be packaged into the APK.

### Step 3: Initialize Capacitor (if not already done)

```bash
npm run cap:init
```

If prompted, confirm the app name and package ID:
- App name: `BL Production Tycoon`
- Package ID: `com.blproductiontycoon.app`

### Step 4: Add Android Platform

```bash
npm run cap:add:android
```

This creates the `android/` folder with the complete Android project.

### Step 5: Sync Web Files to Android

```bash
npm run cap:sync
```

This copies your built web files into the Android project.

### Step 6: Build Release APK

```bash
npm run build:android
```

**Build output location:**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## For Production Release (Signed APK)

If you want to publish to Google Play Store or distribute signed APKs:

### Step 1: Generate Keystore

```bash
cd android/app

# Create a signing key (Windows)
keytool -genkey -v -keystore release.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias release

# Or Mac/Linux
keytool -genkey -v -keystore ~/release.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias release
```

Follow the prompts to create your key. **Save the password somewhere safe!**

### Step 2: Configure Gradle Signing

Edit `android/app/build.gradle` and add before `buildTypes`:

```gradle
signingConfigs {
    release {
        storeFile file('release.keystore')
        storePassword 'YOUR_KEYSTORE_PASSWORD'
        keyAlias 'release'
        keyPassword 'YOUR_KEY_PASSWORD'
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

### Step 3: Build Signed Release APK

```bash
cd android
./gradlew assembleRelease

# Or on Windows
gradlew.bat assembleRelease
```

**Output location:**
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## Troubleshooting Common Errors

### ❌ Error: "Command not found: gradle"
**Solution:** Make sure `ANDROID_SDK_ROOT` is set correctly and restart your terminal.

### ❌ Error: "JAVA_HOME is not set"
**Solution:** 
- Windows: Set JAVA_HOME environment variable to your JDK path
- Mac/Linux: Run `echo $JAVA_HOME` to verify it's set

### ❌ Error: "Failed to resolve dependency"
**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### ❌ Error: "Android SDK not found"
**Solution:**
- Open Android Studio
- Go to Tools → SDK Manager
- Install Android SDK (API 34 recommended)
- Copy the SDK location and set `ANDROID_SDK_ROOT`

### ❌ APK builds but crashes on install
**Solution:**
1. Check the Gradle sync in Android Studio (Tools → Sync Now)
2. Rebuild: `npm run build && npm run cap:sync`
3. Clear build cache: `cd android && ./gradlew clean`

### ❌ "npm not found" or dependency errors
**Solution:**
- Reinstall Node.js from https://nodejs.org/
- Clear npm cache: `npm cache clean --force`
- Delete node_modules: `rm -rf node_modules`
- Reinstall: `npm install`

---

## Testing Your APK

### On Android Device/Emulator:

```bash
# Enable USB debugging on your device

# List connected devices
adb devices

# Install the APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Or using Android Studio:
# Open the android/ folder → Select Run → Choose your device
```

---

## File Management

### Recommended Project Structure:

```
blprodtycoon/
├── src/                    (Your React source code)
├── dist/                   (Built web files - generated by npm run build)
├── android/                (Android project - generated by Capacitor)
├── package.json           (Updated with Capacitor deps)
├── vite.config.js         (Already configured)
├── capacitor.config.json  (Already configured)
└── index.html             (Already configured)
```

---

## Optimization Tips for Better APK

1. **Reduce APK Size:**
   ```bash
   # Enable minification in vite.config.js build options
   build: {
     minify: 'terser',
     outDir: 'dist',
   }
   ```

2. **Use Release Build:**
   - Release APKs are much smaller and faster
   - Follow the "Production Release" section above

3. **Test Performance:**
   - Use Android profiler in Android Studio
   - Monitor memory usage in-app

---

## Next Steps

1. ✅ Follow this guide step-by-step
2. ✅ Build debug APK first to test
3. ✅ Once working, create signed release APK
4. ✅ Test on actual devices before distribution
5. ✅ Consider publishing to Google Play Store

---

## Support Resources

- **Capacitor Docs:** https://capacitorjs.com/docs
- **Android Studio Docs:** https://developer.android.com/studio/intro
- **Google Play Store Publishing:** https://developer.android.com/distribute

---

## Still Having Issues?

If you encounter errors:

1. **Check terminal output carefully** - error messages usually indicate the exact problem
2. **Try the troubleshooting section above**
3. **Make sure ALL environment variables are set correctly**
4. **Restart your terminal/IDE after setting environment variables**
5. **Run `npm run build` to ensure web build works**

Good luck! 🎉
