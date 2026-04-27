import React from 'react';
import { SafeHTML } from '../../utils/security';

/**
 * Lead DevSecOps: XSS Protection Demonstration
 * This component demonstrates how to securely render content that might
 * contain malicious scripts (e.g., from a forum post or student bio).
 */
export const XSSDemo: React.FC = () => {
  // Simulating a malicious payload that might be stored in your database
  const maliciousPayload = `
    <p>Welcome to the school portal!</p>
    <script>alert('XSS Attack: Your session token is ' + document.cookie);</script>
    <img src="x" onerror="alert('XSS via Image Event Handler')">
    <a href="javascript:alert('XSS via Link')">Click for free grades!</a>
    <div onmouseover="console.log('Tracking mouse movement...')">Hover over me</div>
    <p><b>This bold text is safe.</b></p>
  `;

  return (
    <div className="p-4 border rounded-lg shadow-sm bg-white">
      <h3 className="text-lg font-bold mb-2">Secure Content Rendering</h3>
      
      <div className="mb-4">
        <span className="text-sm text-gray-500 block mb-1">Untrusted Content Output:</span>
        {/* 
          Lead DevSecOps: Never use <div dangerouslySetInnerHTML={{ __html: maliciousPayload }} /> 
          directly. Always wrap it in the SafeHTML component.
        */}
        <SafeHTML 
          content={maliciousPayload} 
          className="p-3 bg-gray-50 rounded border text-gray-800"
        />
      </div>

      <p className="text-xs text-green-600 font-medium">
        🛡️ Verified: Malicious scripts, event handlers (onerror), and javascript: links 
        have been automatically stripped by DOMPurify before rendering.
      </p>
    </div>
  );
};
