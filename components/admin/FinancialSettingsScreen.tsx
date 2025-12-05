import React, { useState } from 'react';
import { ChevronRightIcon } from '../../constants';

const Accordion: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 text-left font-bold text-gray-800">
        <span>{title}</span>
        <ChevronRightIcon className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      {isOpen && <div className="p-4 border-t">{children}</div>}
    </div>
  );
};

const FinancialSettingsScreen: React.FC = () => {
    return (
        <div className="p-4 space-y-4 bg-gray-50">
            <Accordion title="Tuition & Fee Structure" defaultOpen>
                <p className="text-gray-600 text-sm">Define fee items (e.g., Tuition, Bus Fee), set up installment plans, and enable auto-pay options for parents.</p>
                {/* A real UI would have forms for these */}
            </Accordion>
            <Accordion title="Invoice & Payment Methods">
                <p className="text-gray-600 text-sm">Customize invoice templates and enable payment methods like Bank Transfer, Card, etc.</p>
            </Accordion>
        </div>
    );
};
export default FinancialSettingsScreen;
