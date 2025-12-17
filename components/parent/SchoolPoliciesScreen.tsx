import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { SchoolPolicy } from '../../types';
import { DocumentTextIcon, ShieldCheckIcon } from '../../constants';

const SchoolPoliciesScreen: React.FC = () => {
  const [policies, setPolicies] = useState<SchoolPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const { data, error } = await supabase
        .from('school_policies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setPolicies(data.map((p: any) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          url: p.url
        })));
      }
    } catch (error) {
      console.error('Error fetching policies:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <main className="flex-grow p-4 space-y-4 overflow-y-auto">
        <div className="bg-green-50 p-6 rounded-2xl text-center border border-green-100 shadow-sm">
          <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
            <ShieldCheckIcon className="h-8 w-8 text-green-500" />
          </div>
          <h3 className="font-bold text-xl text-green-800">School Policies</h3>
          <p className="text-sm text-green-600 mt-1">Official guidelines and documents for our school community.</p>
        </div>

        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : policies.length === 0 ? (
          <div className="text-center p-8 text-gray-500">No policies found.</div>
        ) : (
          <div className="space-y-3">
            {policies.map(policy => (
              <div key={policy.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-gray-800 text-lg">{policy.title}</h4>
                    <p className="text-sm text-gray-500 mt-1 mb-4 leading-relaxed">{policy.description}</p>
                  </div>
                </div>
                <a
                  href={policy.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gray-50 text-gray-700 hover:text-green-700 hover:bg-green-50 font-semibold rounded-xl border border-gray-200 hover:border-green-200 transition-all group"
                >
                  <DocumentTextIcon className="w-5 h-5 group-hover:text-green-600" />
                  <span>View Document</span>
                </a>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default SchoolPoliciesScreen;