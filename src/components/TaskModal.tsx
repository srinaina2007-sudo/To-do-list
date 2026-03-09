import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Plus, Trash2, Wand2, GripVertical, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Task, Subtask } from '../types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GoogleGenAI } from '@google/genai';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  onComplete?: (task: Task) => void;
  initialTask?: Task | null;
  suggestSubtasks: (title: string, description: string) => Promise<string[]>;
}

function SortableSubtask({ st, onToggle, onRemove }: { st: Subtask, onToggle: (id: string) => void, onRemove: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: st.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 ${isDragging ? 'shadow-md opacity-80' : ''}`}
    >
      <div 
        className="cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </div>
      <input
        type="checkbox"
        checked={st.isCompleted}
        onChange={() => onToggle(st.id)}
        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
      />
      <span className={`flex-1 text-sm ${st.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
        {st.title}
      </span>
      <button onClick={() => onRemove(st.id)} className="text-slate-400 hover:text-red-500">
        <Trash2 size={16} />
      </button>
    </div>
  );
}

export function TaskModal({ isOpen, onClose, onSave, onComplete, initialTask, suggestSubtasks }: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [error, setError] = useState('');
  
  const [imageUrl, setImageUrl] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (isOpen) {
      if (initialTask) {
        setTitle(initialTask.title);
        setDescription(initialTask.description);
        setDeadline(initialTask.deadline);
        setSubtasks(initialTask.subtasks || []);
        setImageUrl(initialTask.imageUrl || '');
      } else {
        setTitle('');
        setDescription('');
        
        // Set default deadline to 1 hour from now
        const now = new Date();
        now.setHours(now.getHours() + 1);
        // Format to YYYY-MM-DDThh:mm
        const tzoffset = now.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(now.getTime() - tzoffset)).toISOString().slice(0, 16);
        setDeadline(localISOTime);
        
        setSubtasks([]);
        setImageUrl('');
      }
      setError('');
      setImagePrompt('');
      setShowImagePrompt(false);
    }
  }, [isOpen, initialTask]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    const selectedDeadline = new Date(deadline).getTime();
    const now = new Date().getTime();

    if (selectedDeadline <= now) {
      setError('Deadline must be in the future');
      return;
    }

    const task: Task = {
      id: initialTask?.id || crypto.randomUUID(),
      title,
      description,
      deadline,
      status: initialTask?.status || 'pending',
      createdAt: initialTask?.createdAt || new Date().toISOString(),
      subtasks: subtasks.map((st, index) => ({ ...st, position: index })),
      position: initialTask?.position,
      imageUrl,
    };

    onSave(task);
    onClose();
  };

  const handleAddSubtask = () => {
    if (newSubtaskTitle.trim()) {
      setSubtasks([...subtasks, { id: crypto.randomUUID(), title: newSubtaskTitle, isCompleted: false }]);
      setNewSubtaskTitle('');
    }
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter(st => st.id !== id));
  };

  const handleToggleSubtask = (id: string) => {
    setSubtasks(subtasks.map(st => st.id === id ? { ...st, isCompleted: !st.isCompleted } : st));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSubtasks((items) => {
        const oldIndex = items.findIndex((t) => t.id === active.id);
        const newIndex = items.findIndex((t) => t.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleMagicSuggest = async () => {
    if (!title.trim()) {
      setError('Please enter a title first to get suggestions.');
      return;
    }
    setIsSuggesting(true);
    setError('');
    const suggestions = await suggestSubtasks(title, description);
    if (suggestions.length > 0) {
      const newSubtasks = suggestions.map(st => ({
        id: crypto.randomUUID(),
        title: st,
        isCompleted: false
      }));
      setSubtasks([...subtasks, ...newSubtasks]);
    } else {
      setError('Could not generate suggestions. Please try again.');
    }
    setIsSuggesting(false);
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setIsGeneratingImage(true);
    setError('');
    try {
      if ((window as any).aistudio && (window as any).aistudio.hasSelectedApiKey) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await (window as any).aistudio.openSelectKey();
        }
      }

      const apiKey = (import.meta as any).env?.VITE_API_KEY || (process as any).env?.API_KEY || (process as any).env?.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('API key not found. Please select an API key first.');
      }
      
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [
            {
              text: imagePrompt,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
            imageSize: "512px"
          }
        },
      });
      
      let generatedImageUrl = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          generatedImageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${base64EncodeString}`;
          break;
        }
      }
      
      if (generatedImageUrl) {
        setImageUrl(generatedImageUrl);
        setShowImagePrompt(false);
      } else {
        setError('Failed to generate image. Please try a different prompt.');
      }
    } catch (err: any) {
      console.error('Image generation error:', err);
      const errorMsg = err.message || JSON.stringify(err);
      if (errorMsg.includes('Requested entity was not found') || 
          errorMsg.includes('API key not found') ||
          errorMsg.includes('PERMISSION_DENIED') ||
          errorMsg.includes('403')) {
        if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
          await (window as any).aistudio.openSelectKey();
          setError('Please select a valid API key with access to image generation and try again.');
        } else {
          setError('API Key error. Please check your configuration.');
        }
      } else {
        setError('Error generating image: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-xl font-semibold text-slate-800">
            {initialTask ? 'Edit Task' : 'New Task'}
          </h2>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {imageUrl && (
              <div className="relative h-32 w-full overflow-hidden rounded-xl">
                <img src={imageUrl} alt="Task cover" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                <button 
                  onClick={() => setImageUrl('')}
                  className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {!imageUrl && !showImagePrompt && (
              <button
                onClick={() => setShowImagePrompt(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-3 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <ImageIcon size={18} />
                Add Cover Image with AI
              </button>
            )}

            {showImagePrompt && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                <label className="mb-2 block text-sm font-medium text-indigo-900">Image Prompt</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="E.g., A neon hologram of a cat..."
                    className="flex-1 rounded-lg border border-indigo-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleGenerateImage())}
                  />
                  <button
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage || !imagePrompt.trim()}
                    className="flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isGeneratingImage ? <Loader2 size={16} className="animate-spin" /> : 'Generate'}
                  </button>
                </div>
                <button 
                  onClick={() => setShowImagePrompt(false)}
                  className="mt-2 text-xs text-indigo-600 hover:underline"
                >
                  Cancel
                </button>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="What needs to be done?"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="Add details..."
                rows={3}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Deadline</label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Subtasks</label>
                <button
                  type="button"
                  onClick={handleMagicSuggest}
                  disabled={isSuggesting || !title.trim()}
                  className="flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-100 disabled:opacity-50"
                >
                  <Wand2 size={12} />
                  {isSuggesting ? 'Suggesting...' : 'Magic Suggest'}
                </button>
              </div>
              
              <div className="space-y-2">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={subtasks.map(st => st.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {subtasks.map((st) => (
                      <SortableSubtask
                        key={st.id}
                        st={st}
                        onToggle={handleToggleSubtask}
                        onRemove={handleRemoveSubtask}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
                
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubtask())}
                    placeholder="Add a step..."
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    disabled={!newSubtaskTitle.trim()}
                    className="rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-slate-100 p-6 bg-slate-50">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          
          {initialTask && initialTask.status !== 'completed' && onComplete && (
            <button
              onClick={() => {
                onComplete(initialTask);
                onClose();
              }}
              className="flex-1 rounded-xl bg-emerald-500 py-2.5 font-medium text-white hover:bg-emerald-600"
            >
              Complete
            </button>
          )}

          <button
            onClick={handleSave}
            className="flex-1 rounded-xl bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700"
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </div>
  );
}
