import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { DIETS } from "../lib/constants.js";
import { approveEditAccess, fetchOwnEditRequest, fetchPendingEditRequests, rejectEditAccess, requestEditAccess } from "../lib/api.js";
import AccountSignIn from "../components/AccountSignIn.jsx";
import { LoadingState } from "../components/AsyncState.jsx";
import Chip from "../components/Chip.jsx";
import TagPicker from "../components/TagPicker.jsx";

export default function AccountPage() {
  const { user, loading, canEdit, isAdmin, updateProfile, signOut } = useAuth();
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [blockedIngredients, setBlockedIngredients] = useState([]);
  const [blockedStatus, setBlockedStatus] = useState("");
  const [ownRequest, setOwnRequest] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);

  useEffect(() => {
    setSelected(user?.dietary_requirements || []);
    setBlockedIngredients(user?.blocked_ingredients || []);
  }, [user]);

  useEffect(() => {
    if (!user || canEdit) return;
    fetchOwnEditRequest(user.id).then(setOwnRequest).catch(() => {});
  }, [user, canEdit]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchPendingEditRequests().then(setPendingRequests).catch(() => {});
  }, [isAdmin]);

  async function saveBlockedIngredients(next) {
    setBlockedIngredients(next);
    setBlockedStatus("");
    try {
      await updateProfile({ blocked_ingredients: next });
      setBlockedStatus("Blocked ingredients saved.");
    } catch (nextError) {
      setBlockedStatus(nextError.message || "Could not save blocked ingredients.");
    }
  }

  async function handleRequestEditAccess() {
    setRequesting(true);
    try {
      await requestEditAccess();
      setOwnRequest({ status: "pending" });
    } catch (nextError) {
      setError(nextError.message || "That request could not be sent.");
    } finally {
      setRequesting(false);
    }
  }

  async function handleApprove(email) {
    await approveEditAccess(email);
    setPendingRequests((current) => current.filter((request) => request.email !== email));
  }

  async function handleReject(email) {
    await rejectEditAccess(email);
    setPendingRequests((current) => current.filter((request) => request.email !== email));
  }

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

      <section className="meal-logger-panel">
        <div className="panel-heading">
          <div><p className="eyebrow">Blocked ingredients</p><h2>What should Plate hide?</h2></div>
          <span>Dishes containing these are hidden from search by default.</span>
        </div>
        <TagPicker
          presetTags={[]}
          tags={blockedIngredients}
          onChange={saveBlockedIngredients}
          max={20}
          label="Blocked ingredients"
          ariaLabel="Blocked ingredient"
        />
        {blockedStatus && <p className="field-help" role="status">{blockedStatus}</p>}
      </section>

      <section className="meal-logger-panel">
        <div className="panel-heading">
          <div><p className="eyebrow">Editing</p><h2>Make changes to dishes and restaurants</h2></div>
        </div>
        {canEdit ? (
          <p className="field-help">Your account can edit dish and restaurant details.</p>
        ) : ownRequest?.status === "pending" ? (
          <p className="field-help">Your request to edit is pending approval.</p>
        ) : ownRequest?.status === "rejected" ? (
          <>
            <p className="field-help">Your previous request was not approved.</p>
            <button className="btn-quiet" type="button" onClick={handleRequestEditAccess} disabled={requesting}>
              {requesting ? "Requesting…" : "Request edit access again"}
            </button>
          </>
        ) : (
          <button className="btn-quiet" type="button" onClick={handleRequestEditAccess} disabled={requesting}>
            {requesting ? "Requesting…" : "Request edit access"}
          </button>
        )}
      </section>

      {isAdmin && (
        <section className="meal-logger-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">Admin</p><h2>Pending edit requests</h2></div>
          </div>
          {pendingRequests.length ? (
            <div className="history-list">
              {pendingRequests.map((request) => (
                <article key={request.id} className="meal-history-card">
                  <div className="meal-history-main">
                    <div><p>{request.email}</p></div>
                    <div className="chip-row">
                      <button type="button" className="btn-primary" onClick={() => handleApprove(request.email)}>Approve</button>
                      <button type="button" className="btn-quiet" onClick={() => handleReject(request.email)}>Reject</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="field-help">No pending requests.</p>
          )}
        </section>
      )}
    </main>
  );
}
