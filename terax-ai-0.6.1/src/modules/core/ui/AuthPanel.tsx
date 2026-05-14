import { useState, useEffect } from "react";
import { auth, AuthToken } from "@/modules/ai/engine/auth";
import { Button } from "@/modules/core/ui/button";
import { LogIn, LogOut, ShieldCheck, User } from "lucide-react";

export function AuthPanel() {
  const [token, setToken] = useState<AuthToken | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const t = await auth.getToken();
      setToken(t);
      setLoading(false);
    }
    checkAuth();
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await auth.login();
      // Flow continues in browser and redirects back
    } catch (err) {
      console.error("Login failed:", err);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    await auth.logout();
    setToken(null);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <div className="border rounded-lg p-6 bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col space-y-1.5 mb-4">
          <h3 className="text-2xl font-semibold leading-none tracking-tight">AI Authentication</h3>
          <p className="text-sm text-muted-foreground">
            Connect your Google Account to enable Gemini AI features securely.
          </p>
        </div>
        <div className="space-y-4">
          {token ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-3 bg-muted rounded-md">
                <div className="bg-primary/10 p-2 rounded-full">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Google Account Connected</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                    Access Token: {String(token.access_token).slice(0, 10)}...
                  </p>
                </div>
                <ShieldCheck className="h-5 w-5 text-green-500" />
              </div>
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" /> Disconnect Account
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm">
                Terax uses Google OAuth 2.0 with PKCE for secure authentication. 
                Your tokens are stored strictly in your system's secure Keychain.
              </p>
              <Button 
                variant="default" 
                className="w-full"
                onClick={handleLogin}
              >
                <LogIn className="mr-2 h-4 w-4" /> Login with Google
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
