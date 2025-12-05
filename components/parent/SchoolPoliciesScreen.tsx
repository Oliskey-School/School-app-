import React from 'react';
import { mockSchoolPolicies } from '../../data';
import { DocumentTextIcon, ShieldCheckIcon } from '../../constants';

const SchoolPoliciesScreen: React.FC = () => {
  return (
    <div className="p-4 space-y-4 bg-gray-50 h-full">
      <div className="bg-green-50 p-4 rounded-xl text-center border border-green-200">
        <ShieldCheckIcon className="h-10 w-10 mx-auto text-green-400 mb-2" />
        <h3 className="font-bold text-lg text-green-800">School Policies & Guidelines</h3>
        <p className="text-sm text-green-700">Official documents for students and parents.</p>
      </div>
      <div className="space-y-3">
        {mockSchoolPolicies.map(policy => (
          <div key={policy.id} className="bg-white rounded-xl shadow-sm p-4">
            <h4 className="font-bold text-gray-800">{policy.title}</h4>
            <p className="text-sm text-gray-600 mt-1 mb-3">{policy.description}</p>
            <a href={policy.url} download className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-green-100 text-green-700 font-semibold rounded-lg hover:bg-green-200 transition-colors">
              <DocumentTextIcon className="w-5 h-5" />
              <span>Download PDF</span>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SchoolPoliciesScreen;