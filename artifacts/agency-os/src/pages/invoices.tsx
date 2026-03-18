import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetInvoices, useCreateInvoice, useUpdateInvoice, useGetClients, type Invoice } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Plus, Download, Edit2, FileText } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

export default function Invoices() {
  const { data: invoices = [], isLoading } = useGetInvoices();
  const { data: clients = [] } = useGetClients();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const createInvoice = useCreateInvoice({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/invoices"] }) }});
  const updateInvoice = useUpdateInvoice({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/invoices"] }) }});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const [formData, setFormData] = useState({ 
    invoiceNumber: "", status: "draft", amount: 0, dueDate: "", clientId: 0 
  });

  const openModal = (invoice?: Invoice) => {
    if (invoice) {
      setEditingInvoice(invoice);
      setFormData({ 
        invoiceNumber: invoice.invoiceNumber, 
        status: invoice.status, 
        amount: invoice.amount, 
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : "", 
        clientId: invoice.clientId 
      });
    } else {
      setEditingInvoice(null);
      setFormData({ 
        invoiceNumber: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random()*1000)).padStart(3,'0')}`, 
        status: "draft", amount: 0, dueDate: "", clientId: clients[0]?.id || 0 
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        amount: Number(formData.amount),
        clientId: Number(formData.clientId),
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null
      };

      if (editingInvoice) {
        // Update request schema specifies partial fields for invoice updates
        await updateInvoice.mutateAsync({ id: editingInvoice.id, data: { status: payload.status, amount: payload.amount, dueDate: payload.dueDate } });
        toast({ title: "Invoice updated" });
      } else {
        await createInvoice.mutateAsync({ data: payload });
        toast({ title: "Invoice created" });
      }
      setIsModalOpen(false);
    } catch (err) {
      toast({ title: "Error saving invoice", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <Badge variant="success">PAID</Badge>;
      case 'sent': return <Badge variant="primary">SENT</Badge>;
      case 'overdue': return <Badge variant="destructive">OVERDUE</Badge>;
      default: return <Badge variant="secondary">DRAFT</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold">Invoices</h1>
            <p className="mt-2 text-muted-foreground">Manage billing and payments.</p>
          </div>
          <Button onClick={() => openModal()} className="shrink-0">
            <Plus className="mr-2 h-5 w-5" /> Generate Invoice
          </Button>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-muted-foreground">
                <tr>
                  <th className="pb-4 font-semibold">Invoice ID</th>
                  <th className="pb-4 font-semibold">Client</th>
                  <th className="pb-4 font-semibold">Amount</th>
                  <th className="pb-4 font-semibold">Status</th>
                  <th className="pb-4 font-semibold">Due Date</th>
                  <th className="pb-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Loading invoices...</td></tr>
                ) : invoices.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No invoices generated yet.</td></tr>
                ) : (
                  invoices.map((invoice) => (
                    <motion.tr 
                      key={invoice.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="group transition-colors hover:bg-white/5"
                    >
                      <td className="py-4 font-semibold text-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {invoice.invoiceNumber}
                      </td>
                      <td className="py-4 text-muted-foreground">{invoice.clientName}</td>
                      <td className="py-4 font-bold text-foreground">{formatCurrency(invoice.amount)}</td>
                      <td className="py-4">
                        {getStatusBadge(invoice.status)}
                      </td>
                      <td className="py-4 text-muted-foreground">
                        {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={() => toast({ title: "Downloading..." })}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openModal(invoice)}>
                            <Edit2 className="h-4 w-4" />
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

      <Dialog isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingInvoice ? "Edit Invoice" : "Generate Invoice"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">Invoice Number</label>
              <Input required disabled={!!editingInvoice} value={formData.invoiceNumber} onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">Amount ($)</label>
              <Input required type="number" min="0" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Client</label>
            <select 
              required
              disabled={!!editingInvoice}
              value={formData.clientId} 
              onChange={e => setFormData({...formData, clientId: Number(e.target.value)})}
              className="flex h-11 w-full rounded-xl border border-white/10 bg-input/50 px-4 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none disabled:opacity-50"
            >
              <option value={0} disabled>Select a client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Due Date</label>
            <Input type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Status</label>
            <select 
              value={formData.status} 
              onChange={e => setFormData({...formData, status: e.target.value})}
              className="flex h-11 w-full rounded-xl border border-white/10 bg-input/50 px-4 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none"
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createInvoice.isPending || updateInvoice.isPending}>Save Invoice</Button>
          </div>
        </form>
      </Dialog>
    </DashboardLayout>
  );
}
