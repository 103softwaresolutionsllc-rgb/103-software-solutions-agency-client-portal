import { useState, useEffect } from "react";

export interface PortalProject {
  id: number;
  name: string;
  description: string | null;
  status: string;
  budget: number | null;
  dueDate: string | null;
  currentPhase: number;
  createdAt: string;
}

export interface PortalClient {
  id: number;
  name: string;
  email: string;
  company: string | null;
}

export interface PortalPackage {
  id: number;
  name: string;
  slug: string;
  price: number;
  description: string | null;
  phases: number;
}

export interface ChecklistItem {
  id: number;
  label: string;
  description: string | null;
  phase: number;
  isCompleted: boolean;
  completedAt: string | null;
  sortOrder: number;
}

export interface FeedbackRound {
  id: number;
  roundNumber: number;
  feedbackText: string;
  designArea: string | null;
  status: string;
  adminNotes: string | null;
  createdAt: string;
}

export interface DiscoveryResponse {
  id: number;
  responses: Record<string, string>;
  submittedAt: string | null;
}

export interface Testimonial {
  id: number;
  rating: number;
  testimonialText: string;
  referralName: string | null;
  referralEmail: string | null;
  createdAt: string;
}

export interface PortalInvoice {
  id: number;
  invoiceNumber: string;
  status: string;
  amount: number;
  dueDate: string | null;
  paidDate: string | null;
}

export interface PortalData {
  project: PortalProject;
  client: PortalClient;
  package: PortalPackage | null;
  checklist: ChecklistItem[];
  discoveryResponse: DiscoveryResponse | null;
  feedbackRounds: FeedbackRound[];
  testimonial: Testimonial | null;
  invoices: PortalInvoice[];
}

export function usePortalData() {
  const [data, setData] = useState<PortalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/portal/project');
      if (!res.ok) throw new Error("Failed to load portal data");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { data, isLoading, error, refresh };
}
