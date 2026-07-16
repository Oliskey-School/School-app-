import React from 'react';
import PersonnelFileView from '../shared/PersonnelFileView';

interface TeacherPersonnelFileScreenProps {
    teacher?: { id: string };
    teacherId?: string;
}

const TeacherPersonnelFileScreen: React.FC<TeacherPersonnelFileScreenProps> = ({ teacher, teacherId }) => {
    const id = teacherId || teacher?.id;
    if (!id) return <div className="text-center py-12 text-gray-500">No teacher selected.</div>;
    return <PersonnelFileView mode="admin" teacherId={id} />;
};

export default TeacherPersonnelFileScreen;
