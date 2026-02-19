# Testing Instructions

This document outlines how to verify the recent fixes and manually test the application's critical features.

## 1. Environment Verification (Automated)

We have created two diagnostic scripts to verify the backend connection and schema integrity.

1.  **Open a terminal** in the project root.
2.  **Run the Connection Check:**
    ```bash
    node verify_connection.js
    ```
    *   **Expected Output:** `✅ Connection successful! Found X schools.`
3.  **Run the Schema Verification:**
    ```bash
    node verify_schema.js
    ```
    *   **Expected Output:** `[OK]` for all checked tables (schools, profiles, students, etc.).

## 2. Manual Functionality Testing

### A. Configuration Error Handling
1.  **Scenario:** Simulate a missing configuration.
2.  **Action:** Temporarily rename `.env` to `.env.bak`.
3.  **Result:** Refresh the app. You should see a **"Configuration Error"** screen with a red alert icon, explicitly stating which keys are missing.
4.  **Restore:** Rename `.env.bak` back to `.env` and refresh. The app should load the Login screen.

### B. Authentication Flow (Critical Path)

#### Unhappy Path (Error Handling)
1.  **Action:** Enter a random email (e.g., `test@error.com`) and password.
2.  **Click:** "Sign In".
3.  **Result:** A red error message "Invalid login credentials" should appear at the top of the form. The app **must not** crash or show a white screen.

#### Happy Path (Demo Login)
1.  **Action:** On the Login screen, click **"Try Demo School"** (at the bottom).
2.  **Action:** Click the **"Student"** or **"Teacher"** button.
3.  **Result:**
    *   The app should authenticate successfully.
    *   You should be redirected to the respective Dashboard (Student or Teacher).
    *   Data (like "My Subjects" or "Upcoming Classes") should load without errors.

### C. Offline/Network Handling
1.  **Action:** while logged in, disconnect your internet (or set "Offline" in Chrome DevTools > Network).
2.  **Result:**
    *   An "Offline" indicator should appear (usually at the bottom or top).
    *   The app should **not** crash.
    *   Navigation between visited pages should still work (if PWA cache is active).

## 3. Developer Notes

*   **Supabase Client:** The client in `lib/supabase.ts` is now strictly checked in `App.tsx`.
*   **Env Variables:** Ensure `.env` contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
*   **Backend Server:** For full backend functionality (running `npm run server`), you must add `SUPABASE_SERVICE_KEY` to your `.env` file. This key is required for administrative database operations that bypass RLS. Without it, the backend logs a warning and some features may fail.
*   **Error Boundaries:** `App.tsx` includes an `ErrorBoundary` component to catch unexpected crashes and offer a "Reset Connection" button.
