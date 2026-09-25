import React, { useState, useEffect, useCallback } from "react";
import {
  TbFingerprint, TbPlus, TbTrash, TbX, TbUserCheck, TbUsers, TbRefresh,
  TbSettings, TbPlugConnected,
} from "react-icons/tb";

// Devices known to speak ADMS (the cloud-push protocol routes/biometric.py
// implements) — every option here works against the same endpoints, this
// is just a guided list so an admin buying hardware doesn't have to know
// the protocol name. "Other" covers any other ADMS/cloud-push capable
// device — the field is informational only, it doesn't change behavior.
const DEVICE_MODELS = [
  { value: "zkteco-uface800",   label: "ZKTeco uFace 800 (Fingerprint + Face)" },
  { value: "zkteco-speedface-v5l", label: "ZKTeco SpeedFace V5L (Face)" },
  { value: "zkteco-mb460",      label: "ZKTeco MB460 (Fingerprint)" },
  { value: "zkteco-mb560",      label: "ZKTeco MB560 (Fingerprint)" },
  { value: "other-adms",        label: "Other ADMS / Cloud-Push Compatible Device" },
];

/**
 * Admin-only "Biometric Devices" page — register a fingerprint/face device
 * (ZKTeco or any other ADMS/cloud-push capable brand), watch it come online,
 * and map each employee it reports locally-enrolled to their GDMR Connect
 * record. Once mapped, every punch that device reports flows into the same
 * attendance log as a photo check-in — see routes/biometric.py for the
 * device-facing protocol and helpers.record_attendance_punch() for the
 * shared shift-timing/dedup logic both methods go through.
 */
export default function BiometricDevices({ token, api, employees = [] }) {
  const baseUrl = api?.baseUrl || "https://gdmrconnect-backend-production.up.railway.app";

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBranch, setNewBranch] = useState("");
  const [newModel, setNewModel] = useState(DEVICE_MODELS[0].value);
  const [newSerial, setNewSerial] = useState("");
  const [saving, setSaving] = useState(false);
  const [setupInfo, setSetupInfo] = useState(null); // { name, setup } shown right after registering
  const [testingId, setTestingId] = useState(null);

  const [detailDevice, setDetailDevice] = useState(null); // device row whose enrollments are shown
  const [enrollments, setEnrollments] = useState([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [linkingPin, setLinkingPin] = useState(null);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/biometric-devices`, { headers: { Authorization: `Bearer ${token}` } });
      setDevices(res.ok ? await res.json() : []);
    } catch { setDevices([]); }
    finally { setLoading(false); }
  }, [baseUrl, token]);

  useEffect(() => { loadDevices(); }, [loadDevices]);
  // Poll while waiting for a newly-added device to call in the first time —
  // keeps the "Pending" -> "Connected" flip visible without a manual refresh.
  useEffect(() => {
    if (!devices.some(d => d.status === "pending")) return;
    const id = setInterval(loadDevices, 8000);
    return () => clearInterval(id);
  }, [devices, loadDevices]);

  async function addDevice(e) {
    e.preventDefault();
    if (!newName.trim() || !newSerial.trim()) { alert("Name and serial number are required."); return; }
    setSaving(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/biometric-devices`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newName.trim(), branch: newBranch.trim(), model: newModel, serial_number: newSerial.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { alert(d.message || "Failed to register device."); return; }
      setSetupInfo({ name: newName.trim(), setup: d.setup, deviceId: d._id });
      setNewName(""); setNewBranch(""); setNewModel(DEVICE_MODELS[0].value); setNewSerial("");
      loadDevices();
    } catch { alert("Network error registering the device."); }
    finally { setSaving(false); }
  }

  const openDetail = useCallback(async (device) => {
    setDetailDevice(device);
    setLoadingEnrollments(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/biometric-devices/${device._id}/enrollments`, { headers: { Authorization: `Bearer ${token}` } });
      setEnrollments(res.ok ? await res.json() : []);
    } catch { setEnrollments([]); }
    finally { setLoadingEnrollments(false); }
  }, [baseUrl, token]);

  async function deleteDevice(device) {
    if (!window.confirm(`Remove "${device.name}"? Its enrollments will be unlinked — existing attendance history is kept.`)) return;
    try {
      const res = await fetch(`${baseUrl}/api/admin/biometric-devices/${device._id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.message || "Failed to remove device."); return; }
      if (detailDevice?._id === device._id) setDetailDevice(null);
      loadDevices();
    } catch { alert("Network error removing the device."); }
  }

  async function testDevice(device) {
    setTestingId(device._id);
    try {
      const res = await fetch(`${baseUrl}/api/admin/biometric-devices/${device._id}/test`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { alert(d.message || "Failed to test this device."); return; }
      alert(`${device.name}\n\n${d.online ? "✅" : "⚠️"} ${d.message}`);
      loadDevices();
    } catch { alert("Network error testing this device."); }
    finally { setTestingId(null); }
  }

  async function linkEnrollment(pin, employeeId) {
    if (!employeeId) return;
    setLinkingPin(pin);
    try {
      const res = await fetch(`${baseUrl}/api/admin/biometric-devices/${detailDevice._id}/enrollments/${pin}/map`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ employee_id: employeeId }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.message || "Failed to link."); return; }
      openDetail(detailDevice);
      loadDevices();
    } catch { alert("Network error linking this employee."); }
    finally { setLinkingPin(null); }
  }

  async function unlinkEnrollment(pin) {
    if (!window.confirm("Unlink this fingerprint from the employee?")) return;
    try {
      const res = await fetch(`${baseUrl}/api/admin/biometric-devices/${detailDevice._id}/enrollments/${pin}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.message || "Failed to unlink."); return; }
      openDetail(detailDevice);
      loadDevices();
    } catch { alert("Network error unlinking."); }
  }

  const statusPill = (status) => {
    const map = {
      connected: { bg: "#f0fdf4", fg: "#166534", bd: "#86efac", label: "🟢 Connected" },
      pending:   { bg: "#fffbeb", fg: "#b45309", bd: "#fde68a", label: "⏳ Waiting to connect" },
      offline:   { bg: "#fef2f2", fg: "#b91c1c", bd: "#fecaca", label: "🔴 Offline" },
    };
    const s = map[status] || map.pending;
    return <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 8, background: s.bg, color: s.fg, border: `1px solid ${s.bd}` }}>{s.label}</span>;
  };

  const unmapped = enrollments.filter(e => !e.employee_id);
  const mapped   = enrollments.filter(e => e.employee_id);

  return (
    <div>
      <div className="card" style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, color: "var(--brand)", display: "flex", alignItems: "center", gap: 8 }}>
            <TbFingerprint size={18} /> Biometric Devices
          </h3>
          <p className="small" style={{ margin: "3px 0 0" }}>
            Fingerprint/face attendance devices — add one, wait for it to connect, then link each fingerprint it reports to an employee.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5 }} onClick={loadDevices} disabled={loading}>
            <TbRefresh size={13} /> {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button className="btn" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5 }} onClick={() => setAddModalOpen(true)}>
            <TbPlus size={13} /> Add Device
          </button>
        </div>
      </div>

      {loading && devices.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Loading…</div>
      ) : devices.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "50px 20px", color: "#94a3b8", border: "1px dashed #e2e8f0", borderRadius: 10 }}>
          <TbFingerprint size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontSize: 15, fontWeight: 500 }}>No devices added yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Click <strong>Add Device</strong> to connect your first fingerprint/face device.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 14 }}>
          {devices.map(d => (
            <div key={d._id} className="card">
              <div>
                <div style={{ fontWeight: 700, fontSize: 14.5, color: "#0f172a" }}>{d.name}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  {d.branch || "No branch set"}{d.model ? ` · ${DEVICE_MODELS.find(m => m.value === d.model)?.label || d.model}` : ""}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, fontFamily: "monospace" }}>SN: {d.serial_number}</div>
              </div>
              <div style={{ marginTop: 10 }}>{statusPill(d.status)}</div>
              <div style={{ marginTop: 10, display: "flex", gap: 14, fontSize: 12.5, color: "#475569" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><TbUserCheck size={13} color="#16a34a" /> {d.mapped_count} mapped</span>
                {d.unmapped_count > 0 && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#b45309", fontWeight: 600 }}><TbUsers size={13} /> {d.unmapped_count} to map</span>
                )}
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button title="Manage enrollments" onClick={() => openDetail(d)}
                  style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  <TbSettings size={13} /> Manage
                </button>
                <button title="Test connection" onClick={() => testDevice(d)} disabled={testingId === d._id}
                  style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  <TbPlugConnected size={13} /> {testingId === d._id ? "Testing…" : "Test"}
                </button>
                <button title="Remove device" onClick={() => deleteDevice(d)}
                  style={{ border: "1px solid #fca5a5", background: "#fef2f2", color: "#b91c1c", borderRadius: 6, padding: "6px 9px", cursor: "pointer", display: "inline-flex" }}>
                  <TbTrash size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Device modal ── */}
      {addModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 4000 }} onClick={() => { setAddModalOpen(false); setSetupInfo(null); }}>
          <div className="modal-box" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>{setupInfo ? "Device Registered" : "Add Biometric Device"}</h3>
              <button className="btn-small ghost" onClick={() => { setAddModalOpen(false); setSetupInfo(null); }}><TbX /></button>
            </div>

            {setupInfo ? (
              <div>
                <p className="small">
                  On <strong>{setupInfo.name}</strong>'s own screen, go to <strong>Comm → Cloud Server Settings</strong> and enter:
                </p>
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, fontSize: 13, fontFamily: "monospace" }}>
                  <div>Server Address: <strong>{setupInfo.setup?.server_address}</strong></div>
                  <div>Server Port: <strong>{setupInfo.setup?.server_port}</strong></div>
                  <div>Use HTTPS: <strong>{setupInfo.setup?.use_https ? "Yes" : "No"}</strong></div>
                </div>
                <p className="small" style={{ marginTop: 10, color: "#64748b" }}>
                  Once saved on the device, it will connect automatically within a minute or two — this page will update to "🟢 Connected" on its own. Once you've saved it on the device, use <strong>Test Connection</strong> below to check.
                </p>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                  <button
                    className="btn ghost" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                    disabled={testingId === setupInfo.deviceId}
                    onClick={() => testDevice({ _id: setupInfo.deviceId, name: setupInfo.name })}
                  >
                    <TbPlugConnected size={14} /> {testingId === setupInfo.deviceId ? "Testing…" : "Test Connection"}
                  </button>
                  <button className="btn" onClick={() => { setAddModalOpen(false); setSetupInfo(null); }}>Done</button>
                </div>
              </div>
            ) : (
              <form onSubmit={addDevice}>
                <label className="modern-label">Device Name</label>
                <input className="modern-input" placeholder="e.g., Head Office - Main Gate" value={newName} onChange={e => setNewName(e.target.value)} />
                <label className="modern-label" style={{ marginTop: 10, display: "block" }}>Branch / Location</label>
                <input className="modern-input" placeholder="e.g., Head Office" value={newBranch} onChange={e => setNewBranch(e.target.value)} />
                <label className="modern-label" style={{ marginTop: 10, display: "block" }}>Device Model</label>
                <select className="modern-input" value={newModel} onChange={e => setNewModel(e.target.value)}>
                  {DEVICE_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <label className="modern-label" style={{ marginTop: 10, display: "block" }}>Serial Number</label>
                <input className="modern-input" placeholder="Printed on a sticker on the device" value={newSerial} onChange={e => setNewSerial(e.target.value)} />
                <p className="small" style={{ marginTop: 6, color: "#94a3b8" }}>
                  Any device that supports "Cloud Server" / ADMS push works here — the model above is just for your own reference.
                </p>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
                  <button type="button" className="btn ghost" onClick={() => setAddModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn" disabled={saving}>{saving ? "Registering…" : "Register Device"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Device detail: enrollments ── */}
      {detailDevice && (
        <div className="modal-overlay" style={{ zIndex: 4000 }} onClick={() => setDetailDevice(null)}>
          <div className="modal-box" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <h3 style={{ margin: 0 }}>{detailDevice.name}</h3>
              <button className="btn-small ghost" onClick={() => setDetailDevice(null)}><TbX /></button>
            </div>
            <div style={{ margin: "2px 0 14px" }}>{statusPill(detailDevice.status)}</div>

            {loadingEnrollments ? (
              <div style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>Loading…</div>
            ) : (
              <>
                <h4 style={{ fontSize: 13, color: "#0f172a", margin: "0 0 8px" }}>
                  Unmapped Device Users {unmapped.length > 0 && <span style={{ color: "#b45309" }}>({unmapped.length})</span>}
                </h4>
                {unmapped.length === 0 ? (
                  <p className="small" style={{ color: "#94a3b8", marginBottom: 16 }}>
                    Nothing to map yet — once someone is enrolled directly on the device, they'll appear here.
                  </p>
                ) : (
                  <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8, marginBottom: 16 }}>
                    <table className="styled-table-global">
                      <thead><tr><th>Device PIN</th><th>Name on device</th><th>Type</th><th>Link to</th></tr></thead>
                      <tbody>
                        {unmapped.map(e => (
                          <tr key={e.device_pin}>
                            <td>{e.device_pin}</td>
                            <td>{e.device_reported_name || "—"}</td>
                            <td style={{ fontSize: 12, textTransform: "capitalize" }}>{e.biometric_type}</td>
                            <td>
                              <select
                                className="modern-input" style={{ margin: 0, minWidth: 160 }}
                                disabled={linkingPin === e.device_pin}
                                value=""
                                onChange={ev => linkEnrollment(e.device_pin, ev.target.value)}
                              >
                                <option value="">{linkingPin === e.device_pin ? "Linking…" : "Select employee…"}</option>
                                {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name}</option>)}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <h4 style={{ fontSize: 13, color: "#0f172a", margin: "0 0 8px" }}>Mapped Employees ({mapped.length})</h4>
                {mapped.length === 0 ? (
                  <p className="small" style={{ color: "#94a3b8" }}>No employees linked to this device yet.</p>
                ) : (
                  <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                    <table className="styled-table-global">
                      <thead><tr><th>Employee</th><th>Type</th><th>Device PIN</th><th></th></tr></thead>
                      <tbody>
                        {mapped.map(e => (
                          <tr key={e.device_pin}>
                            <td style={{ fontWeight: 600 }}>{e.employee_name}</td>
                            <td style={{ fontSize: 12, textTransform: "capitalize" }}>{e.biometric_type}</td>
                            <td>{e.device_pin}</td>
                            <td>
                              <button className="btn-small ghost" style={{ border: "1px solid #e2e8f0", padding: "4px 10px", fontSize: 11.5 }} onClick={() => unlinkEnrollment(e.device_pin)}>Unlink</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
