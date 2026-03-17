# 🏫 School App - Codebase Structure & Tech Stack

## 🛠️ Technology Stack

### **Frontend & Mobile Core**
*   **React (Web)** & **Expo (React Native)**: Cross-platform web and mobile application framework.
*   **React Native Web**: Allows the use of React Native components and APIs in a web environment.
*   **Vite**: Fast build tool and development server for the web frontend.
*   **Capacitor**: Cross-platform app runtime to wrap the web app into native mobile apps.

### **Data Management & State**
*   **Supabase (@supabase/supabase-js)**: Backend-as-a-Service providing Database (PostgreSQL), Auth, and Realtime subscriptions.
*   **TanStack Query (React Query)**: Asynchronous state management for data fetching and caching.
*   **Prisma**: ORM utilized in the backend/migrations for database schema management.

### **Styling & UI**
*   **TailwindCSS**: Utility-first CSS framework for web styling.
*   **NativeWind**: Tailwind CSS for React Native, ensuring styling consistency across web and mobile.
*   **Framer Motion**: Animation library for smooth UI transitions and micro-animations.
*   **Lucide React**: Comprehensive icon library.
*   **Recharts**: Composable charting library for data visualization.

### **Functional Modules**
*   **Formik & Yup**: Robust form handling and schema-based validation.
*   **React Router Dom**: Declarative routing for the web application.
*   **Payment Integration**: `react-paystack` for handling school fee payments.
*   **Document Generation**: `jspdf`, `jspdf-autotable`, `html2canvas`, and `html2pdf.js` for exporting reports and receipts.
*   **Scanning & QR**: `html5-qrcode` and `qrcode.react` for ID cards and attendance tracking.

### **Backend & Utilities**
*   **Express**: Minimalist web framework for Node.js.
*   **Google Generative AI**: Integration of AI capabilities.
*   **bcryptjs & jsonwebtoken**: Standard security for password hashing and JWT management.
*   **date-fns**: Modern JavaScript date utility library.

---

## 📂 Codebase Structure

### **Root Directory**
*   `App.tsx`: Main entry point for the application.
*   `index.tsx`: Web entry point.
*   `vite.config.mts`: Configuration for the Vite build tool.
*   `tsconfig.json`: TypeScript configuration.
*   `package.json`: Project manifest and dependency list.
*   `tailwind.config.js`: Tailwind styling configuration.

### **Core Modules (`/`)**
*   `components/`: UI components organized by feature and role.
    *   `admin/`: Admin-specific dashboards and tools (Student list, etc.).
    *   `teacher/`: Teacher interfaces (Dashboards, Class Management).
    *   `student/`: Student-facing components.
    *   `parent/`: Parent communication and tracking tools.
    *   `auth/`: Login, registration, and password recovery.
    *   `shared/`: Reusable components used across all roles.
    *   `ui/`: Base design system components (Inputs, Toasts, etc.).
*   `context/`: React Context providers for global state (Auth, Profiles, Branching, Gamification).
*   `hooks/`: Custom React hooks for business logic, realtime subscriptions, and offline support.
*   `services/`: Communication layer for external APIs and Supabase (Student, Auth, Realtime, Finance, Payment services).
*   `pages/`: Route-level components for the web app.
*   `types/`: TypeScript definitions, interfaces, and database schemas.
*   `supabase/`: Database configuration (Migrations, Edge Functions, SQL scripts).
*   `backend/`: Node.js/Express backend source code.
*   `scripts/`: Utility scripts for database fixing, testing, and deployment.
*   `tests/` / `e2e/`: Unit and end-to-end test suites.

---

## 🏛️ Architecture Overview
The application follows a **Modular Layered Architecture**:
1.  **UI Layer (`components/`, `pages/`)**: Role-specific interfaces built with shared UI tokens.
2.  **State Layer (`context/`, `hooks/`)**: Decouples UI from data fetching and manages global application state.
3.  **Service Layer (`services/`)**: abstracts database and API interactions, ensuring consistent logic across the app.
4.  **Data Layer (`supabase/`, `types/`)**: Defines the source of truth, schema, and realtime synchronization logic.
