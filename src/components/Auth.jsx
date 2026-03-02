import { useState } from "react";
import { supabase } from "../supabase";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function login() {
    setErrorMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErrorMsg("E-Mail-Adresse oder Passwort ist falsch.");
  }

  return (
    <div className="login-card">
      <h2>TGSB Materialverwaltung</h2>
      <h2>Login</h2>

      <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" placeholder="Passwort" value={password} onChange={(e) => setPassword(e.target.value)} />

      <button onClick={login}>Login</button>

      {errorMsg && (
        <div
          style={{
            marginTop: "12px",
            padding: "10px",
            borderRadius: "8px",
            background: "rgba(255,0,0,0.12)",
            border: "1px solid rgba(255,0,0,0.25)",
          }}
        >
          {errorMsg}
        </div>
      )}
    </div>
  );
}