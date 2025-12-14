# Mobile App Setup Guide

This project has been configured with **Capacitor** to run your existing web application as a native mobile app on Android and iOS.

## Project Structure
- **`android/`**: The native Android project source code.
- **`ios/`**: The native iOS project source code.
- **`dist/`**: The built web assets that are copied to the native projects.
- **`capacitor.config.ts`**: Configuration file for Capacitor.

## Workflow

### 1. Develop
Continue developing your web app as usual.
```bash
npm run dev
```

### 2. Build for Mobile
By default, Capacitor uses the `dist` folder. Whenever you want to test on a device or build the native app, you must first build your web project.
```bash
npm run build
```

### 3. Sync
Copy the latest build artifacts to the native platforms.
```bash
npx capacitor copy
```
*Note: If you install new native plugins, use `npx capacitor sync` instead.*

### 4. Run on Device/Emulator

#### Android
1. Open the `android` directory in **Android Studio**.
   ```bash
   npx capacitor open android
   ```
2. Wait for Gradle sync to complete.
3. Select your device/emulator and click the **Run** (Play) button.

#### iOS (Mac Only)
1. Open the `ios` directory in **Xcode**.
   ```bash
   npx capacitor open ios
   ```
2. Select your target device/simulator.
3. Click the **Run** (Play) button.

## Troubleshooting
- **Android Studio not opening**: If `npx capacitor open android` fails, manually launch Android Studio and select "Open an existing project", then choose the `android` folder in this directory.
- **Network Requests**: Ensure your backend URL is accessible from the device. If using localhost, you may need to change it to your computer's local IP address (e.g., `192.168.1.x`) so the phone can reach it.
