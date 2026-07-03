import { useEffect, useState } from "react";
import { localDb } from "@/integrations/local_db/client";
import { useUIMode } from "@/contexts/UIModeContext";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowRight, Wallet, Eye, EyeOff, Loader2, AtSign, KeyRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate, useLocation } from "react-router-dom";

const AuthPage = () => {
  const { mode } = useUIMode();
  const isEasy = mode === "easy";
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "loading" | "available" | "taken" | "invalid">("idle");
  const [emailStatus, setEmailStatus] = useState<"idle" | "loading" | "available" | "taken" | "invalid">("idle");

  const checkUsernameAvailability = async (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) {
      setUsernameStatus("idle");
      return;
    }
    if (trimmed.length < 3) {
      setUsernameStatus("invalid");
      return;
    }
    const alphanumericRegex = /^[a-zA-Z0-9_]+$/;
    if (!alphanumericRegex.test(trimmed)) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("loading");
    try {
      const { data, error } = await localDb.rpc("is_username_available", {
        username_to_check: trimmed.toLowerCase(),
      });

      if (error) {
        // If function doesn't exist, handle it in catch block
        throw error;
      }

      if (data) {
        setUsernameStatus("available");
      } else {
        setUsernameStatus("taken");
      }
    } catch (err: any) {
      console.error("Error checking username availability:", err);
      const errMsg = err?.message || "";
      if (errMsg.includes("Could not find the function") || errMsg.includes("does not exist")) {
        console.warn("The public.is_username_available RPC is not deployed. Defaulting to available.");
        setUsernameStatus("available");
      } else {
        setUsernameStatus("idle");
      }
    }
  };

  const checkEmailAvailability = async (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) {
      setEmailStatus("idle");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setEmailStatus("invalid");
      return;
    }

    setEmailStatus("loading");
    try {
      const { data, error } = await localDb.rpc("is_email_available", {
        email_to_check: trimmed.toLowerCase(),
      });

      if (error) {
        throw error;
      }

      if (data) {
        setEmailStatus("available");
      } else {
        setEmailStatus("taken");
      }
    } catch (err: any) {
      console.error("Error checking email availability:", err);
      const errMsg = err?.message || "";
      if (errMsg.includes("Could not find the function") || errMsg.includes("does not exist")) {
        console.warn("The public.is_email_available RPC is not deployed. Defaulting to available.");
        setEmailStatus("available");
      } else {
        setEmailStatus("idle");
      }
    }
  };

  useEffect(() => {
    if (isLogin) {
      setUsernameStatus("idle");
      return;
    }
    if (!username.trim()) {
      setUsernameStatus("idle");
      return;
    }

    const timer = setTimeout(() => {
      checkUsernameAvailability(username);
    }, 500);

    return () => clearTimeout(timer);
  }, [username, isLogin]);

  useEffect(() => {
    if (isLogin) {
      setEmailStatus("idle");
      return;
    }
    if (!email.trim()) {
      setEmailStatus("idle");
      return;
    }

    const timer = setTimeout(() => {
      checkEmailAvailability(email);
    }, 500);

    return () => clearTimeout(timer);
  }, [email, isLogin]);

  useEffect(() => {
    const checkConfirmation = async () => {
      const hash = location.hash;
      const search = location.search;
      const hasConfirmationToken =
        hash.includes("type=signup") ||
        hash.includes("access_token") ||
        search.includes("code=");

      if (hasConfirmationToken) {
        window.history.replaceState(null, "", window.location.pathname);
        await localDb.auth.signOut();
        setIsLogin(true);
        setIsConfirming(false);
        toast({
          title: "Email Confirmed!",
          description: "Your email has been successfully verified. You can now sign in.",
        });
      }
    };
    checkConfirmation();
  }, [location]);

  const meetsLength = password.length >= 6;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumeric = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const meetsAllRequirements = meetsLength && hasUppercase && hasNumeric && hasSpecialChar;

  const generateStrongPassword = () => {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const specials = "!@#$%^&*()_+-=[]{}|;:,.<>?";
    
    const u = uppercase[Math.floor(Math.random() * uppercase.length)];
    const n = numbers[Math.floor(Math.random() * numbers.length)];
    const s = specials[Math.floor(Math.random() * specials.length)];
    
    const allChars = uppercase + lowercase + numbers + specials;
    let rest = "";
    for (let i = 0; i < 9; i++) {
      rest += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    const combined = (u + n + s + rest).split("");
    for (let i = combined.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [combined[i], combined[j]] = [combined[j], combined[i]];
    }
    
    const generated = combined.join("");
    setPassword(generated);
    setShowPassword(true);
    toast({
      title: "Strong Password Suggested",
      description: "A strong password meeting all criteria has been applied.",
    });
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast({ title: "Error", description: "Email and password are required.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await (localDb.auth as any).resetPasswordForEmail({ email, newPassword: password });
      if (error) throw error;
      toast({
        title: "Success!",
        description: "Password reset successfully. You can now sign in.",
      });
      setIsResetPassword(false);
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({
        title: "Reset failed",
        description: err?.message || "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent multiple submissions
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await localDb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Navigate to dashboard immediately without any artificial delay
        navigate("/dashboard");
        toast({ title: "Welcome back!", description: "You've been logged in." });
      } else {
        if (usernameStatus !== "available") {
          throw new Error("Please choose an available, valid username.");
        }
        if (emailStatus !== "available") {
          throw new Error("Please choose an available, valid email address.");
        }
        const { error } = await localDb.auth.signUp({
          email,
          password,
          options: {
            data: { 
              display_name: displayName,
              username: username.trim().toLowerCase(),
            },
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        });
        if (error) throw error;
        
        // Auto-login since local database doesn't send verification email
        const loginRes = await localDb.auth.signInWithPassword({ email, password });
        if (loginRes.error) throw loginRes.error;

        navigate("/dashboard");
        toast({
          title: "Account created!",
          description: "You've been successfully signed up and logged in.",
        });
      }
    } catch (error: unknown) {
      const errorObj = error as { message?: string };
      toast({ title: "Error", description: errorObj?.message || "An error occurred", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const cardClass = isEasy
    ? "rounded-2xl border-2 border-border bg-card p-8 shadow-lg"
    : "glass-strong rounded-2xl p-8";

  if (isConfirming) {
    return (
      <div className="flex min-h-[calc(100vh-60px)] items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`w-full max-w-md ${cardClass}`}
        >
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl gradient-primary animate-bounce">
              <Mail className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className={`font-display font-bold ${isEasy ? "text-3xl" : "text-2xl"}`}>
              Gmail Confirmation
            </h1>
            <p className={`mt-2 text-muted-foreground ${isEasy ? "text-lg" : "text-sm"}`}>
              We've sent a verification link to your email. Please check your Gmail to confirm your account.
            </p>
          </div>

          <div className="space-y-4">
            <a
              href="https://mail.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`flex w-full items-center justify-center gap-2 rounded-lg gradient-primary font-semibold text-primary-foreground transition-all hover:opacity-90 ${
                isEasy ? "h-14 text-lg" : "h-11 text-sm"
              }`}
            >
              Open Gmail
              <ArrowRight className="h-4 w-4" />
            </a>

            <button
              onClick={() => setIsConfirming(false)}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-transparent font-semibold text-foreground transition-all hover:bg-muted/50 ${
                isEasy ? "h-14 text-lg" : "h-11 text-sm"
              }`}
            >
              Back to Sign In
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (isResetPassword) {
    return (
      <div className="flex min-h-[calc(100vh-60px)] items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`w-full max-w-md ${cardClass}`}
        >
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl gradient-primary">
              <KeyRound className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className={`font-display font-bold ${isEasy ? "text-3xl" : "text-2xl"}`}>
              Reset Password
            </h1>
            <p className={`mt-2 text-muted-foreground ${isEasy ? "text-lg" : "text-sm"}`}>
              Enter your email and your new password to reset it.
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <Label htmlFor="reset-email" className={isEasy ? "text-base" : "text-sm"}>Email Address</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={`pl-10 ${isEasy ? "h-12 text-lg" : ""}`}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="reset-password" className={isEasy ? "text-base" : "text-sm"}>New Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reset-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`pl-10 pr-10 ${isEasy ? "h-12 text-lg" : ""}`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirm-reset-password" className={isEasy ? "text-base" : "text-sm"}>Confirm New Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirm-reset-password"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`pl-10 pr-10 ${isEasy ? "h-12 text-lg" : ""}`}
                  required
                />
              </div>
            </div>

            {/* Password Rules Display */}
            {password && (
              <div className="mt-3 rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2 text-xs">
                <p className="font-semibold text-muted-foreground">Password requirements:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className={`flex items-center gap-1.5 transition-colors duration-200 ${meetsLength ? "text-success font-medium" : "text-muted-foreground/85"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${meetsLength ? "bg-success" : "bg-muted-foreground/45"}`} />
                    <span>Min 6 characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 transition-colors duration-200 ${hasUppercase ? "text-success font-medium" : "text-muted-foreground/85"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${hasUppercase ? "bg-success" : "bg-muted-foreground/45"}`} />
                    <span>One uppercase letter</span>
                  </div>
                  <div className={`flex items-center gap-1.5 transition-colors duration-200 ${hasNumeric ? "text-success font-medium" : "text-muted-foreground/85"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${hasNumeric ? "bg-success" : "bg-muted-foreground/45"}`} />
                    <span>One numeric value</span>
                  </div>
                  <div className={`flex items-center gap-1.5 transition-colors duration-200 ${hasSpecialChar ? "text-success font-medium" : "text-muted-foreground/85"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${hasSpecialChar ? "bg-success" : "bg-muted-foreground/45"}`} />
                    <span>One special character</span>
                  </div>
                </div>
                <p className={`pt-1.5 border-t border-border/20 mt-2 ${password === confirmPassword ? "text-success font-semibold" : "text-destructive font-semibold"}`}>
                  {password === confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !meetsAllRequirements || !email || password !== confirmPassword}
              className={`flex w-full items-center justify-center gap-2 rounded-lg gradient-primary font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50 ${
                isEasy ? "h-14 text-lg" : "h-11 text-sm"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Resetting password...</span>
                </>
              ) : (
                <>
                  <span>Reset Password</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className={`mt-6 text-center text-muted-foreground ${isEasy ? "text-base" : "text-sm"}`}>
            Remembered your password?{" "}
            <button
              onClick={() => {
                setIsResetPassword(false);
                setPassword("");
                setConfirmPassword("");
              }}
              className="font-semibold text-primary hover:underline"
            >
              Sign In
            </button>
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-60px)] items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full max-w-md ${cardClass}`}
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl gradient-primary">
            <Wallet className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className={`font-display font-bold ${isEasy ? "text-3xl" : "text-2xl"}`}>
            {isLogin ? (isEasy ? "Sign In" : "Welcome Back") : (isEasy ? "Create Account" : "Get Started")}
          </h1>
          <p className={`mt-2 text-muted-foreground ${isEasy ? "text-lg" : "text-sm"}`}>
            {isLogin ? "Enter your credentials to continue" : "Create your ZenMoney account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <Label htmlFor="username" className={isEasy ? "text-base" : "text-sm"}>
                  Username
                </Label>
                <div className="relative mt-1">
                  <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a unique username"
                    className={`pl-10 pr-10 ${isEasy ? "h-12 text-lg" : ""} ${
                      usernameStatus === "invalid" || usernameStatus === "taken"
                        ? "border-destructive focus-visible:ring-destructive"
                        : usernameStatus === "available"
                        ? "border-success focus-visible:ring-success"
                        : ""
                    }`}
                    required
                  />
                  {usernameStatus === "loading" && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                  )}
                </div>
                {usernameStatus === "taken" && (
                  <p className="mt-1 text-xs text-destructive font-medium">This username is already taken.</p>
                )}
                {usernameStatus === "invalid" && (
                  <p className="mt-1 text-xs text-destructive font-medium">Username must be at least 3 characters and alphanumeric (or underscores).</p>
                )}
                {usernameStatus === "available" && (
                  <p className="mt-1 text-xs text-success font-medium">Username is available!</p>
                )}
              </div>

              <div>
                <Label htmlFor="name" className={isEasy ? "text-base" : "text-sm"}>
                  {isEasy ? "Your Name" : "Display Name"}
                </Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    className={`pl-10 ${isEasy ? "h-12 text-lg" : ""}`}
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <Label htmlFor="email" className={isEasy ? "text-base" : "text-sm"}>Email</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`pl-10 pr-10 ${isEasy ? "h-12 text-lg" : ""} ${
                  !isLogin && (emailStatus === "invalid" || emailStatus === "taken")
                    ? "border-destructive focus-visible:ring-destructive"
                    : !isLogin && emailStatus === "available"
                    ? "border-success focus-visible:ring-success"
                    : ""
                }`}
                required
              />
              {!isLogin && emailStatus === "loading" && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
            {!isLogin && emailStatus === "taken" && (
              <p className="mt-1 text-xs text-destructive font-medium">This email is already registered.</p>
            )}
            {!isLogin && emailStatus === "invalid" && (
              <p className="mt-1 text-xs text-destructive font-medium">Please enter a valid email address.</p>
            )}
            {!isLogin && emailStatus === "available" && (
              <p className="mt-1 text-xs text-success font-medium">Email is available!</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className={isEasy ? "text-base" : "text-sm"}>Password</Label>
              {isLogin ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsResetPassword(true);
                    setPassword("");
                    setConfirmPassword("");
                  }}
                  className="text-xs text-primary hover:underline font-semibold focus:outline-none"
                >
                  Forgot password?
                </button>
              ) : (
                <button
                  type="button"
                  onClick={generateStrongPassword}
                  className="text-xs text-primary hover:underline font-semibold focus:outline-none"
                >
                  Suggest strong password
                </button>
              )}
            </div>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`pl-10 pr-10 ${isEasy ? "h-12 text-lg" : ""}`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Password Rules Display */}
            <div className="mt-3 rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2 text-xs">
              <p className="font-semibold text-muted-foreground">Password requirements:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className={`flex items-center gap-1.5 transition-colors duration-200 ${meetsLength ? "text-success font-medium" : "text-muted-foreground/85"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${meetsLength ? "bg-success" : "bg-muted-foreground/45"}`} />
                  <span>Min 6 characters</span>
                </div>
                <div className={`flex items-center gap-1.5 transition-colors duration-200 ${hasUppercase ? "text-success font-medium" : "text-muted-foreground/85"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${hasUppercase ? "bg-success" : "bg-muted-foreground/45"}`} />
                  <span>One uppercase letter</span>
                </div>
                <div className={`flex items-center gap-1.5 transition-colors duration-200 ${hasNumeric ? "text-success font-medium" : "text-muted-foreground/85"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${hasNumeric ? "bg-success" : "bg-muted-foreground/45"}`} />
                  <span>One numeric value</span>
                </div>
                <div className={`flex items-center gap-1.5 transition-colors duration-200 ${hasSpecialChar ? "text-success font-medium" : "text-muted-foreground/85"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${hasSpecialChar ? "bg-success" : "bg-muted-foreground/45"}`} />
                  <span>One special character</span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || (isLogin ? (!email || !password) : (!meetsAllRequirements || !displayName || usernameStatus !== "available" || emailStatus !== "available"))}
            className={`flex w-full items-center justify-center gap-2 rounded-lg gradient-primary font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50 ${
              isEasy ? "h-14 text-lg" : "h-11 text-sm"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{isLogin ? "Signing you in..." : "Creating account..."}</span>
              </>
            ) : (
              <>
                <span>{isLogin ? "Sign In" : "Create Account"}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className={`mt-6 text-center text-muted-foreground ${isEasy ? "text-base" : "text-sm"}`}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="font-semibold text-primary hover:underline"
          >
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default AuthPage;
