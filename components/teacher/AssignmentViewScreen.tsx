import { toast } from 'react-hot-toast';
import { GeneratedAssessment } from '../../types';
import { SchoolLogoIcon, DocumentTextIcon, ShareIcon } from '../../constants';

interface AssignmentViewScreenProps {
    assessment: GeneratedAssessment;
    handleBack: () => void;
}

const AssignmentViewScreen: React.FC<AssignmentViewScreenProps> = ({ assessment }) => {

    const handlePrint = () => {
        window.print();
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: `Assignment: ${assessment.type}`,
                text: `Here is the assignment for ${assessment.type}. Please review and complete the questions.`,
                // In a real app, you might share a URL to a student-facing version of this assignment
                // url: window.location.href, 
            }).catch((error) => console.log('Error sharing:', error));
        } else {
            // Fallback for browsers that do not support the Web Share API
            toast.error('To share, please print/save as PDF or take a screenshot.', { duration: 4000 });
        }
    };

    // Example: subject and class info would be available from the parent component in a real app
    const subject = "Generated Assessment";
    const className = "Class";

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <div className="p-3 border-b border-gray-200 flex justify-between items-center flex-shrink-0 bg-white print:hidden">
                <h2 className="text-lg font-bold text-gray-800">Assignment Preview</h2>
                <div className="flex items-center space-x-2">
                    <button onClick={handleShare} className="flex items-center space-x-1.5 px-3 py-1.5 text-sm font-semibold text-sky-700 bg-sky-100 rounded-md hover:bg-sky-200">
                        <ShareIcon className="w-4 h-4" /><span>Share</span>
                    </button>
                    <button onClick={handlePrint} className="flex items-center space-x-1.5 px-3 py-1.5 text-sm font-semibold text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200">
                        <DocumentTextIcon className="w-4 h-4" /><span>Print</span>
                    </button>
                </div>
            </div>

            <main className="flex-grow overflow-y-auto p-4">
                <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-lg printable-area font-sans">
                    <header className="flex justify-between items-center border-b-2 border-gray-300 pb-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Smart School Academy</h1>
                            <p className="font-semibold text-gray-600">{subject} - {className}</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-xl font-bold text-gray-800">{assessment.type}</h2>
                            <p className="font-semibold text-gray-600">Total Marks: {assessment.totalMarks}</p>
                        </div>
                    </header>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8 text-lg">
                        <div className="flex items-center">
                            <label className="font-bold mr-2">Name:</label>
                            <div className="flex-grow border-b-2 border-gray-400"></div>
                        </div>
                        <div className="flex items-center">
                            <label className="font-bold mr-2">Date:</label>
                            <div className="flex-grow border-b-2 border-gray-400"></div>
                        </div>
                    </div>

                    <div className="space-y-8 prose prose-base max-w-none text-gray-800">
                        {assessment.questions.map(q => (
                            <div key={q.id}>
                                <p><strong>{q.id}.</strong> {q.question} <em className="text-gray-600">({q.marks} marks)</em></p>
                                {q.type === 'multiple-choice' && q.options && (
                                    <ol type="A" className="pl-6 mt-2 space-y-1">
                                        {q.options.map((opt, i) => <li key={i}>{opt}</li>)}
                                    </ol>
                                )}
                                {q.type === 'short-answer' && <div className="mt-4 border-b-2 border-dotted h-10"></div>}
                                {q.type === 'theory' && (
                                    <div className="mt-4 space-y-2">
                                        {[...Array(5)].map((_, i) => <div key={i} className="border-b-2 border-dotted h-6"></div>)}
                                    </div>
                                )}
                                {q.type === 'practical' && <div className="mt-2 p-2 border border-dashed rounded-md h-24 text-gray-400 text-sm">Space for practical work/diagram.</div>}
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AssignmentViewScreen;
