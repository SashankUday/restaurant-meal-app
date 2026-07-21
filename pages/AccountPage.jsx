import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { DIETS } from "../lib/constants.js";
import AccountSignIn from "../components/AccountSignIn.jsx";
import { LoadingState } from "../components/AsyncState.jsx";
import Chip from "../components/Chip.jsx";

export default function AccountPage() {
  const { user, loading, updateProfile, signOut } = useAuth();
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setSelected(user?.dietary_requirements || []);
  }, [user]);

  if (loading) return <LoadingState label="Opening your account…" />;

  if (!user) {
    return (
      <main className="me-page signed-out-page">
        <div className="page-intro me-intro">
          <p className="eyebrow">Your account</p>
          <h1>Save your dietary preferences.</h1>
          <p>Sign in to keep your dietary requirements with your account.</p>
        </div>
        <AccountSignIn />
      </main>
    );
  }

  function toggleDiet(diet) {
    setStatus("");
    setSelected((current) => current.includes(diet) ? current.filter((item) => item !== diet) : [...current, diet]);
  }

  async function save() {
    setSaving(true);
    setError("");
    setStatus("");
    try {
      await updateProfile({ dietary_requirements: selected });
      setStatus("Dietary requirements saved.");
    } catch (nextError) {
      setError(nextError.message || "Your preferences could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const dirty = JSON.stringify([...selected].sort()) !== JSON.stringify([...(user.dietary_requirements || [])].sort());

  return (
    <main className="me-page account-page">
      <section className="me-header">
        <div>
          <p className="eyebrow">My account</p>
          <h1>Your preferences, remembered.</h1>
          <p>Signed in as {user.email}</p>
        </div>
        <button type="button" className="btn-quiet" onClick={signOut}>Sign out on this browser</button>
      </section>

      <section className="meal-logger-panel">
        <div className="panel-heading">
          <div><p className="eyebrow">Dietary requirements</p><h2>What should Plate keep in mind?</h2></div>
          <span>These are saved to your account. You can still change filters per search.</span>
        </div>
        <div className="chip-row">
          {DIETS.map((diet) => (
            <Chip key={diet} active={selected.includes(diet)} onClick={() => toggleDiet(diet)}>{diet}</Chip>
          ))}
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {status && <p className="field-help" role="status">{status}</p>}
        <button className="btn-primary" type="button" onClick={save} disabled={saving || !dirty}>
          {saving ? "Saving…" : "Save preferences"}
        </button>
      </section>
    </main>
  );
}
