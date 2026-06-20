import { useState, useEffect } from "react";
import { supabase } from "../config/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function DebugAuth() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Get session
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session?.user) {
        // Get profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        setProfile(profile);
      }
    } catch (error) {
      console.error("Debug error:", error);
    } finally {
      setLoading(false);
    }
  };

  const forceSuperAdmin = async () => {
    if (!session?.user) return;
    
    const { error } = await supabase
      .from("profiles")
      .upsert({ 
        id: session.user.id, 
        role: "SuperAdmin",
        email: session.user.email,
        full_name: session.user.user_metadata?.full_name || "Admin User"
      });
      
    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("Role set to SuperAdmin! Refreshing...");
      window.location.reload();
    }
  };

  if (loading) return <div style={{padding: 20, color: "white"}}>Loading...</div>;

  return (
    <div style={{padding: 20, background: "#0a0e1a", color: "white", minHeight: "100vh"}}>
      <h1>Auth Debug Page</h1>
      
      <h2>Session:</h2>
      <pre style={{background: "#1a1f2e", padding: 10, borderRadius: 8}}>
        {JSON.stringify({
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email,
          metadata: session?.user?.user_metadata
        }, null, 2)}
      </pre>

      <h2>Profile:</h2>
      <pre style={{background: "#1a1f2e", padding: 10, borderRadius: 8}}>
        {JSON.stringify(profile, null, 2)}
      </pre>

      <h2>Role Check:</h2>
      <p>Role from profile: <strong style={{color: "#c9a84c"}}>{profile?.role || "NOT SET"}</strong></p>
      <p>Is Admin: {profile?.role === "Admin" ? "✅ YES" : "❌ NO"}</p>
      <p>Is SuperAdmin: {profile?.role === "SuperAdmin" ? "✅ YES" : "❌ NO"}</p>

      <div style={{marginTop: 20, display: "flex", gap: 10}}>
        <button 
          onClick={forceSuperAdmin}
          style={{
            padding: "10px 20px", 
            background: "#c9a84c", 
            color: "#0a0e1a",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: "bold"
          }}
        >
          Force Set SuperAdmin Role
        </button>
        
        <button 
          onClick={() => navigate("/Admin")}
          style={{
            padding: "10px 20px", 
            background: "#374151", 
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer"
          }}
        >
          Try /Admin
        </button>
        
        <button 
          onClick={() => navigate("/auth")}
          style={{
            padding: "10px 20px", 
            background: "#374151", 
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer"
          }}
        >
          Back to Auth
        </button>
      </div>
    </div>
  );
}
