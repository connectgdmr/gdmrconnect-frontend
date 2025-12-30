import React, {useState, useEffect} from "react";

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

export default function EmployeeForm({ onAdd, api, token }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState(departments[0]); 
  const [position, setPosition] = useState("");
  const [managerId, setManagerId] = useState("");
  const [managers, setManagers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function loadManagers() {
    try {
      // API call to fetch all registered managers (REVISION 3)
      const list = await api.getManagers(token);
      setManagers(list);
    } catch (err) {
      console.error("Failed to load managers", err);
    }
  }

  useEffect(() => {
    if(token && api) {
        loadManagers();
    }
  }, [token, api]);

  async function handle(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      await onAdd({ 
        name, 
        email, 
        department, 
        position, 
        manager_id: managerId || undefined 
      });
      setMsg("Employee added — credentials sent by email.");
      setName(""); setEmail(""); setDepartment(departments[0]); setPosition(""); setManagerId("");
    } catch (err) {
      setMsg(err.message || "Error");
    } finally { setSaving(false); }
  }

  return (
    <div className="card">
      <h3 style={{color:"#b91c1c"}}>Add Employee</h3>
      {msg && <div className="small" style={{color: msg.startsWith("Employee added") ? "green" : "red", fontWeight: 500}}>{msg}</div>}
      <br />
      <form onSubmit={handle}>
        
        {/* Row 1: Name and Email */}
        <div className="form-row">
          <input className="input" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} required />
          <input className="input" placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        </div>
        
        {/* Row 2: Department and Position (Fixed layout) */}
        <div className="form-row">
          <div style={{ flex: 1 }}>
            <label>Department</label>
            <select className="input" value={department} onChange={e=>setDepartment(e.target.value)} required>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>Position</label>
            {/* Position input now uses the .input class correctly, fixing height */}
            <input 
                className="input" 
                placeholder="Position" 
                value={position} 
                onChange={e=>setPosition(e.target.value)} 
            />
          </div>
        </div>
        
        {/* Row 3: Manager Assignment (Optional) */}
        <div className="form-row">
          <div style={{flex: 1}}>
            <label>Assign Manager (Optional)</label>
            <select className="input" value={managerId} onChange={e=>setManagerId(e.target.value)}>
              <option value="">-- No Manager Assigned --</option>
              {managers.map(m => (
                <option key={m._id} value={m._id}>{m.name} ({m.department})</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{marginTop:10}}>
          <button className="btn" disabled={saving}>{saving ? "Adding..." : "Add employee"}</button>
        </div>
      </form>
    </div>
  );
}