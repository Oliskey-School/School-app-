import React from 'react';
import { motion } from 'framer-motion';
import PersonnelFileView from '../shared/PersonnelFileView';

interface TeacherPersonnelFileScreenProps {
    teacher?: { id: string };
    teacherId?: string;
}

const TeacherPersonnelFileScreen: React.FC<TeacherPersonnelFileScreenProps> = ({ teacher, teacherId }) => {
    const id = teacherId || teacher?.id;
    if (!id) return <div className="text-center py-12 text-gray-500">No teacher selected.</div>;
    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <PersonnelFileView mode="admin" teacherId={id} />
        </motion.div>
    );
};

export default TeacherPersonnelFileScreen;
