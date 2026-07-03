import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useUpdateProfile } from "@/hooks/useFinanceData";
import { localDb } from "@/integrations/local_db/client";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User,
  KeyRound,
  HelpCircle,
  Mail,
  LogOut,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Profile fields state
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [isUpdatingInfo, setIsUpdatingInfo] = useState(false);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Password rules validation
  const meetsLength = newPassword.length >= 6;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumeric = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && newPassword !== "";
  const isNewPasswordValid = meetsLength && hasUppercase && hasNumeric && hasSpecialChar;

  // Contact support state
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [isSendingSupport, setIsSendingSupport] = useState(false);

  // Load profile values when fetched
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setUsername(profile.username || "");
      setMonthlyBudget(profile.monthly_budget ? profile.monthly_budget.toString() : "30000");
    }
  }, [profile]);

  if (isProfileLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // Get Initials for Avatar Badge
  const getInitials = () => {
    if (displayName) {
      const parts = displayName.split(" ");
      return parts.map(p => p[0]).join("").toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  // Sign out handler
  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    toast({
      title: "Logged Out",
      description: "You have been successfully signed out.",
    });
  };

  // Update Profile details
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast({
        title: "Error",
        description: "Display name cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingInfo(true);
    try {
      await updateProfile.mutateAsync({
        display_name: displayName.trim(),
        username: username.trim().toLowerCase() || null,
        monthly_budget: parseFloat(monthlyBudget) || 0
      });
      toast({
        title: "Success",
        description: "Profile details updated successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Error updating profile",
        description: err?.message || "Failed to update profile details.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingInfo(false);
    }
  };

  // Change Password handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast({
        title: "Validation Error",
        description: "Please enter your current password.",
        variant: "destructive"
      });
      return;
    }
    if (!isNewPasswordValid) {
      toast({
        title: "Validation Error",
        description: "New password does not meet all security guidelines.",
        variant: "destructive"
      });
      return;
    }
    if (!passwordsMatch) {
      toast({
        title: "Validation Error",
        description: "New passwords do not match.",
        variant: "destructive"
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      // Call changePassword from the custom client auth
      const { error } = await (localDb.auth as any).changePassword({
        currentPassword,
        newPassword
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your password has been changed successfully.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to change password. Please check your credentials.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Support Request handler
  const handleSendSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportSubject.trim() || !supportMessage.trim()) {
      toast({
        title: "Validation Error",
        description: "Subject and Message fields are required.",
        variant: "destructive"
      });
      return;
    }

    setIsSendingSupport(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_LOCAL_DB_API_URL || 'http://localhost:5000'}/api/support/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: displayName,
          email: user.email,
          subject: supportSubject.trim(),
          message: supportMessage.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit message");
      }

      toast({
        title: "Message Sent",
        description: "Thank you! We have logged your request and will get back to you soon.",
      });
      setSupportSubject("");
      setSupportMessage("");
    } catch (err: any) {
      toast({
        title: "Delivery Error",
        description: err?.message || "Failed to send support request.",
        variant: "destructive",
      });
    } finally {
      setIsSendingSupport(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* 👤 Visual Header with Initials Avatar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col items-center gap-4 rounded-2xl border border-border bg-card/50 p-6 text-center shadow-lg md:flex-row md:text-left"
      >
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full gradient-primary text-3xl font-bold text-primary-foreground shadow-md ring-4 ring-primary/20">
          {getInitials()}
        </div>
        <div className="flex-1 space-y-1">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {displayName || "User Profile"}
          </h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Joined {new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
            </span>
            {username && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                @{username}
              </span>
            )}
          </div>
        </div>
        <Button
          onClick={handleSignOut}
          variant="outline"
          className="flex gap-2 border-destructive/20 text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </Button>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex gap-2">
            <User className="h-4 w-4" />
            <span>Profile Details</span>
          </TabsTrigger>
          <TabsTrigger value="help" className="flex gap-2">
            <HelpCircle className="h-4 w-4" />
            <span>Help & FAQ</span>
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex gap-2">
            <Mail className="h-4 w-4" />
            <span>Contact Us</span>
          </TabsTrigger>
        </TabsList>

        {/* 1. PROFILE DETAILS TAB */}
        <TabsContent value="profile">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Account Information Card */}
            <Card className="glass-strong">
              <CardHeader>
                <CardTitle className="flex gap-2 items-center">
                  <User className="h-5 w-5 text-primary" />
                  <span>Update Account Info</span>
                </CardTitle>
                <CardDescription>
                  Modify your primary profile details and monthly budget limits.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="display-name">Display Name</Label>
                    <Input
                      id="display-name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthly-budget">Monthly Budget limit (₹)</Label>
                    <Input
                      id="monthly-budget"
                      type="number"
                      value={monthlyBudget}
                      onChange={(e) => setMonthlyBudget(e.target.value)}
                      placeholder="30000"
                    />
                  </div>
                  <Button type="submit" disabled={isUpdatingInfo} className="w-full flex gap-2">
                    {isUpdatingInfo ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>Save Changes</span>
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Change Password Card */}
            <Card className="glass-strong">
              <CardHeader>
                <CardTitle className="flex gap-2 items-center">
                  <KeyRound className="h-5 w-5 text-primary" />
                  <span>Secure Password Reset</span>
                </CardTitle>
                <CardDescription>
                  Update your database credentials to secure your account.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>

                  {/* Password Guidelines Indicators */}
                  {newPassword && (
                    <div className="rounded-lg bg-muted/30 p-3 space-y-1.5 text-xs">
                      <p className="font-semibold text-muted-foreground mb-1">Guidelines:</p>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                        <span className={`flex items-center gap-1 ${meetsLength ? "text-green-500" : "text-muted-foreground"}`}>
                          {meetsLength ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                          Min 6 chars
                        </span>
                        <span className={`flex items-center gap-1 ${hasUppercase ? "text-green-500" : "text-muted-foreground"}`}>
                          {hasUppercase ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                          Uppercase
                        </span>
                        <span className={`flex items-center gap-1 ${hasNumeric ? "text-green-500" : "text-muted-foreground"}`}>
                          {hasNumeric ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                          Numeric
                        </span>
                        <span className={`flex items-center gap-1 ${hasSpecialChar ? "text-green-500" : "text-muted-foreground"}`}>
                          {hasSpecialChar ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                          Special Symbol
                        </span>
                      </div>
                      <p className={`pt-1 border-t border-border/20 mt-1.5 ${passwordsMatch ? "text-green-500" : "text-red-400"}`}>
                        {passwordsMatch ? "✓ Passwords match" : "✗ Passwords do not match"}
                      </p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isUpdatingPassword || !isNewPasswordValid || !passwordsMatch}
                    className="w-full flex gap-2"
                  >
                    {isUpdatingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>Update Password</span>
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. HELP FAQ TAB */}
        <TabsContent value="help">
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle className="flex gap-2 items-center">
                <HelpCircle className="h-5 w-5 text-primary" />
                <span>Help Center & FAQ</span>
              </CardTitle>
              <CardDescription>
                Find answers to common questions on utilizing ZenMoney dashboard parameters.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>How do I adjust my monthly budget?</AccordionTrigger>
                  <AccordionContent>
                    You can adjust your budget inside the **Profile Details** tab on this page or by clicking **Edit** on the "Monthly Budget" card in the main Dashboard. Changing it updates the budget progression percentage on your dashboard widgets in real-time.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>What payment sources are supported?</AccordionTrigger>
                  <AccordionContent>
                    ZenMoney currently supports tracking expenses and income across four channels: **UPI**, **Credit Cards (CC)**, **Cash**, and **Bank Transfers**. Choose the appropriate method during transaction inputs to keep clean category tracking.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>How do subscriptions differ from transactions?</AccordionTrigger>
                  <AccordionContent>
                    Transactions record single income or expense logs. **Subscriptions** represent recurring bills (like Netflix or Spotify) that trigger on a specific billing cycle. The dashboard integrates subscriptions automatically into your upcoming monthly expenses calculations.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                  <AccordionTrigger>What is "Owed to You"?</AccordionTrigger>
                  <AccordionContent>
                    "Owed to You" helps you keep track of funds you lend to family or friends. These transactions are tracked separately and let you easily log when someone repays you so your net balance is accurate.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. CONTACT SUPPORT TAB */}
        <TabsContent value="contact">
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle className="flex gap-2 items-center">
                <Mail className="h-5 w-5 text-primary" />
                <span>Contact Us</span>
              </CardTitle>
              <CardDescription>
                Have a query or encountered a bug? Submit details below to log a support request.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendSupport} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Your Name</Label>
                    <Input value={displayName} disabled className="bg-muted/40 cursor-not-allowed" />
                  </div>
                  <div className="space-y-2">
                    <Label>Sender Email</Label>
                    <Input value={user.email} disabled className="bg-muted/40 cursor-not-allowed" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support-subject">Subject</Label>
                  <Input
                    id="support-subject"
                    value={supportSubject}
                    onChange={(e) => setSupportSubject(e.target.value)}
                    placeholder="e.g. Question about subscription tracking"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support-message">Message Details</Label>
                  <textarea
                    id="support-message"
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="Write your detailed description or bug reports here..."
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <Button type="submit" disabled={isSendingSupport} className="w-full flex gap-2">
                  {isSendingSupport ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  <span>Send Support Request</span>
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfilePage;
