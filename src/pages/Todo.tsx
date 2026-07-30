import { useState } from 'react';
import { useStore, TodoStep } from '../store/useStore';
import { Plus, CheckCircle2, Circle, Trash2, GripVertical, ChevronDown, ChevronRight, X } from 'lucide-react';

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
    <div className="page-enter space-y-14 md:space-y-20">
      <header className="flex min-h-[42vh] flex-col justify-end text-white">
        <p className="hero-text-shadow mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-white/80">Focus</p>
        <h1 className="page-title hero-text-shadow">待办与流程。</h1>
        <p className="hero-text-shadow mt-6 max-w-2xl text-lg font-medium text-white/85 md:text-xl">一次只推进一件重要的事，把复杂事项拆成看得见的下一步。</p>
      </header>

      <form onSubmit={handleAddTodo} className="apple-surface space-y-5 rounded-[2.5rem] p-7 sm:p-10">
        <input
          type="text"
          placeholder="新任务标题..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="w-full border-none bg-transparent px-0 text-3xl font-semibold tracking-[-0.04em] outline-none placeholder:text-zinc-300 focus:ring-0 dark:placeholder:text-zinc-700"
          required
        />
        <input
          type="text"
          placeholder="添加备注描述（可选）..."
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          className="w-full border-none bg-transparent px-0 text-[15px] text-zinc-600 outline-none placeholder:text-zinc-400 focus:ring-0 dark:text-zinc-400"
        />
        <div className="flex justify-end border-t border-black/[0.07] pt-5 dark:border-white/[0.09]">
          <button
            type="submit"
            disabled={!newTitle.trim()}
            className="apple-button"
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
                className={`apple-surface overflow-hidden rounded-[2rem] transition ${todo.completed ? '!border-emerald-500/30' : ''}`}
              >
                <div className="flex items-start gap-4 p-5 sm:items-center sm:p-7">
                  <button 
                    onClick={() => toggleTodoComplete(todo.id, todo.completed)}
                    className={`mt-1 sm:mt-0 shrink-0 transition-colors ${todo.completed ? 'text-emerald-500' : 'text-zinc-300 hover:text-emerald-400 dark:text-zinc-600 dark:hover:text-emerald-500'}`}
                  >
                    {todo.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-lg font-semibold tracking-[-0.025em] transition-all sm:text-xl ${todo.completed ? 'text-zinc-400 line-through' : 'text-zinc-900 dark:text-zinc-100'}`}>
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
                          void deleteTodo(todo.id).catch((error) => console.error('Failed to delete todo:', error));
                        }
                      }}
                      className="p-2 text-red-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-black/[0.07] bg-black/[0.025] p-5 sm:p-7 dark:border-white/[0.08] dark:bg-white/[0.025]">
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
                        className="apple-input min-h-10 flex-1 py-2"
                      />
                      <button 
                        type="submit"
                        disabled={!stepInput.trim()}
                        className="apple-button min-h-10 px-4 py-2"
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
          <div className="apple-surface rounded-[2.5rem] py-24 text-center">
            <CheckCircle2 className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500">太棒了，所有任务都已完成！</p>
          </div>
        )}
      </div>
    </div>
  );
}
