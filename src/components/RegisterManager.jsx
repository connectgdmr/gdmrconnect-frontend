import React, { useState, useEffect } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";

const departments = [
  "Projects Dept",
  "Accounts Dept",
  "Graphic Designing Dept",
  "HR Dept",
  "Administration Dept",
  "BRD Dept",
  "Engineering Dept",
  "Digital Marketing Dept"
];

export default function RegisterManager({ token, api }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [department, setDepartment] = useState(departments[0]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [msg, setMsg] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [managers, setManagers] = useState([]); 
  const [loading, setLoading] = useState(false);

  // Edit State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingManager, setEditingManager] = useState(null);

  async function loadManagers() {
    try {
      setLoading(true);
      const list = await api.getManagers(token);
      setManagers(list);
    } catch (err) {
      console.error("Error loading managers:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadManagers();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setMsg("");

    if (password !== confirmPassword) {
      setMsg("❌ Passwords do not match!");
      setShowModal(true);
      return;
    }

    try {
      await api.registerManager({ name, email, password, department }, token);
      setMsg("✅ Manager registered successfully!");
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setDepartment(departments[0]);
      loadManagers(); 
    } catch (err) {
      setMsg("❌ " + (err.message || "Error registering manager"));
    }

    setShowModal(true);
  }

  async function deleteManager(id) {
    if (!window.confirm("Delete this manager?")) return;
    try {
      await api.deleteManager(id, token);
      loadManagers(); 
    } catch (err) {
      alert("Error deleting manager");
    }
  }

  // Edit Logic
  const handleEditClick = (manager) => {
    setEditingManager({ ...manager });
    setEditModalOpen(true);
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    try {
      await api.editManager(editingManager._id, editingManager, token);
      setEditModalOpen(false);
      setEditingManager(null);
      loadManagers();
      alert("Manager updated successfully");
    } catch (err) {
      alert("Failed to update manager");
    }
  };

  return (
    <div className="card">
      <style>{`
        .icon-btn {
          border: none;
          background: none;
          cursor: pointer;
          font-size: 16px;
          padding: 6px;
          border-radius: 4px;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .icon-btn.edit { color: #16a34a; }
        .icon-btn.edit:hover { background: #dcfce7; }
        .icon-btn.delete { color: #dc2626; }
        .icon-btn.delete:hover { background: #fee2e2; }
      `}</style>

      <h3 style={{ color: "#b91c1c" }}>Register Manager</h3>

      <form onSubmit={submit}>
        <div className="form-row">
          <div style={{ flex: 1 }}>
            <label>Name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div style={{ flex: 1 }}>
            <label>Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>
        
        <div className="form-row">
           <div style={{ flex: 1 }}>
            <label>Department</label>
            <select className="input" value={department} onChange={e=>setDepartment(e.target.value)} required>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}></div>
        </div>

        <div className="form-row">
          <div style={{ flex: 1, position: "relative" }}>
            <label>Password</label>
            <input
              className="input"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ paddingRight: "42px" }}
            />
            <span
              className="material-icons"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "10px",
                top: "53%",
                transform: "translateY(-50%)",
                cursor: "pointer",
                color: "#b91c1c",
              }}
            >
              {showPassword ? "visibility_off" : "visibility"}
            </span>
          </div>

          <div style={{ flex: 1, position: "relative" }}>
            <label>Confirm Password</label>
            <input
              className="input"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{ paddingRight: "42px" }}
            />
            <span
              className="material-icons"
              onClick={() =>
                setShowConfirmPassword(!showConfirmPassword)
              }
              style={{
                position: "absolute",
                right: "10px",
                top: "53%",
                transform: "translateY(-50%)",
                cursor: "pointer",
                color: "#b91c1c",
              }}
            >
              {showConfirmPassword ? "visibility_off" : "visibility"}
            </span>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", justifyContent: "end" }}>
          <button className="btn" type="submit">
            Create Manager
          </button>
        </div>
      </form>

      <h3 style={{ color: "#b91c1c", marginTop: "20px" }}>Manager List</h3>

      {loading && <p>Loading managers...</p>}
      {!loading && managers.length === 0 && <p>No managers found.</p>}

      {!loading && managers.length > 0 && (
        <table className="leave-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th style={{ textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {managers.map((m) => (
              <tr key={m._id}>
                <td>{m.name}</td>
                <td>{m.email}</td>
                <td>{m.department}</td>
                <td style={{ textAlign: "center", display: "flex", gap: "5px", justifyContent: "center" }}>
                  <button className="icon-btn edit" onClick={() => handleEditClick(m)} title="Edit">
                    <FaEdit />
                  </button>
                  <button
                    className="icon-btn delete"
                    onClick={() => deleteManager(m._id)}
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Message Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h4 style={{ color: "#b91c1c" }}>Message</h4>
            <p style={{ color: msg.includes("✅") ? "green" : "red" }}>{msg}</p>
            <button className="btn" onClick={() => setShowModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Edit Manager Modal */}
      {editModalOpen && editingManager && (
        <div className="modal-overlay" onClick={() => setEditModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{width: 400}}>
            <h3 style={{color: "#b91c1c"}}>Edit Manager</h3>
            <form onSubmit={handleEditSave}>
               <div style={{textAlign: "left", marginBottom: 10}}>
                  <label>Name</label>
                  <input className="input" value={editingManager.name} onChange={e => setEditingManager({...editingManager, name: e.target.value})} required />
               </div>
               <div style={{textAlign: "left", marginBottom: 10}}>
                  <label>Email</label>
                  <input className="input" type="email" value={editingManager.email} onChange={e => setEditingManager({...editingManager, email: e.target.value})} required />
               </div>
               <div style={{textAlign: "left", marginBottom: 15}}>
                  <label>Department</label>
                  <select className="input" value={editingManager.department} onChange={e => setEditingManager({...editingManager, department: e.target.value})} required>
                     {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
               </div>
               <div className="modal-actions">
                  <button className="btn" type="submit">Save Changes</button>
                  <button className="btn ghost" type="button" onClick={() => setEditModalOpen(false)}>Cancel</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}