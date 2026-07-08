import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useUIMode } from "@/contexts/UIModeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useFinanceData";
import {
  Wallet,
  Sun,
  Moon,
  LayoutDashboard,
  Mic,
  LogIn,
  LogOut,
  Menu,
  X,
  Home,
  User,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import AddTransactionForm from "@/components/AddTransactionForm";
import AddSubscriptionForm from "@/components/AddSubscriptionForm";
import AddOwedForm from "@/components/AddOwedForm";

const Navbar = () => {
  const { mode, setMode, toggleMode, theme, setTheme } = useUIMode();
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const location = useLocation();
  const navigate = useNavigate();
  const isEasy = mode === "easy";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setMobileMenuOpen(prev => !prev);
    window.addEventListener("toggle-mobile-menu", handleToggle);
    return () => window.removeEventListener("toggle-mobile-menu", handleToggle);
  }, []);

  const rawName = profile?.display_name || user?.user_metadata?.display_name || user?.email;
  const firstName = rawName ? rawName.split("@")[0].split(" ")[0] : "";
  const capitalizedName = firstName ? firstName.charAt(0).toUpperCase() : "U";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    setMobileMenuOpen(false);
  };

  const navItems = [
    {
      label: "Home",
      path: "/",
      icon: Home,
      show: !user,
    },
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
      show: !!user,
    },
  ];

  const activePath = location.pathname;

  if (!user) {
    return (
      <motion.nav
        initial={{ y: -25, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`sticky top-0 z-50 border-b border-border w-full ${
          isEasy ? "bg-card border-b-2" : "glass-strong"
        }`}
      >
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className={`font-display font-bold ${isEasy ? "text-xl" : "text-lg"}`}>
              ZenMoney
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className={`flex items-center gap-2 font-medium transition-colors ${
                activePath === "/" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              } ${isEasy ? "text-lg" : "text-sm"}`}
            >
              <Home className={isEasy ? "h-5 w-5" : "h-4 w-4"} />
              Home
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg border border-border bg-muted/20">
              <Sun className={`h-4 w-4 ${theme === "light" ? "text-primary" : "text-muted-foreground"}`} />
              <Switch checked={theme === "dark"} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
              <Moon className={`h-4 w-4 ${theme === "dark" ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <Link to="/auth">
              <Button size={isEasy ? "lg" : "sm"} className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                <span>Sign In</span>
              </Button>
            </Link>
          </div>
        </div>
      </motion.nav>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="z-50 shrink-0"
    >
      {/* 📱 Mobile Topbar */}
      <div
        className={`md:hidden flex items-center justify-between w-full px-4 py-3 border-b border-border sticky top-0 ${
          isEasy ? "bg-card" : "glass-strong"
        }`}
      >
        <Link
          to="/dashboard"
          className="flex items-center gap-2 shrink-0"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
            <Wallet className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className={`font-display font-bold ${isEasy ? "text-xl" : "text-lg"}`}>
            ZenMoney
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2 py-1 rounded-lg border border-border bg-muted/20">
            <Sun className={`h-4 w-4 ${theme === "light" ? "text-primary" : "text-muted-foreground"}`} />
            <Switch checked={theme === "dark"} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
            <Moon className={`h-4 w-4 ${theme === "dark" ? "text-primary" : "text-muted-foreground"}`} />
          </div>



          {mobileMenuOpen ? (
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Close menu"
            >
              <X className="h-6 w-6" />
            </button>
          ) : (
            <Link to="/profile" className="flex shrink-0">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex h-9 w-9 items-center justify-center rounded-full gradient-primary text-sm font-bold text-primary-foreground shadow-md ring-2 ring-primary/20 cursor-pointer"
              >
                {capitalizedName}
              </motion.div>
            </Link>
          )}
        </div>
      </div>

      {/* 📱 Mobile Overlay Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-b border-border bg-card px-4 pb-6 pt-4 space-y-4"
          >
            <div className="space-y-2">
              {navItems.map(
                (item) => {
                  const isActive = item.path === "/" ? activePath === "/" : activePath.startsWith(item.path);
                  return (
                    item.show && (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted"
                        } ${isEasy ? "text-lg py-3" : "text-sm"}`}
                      >
                        <item.icon className={isEasy ? "h-5 w-5" : "h-4 w-4"} />
                        {item.label}
                      </Link>
                    )
                  );
                }
              )}
            </div>
            
            <div className="flex flex-col gap-2">
              <AddTransactionForm
                triggerClassName={isEasy
                  ? "w-full flex items-center justify-center gap-3 rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition-all hover:opacity-90 text-lg border-2 border-transparent"
                  : "w-full flex items-center justify-center gap-2 rounded-lg gradient-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 shadow-md"
                }
                buttonText="Add Transaction"
              />
              <AddSubscriptionForm
                triggerClassName={isEasy
                  ? "w-full flex items-center justify-center gap-3 rounded-lg border-2 border-primary/40 bg-card py-3 font-semibold text-primary transition-all hover:bg-muted text-lg"
                  : "w-full flex items-center justify-center gap-2 rounded-lg border border-primary/20 bg-muted/20 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-muted/40 shadow-sm"
                }
                buttonText="Add Subscription"
              />
              <AddOwedForm
                triggerClassName={isEasy
                  ? "w-full flex items-center justify-center gap-3 rounded-lg border-2 border-primary/40 bg-card py-3 font-semibold text-primary transition-all hover:bg-muted text-lg"
                  : "w-full flex items-center justify-center gap-2 rounded-lg border border-primary/20 bg-muted/20 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-muted/40 shadow-sm"
                }
                buttonText="Add Owed to You"
              />
            </div>

            {isEasy && user && (
              <button
                className="w-full flex items-center gap-3 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground transition-all hover:opacity-90"
              >
                <Mic className="h-5 w-5" />
                Voice Entry
              </button>
            )}



            {user ? (
              <button
                onClick={handleSignOut}
                className={`w-full flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 font-medium text-muted-foreground transition-colors hover:bg-muted ${
                  isEasy ? "py-3" : ""
                }`}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            ) : (
              <Link
                to="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full block"
              >
                <button
                  className={`w-full flex items-center justify-center gap-2 rounded-lg gradient-primary px-4 py-2.5 font-medium text-primary-foreground ${
                    isEasy ? "py-3" : ""
                  }`}
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </button>
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 💻 Desktop Sidebar */}
      <div
        className={`hidden md:flex flex-col justify-between h-screen w-64 sticky top-0 border-r border-border p-6 ${
          isEasy ? "border-r-2 bg-card" : "glass-strong"
        }`}
      >
        {/* Top Section */}
        <div className="space-y-8">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary">
              <Wallet className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className={`font-display font-bold ${isEasy ? "text-2xl" : "text-xl"}`}>
              ZenMoney
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex flex-col gap-3">
            {navItems.map(
              (item) => {
                const isActive = item.path === "/" ? activePath === "/" : activePath.startsWith(item.path);
                return (
                  item.show && (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      } ${isEasy ? "text-lg border-2 border-border" : "text-sm"}`}
                    >
                      <item.icon className={isEasy ? "h-6 w-6" : "h-5 w-5"} />
                      {item.label}
                    </Link>
                  )
                );
              }
            )}
          </div>
          
          <div className="pt-2 flex flex-col gap-2">
            <AddTransactionForm
              triggerClassName={isEasy
                ? "w-full flex items-center justify-center gap-3 rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition-all hover:opacity-90 text-lg border-2 border-transparent"
                : "w-full flex items-center justify-center gap-2 rounded-lg gradient-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 shadow-md"
              }
              buttonText="Add Transaction"
            />
            <AddSubscriptionForm
              triggerClassName={isEasy
                ? "w-full flex items-center justify-center gap-3 rounded-lg border-2 border-primary/40 bg-card py-3 font-semibold text-primary transition-all hover:bg-muted text-lg"
                : "w-full flex items-center justify-center gap-2 rounded-lg border border-primary/20 bg-muted/20 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-muted/40 shadow-sm"
              }
              buttonText="Add Subscription"
            />
            <AddOwedForm
              triggerClassName={isEasy
                ? "w-full flex items-center justify-center gap-3 rounded-lg border-2 border-primary/40 bg-card py-3 font-semibold text-primary transition-all hover:bg-muted text-lg"
                : "w-full flex items-center justify-center gap-2 rounded-lg border border-primary/20 bg-muted/20 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-muted/40 shadow-sm"
              }
              buttonText="Add Owed to You"
            />
          </div>
        </div>

        {/* Bottom Section */}
        <div className="space-y-4">
          {/* Voice Entry - Easy Mode Only */}
          {isEasy && user && (
            <button
              className="w-full flex items-center justify-center gap-3 rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition-all hover:opacity-90 text-lg border-2 border-transparent"
            >
              <Mic className="h-6 w-6" />
              Voice Entry
            </button>
          )}

          {/* Settings & Theme Switch */}
          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <div className="flex items-center justify-center gap-4 px-3 py-2 rounded-lg border border-border bg-muted/20">
              <Sun className={`h-4 w-4 ${theme === "light" ? "text-primary" : "text-muted-foreground"}`} />
              <Switch checked={theme === "dark"} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
              <Moon className={`h-4 w-4 ${theme === "dark" ? "text-primary" : "text-muted-foreground"}`} />
            </div>

            {/* Auth Section */}
            {user ? (
              <Button
                onClick={handleSignOut}
                variant="outline"
                size={isEasy ? "lg" : "sm"}
                className={`w-full flex items-center justify-center gap-2 ${
                  isEasy ? "text-base py-6 border-2" : "text-xs"
                } border-destructive/20 text-destructive hover:bg-destructive/10`}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            ) : (
              <Link to="/auth" className="w-full block">
                <Button
                  size={isEasy ? "lg" : "sm"}
                  className={`w-full flex items-center justify-center gap-2 ${
                    isEasy ? "text-base py-6 border-2" : "text-xs"
                  }`}
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Navbar;
