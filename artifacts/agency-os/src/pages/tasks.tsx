import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetTasks, useCreateTask, useUpdateTask, useDeleteTask, useGetProjects, type Task } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Plus, Edit2, Trash2, Calendar, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const KANBAN_COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'bg-white/5 border-white/10' },
  { id: 'in-progress', label: 'In Progress', color: 'bg-primary/5 border-primary/20' },
  { id: 'review', label: 'Review', color: 'bg-purple-500/5 border-purple-500/20' },
  { id: 'done', label: 'Done', color: 'bg-emerald-500/5 border-emerald-500/20' }
];

export default function Tasks() {
  const { data: tasks = [], isLoading } = useGetTasks();
  const { data: projects = [] } = useGetProjects();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const createTask = useCreateTask({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }) }});
  const updateTask = useUpdateTask({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }) }});
  const deleteTask = useDeleteTask({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }) }});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [formData, setFormData] = useState({ 
    title: "", description: "", status: "todo", priority: "medium", dueDate: "", projectId: 0 
  });

  const openModal = (task?: Task, defaultStatus?: string) => {
    if (task) {
      setEditingTask(task);
      setFormData({ 
        title: task.title, 
        description: task.description || "", 
        status: task.status, 
        priority: task.priority, 
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "", 
        projectId: task.projectId 
      });
    } else {
      setEditingTask(null);
      setFormData({ 
        title: "", description: "", 
        status: defaultStatus || "todo", 
        priority: "medium", dueDate: "", 
        projectId: projects[0]?.id || 0 
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        projectId: Number(formData.projectId),
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null
      };

      if (editingTask) {
        await updateTask.mutateAsync({ id: editingTask.id, data: payload });
        toast({ title: "Task updated" });
      } else {
        await createTask.mutateAsync({ data: payload });
        toast({ title: "Task created" });
      }
      setIsModalOpen(false);
    } catch (err) {
      toast({ title: "Error saving task", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this task?")) {
      await deleteTask.mutateAsync({ id });
      toast({ title: "Task deleted" });
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent': return <Badge variant="destructive">URGENT</Badge>;
      case 'high': return <Badge variant="warning">HIGH</Badge>;
      case 'medium': return <Badge variant="default">MEDIUM</Badge>;
      default: return <Badge variant="secondary">LOW</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 h-full flex flex-col">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-4xl font-display font-bold">Tasks</h1>
            <p className="mt-2 text-muted-foreground">Manage project deliverables.</p>
          </div>
          <Button onClick={() => openModal()} className="shrink-0">
            <Plus className="mr-2 h-5 w-5" /> New Task
          </Button>
        </div>

        {isLoading ? (
           <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 flex-1 min-h-[500px] overflow-x-auto pb-4">
            {KANBAN_COLUMNS.map((col) => {
              const columnTasks = tasks.filter(t => t.status === col.id);
              return (
                <div key={col.id} className={`flex flex-col rounded-2xl border ${col.color} backdrop-blur-md p-4 min-w-[300px]`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      {col.label}
                      <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-muted-foreground">{columnTasks.length}</span>
                    </h3>
                    <button onClick={() => openModal(undefined, col.id)} className="p-1 rounded hover:bg-white/10 text-muted-foreground transition-colors"><Plus className="h-4 w-4" /></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                    {columnTasks.map(task => (
                      <motion.div 
                        key={task.id}
                        layoutId={`task-${task.id}`}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-card border border-white/5 p-4 rounded-xl shadow-lg group hover:border-primary/30 transition-colors relative"
                      >
                        <div className="flex justify-between items-start mb-2">
                          {getPriorityBadge(task.priority)}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openModal(task)} className="text-muted-foreground hover:text-primary"><Edit2 className="h-3.5 w-3.5" /></button>
                            <button onClick={() => handleDelete(task.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                        <h4 className="font-bold text-sm text-foreground mb-1 leading-tight">{task.title}</h4>
                        <p className="text-xs text-primary mb-3">{task.projectName}</p>
                        
                        {task.dueDate && (
                          <div className="flex items-center text-xs text-muted-foreground mt-4 border-t border-white/5 pt-3">
                            <Calendar className="h-3.5 w-3.5 mr-1.5" />
                            {new Date(task.dueDate).toLocaleDateString()}
                          </div>
                        )}
                      </motion.div>
                    ))}
                    {columnTasks.length === 0 && (
                      <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed border-white/5 rounded-xl">
                        Drop tasks here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTask ? "Edit Task" : "Create Task"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Task Title</label>
            <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Design hero section..." />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Project</label>
            <select 
              required
              value={formData.projectId} 
              onChange={e => setFormData({...formData, projectId: Number(e.target.value)})}
              className="flex h-11 w-full rounded-xl border border-white/10 bg-input/50 px-4 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none"
            >
              <option value={0} disabled>Select a project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Description</label>
            <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Add details..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">Status</label>
              <select 
                value={formData.status} 
                onChange={e => setFormData({...formData, status: e.target.value})}
                className="flex h-11 w-full rounded-xl border border-white/10 bg-input/50 px-4 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none"
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">Priority</label>
              <select 
                value={formData.priority} 
                onChange={e => setFormData({...formData, priority: e.target.value})}
                className="flex h-11 w-full rounded-xl border border-white/10 bg-input/50 px-4 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Due Date</label>
            <Input type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
          </div>
          <div className="pt-4 flex justify-end gap-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createTask.isPending || updateTask.isPending}>Save Task</Button>
          </div>
        </form>
      </Dialog>
    </DashboardLayout>
  );
}
