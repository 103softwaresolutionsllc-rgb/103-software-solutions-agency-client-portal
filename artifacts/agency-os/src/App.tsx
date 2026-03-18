import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, AuthGuard } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";

// Admin pages
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Projects from "@/pages/projects";
import Tasks from "@/pages/tasks";
import Invoices from "@/pages/invoices";

// Client portal pages
import PortalHome from "@/pages/portal/portal-home";
import PortalDiscovery from "@/pages/portal/portal-discovery";
import PortalOnboarding from "@/pages/portal/portal-onboarding";
import PortalProduction from "@/pages/portal/portal-production";
import PortalLaunch from "@/pages/portal/portal-launch";
import PortalPostLaunch from "@/pages/portal/portal-post-launch";

// Intercept window.fetch to inject auth token for API calls
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
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />

      {/* Staff-only routes */}
      <Route path="/dashboard">
        <AuthGuard allowedRoles={['staff']}><Dashboard /></AuthGuard>
      </Route>
      <Route path="/clients">
        <AuthGuard allowedRoles={['staff']}><Clients /></AuthGuard>
      </Route>
      <Route path="/projects">
        <AuthGuard allowedRoles={['staff']}><Projects /></AuthGuard>
      </Route>
      <Route path="/tasks">
        <AuthGuard allowedRoles={['staff']}><Tasks /></AuthGuard>
      </Route>
      <Route path="/invoices">
        <AuthGuard allowedRoles={['staff']}><Invoices /></AuthGuard>
      </Route>

      {/* Client portal routes */}
      <Route path="/portal">
        <AuthGuard allowedRoles={['client']}><PortalHome /></AuthGuard>
      </Route>
      <Route path="/portal/discovery">
        <AuthGuard allowedRoles={['client']}><PortalDiscovery /></AuthGuard>
      </Route>
      <Route path="/portal/onboarding">
        <AuthGuard allowedRoles={['client']}><PortalOnboarding /></AuthGuard>
      </Route>
      <Route path="/portal/production">
        <AuthGuard allowedRoles={['client']}><PortalProduction /></AuthGuard>
      </Route>
      <Route path="/portal/launch">
        <AuthGuard allowedRoles={['client']}><PortalLaunch /></AuthGuard>
      </Route>
      <Route path="/portal/post-launch">
        <AuthGuard allowedRoles={['client']}><PortalPostLaunch /></AuthGuard>
      </Route>

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
