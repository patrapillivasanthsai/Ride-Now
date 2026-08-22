# RideNow Driver Mobile Application (React Native CLI Skeleton)

This is the mobile application frontend for drivers, built using React Native CLI.

## Local Setup Instructions

Because React Native CLI targets native Android and iOS environments, you must set up your local development environment with the necessary SDKs before building the app.

### 1. Install Dependencies
Ensure you have the following installed on your machine:
- **Node.js** (v18 or higher)
- **Android Studio** (for Android emulation & Android SDK)
- **Xcode** (macOS only, for iOS emulation)
- **CocoaPods** (macOS only, for iOS native dependencies)

For complete OS-specific guides, refer to the [React Native Environment Setup Guide](https://reactnative.dev/docs/environment-setup?guide=native).

### 2. Install Project Packages
From this directory, run:
```bash
npm install
```

### 3. Start Metro Bundler
Start the Metro bundler to compile and serve the JavaScript/TypeScript bundle:
```bash
npm start
```

### 4. Run on Device / Emulator
Keep the Metro bundler window running and open a new terminal window to execute one of the following:

- **For Android:**
  ```bash
  npm run android
  ```
- **For iOS (macOS only):**
  ```bash
  npm run ios
  ```
