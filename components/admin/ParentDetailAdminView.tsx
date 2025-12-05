
import React from 'react';
import { Parent } from '../../types';
import { MailIcon, PhoneIcon, EditIcon, TrashIcon, StudentsIcon } from '../../constants';
import { mockStudents, mockParents } from '../../data';

interface ParentDetailAdminViewProps {
  parent: Parent;
  navigateTo: (view: string, title: string, props?: any) => void;
  forceUpdate: () => void;
  handleBack: () => void;
}

const ParentDetailAdminView: React.FC<ParentDetailAdminViewProps> = ({ parent, navigateTo, forceUpdate, handleBack }) => {
  
  // Note: Ideally this would be fetched from DB, here using mock for simplicity if parent.childIds exists
  const linkedChildren = mockStudents.filter(s => parent.childIds?.includes(s.id));

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete the account for ${parent.name}? This action cannot be undone.`)) {
        const index = mockParents.findIndex(p => p.id === parent.id);
        if (index > -1) {
            mockParents.splice(index, 1);
            forceUpdate();
            handleBack();
        }
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
        <main className="flex-grow p-4 space-y-4 overflow-y-auto">
            <div className="bg-white p-4 rounded-xl shadow-sm flex items-center space-x-4">
                <img src={parent.avatarUrl} alt={parent.name} className="w-20 h-20 rounded-full object-cover border-4 border-orange-100"/>
                <div>
                    <h3 className="text-xl font-bold text-gray-800">{parent.name}</h3>
                    <div className="flex space-x-4 mt-2">
                         <a href={`mailto:${parent.email}`} className="flex items-center space-x-1 text-sm text-gray-600 hover:text-sky-600"><MailIcon className="w-4 h-4"/><span>Email</span></a>
                         <a href={`tel:${parent.phone}`} className="flex items-center space-x-1 text-sm text-gray-600 hover:text-sky-600"><PhoneIcon className="w-4 h-4"/><span>Call</span></a>
                    </div>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm">
                <h4 className="font-bold text-gray-800 mb-2 flex items-center"><StudentsIcon className="w-5 h-5 mr-2 text-sky-500" /> Linked Children</h4>
                <div className="space-y-2">
                    {linkedChildren.length > 0 ? linkedChildren.map(child => (
                        <div key={child.id} className="bg-gray-50 p-3 rounded-lg flex items-center space-x-3">
                            <img src={child.avatarUrl} alt={child.name} className="w-10 h-10 rounded-full object-cover"/>
                            <div>
                                <p className="font-semibold text-gray-700">{child.name}</p>
                                <p className="text-xs text-gray-500">Grade {child.grade}{child.section}</p>
                            </div>
                        </div>
                    )) : <p className="text-sm text-gray-500">No children linked.</p>}
                </div>
            </div>
        </main>
        <div className="p-4 mt-auto bg-white border-t space-y-2">
            <h3 className="text-sm font-bold text-gray-500 text-center uppercase tracking-wider">Admin Actions</h3>
            <div className="grid grid-cols-2 gap-3">
                <button onClick={() => navigateTo('addParent', `Edit ${parent.name}`, { parentToEdit: parent })} className="flex items-center justify-center space-x-2 py-3 bg-indigo-100 text-indigo-700 rounded-xl font-semibold hover:bg-indigo-200"><EditIcon className="w-5 h-5" /><span>Edit Profile</span></button>
                <button onClick={handleDelete} className="flex items-center justify-center space-x-2 py-3 bg-red-100 text-red-700 rounded-xl font-semibold hover:bg-red-200"><TrashIcon className="w-5 h-5" /><span>Delete Account</span></button>
            </div>
        </div>
    </div>
  );
};

export default ParentDetailAdminView;
