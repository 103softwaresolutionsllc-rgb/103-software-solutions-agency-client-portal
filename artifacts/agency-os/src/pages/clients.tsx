import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetClients, useCreateClient, useUpdateClient, useDeleteClient, type Client } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Plus, Search, Edit2, Trash2, Building, Mail, Phone, Layers } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Clients() {
  const { data: clients = [], isLoading } = useGetClients();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const createClient = useCreateClient({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/clients"] }) }});
  const updateClient = useUpdateClient({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/clients"] }) }});
  const deleteClient = useDeleteClient({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/clients"] }) }});

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form State
  const [formData, setFormData] = useState({ name: "", email: "", company: "", phone: "", status: "active" });

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.company?.toLowerCase().includes(search.toLowerCase())
  );

  const openModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({ name: client.name, email: client.email, company: client.company || "", phone: client.phone || "", status: client.status });
    } else {
      setEditingClient(null);
      setFormData({ name: "", email: "", company: "", phone: "", status: "active" });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await updateClient.mutateAsync({ id: editingClient.id, data: formData });
        toast({ title: "Client updated successfully" });
      } else {
        await createClient.mutateAsync({ data: formData });
        toast({ title: "Client created successfully" });
      }
      setIsModalOpen(false);
    } catch (err) {
      toast({ title: "Error saving client", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this client?")) {
      try {
        await deleteClient.mutateAsync({ id });
        toast({ title: "Client deleted" });
      } catch (err) {
        toast({ title: "Error deleting client", variant: "destructive" });
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold">Clients</h1>
            <p className="mt-2 text-muted-foreground">Manage your agency's client relationships.</p>
          </div>
          <Button onClick={() => openModal()} className="shrink-0">
            <Plus className="mr-2 h-5 w-5" /> Add Client
          </Button>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <div className="mb-6 flex items-center">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Search clients..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-muted-foreground">
                <tr>
                  <th className="pb-4 font-semibold">Client Name</th>
                  <th className="pb-4 font-semibold">Company</th>
                  <th className="pb-4 font-semibold">Contact Info</th>
                  <th className="pb-4 font-semibold">Status</th>
                  <th className="pb-4 font-semibold">Portal Phase</th>
                  <th className="pb-4 font-semibold">Projects</th>
                  <th className="pb-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Loading clients...</td></tr>
                ) : filteredClients.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No clients found.</td></tr>
                ) : (
                  filteredClients.map((client) => (
                    <motion.tr 
                      key={client.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="group transition-colors hover:bg-white/5"
                    >
                      <td className="py-4 font-semibold text-foreground">{client.name}</td>
                      <td className="py-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building className="h-4 w-4" /> {client.company || "N/A"}
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex flex-col gap-1 text-muted-foreground">
                          <span className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {client.email}</span>
                          {client.phone && <span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {client.phone}</span>}
                        </div>
                      </td>
                      <td className="py-4">
                        <Badge variant={client.status === 'active' ? 'success' : 'secondary'}>
                          {client.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-4">
                        {client.portalPhase ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
                            <Layers className="h-3 w-3" />
                            Phase {client.portalPhase}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">No portal</span>
                        )}
                      </td>
                      <td className="py-4 text-muted-foreground">{client.projectCount} Projects</td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={() => openModal(client)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(client.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingClient ? "Edit Client" : "Add New Client"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Full Name</label>
            <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="John Doe" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Email Address</label>
            <Input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="john@example.com" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Company Name</label>
            <Input value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} placeholder="Acme Corp" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Phone Number</label>
            <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+1 (555) 000-0000" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Status</label>
            <select 
              value={formData.status} 
              onChange={e => setFormData({...formData, status: e.target.value})}
              className="flex h-11 w-full rounded-xl border border-white/10 bg-input/50 px-4 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createClient.isPending || updateClient.isPending}>Save Client</Button>
          </div>
        </form>
      </Dialog>
    </DashboardLayout>
  );
}
