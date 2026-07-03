import { useUIMode } from "@/contexts/UIModeContext";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Mic, BarChart3, Users, Zap, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-illustration.png";

const features = [
  {
    icon: BarChart3,
    title: "Smart Dashboard",
    description: "See your remaining budget countdown alongside daily spending patterns.",
  },
  {
    icon: Mic,
    title: "Voice Entry",
    description: "Just say \"I spent 500 on dinner\" — we handle the rest.",
  },
  {
    icon: Zap,
    title: "Auto-Categorize",
    description: "Paste any UPI or bank SMS and we extract amount, vendor, and date.",
  },
  {
    icon: Users,
    title: "Split Bills",
    description: "Track who owes you, settle up with friends effortlessly.",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Bank-level encryption. Your financial data never leaves your control.",
  },
  {
    icon: Eye,
    title: "Dual Mode UI",
    description: "Switch between Gen Z dark mode and Senior-friendly high-contrast in one tap.",
  },
];

const LandingPage = () => {
  const { mode } = useUIMode();
  const isEasy = mode === "easy";

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        {!isEasy && (
          <div className="absolute inset-0 opacity-20">
            <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-primary blur-[100px] animate-pulse-glow" />
            <div className="absolute right-1/4 bottom-1/4 h-48 w-48 rounded-full bg-accent blur-[80px] animate-pulse-glow" />
          </div>
        )}

        <div className="container relative mx-auto px-4 py-20 md:py-32">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
            >
              <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 font-display text-sm font-medium text-primary">
                Cross-Generational Finance
              </span>
              <h1 className={`font-display font-bold leading-tight ${isEasy ? "text-4xl md:text-5xl" : "text-4xl md:text-6xl"}`}>
                {isEasy ? (
                  <>Track Your <span className="text-primary">Money In & Out</span> — Simply</>
                ) : (
                  <>Your Money,{" "}<span className="text-gradient">Your Vibe</span></>
                )}
              </h1>
              <p className={`mt-6 text-muted-foreground ${isEasy ? "text-xl leading-relaxed" : "text-lg"} max-w-lg`}>
                {isEasy
                  ? "A simple, clear way to see where your money goes. Big buttons, voice entry, and no confusing menus."
                  : "Auto-track expenses, manage subscriptions, split bills, and vibe-check your spending — all in one sleek dashboard."}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to="/dashboard"
                  className={`inline-flex items-center gap-2 rounded-lg gradient-primary font-semibold text-primary-foreground transition-all hover:opacity-90 glow-primary ${
                    isEasy ? "px-8 py-4 text-lg" : "px-6 py-3 text-sm"
                  }`}
                >
                  {isEasy ? "Start Tracking" : "Get Started"}
                  <ArrowRight className={isEasy ? "h-5 w-5" : "h-4 w-4"} />
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative"
            >
              <div className={`overflow-hidden rounded-2xl ${isEasy ? "" : "glow-primary"}`}>
                <img
                  src={heroImage}
                  alt="ZenMoney dashboard preview"
                  className="w-full rounded-2xl"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className={`font-display font-bold ${isEasy ? "text-3xl" : "text-3xl md:text-4xl"}`}>
              {isEasy ? "Everything You Need" : "Built for Every Generation"}
            </h2>
            <p className="mt-3 text-muted-foreground text-lg">
              {isEasy ? "Simple tools to manage your finances" : "Powerful features, zero complexity"}
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`group rounded-xl p-6 transition-all ${
                  isEasy
                    ? "border-2 border-border bg-card hover:border-primary"
                    : "glass hover:glow-primary"
                }`}
              >
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                  <feature.icon className={`text-primary ${isEasy ? "h-7 w-7" : "h-5 w-5"}`} />
                </div>
                <h3 className={`font-display font-semibold ${isEasy ? "text-xl" : "text-lg"}`}>
                  {feature.title}
                </h3>
                <p className={`mt-2 text-muted-foreground ${isEasy ? "text-base" : "text-sm"}`}>
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p className={isEasy ? "text-base" : "text-sm"}>
            © 2026 ZenMoney. Your finances, simplified.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
