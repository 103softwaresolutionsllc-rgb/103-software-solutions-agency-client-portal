import { useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetProjects, useCreateProject, useUpdateProject, useDeleteProject, useGetClients, type Project } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Plus, Edit2, Trash2, Calendar, Target, DollarSign, Package, Layers, ExternalLink } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

export default function Projects() {
  const { data: projects = [], isLoading } = useGetProjects();
  const { data: clients = [] } = useGetClients();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const createProject = useCreateProject({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/projects"] }) }});
  const updateProject = useUpdateProject({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/projects"] }) }});
  const deleteProject = useDeleteProject({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/projects"] }) }});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [formData, setFormData] = useState({ 
    name: "", description: "", status: "planning", budget: 0, dueDate: "", clientId: 0 
  });

  const openModal = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setFormData({ 
        name: project.name, 
        description: project.description || "", 
        status: project.status, 
        budget: project.budget || 0, 
        dueDate: project.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : "", 
        clientId: project.clientId 
      });
    } else {
      setEditingProject(null);
      setFormData({ name: "", description: "", status: "planning", budget: 0, dueDate: "", clientId: clients[0]?.id || 0 });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        budget: Number(formData.budget),
        clientId: Number(formData.clientId),
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null
      };

      if (editingProject) {
        await updateProject.mutateAsync({ id: editingProject.id, data: payload });
        toast({ title: "Project updated successfully" });
      } else {
        await createProject.mutateAsync({ data: payload });
        toast({ title: "Project created successfully" });
      }
      setIsModalOpen(false);
    } catch (err) {
      toast({ title: "Error saving project", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this project?")) {
      try {
        await deleteProject.mutateAsync({ id });
        toast({ title: "Project deleted" });
      } catch (err) {
        toast({ title: "Error deleting project", variant: "destructive" });
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'planning': return 'purple';
      case 'on-hold': return 'warning';
      case 'completed': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold">Projects</h1>
            <p className="mt-2 text-muted-foreground">Track and manage client projects.</p>
          </div>
          <Button onClick={() => openModal()} className="shrink-0">
            <Plus className="mr-2 h-5 w-5" /> New Project
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
        ) : projects.length === 0 ? (
           <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">No projects found. Create one to get started.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {projects.map((project) => {
              const progress = project.taskCount > 0 ? Math.round((project.completedTaskCount / project.taskCount) * 100) : 0;
              return (
                <motion.div key={project.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-2xl p-6 group flex flex-col hover-glow relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                    <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getStatusColor(project.status) as "default" | "secondary" | "destructive" | "outline"}>{project.status.toUpperCase()}</Badge>
                      {project.packageName && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 text-xs font-medium border border-purple-500/20">
                          <Package className="h-3 w-3" />{project.packageName}
                        </span>
                      )}
                      {project.currentPhase && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                          <Layers className="h-3 w-3" />Phase {project.currentPhase}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => navigate(`/projects/${project.id}`)} className="text-muted-foreground hover:text-primary" title="View details"><ExternalLink className="h-4 w-4" /></button>
                      <button onClick={() => openModal(project)} className="text-muted-foreground hover:text-primary"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(project.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-1">{project.name}</h3>
                  <p className="text-sm text-primary font-medium mb-4">{project.clientName}</p>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-6 flex-1">
                    {project.description || "No description provided."}
                  </p>

                  <div className="space-y-3 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center text-muted-foreground"><DollarSign className="h-4 w-4 mr-1"/> Budget</span>
                      <span className="font-semibold text-foreground">{project.budget ? formatCurrency(project.budget) : 'TBD'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center text-muted-foreground"><Calendar className="h-4 w-4 mr-1"/> Due Date</span>
                      <span className="font-semibold text-foreground">{project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'No date'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center text-muted-foreground"><Target className="h-4 w-4 mr-1"/> Tasks</span>
                      <span className="font-semibold text-foreground">{project.completedTaskCount} / {project.taskCount}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProject ? "Edit Project" : "Create Project"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Project Name</label>
            <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Website Redesign" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Client</label>
            <select 
              required
              value={formData.clientId} 
              onChange={e => setFormData({...formData, clientId: Number(e.target.value)})}
              className="flex h-11 w-full rounded-xl border border-white/10 bg-input/50 px-4 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none"
            >
              <option value={0} disabled>Select a client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Description</label>
            <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Short description..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">Budget ($)</label>
              <Input type="number" min="0" step="0.01" value={formData.budget} onChange={e => setFormData({...formData, budget: Number(e.target.value)})} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">Due Date</label>
              <Input type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Status</label>
            <select 
              value={formData.status} 
              onChange={e => setFormData({...formData, status: e.target.value})}
              className="flex h-11 w-full rounded-xl border border-white/10 bg-input/50 px-4 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none"
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on-hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createProject.isPending || updateProject.isPending}>Save Project</Button>
          </div>
        </form>
      </Dialog>
    </DashboardLayout>
  );
}
