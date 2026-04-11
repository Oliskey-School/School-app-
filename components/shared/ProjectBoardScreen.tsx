import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import {
    LayoutGrid,
    PlusIcon,
    Search,
    MoreVertical,
    GripVertical,
    Users,
    Calendar,
    CheckCircle2,
    Clock,
    AlertCircle,
    ArrowRight,
    Tag,
    MessageSquare,
    Trash2,
    Edit3,
    Filter,
    Loader2
} from 'lucide-react';

interface BoardTask {
    id: string;
    title: string;
    description: string;
    assignees: string[];
    due_date: string;
    priority: 'low' | 'medium' | 'high';
    labels: string[];
    comments: number;
}

interface BoardColumn {
    id: string;
    title: string;
    color: string;
    tasks: BoardTask[];
}

const ProjectBoardScreen = () => {
    const { currentSchool } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddingTask, setIsAddingTask] = useState<string | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [columns, setColumns] = useState<BoardColumn[]>([]);

    useEffect(() => {
        if (currentSchool?.id) {
            fetchBoard();
        }
    }, [currentSchool?.id]);

    const fetchBoard = async () => {
        try {
            const data = await api.getKanbanBoard(currentSchool?.id);
            setColumns(data);
        } catch (err) {
            console.error('Fetch board error:', err);
            toast.error('Failed to load project board');
        } finally {
            setLoading(false);
        }
    };

    const priorityColors: Record<string, string> = {
        low: 'bg-gray-100 text-gray-600',
        medium: 'bg-amber-100 text-amber-700',
        high: 'bg-red-100 text-red-700',
    };

    const handleAddTask = async (columnId: string) => {
        if (!newTaskTitle.trim()) return;
        try {
            await api.createKanbanTask({
                columnId,
                title: newTaskTitle,
                priority: 'medium',
                labels: [],
                assignees: []
            });
            toast.success('Task added!');
            fetchBoard();
        } catch (err) {
            toast.error('Failed to add task');
        } finally {
            setNewTaskTitle('');
            setIsAddingTask(null);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        try {
            await api.deleteKanbanTask(taskId);
            toast.success('Task removed');
            fetchBoard();
        } catch (err) {
            toast.error('Failed to delete task');
        }
    };

    const handleMoveTaskAction = async (taskId: string, direction: 'left' | 'right', currentColId: string) => {
        const colIndex = columns.findIndex(c => c.id === currentColId);
        const targetIndex = direction === 'right' ? colIndex + 1 : colIndex - 1;
        
        if (targetIndex >= 0 && targetIndex < columns.length) {
            try {
                const targetColumnId = columns[targetIndex].id;
                await api.moveKanbanTask(taskId, targetColumnId);
                fetchBoard();
                toast.success(`Moved to ${columns[targetIndex].title}`);
            } catch (err) {
                toast.error('Failed to move task');
            }
        }
    };

    const totalTasks = columns.reduce((sum, col) => sum + (col.tasks?.length || 0), 0);

    if (loading) {
        return (
            <div className="p-12 flex flex-col items-center justify-center space-y-4 font-outfit min-h-[400px]">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
                <p className="text-gray-500 font-bold">Loading your project board...</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-full mx-auto space-y-6">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 font-outfit">Project Boards</h1>
                    <p className="text-sm text-gray-500">{totalTasks} tasks across {columns.length} columns</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" placeholder="Search tasks..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none w-64" />
                </div>
            </header>

            {/* Board */}
            <div className="flex space-x-4 overflow-x-auto pb-6 -mx-2 px-2">
                {columns.map((column, colIndex) => (
                    <div key={column.id} className="flex-shrink-0 w-80">
                        {/* Column Header */}
                        <div className="flex items-center justify-between mb-3 px-1">
                            <div className="flex items-center space-x-2">
                                <div className={`w-3 h-3 rounded-full ${column.color}`} />
                                <h3 className="font-bold text-gray-700">{column.title}</h3>
                                <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{(column.tasks || []).length}</span>
                            </div>
                            <button onClick={() => setIsAddingTask(column.id)} className="p-1 hover:bg-gray-100 rounded-lg transition-all">
                                <PlusIcon className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>

                        {/* Task Cards */}
                        <div className="space-y-3">
                            {(column.tasks || []).filter(t => !searchTerm || t.title.toLowerCase().includes(searchTerm.toLowerCase())).map(task => (
                                <div key={task.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                                    {/* Labels */}
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {(task.labels || []).map(label => (
                                            <span key={label} className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">{label}</span>
                                        ))}
                                    </div>
                                    <h4 className="font-bold text-gray-800 text-sm">{task.title}</h4>
                                    {task.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>}

                                    {/* Meta */}
                                    <div className="flex items-center justify-between mt-3">
                                        <div className="flex items-center space-x-3">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded capitalize ${priorityColors[task.priority]}`}>{task.priority}</span>
                                            {(task.comments || 0) > 0 && (
                                                <span className="flex items-center space-x-1 text-xs text-gray-400">
                                                    <MessageSquare className="w-3 h-3" /><span>{task.comments}</span>
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-1 text-xs text-gray-400">
                                            <Clock className="w-3 h-3" />
                                            <span>{task.due_date ? new Date(task.due_date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }) : 'No date'}</span>
                                        </div>
                                    </div>

                                    {/* Assignees + Actions */}
                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                                        <div className="flex -space-x-2">
                                            {(task.assignees || []).slice(0, 3).map((a, i) => (
                                                <div key={i} className="w-6 h-6 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center">
                                                    <span className="text-xs font-bold text-indigo-600">{a[0]}</span>
                                                </div>
                                            ))}
                                            {(task.assignees || []).length > 3 && <span className="text-xs text-gray-400 ml-2">+{(task.assignees || []).length - 3}</span>}
                                        </div>
                                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {colIndex > 0 && (
                                                <button onClick={() => handleMoveTaskAction(task.id, 'left', column.id)} className="p-1 hover:bg-gray-100 rounded" title="Move left">
                                                    <ArrowRight className="w-3 h-3 text-gray-400 rotate-180" />
                                                </button>
                                            )}
                                            {colIndex < columns.length - 1 && (
                                                <button onClick={() => handleMoveTaskAction(task.id, 'right', column.id)} className="p-1 hover:bg-gray-100 rounded" title="Move right">
                                                    <ArrowRight className="w-3 h-3 text-gray-400" />
                                                </button>
                                            )}
                                            <button onClick={() => handleDeleteTask(task.id)} className="p-1 hover:bg-red-50 rounded" title="Delete">
                                                <Trash2 className="w-3 h-3 text-red-400" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Add Task Inline */}
                            {isAddingTask === column.id ? (
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-200">
                                    <input type="text" autoFocus placeholder="Task title..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddTask(column.id)}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    <div className="flex space-x-2 mt-2">
                                        <button onClick={() => handleAddTask(column.id)} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all">Add</button>
                                        <button onClick={() => { setIsAddingTask(null); setNewTaskTitle(''); }} className="px-4 py-1.5 text-gray-500 text-xs font-bold hover:text-gray-700 transition-all">Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <button onClick={() => setIsAddingTask(column.id)} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm font-medium hover:border-indigo-200 hover:text-indigo-500 transition-all flex items-center justify-center space-x-1">
                                    <PlusIcon className="w-4 h-4" /><span>Add Task</span>
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProjectBoardScreen;
