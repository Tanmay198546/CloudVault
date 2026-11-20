
import { useState } from "react";
import { supabase } from "./supabaseClient";
import { Cloud } from "lucide-react";

export default function Auth() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleAuth(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password
        });

        if (error) throw error;

        setMessage(
          data.session
            ? "Account created! You can now use CloudVault."
            : "Account created! Check your email to confirm your account."
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <form style={styles.card} onSubmit={handleAuth}>
        <div style={styles.logo}>
          <Cloud size={30} />
          <h1>CloudVault</h1>
        </div>

        <h2>{isSignup ? "Create your account" : "Welcome back"}</h2>
        <p style={styles.subtitle}>
          {isSignup
            ? "Create your personal cloud storage account."
            : "Login to access your cloud files."}
        </p>

        <label>Email address</label>
        <input
          style={styles.input}
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label>Password</label>
        <input
          style={styles.input}
          type="password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />

        <button style={styles.button} disabled={loading}>
          {loading
            ? "Please wait..."
            : isSignup
            ? "Create Account"
            : "Login"}
        </button>

        {message && <p style={styles.message}>{message}</p>}

        <p style={styles.switch}>
          {isSignup ? "Already have an account?" : "New to CloudVault?"}
          <button
            type="button"
            style={styles.link}
            onClick={() => {
              setIsSignup(!isSignup);
              setMessage("");
            }}
          >
            {isSignup ? "Login" : "Sign up"}
          </button>
        </p>
      </form>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f3ff",
    padding: "20px"
  },
  card: {
    background: "white",
    padding: "35px",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "420px",
    boxShadow: "0 10px 35px rgba(0,0,0,0.08)"
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "#7045d6",
    marginBottom: "25px"
  },
  subtitle: {
    color: "#777",
    marginBottom: "25px"
  },
  input: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    margin: "8px 0 18px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    fontSize: "15px"
  },
  button: {
    width: "100%",
    padding: "13px",
    border: "none",
    borderRadius: "8px",
    background: "#7045d6",
    color: "white",
    fontSize: "16px",
    cursor: "pointer"
  },
  message: {
    color: "#7045d6",
    marginTop: "15px",
    overflowWrap: "anywhere"
  },
  switch: {
    textAlign: "center",
    marginTop: "25px",
    color: "#666"
  },
  link: {
    border: "none",
    background: "none",
    color: "#7045d6",
    fontWeight: "bold",
    cursor: "pointer",
    marginLeft: "5px"
  }
};
