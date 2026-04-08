import { useState } from 'react';
import { useStore, TodoStep } from '../store/useStore';
import { Plus, CheckCircle2, Circle, Trash2, Edit2, GripVertical, ChevronDown, ChevronRight, X } from 'lucide-react';

export default function Todo() {
  const todos = useStore((state) => state.todos);
  const addTodo = useStore((state) => state.addTodo);
  const updateTodo = useStore((state) => state.updateTodo);
  const deleteTodo = useStore((state) => state.deleteTodo);
  
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [stepInput, setStepInput] = useState('');

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    
    addTodo({
      title: newTitle,
      description: newDesc,
      steps: []
    });
    
    setNewTitle('');
    setNewDesc('');
  };

  const handleAddStep = (e: React.FormEvent, todoId: string, currentSteps: TodoStep[]) => {
    e.preventDefault();
    if (!stepInput.trim()) return;
    
    updateTodo(todoId, {
      steps: [...currentSteps, { id: crypto.randomUUID(), title: stepInput, completed: false }]
    });
    setStepInput('');
  };

  const toggleTodoComplete = (id: string, currentStatus: boolean) => {
    updateTodo(id, { completed: !currentStatus });
  };

  const toggleStepComplete = (todoId: string, steps: TodoStep[], stepId: string) => {
    const updatedSteps = steps.map(s => s.id === stepId ? { ...s, completed: !s.completed } : s);
    updateTodo(todoId, { steps: updatedSteps });
  };

  const deleteStep = (todoId: string, steps: TodoStep[], stepId: string) => {
    updateTodo(todoId, { steps: steps.filter(s => s.id !== stepId) });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">待办与流程</h1>
        <p className="text-zinc-500 dark:text-zinc-400">管理您的任务清单，并将复杂事项拆分为详细流程。</p>
      </div>

      <form onSubmit={handleAddTodo} className="bg-white/[var(--component-bg-alpha)] dark:bg-zinc-950/[var(--component-bg-alpha)] backdrop-blur-md p-6 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm space-y-4">
        <input
          type="text"
          placeholder="新任务标题..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="w-full text-lg font-bold bg-transparent border-none outline-none placeholder:text-zinc-400 focus:ring-0 px-0"
          required
        />
        <input
          type="text"
          placeholder="添加备注描述（可选）..."
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          className="w-full text-sm text-zinc-600 dark:text-zinc-400 bg-transparent border-none outline-none placeholder:text-zinc-500 focus:ring-0 px-0"
        />
        <div className="flex justify-end pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="submit"
            disabled={!newTitle.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 transition-colors shadow-sm text-sm"
          >
            <Plus className="w-4 h-4" />
            创建任务
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {todos.length > 0 ? (
          todos.map((todo) => {
            const isExpanded = expandedId === todo.id;
            const progress = todo.steps.length > 0 
              ? Math.round((todo.steps.filter(s => s.completed).length / todo.steps.length) * 100) 
              : todo.completed ? 100 : 0;

            return (
              <div 
                key={todo.id} 
                className={`bg-white/[var(--component-bg-alpha)] dark:bg-zinc-950/[var(--component-bg-alpha)] backdrop-blur-md rounded-2xl border ${todo.completed ? 'border-emerald-500/30 dark:border-emerald-500/20' : 'border-zinc-200/50 dark:border-zinc-800/50'} shadow-sm overflow-hidden transition-colors`}
              >
                <div className="p-4 sm:p-5 flex items-start sm:items-center gap-4">
                  <button 
                    onClick={() => toggleTodoComplete(todo.id, todo.completed)}
                    className={`mt-1 sm:mt-0 shrink-0 transition-colors ${todo.completed ? 'text-emerald-500' : 'text-zinc-300 hover:text-emerald-400 dark:text-zinc-600 dark:hover:text-emerald-500'}`}
                  >
                    {todo.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-base sm:text-lg font-bold transition-all ${todo.completed ? 'text-zinc-400 line-through' : 'text-zinc-900 dark:text-zinc-100'}`}>
                      {todo.title}
                    </h3>
                    {todo.description && (
                      <p className={`text-sm mt-1 truncate ${todo.completed ? 'text-zinc-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
                        {todo.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    {todo.steps.length > 0 && (
                      <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-zinc-500">
                        <div className="w-16 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                        {progress}%
                      </div>
                    )}
                    
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : todo.id)}
                      className="p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('确定要删除这个任务吗？')) {
                          deleteTodo(todo.id);
                        }
                      }}
                      className="p-2 text-red-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-zinc-100 dark:border-zinc-800/50 p-4 sm:p-5 bg-zinc-50/50 dark:bg-zinc-900/20">
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-zinc-400" />
                      执行流程
                    </h4>
                    
                    <div className="space-y-2 pl-6 mb-4">
                      {todo.steps.map((step) => (
                        <div key={step.id} className="flex items-center gap-3 group">
                          <button 
                            onClick={() => toggleStepComplete(todo.id, todo.steps, step.id)}
                            className={`shrink-0 transition-colors ${step.completed ? 'text-emerald-500' : 'text-zinc-300 hover:text-emerald-400 dark:text-zinc-600 dark:hover:text-emerald-500'}`}
                          >
                            {step.completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                          </button>
                          <span className={`flex-1 text-sm ${step.completed ? 'text-zinc-400 line-through' : 'text-zinc-700 dark:text-zinc-300'}`}>
                            {step.title}
                          </span>
                          <button 
                            onClick={() => deleteStep(todo.id, todo.steps, step.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={(e) => handleAddStep(e, todo.id, todo.steps)} className="flex gap-2 pl-6">
                      <input
                        type="text"
                        placeholder="添加新步骤..."
                        value={stepInput}
                        onChange={(e) => setStepInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                      />
                      <button 
                        type="submit"
                        disabled={!stepInput.trim()}
                        className="px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-lg disabled:opacity-50"
                      >
                        添加
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-24 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
            <CheckCircle2 className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500">太棒了，所有任务都已完成！</p>
          </div>
        )}
      </div>
    </div>
  );
}
