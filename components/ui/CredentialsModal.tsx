import React, { useState, useRef } from 'react';
// Add html2pdf.js for PDF export
// Install with: npm install html2pdf.js
import html2pdf from 'html2pdf.js';
import { toast } from 'react-hot-toast';
import { DownloadIcon, CheckCircleIcon } from '../../constants';

interface CredentialsModalProps {
  isOpen: boolean;
  userName: string;
  username: string;
  password: string;
  email: string;
  userType: 'Student' | 'Teacher' | 'Parent' | 'Admin';
  onClose: () => void;
  fullscreen?: boolean; // Optional prop for fullscreen mode
}

const CredentialsModal: React.FC<CredentialsModalProps> = ({
  isOpen,
  userName,
  username,
  password,
  email,
  userType,
  onClose,
  fullscreen = false
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const downloadCredentials = () => {
    const credentialsText = `
===========================================
${userType} Account Credentials
===========================================

Name: ${userName}
Email: ${email}
Role: ${userType}

LOGIN DETAILS:
Username: ${username}
Password: ${password}

IMPORTANT:
- Confirm your email within 7 days to activate your account
- Change your password after first login
- Keep these credentials safe and secure
- Do not share with anyone

Visit: https://your-school-app.com/login
===========================================
    `;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(credentialsText));
    element.setAttribute('download', `${userType.toLowerCase()}_credentials.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (!isOpen) return null;

  // PDF download handler
  const downloadPDF = async () => {
    if (!modalRef.current) return;

    try {
      // 1. Clone the element to avoid messing with the UI and to strip conflicting styles
      const element = modalRef.current.cloneNode(true) as HTMLElement;

      // 2. Simplify styles for the PDF export
      // We position it off-screen but visible so html2canvas can render it
      Object.assign(element.style, {
        position: 'absolute',
        left: '-9999px',
        top: '0',
        width: '600px', // Fixed width for A4
        height: 'auto',
        maxHeight: 'none',
        overflow: 'visible',
        boxShadow: 'none',
        borderRadius: '0',
        backgroundColor: '#ffffff',
        zIndex: '-1000',
        padding: '20px' // Add some padding
      });

      // 3. Remove the footer (buttons) from the clone
      // We look for the div with the specific attribute we added
      const footer = element.querySelector('[data-html2canvas-ignore="true"]');
      if (footer) footer.remove();

      // 4. Append to body
      document.body.appendChild(element);

      // 5. Generate PDF
      const opt = {
        margin: 0.5,
        filename: `${userType.toLowerCase()}_credentials.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' as const }
      };

      await html2pdf().set(opt).from(element).save();

      // 6. Cleanup
      document.body.removeChild(element);
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('Could not generate PDF. Please try the "Download TXT" option.');
      // Attempt cleanup if it exists in body
      const clones = document.querySelectorAll('[style*="left: -9999px"]');
      clones.forEach(c => c.remove());
    }
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${fullscreen ? 'p-0' : 'p-2 sm:p-4'} overflow-y-auto`}>
      <div
        ref={modalRef}
        className={`bg-white ${fullscreen ? 'rounded-none w-full h-full max-w-full max-h-full' : 'rounded-2xl w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mx-auto max-h-[95vh]'} shadow-2xl overflow-hidden flex flex-col`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 sm:p-6">
          <div className="flex items-center space-x-3">
            <CheckCircleIcon className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Success!</h2>
              <p className="text-green-100 text-sm">Account created successfully</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
          {/* User Info */}
          <div className="bg-green-50 rounded-lg p-3 sm:p-4 border border-green-200">
            <p className="text-sm text-green-600 font-medium">Account Created For:</p>
            <p className="text-lg font-bold text-gray-800">{userName}</p>
            <p className="text-sm text-gray-600">{email}</p>
            <p className="text-xs text-green-700 mt-2 font-semibold">Role: {userType}</p>
          </div>

          {/* Important Notice */}
          <div className="bg-yellow-50 rounded-lg p-3 sm:p-4 border-l-4 border-yellow-400">
            <p className="text-sm text-yellow-800 font-semibold">⏰ Important:</p>
            <p className="text-xs text-yellow-700 mt-1">
              A confirmation email has been sent to <strong>{email}</strong>. The user must confirm their email within <strong>7 days</strong> to activate the account.
            </p>
          </div>

          {/* Login Credentials */}
          <div className="space-y-2 sm:space-y-3">
            <p className="text-sm sm:text-base font-semibold text-gray-700">Login Credentials:</p>

            {/* Username Field */}
            <div className="relative">
              <label className="text-xs text-gray-500 font-medium">Username</label>
              <div className="flex items-center mt-1 gap-2">
                <input
                  type="text"
                  value={username}
                  readOnly
                  className="flex-1 px-2 sm:px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-xs sm:text-sm font-mono text-gray-800"
                />
                <button
                  onClick={() => copyToClipboard(username, 'username')}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Copy username"
                >
                  {copiedField === 'username' ? (
                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                  ) : (
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Password Field */}
            <div className="relative">
              <label className="text-xs text-gray-500 font-medium">Password</label>
              <div className="flex items-center mt-1 gap-2">
                <input
                  type="text"
                  value={password}
                  readOnly
                  className="flex-1 px-2 sm:px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-xs sm:text-sm font-mono text-gray-800"
                />
                <button
                  onClick={() => copyToClipboard(password, 'password')}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Copy password"
                >
                  {copiedField === 'password' ? (
                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                  ) : (
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Security Warning */}
          <div className="bg-red-50 rounded-lg p-2 sm:p-3 border border-red-200">
            <p className="text-xs text-red-700">
              <strong>🔒 Security Note:</strong> Keep these credentials safe. Change the password after first login. Do not share with anyone.
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border-l-4 border-blue-400">
            <p className="text-sm sm:text-base font-semibold text-blue-900 mb-2">📧 Next Steps:</p>
            <ol className="text-xs sm:text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>An email will be sent to confirm the account</li>
              <li>User must click the confirmation link</li>
              <li>Account becomes active after confirmation</li>
              <li>User can then login with username & password</li>
            </ol>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          data-html2canvas-ignore="true"
          className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row gap-2 sm:gap-3 border-t border-gray-200"
        >
          <button
            onClick={downloadCredentials}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm"
          >
            <DownloadIcon className="w-4 h-4" />
            <span>Download TXT</span>
          </button>
          <button
            onClick={downloadPDF}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16v-8m0 8l-4-4m4 4l4-4" /></svg>
            <span>Download PDF</span>
          </button>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CredentialsModal;
