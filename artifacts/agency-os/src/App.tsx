import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, AuthGuard } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";

// Pages
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Projects from "@/pages/projects";
import Tasks from "@/pages/tasks";
import Invoices from "@/pages/invoices";

// Intercept window.fetch to automatically include the Auth token for ALL generated TanStack query hooks
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  const token = localStorage.getItem('agency_os_token');
  if (token && typeof resource === 'string' && resource.startsWith('/api')) {
    config = config || {};
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  return originalFetch(resource, config);
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* Protected Routes */}
      <Route path="/dashboard">
        <AuthGuard><Dashboard /></AuthGuard>
      </Route>
      <Route path="/clients">
        <AuthGuard><Clients /></AuthGuard>
      </Route>
      <Route path="/projects">
        <AuthGuard><Projects /></AuthGuard>
      </Route>
      <Route path="/tasks">
        <AuthGuard><Tasks /></AuthGuard>
      </Route>
      <Route path="/invoices">
        <AuthGuard><Invoices /></AuthGuard>
      </Route>

      {/* Root redirects to dashboard by default (auth guard will bounce to login if needed) */}
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AuthProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
