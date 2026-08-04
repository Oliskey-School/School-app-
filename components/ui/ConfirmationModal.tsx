
import React from 'react';
import { createPortal } from 'react-dom';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", isDanger = false
}) => {
    if (!isOpen) return null;

    // Portaled to document.body on purpose. DashboardLayout wraps every screen in
    // an `animate-slide-in-up` element, and a CSS transform creates a new stacking
    // context — so a `position: fixed` modal rendered inline is trapped inside it
    // and its z-index can never beat a full-screen overlay that IS portaled to the
    // body (e.g. LiveClassRoom's z-[9999] call screen). That's what made "End Class"
    // look dead: the dialog was opening, just painted underneath the opaque call
    // screen where it couldn't be seen or clicked. Portaling escapes the trap.
    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] animate-fade-in p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
                <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => { onConfirm(); onClose(); }}
                        className={`px-4 py-2 text-white font-medium rounded-lg shadow-sm transition-colors ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ConfirmationModal;
