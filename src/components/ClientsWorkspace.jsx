import React, { useState, useEffect } from "react";
import {
  FaFolder, FaFolderPlus, FaFile, FaFilePdf, FaFileImage, FaFileWord, FaFileExcel,
  FaPlus, FaTrash, FaEdit, FaSearch, FaCloudUploadAlt, FaArrowLeft, FaChevronRight,
  FaBuilding, FaTimes, FaDownload, FaPaperPlane, FaClipboardList,
} from "react-icons/fa";
import { SkeletonCards, SkeletonTable } from "./Skeleton";

// One real Clients workspace for every role and every delegated-access caller —
// same "real thing, not a stripped copy" pattern as AdminDepartments.jsx /
// AdminAnnouncements.jsx / AdminAssets.jsx this session. Fully self-contained;
// no employees/departments props needed — the department "boxes" grid below is
// derived client-side from whatever GET /api/clients already returns, and that
// endpoint is itself department-scoped server-side (admin/owner/delegate: every
// client; manager/employee: only their own department's). So the exact same
// component naturally shows the full org-wide picture to admin and a scoped
// slice to everyone else, with zero role-branching in this file.

const TINTS = [
  { bg: "#f0fdf4", color: "#226e48" }, { bg: "#effdf8", color: "#0f766e" },
  { bg: "#ecfdf5", color: "#047857" }, { bg: "#e7f6f1", color: "#1c5249" },
  { bg: "#eef7f0", color: "#2b885a" }, { bg: "#e9f5ee", color: "#15803d" },
];
const tint = (i) => TINTS[i % TINTS.length];

function fileIcon(mime) {
  if (!mime) return FaFile;
  if (mime.includes("pdf")) return FaFilePdf;
  if (mime.startsWith("image/")) return FaFileImage;
  if (mime.includes("word") || mime.includes("document")) return FaFileWord;
  if (mime.includes("sheet") || mime.includes("excel")) return FaFileExcel;
  return FaFile;
}
function fmtSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
function fmtWhen(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}

// `ownDepartments` — pass the current user's own department(s) for a
// manager/employee's own dashboard (their view is fixed to just their own
// department(s), so there's no need to ask the backend for the org-wide
// list — and a regular, non-delegated manager/employee isn't authorized to
// call GET /api/admin/departments anyway). Leave it undefined for admin's
// own dashboard and every delegated-access caller — that combination always
// gets the full org-wide department list, fetched here, and shown as
// folders unconditionally (not just departments that already have a
// client), so admin can open an empty department and create its first one.
export default function ClientsWorkspace({ token, api, ownDepartments }) {
  const baseUrl     = api?.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";
  const headers     = { Authorization: `Bearer ${token}` };
  const jsonHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const isOwnScope  = Array.isArray(ownDepartments); // manager/employee's own dashboard

  const [clients, setClients]     = useState([]);
  const [allDepartments, setAllDepartments] = useState([]); // org-wide list, admin/delegate scope only
  const [loading, setLoading]     = useState(false);
  const [deptFilter, setDeptFilter] = useState(null); // null = show department boxes
  const [search, setSearch]       = useState("");
  const [msg, setMsg]             = useState({ text: "", type: "" });
  const flash = (text, type = "success") => { setMsg({ text, type }); setTimeout(() => setMsg({ text: "", type: "" }), 3000); };

  const [clientModal, setClientModal] = useState(null); // { mode: "add"|"edit", id?, name, description, departments }
  const [saving, setSaving]       = useState(false);
  const [openClientId, setOpenClientId] = useState(null);

  function loadClients() {
    setLoading(true);
    fetch(`${baseUrl}/api/clients`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(d => setClients(Array.isArray(d) ? d : []))
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  }
  useEffect(() => { loadClients(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOwnScope) return; // manager/employee: no admin-departments call, no permission to make it either
    fetch(`${baseUrl}/api/admin/departments`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(d => setAllDepartments(Array.isArray(d) ? d.map(x => x.name).filter(Boolean).sort() : []))
      .catch(() => setAllDepartments([]));
  }, [isOwnScope]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasUnassigned = clients.some(c => !c.departments?.length);
  const departments = isOwnScope
    ? [...ownDepartments].sort()
    : [...allDepartments, ...(hasUnassigned ? ["Unassigned"] : [])];
  // Admin/delegate always lands on the department-folder view first — the
  // point is browsing "every department as a folder", even empty ones.
  // Manager/employee auto-skip straight to their client grid when they only
  // have the one department, since a box screen with a single box on it is
  // just an extra click for no benefit.
  const showBoxes = deptFilter === null && (isOwnScope ? departments.length > 1 : true);

  const visibleClients = clients.filter(c => {
    const depts = c.departments?.length ? c.departments : ["Unassigned"];
    if (deptFilter && !depts.includes(deptFilter)) return false;
    if (search && !(c.name || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function openAdd() {
    // "Unassigned" is a synthetic bucket for clients with no real department
    // (deptFilter === "Unassigned" here, distinct from deptFilter === null,
    // i.e. the box grid itself) — never pre-fill it as an actual department.
    const prefill = deptFilter && deptFilter !== "Unassigned" ? [deptFilter] : [];
    setClientModal({ mode: "add", name: "", description: "", departments: prefill });
  }
  function openEdit(c) {
    setClientModal({ mode: "edit", id: c._id, name: c.name, description: c.description || "", departments: c.departments || [] });
  }

  async function saveClient(e) {
    e.preventDefault();
    if (!clientModal.name.trim()) return flash("Client name is required.", "error");
    setSaving(true);
    try {
      const url    = clientModal.mode === "add" ? `${baseUrl}/api/admin/clients` : `${baseUrl}/api/admin/clients/${clientModal.id}`;
      const method = clientModal.mode === "add" ? "POST" : "PUT";
      const r = await fetch(url, {
        method, headers: jsonHeaders,
        body: JSON.stringify({ name: clientModal.name.trim(), description: clientModal.description.trim(), departments: clientModal.departments }),
      });
      if (r.ok) { setClientModal(null); flash(clientModal.mode === "add" ? "Client created." : "Client updated."); loadClients(); }
      else { const d = await r.json().catch(() => ({})); flash(d.message || "Failed to save client.", "error"); }
    } catch { flash("Network error.", "error"); } finally { setSaving(false); }
  }

  async function removeClient(id, name) {
    if (!window.confirm(`Delete client "${name}"? This also removes every file, folder, and update logged against it.`)) return;
    const r = await fetch(`${baseUrl}/api/admin/clients/${id}`, { method: "DELETE", headers }).catch(() => null);
    if (r?.ok) { flash("Client deleted."); loadClients(); }
    else flash("Failed to delete client.", "error");
  }

  if (openClientId) {
    return (
      <ClientDetail
        clientId={openClientId} baseUrl={baseUrl} headers={headers} jsonHeaders={jsonHeaders}
        onBack={() => { setOpenClientId(null); loadClients(); }}
      />
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div className="card" style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, color: "var(--brand)" }}>
            {deptFilter ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => setDeptFilter(null)} title="Back to departments" style={{ border: "none", background: "none", cursor: "pointer", color: "var(--brand)", padding: 0, display: "flex" }}><FaArrowLeft size={15} /></button>
                {deptFilter}
              </span>
            ) : "Clients"}
          </h3>
          <p className="small" style={{ marginTop: 4 }}>
            {deptFilter ? "Clients in this department." : "Store client data, files, and work updates — organised by department."}
          </p>
        </div>
        <button className="btn" onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <FaPlus size={11} /> Add Client
        </button>
      </div>

      {msg.text && (
        <div style={{ marginBottom: 12, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
          background: msg.type === "error" ? "#fef2f2" : "#f0fdf4", color: msg.type === "error" ? "#b91c1c" : "#16a34a",
          border: `1px solid ${msg.type === "error" ? "#fecaca" : "#bbf7d0"}` }}>{msg.text}</div>
      )}

      {loading ? <SkeletonCards count={6} minWidth={220} /> : showBoxes ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {departments.map((d, i) => {
            const t = tint(i);
            const count = clients.filter(c => (c.departments?.length ? c.departments : ["Unassigned"]).includes(d)).length;
            return (
              <button key={d} onClick={() => setDeptFilter(d)} className="card" style={{ textAlign: "left", cursor: "pointer", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: t.bg, color: t.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                  <FaBuilding />
                </div>
                <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 15 }}>{d}</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>{count} client{count === 1 ? "" : "s"}</div>
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div style={{ position: "relative", marginBottom: 14, maxWidth: 340 }}>
            <FaSearch style={{ position: "absolute", left: 12, top: 12, color: "#94a3b8" }} />
            <input className="modern-input" placeholder="Search clients…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36, margin: 0 }} />
          </div>

          {visibleClients.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "50px 20px", color: "#94a3b8" }}>
              <FaFolder size={36} style={{ opacity: 0.2, marginBottom: 10 }} />
              <p style={{ margin: 0 }}>No clients {deptFilter ? "in this department" : ""} yet. Add one above.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 14 }}>
              {visibleClients.map((c, i) => {
                const t = tint(i);
                return (
                  <div key={c._id} className="card" style={{ display: "flex", flexDirection: "column", gap: 10, cursor: "pointer" }} onClick={() => setOpenClientId(c._id)}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                      <div style={{ width: 46, height: 46, borderRadius: 12, background: t.bg, color: t.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                        <FaFolder />
                      </div>
                      {c.can_write && (
                        <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                          <button className="btn-action" title="Edit" onClick={() => openEdit(c)}><FaEdit /></button>
                          <button className="btn-action btn-remove" title="Delete" onClick={() => removeClient(c._id, c.name)}><FaTrash /></button>
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 15 }}>{c.name}</div>
                      {c.description && <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 3, lineHeight: 1.4 }}>{c.description}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: "auto" }}>
                      {(c.departments?.length ? c.departments : ["Unassigned"]).map(d => (
                        <span key={d} style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: t.bg, color: t.color }}>{d}</span>
                      ))}
                    </div>
                    {c.task_count != null && <div style={{ fontSize: 11.5, color: "#94a3b8" }}>{c.task_count} work item{c.task_count === 1 ? "" : "s"}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {clientModal && (
        <div className="modal-overlay" onClick={() => setClientModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width: 420, textAlign: "left" }}>
            <h3 style={{ color: "var(--brand)", marginTop: 0 }}>{clientModal.mode === "add" ? "Add Client" : "Edit Client"}</h3>
            <form onSubmit={saveClient}>
              <div style={{ marginBottom: 12 }}>
                <label className="modern-label">Client Name *</label>
                <input className="modern-input" value={clientModal.name} onChange={e => setClientModal({ ...clientModal, name: e.target.value })} placeholder="e.g. Acme Corp" required />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label className="modern-label">Description</label>
                <input className="modern-input" value={clientModal.description} onChange={e => setClientModal({ ...clientModal, description: e.target.value })} placeholder="Short note about this client" />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label className="modern-label">Department(s)</label>
                <input
                  className="modern-input"
                  value={clientModal.departments.join(", ")}
                  onChange={e => setClientModal({ ...clientModal, departments: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                  placeholder="e.g. Engineering, Design"
                />
                <p style={{ fontSize: 11.5, color: "#94a3b8", margin: "4px 0 0" }}>Comma-separated. Leave blank to default to your own department.</p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn" type="submit" disabled={saving} style={{ flex: 1 }}>{saving ? "Saving…" : "Save"}</button>
                <button className="btn ghost" type="button" onClick={() => setClientModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Client detail: Files (Drive) + Work Updates ─────────────────────────────

function ClientDetail({ clientId, baseUrl, headers, jsonHeaders, onBack }) {
  const [client, setClient]   = useState(null);
  const [tab, setTab]         = useState("files");

  function loadClient() {
    fetch(`${baseUrl}/api/clients/${clientId}`, { headers })
      .then(r => r.ok ? r.json() : null).then(setClient).catch(() => setClient(null));
  }
  useEffect(() => { loadClient(); }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ marginTop: 16 }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <button onClick={onBack} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--brand)", display: "flex", alignItems: "center", gap: 6, padding: 0, marginBottom: 10, fontSize: 13, fontWeight: 600 }}>
          <FaArrowLeft size={12} /> Back to Clients
        </button>
        <h3 style={{ margin: 0, color: "var(--brand)" }}>{client?.name || "…"}</h3>
        {client?.description && <p className="small" style={{ marginTop: 4 }}>{client.description}</p>}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {(client?.departments?.length ? client.departments : ["Unassigned"]).map(d => (
            <span key={d} style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#f0fdf4", color: "#226e48" }}>{d}</span>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#f1f5f9", borderRadius: 10, padding: 4, width: "fit-content" }}>
        <button onClick={() => setTab("files")} style={{
          padding: "8px 18px", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 13,
          background: tab === "files" ? "var(--red)" : "transparent", color: tab === "files" ? "#fff" : "#64748b",
        }}>Files</button>
        <button onClick={() => setTab("updates")} style={{
          padding: "8px 18px", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 13,
          background: tab === "updates" ? "var(--red)" : "transparent", color: tab === "updates" ? "#fff" : "#64748b",
        }}>Work Updates</button>
      </div>

      {tab === "files"
        ? <DriveTab clientId={clientId} baseUrl={baseUrl} headers={headers} canWrite={!!client?.can_write} />
        : <UpdatesTab clientId={clientId} baseUrl={baseUrl} headers={headers} jsonHeaders={jsonHeaders} canWrite={!!client?.can_write} />}
    </div>
  );
}

function DriveTab({ clientId, baseUrl, headers, canWrite }) {
  const [parentId, setParentId] = useState(null);
  const [items, setItems]       = useState([]);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [newFolder, setNewFolder] = useState(null); // "" while composing, null when hidden
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");

  function load() {
    setLoading(true);
    const q = parentId ? `?parent_id=${parentId}` : "";
    fetch(`${baseUrl}/api/clients/${clientId}/drive${q}`, { headers })
      .then(r => r.ok ? r.json() : { items: [], breadcrumb: [] })
      .then(d => { setItems(d.items || []); setBreadcrumb(d.breadcrumb || []); })
      .catch(() => { setItems([]); setBreadcrumb([]); })
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, [clientId, parentId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function createFolder(e) {
    e.preventDefault();
    if (!newFolder?.trim()) return;
    const r = await fetch(`${baseUrl}/api/clients/${clientId}/drive/folders`, {
      method: "POST", headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ name: newFolder.trim(), parent_id: parentId }),
    });
    if (r.ok) { setNewFolder(null); load(); } else setMsg("Failed to create folder.");
  }

  async function uploadFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    if (parentId) form.append("parent_id", parentId);
    try {
      const r = await fetch(`${baseUrl}/api/clients/${clientId}/drive/files`, { method: "POST", headers, body: form });
      if (r.ok) load(); else { const d = await r.json().catch(() => ({})); setMsg(d.message || "Upload failed."); }
    } catch { setMsg("Network error during upload."); } finally { setUploading(false); }
  }

  async function removeItem(item) {
    const warning = item.type === "folder" ? `Delete folder "${item.name}" and everything inside it?` : `Delete "${item.name}"?`;
    if (!window.confirm(warning)) return;
    const r = await fetch(`${baseUrl}/api/clients/${clientId}/drive/${item._id}`, { method: "DELETE", headers }).catch(() => null);
    if (r?.ok) load(); else setMsg("Failed to delete.");
  }

  return (
    <div className="card">
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4, marginBottom: 14, fontSize: 13 }}>
        <button onClick={() => setParentId(null)} style={{ border: "none", background: "none", cursor: "pointer", color: parentId ? "var(--brand)" : "#0f172a", fontWeight: parentId ? 500 : 700, padding: "2px 4px" }}>Root</button>
        {breadcrumb.map((b, i) => (
          <React.Fragment key={b._id}>
            <FaChevronRight size={9} color="#cbd5e1" />
            <button onClick={() => setParentId(b._id)} style={{ border: "none", background: "none", cursor: "pointer", color: i === breadcrumb.length - 1 ? "#0f172a" : "var(--brand)", fontWeight: i === breadcrumb.length - 1 ? 700 : 500, padding: "2px 4px" }}>{b.name}</button>
          </React.Fragment>
        ))}
      </div>

      {canWrite && (
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          {newFolder === null ? (
            <button className="btn ghost" onClick={() => setNewFolder("")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <FaFolderPlus size={12} /> New Folder
            </button>
          ) : (
            <form onSubmit={createFolder} style={{ display: "flex", gap: 6 }}>
              <input className="modern-input" autoFocus value={newFolder} onChange={e => setNewFolder(e.target.value)} placeholder="Folder name" style={{ margin: 0, maxWidth: 200 }} />
              <button className="btn" type="submit" style={{ padding: "8px 14px" }}>Create</button>
              <button className="btn ghost" type="button" onClick={() => setNewFolder(null)}>Cancel</button>
            </form>
          )}
          <label className="btn ghost" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.6 : 1 }}>
            <FaCloudUploadAlt size={13} /> {uploading ? "Uploading…" : "Upload File"}
            <input type="file" onChange={uploadFile} disabled={uploading} style={{ display: "none" }} />
          </label>
        </div>
      )}
      {msg && <p style={{ color: "#b91c1c", fontSize: 12.5, marginBottom: 12 }}>{msg}</p>}

      {loading ? <SkeletonTable rows={4} cols={3} /> : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
          <FaFolder size={32} style={{ opacity: 0.2, marginBottom: 8 }} />
          <p style={{ margin: 0 }}>This folder is empty.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {items.map(it => {
            const Icon = it.type === "folder" ? FaFolder : fileIcon(it.mime_type);
            return (
              <div key={it._id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", borderRadius: 8, cursor: it.type === "folder" ? "pointer" : "default" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                onClick={() => it.type === "folder" && setParentId(it._id)}>
                <Icon size={16} color={it.type === "folder" ? "#d97706" : "#64748b"} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</div>
                  {it.type === "file" && <div style={{ fontSize: 11, color: "#94a3b8" }}>{fmtSize(it.size)} · {fmtWhen(it.created_at)}</div>}
                </div>
                {it.type === "file" && it.url && (
                  <a href={it.url} target="_blank" rel="noreferrer" title="Download" onClick={e => e.stopPropagation()} style={{ color: "#0f766e", padding: 6 }}><FaDownload size={13} /></a>
                )}
                {canWrite && (
                  <button title="Delete" onClick={e => { e.stopPropagation(); removeItem(it); }} style={{ border: "none", background: "none", cursor: "pointer", color: "#dc2626", padding: 6 }}><FaTrash size={13} /></button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UpdatesTab({ clientId, baseUrl, headers, jsonHeaders, canWrite }) {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [text, setText]       = useState("");
  const [posting, setPosting] = useState(false);

  function load() {
    setLoading(true);
    fetch(`${baseUrl}/api/clients/${clientId}/updates`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(d => setUpdates(Array.isArray(d) ? d : []))
      .catch(() => setUpdates([]))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function post(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setPosting(true);
    try {
      const r = await fetch(`${baseUrl}/api/clients/${clientId}/updates`, { method: "POST", headers: jsonHeaders, body: JSON.stringify({ text: text.trim() }) });
      if (r.ok) { setText(""); load(); }
    } catch { /* silent — the composer stays populated so the user can retry */ }
    finally { setPosting(false); }
  }

  return (
    <div className="card">
      {canWrite && (
        <form onSubmit={post} style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          <input className="modern-input" value={text} onChange={e => setText(e.target.value)} placeholder="Post an update on this client…" style={{ margin: 0, flex: 1 }} />
          <button className="btn" type="submit" disabled={posting} style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
            <FaPaperPlane size={11} /> {posting ? "Posting…" : "Post"}
          </button>
        </form>
      )}

      {loading ? <SkeletonTable rows={4} cols={2} /> : updates.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
          <FaClipboardList size={32} style={{ opacity: 0.2, marginBottom: 8 }} />
          <p style={{ margin: 0 }}>No work logged for this client yet.</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Tasks tagged to this client in Daily Work Plan show up here automatically.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {updates.map((u, i) => u.kind === "manual" ? (
            <div key={u._id || i} style={{ padding: "12px 14px", borderRadius: 10, background: "#f8fafc", border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 13.5, color: "#0f172a" }}>{u.text}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 5 }}>{u.posted_by_name || "Someone"} · {fmtWhen(u.at)}</div>
            </div>
          ) : (
            <div key={i} style={{ padding: "12px 14px", borderRadius: 10, background: "#effdf8", border: "1px solid #b6e6d6" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: "#0f766e" }}>{u.title || "Task"}</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "#0f766e", background: "#fff", padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>{u.status || "Pending"}</span>
              </div>
              <div style={{ fontSize: 11.5, color: "#0f766e", marginTop: 4 }}>
                {u.employee_name || "—"}{u.work_type ? ` · ${u.work_type}` : ""} · {u.department || "—"} · {u.date || fmtWhen(u.at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
