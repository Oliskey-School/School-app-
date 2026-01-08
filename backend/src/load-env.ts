import dotenv from 'dotenv';
import path from 'path';

// Load .env from root folder explicitly
console.log("Loading env from:", path.join(__dirname, '../../.env'));
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Also load local backend .env for specific backend overrides
dotenv.config();

console.log("Env loaded. Gemini Key present:", !!process.env.VITE_GEMINI_API_KEY);
