# Project Isolation Guide

This guide contains the steps to completely isolate your project dependencies and environment. I have already **pinned all your dependencies** in `package.json` to exact versions to prevent unexpected updates.

## 🛑 Critical First Step
**Stop all running local servers.**
If you have `npm run dev`, `npm run server`, or `npm run start:all` running in any terminal, **CTRL+C** to stop them. The cleanup commands below will fail if files are locked by running processes.

## 🧹 Clean & Reinstall Commands
Run these commands in your project root (`c:\Users\USER\OneDrive\Desktop\Project\school-app-`) to clear all caches and reinstall fresh dependencies:

### PowerShell
```powershell
# 1. Clear NPM Cache (removes shared global cache interference)
npm cache clean --force

# 2. Delete existing artifacts (forcefully)
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json

# 3. Reinstall strict dependencies
npm install
```

### Command Prompt (cmd)
```cmd
npm cache clean --force
rmdir /s /q node_modules
del package-lock.json
npm install
```

## 🛡️ Verifying Isolation

1.  **Check `package.json`**: Ensure no version numbers run with `^` or `~`. (I have already done this for you).
2.  **Environment Variables**:
    *   Ensure you have a `.env` file in the project root.
    *   Compare it with `.env.example` to ensure all required keys are present.
    *   **Tip**: Never rely on global environment variables. Always define them in your `.env` file for this specific project.

## 🚀 Restart
After running the commands above:
```bash
npm run start:all
```
Your project is now running in a strictly isolated environment with exact dependency versions.

## 🆘 Troubleshooting

### Network Errors (ECONNRESET, ETIMEDOUT)
If you see `npm error code ECONNRESET` or similar network issues:

1.  **Disable Proxy**:
    ```powershell
    npm config delete proxy
    npm config delete https-proxy
    ```
2.  **Use Standard Registry**:
    ```powershell
    npm config set registry https://registry.npmjs.org/
    ```
3.  **Clear Cache & Retry**:
    ```powershell
    npm cache clean --force
    Remove-Item -Recurse -Force node_modules
    npm install
    ```

