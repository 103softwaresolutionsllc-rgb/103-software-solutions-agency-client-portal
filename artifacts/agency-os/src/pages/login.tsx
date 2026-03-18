import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Mail } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err?.message || "Invalid credentials. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div className="absolute inset-0 z-0">
        <img
          src={`${import.meta.env.BASE_URL}images/login-bg.png`}
          alt="Abstract mesh background"
          className="w-full h-full object-cover opacity-40 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-background/60 backdrop-blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md p-6"
      >
        <div className="glass-card rounded-3xl p-10">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/5 border border-white/10 shadow-2xl">
              <span className="text-3xl font-display font-black tracking-tighter text-gradient-103">
                103
              </span>
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground">Welcome Back</h1>
            <p className="mt-2 text-sm font-medium tracking-widest text-gradient-brand">
              AGENCY OS CLIENT PORTAL
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-14 rounded-2xl bg-black/20"
                  required
                />
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 h-14 rounded-2xl bg-black/20"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-sm text-destructive text-center"
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              className="w-full h-14 rounded-2xl text-base group"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Authenticating..." : "Sign In"}
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </form>

          <div className="mt-8 rounded-xl border border-white/5 bg-white/3 p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground tracking-wider">DEMO CREDENTIALS</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p><span className="text-primary font-medium">Admin:</span> admin@103software.com / admin123</p>
              <p><span className="text-emerald-400 font-medium">Client (Phase 3):</span> client@apexinnovations.com / client123</p>
              <p><span className="text-yellow-400 font-medium">Client (Phase 2):</span> client@nexusdigital.com / client123</p>
              <p><span className="text-purple-400 font-medium">Client (Phase 1):</span> client@summitanalytics.io / client123</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
