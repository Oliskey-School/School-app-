import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Submission, Assignment } from '../../types';
import { SparklesIcon, AIIcon } from '../../constants';
import { getAIClient, AI_MODEL_NAME, SchemaType as Type } from '../../lib/ai';

// A custom microphone icon
const MicrophoneIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${className || ''}`.trim()} viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M9 2m0 3a3 3 0 0 1 3 -3h0a3 3 0 0 1 3 3v5a3 3 0 0 1 -3 3h0a3 3 0 0 1 -3 -3z" /><path d="M5 10a7 7 0 0 0 14 0" /><path d="M8 21l8 0" /><path d="M12 17l0 4" /></svg>;


interface GradeSubmissionScreenProps {
  submission: Submission;
  assignment: Assignment;
  onGrade: (submissionId: string, grade: number, feedback: string) => void;
}

const GradeSubmissionScreen: React.FC<GradeSubmissionScreenProps> = ({ submission, assignment, onGrade }) => {
  const [grade, setGrade] = useState<string>(submission.grade?.toString() || '');
  const [feedback, setFeedback] = useState<string>(submission.feedback || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = React.useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setFeedback(prev => prev + finalTranscript);
      };
      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const handleToggleRecording = () => {
    if (!recognitionRef.current) {
      toast.error("Voice recognition is not supported in your browser.");
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleGenerateFeedback = async () => {
    setIsGenerating(true);
    setAiSuggestions([]);
    try {
      const ai = getAIClient(import.meta.env.VITE_GEMINI_API_KEY || '');
      const prompt = `Act as an expert teacher. Evaluate this student submission and provide:
      1. A recommended grade (0-100) based on quality.
      2. 3 distinct, constructive feedback comments.

      - Assignment: "${assignment.title}" (${assignment.subject})
      - Student Submission: "${submission.textSubmission || '(No text submitted, check file)'}"
      - Current Grade Input: ${grade ? grade + '/100' : 'Not yet graded'}

      If the grade is active, tailor feedback to that score. If not, analyze the text to suggest a fair grade.
      Return JSON.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggested_grade: { type: Type.INTEGER, description: "Recommended score out of 100" },
              suggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of 3 feedback comments."
              }
            },
            required: ["suggestions"]
          }
        }
      });

      const jsonResponse = JSON.parse(response.text.trim());
      if (jsonResponse.suggestions && Array.isArray(jsonResponse.suggestions)) {
        if (jsonResponse.suggested_grade && !grade) {
          setGrade(jsonResponse.suggested_grade.toString());
          toast.success(`AI suggested a grade of ${jsonResponse.suggested_grade}`);
        }
        setAiSuggestions(jsonResponse.suggestions);
      } else {
        throw new Error("Invalid response format from AI.");
      }

    } catch (error) {
      console.error("AI Feedback Generation Error:", error);
      toast.error("Sorry, there was an error generating feedback. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericGrade = parseInt(grade, 10);
    if (isNaN(numericGrade) || numericGrade < 0 || numericGrade > 100) {
      toast.error('Please enter a valid grade between 0 and 100.');
      return;
    }
    onGrade(submission.id, numericGrade, feedback);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <form onSubmit={handleSubmit} className="flex-grow flex flex-col">
        <main className="flex-grow p-4 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 space-y-4">
              {/* Student and Submission Info */}
              <div className="bg-white p-4 rounded-xl shadow-sm flex items-center space-x-4">
                <img src={submission.student.avatarUrl} alt={submission.student.name} className="w-16 h-16 rounded-full object-cover" />
                <div>
                  <p className="font-bold text-xl text-gray-800">{submission.student.name}</p>
                  <p className="text-sm text-gray-500">
                    Submitted: {new Date(submission.submittedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                  <span className={`mt-1 inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${submission.isLate ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {submission.isLate ? 'Late' : 'On Time'}
                  </span>
                </div>
              </div>

              {/* Submission Preview */}
              {submission.textSubmission && (
                <div className="bg-white p-4 rounded-xl shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-2">Student's Submission</h3>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{submission.textSubmission}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              {/* Grading Form */}
              <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                <div>
                  <label htmlFor="grade-input" className="block text-sm font-medium text-gray-700 mb-1">Score (out of 100)</label>
                  <input
                    id="grade-input"
                    type="number"
                    value={grade}
                    onChange={e => setGrade(e.target.value)}
                    placeholder="e.g., 85"
                    required
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label htmlFor="feedback-input" className="block text-sm font-medium text-gray-700 mb-1">Feedback</label>
                  <div className="relative">
                    <textarea
                      id="feedback-input"
                      value={feedback}
                      onChange={e => setFeedback(e.target.value)}
                      rows={6}
                      placeholder="Provide constructive feedback for the student..."
                      className="w-full px-3 py-2 pr-12 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                    />
                    {recognitionRef.current && (
                      <button
                        type="button"
                        onClick={handleToggleRecording}
                        className={`absolute top-2 right-2 p-2 rounded-full transition-colors ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                        aria-label={isRecording ? 'Stop recording' : 'Start recording feedback'}
                      >
                        <MicrophoneIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={handleGenerateFeedback}
                      disabled={isGenerating}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <div className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <SparklesIcon className="w-4 h-4" />
                      )}
                      <span>{isGenerating ? 'Drafting...' : 'Draft with AI'}</span>
                    </button>
                  </div>
                </div>

                {/* AI Feedback Section */}
                <div>
                  <button
                    type="button"
                    onClick={handleGenerateFeedback}
                    disabled={isGenerating || !grade}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:bg-gray-100 hover:border-purple-400 hover:text-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <AIIcon className="h-5 w-5" />
                    <span className="font-semibold">{isGenerating ? 'Generating...' : 'Generate Feedback with AI'}</span>
                  </button>
                  {aiSuggestions.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <h4 className="text-xs font-semibold text-gray-500">AI Suggestions (Click to use):</h4>
                      {aiSuggestions.map((suggestion, index) => (
                        <button
                          type="button"
                          key={index}
                          onClick={() => setFeedback(suggestion)}
                          className="w-full text-left p-2 bg-purple-50 text-purple-800 text-sm rounded-lg hover:bg-purple-100 transition-colors flex items-start space-x-2">
                          <SparklesIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-purple-500" />
                          <span>{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        <div className="p-4 mt-auto bg-white border-t border-gray-200">
          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Submit Grade
          </button>
        </div>
      </form>
    </div>
  );
};

export default GradeSubmissionScreen;
