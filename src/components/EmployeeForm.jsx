import React, {useState, useEffect} from "react";

const SHIFTS = [
  { key: "general", label: "General Shift (9 AM – 6 PM)" },
  { key: "morning", label: "Morning Shift (10 AM – 7 PM)" },
  { key: "night",   label: "Night Shift (7 PM – 4 AM)" },
];

export default function EmployeeForm({ onAdd, api, token, departments: deptList = [] }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState(deptList[0]?.name || "");
  const [position, setPosition] = useState("");
  const [location, setLocation] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [doj, setDoj] = useState("");
  const [confirmationDate, setConfirmationDate] = useState("");
  const [promotionDate, setPromotionDate] = useState("");
  const [managerId, setManagerId] = useState("");
  const [shift, setShift] = useState("morning");
  const [employmentType, setEmploymentType] = useState("Permanent");
  const [contractMonths, setContractMonths] = useState("");
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
    if (employmentType === "Contract" && !contractMonths) {
      setMsg("Please enter the contract duration in months.");
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      await onAdd({
        name,
        email,
        phone,
        department,
        position,
        location,
        employee_code: employeeCode,
        doj,
        confirmation_date: confirmationDate,
        promotion_date: promotionDate,
        shift,
        manager_id: managerId || undefined,
        employment_type: employmentType,
        contract_months: employmentType === "Contract" ? Number(contractMonths) : undefined,
      });
      setMsg(employmentType === "Contract" ? "Employee added — no login access (contract)." : "Employee added — credentials sent by email.");
      setName(""); setEmail(""); setPhone(""); setDepartment(deptList[0]?.name || ""); setPosition(""); setLocation(""); setEmployeeCode(""); setDoj(""); setConfirmationDate(""); setPromotionDate(""); setManagerId(""); setShift("morning"); setEmploymentType("Permanent"); setContractMonths("");
    } catch (err) {
      setMsg(err.message || "Error");
    } finally { setSaving(false); }
  }

  return (
    <div className="card">
      <h3 style={{color:"var(--brand)"}}>Add Employee</h3>
      {msg && <div className="small" style={{color: msg.startsWith("Employee added") ? "green" : "red", fontWeight: 500}}>{msg}</div>}
      <br />
      <form onSubmit={handle}>
        
        {/* Row 1: Name and Email */}
        <div className="form-row">
          <input className="input" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} required />
          <input className="input" placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value.toLowerCase())} required />
        </div>

        {/* Row 1b: Phone */}
        <div className="form-row">
          <input className="input" placeholder="Phone (optional)" type="tel" value={phone} onChange={e=>setPhone(e.target.value)} />
        </div>

        {/* Row 2: Department and Position (Fixed layout) */}
        <div className="form-row">
          <div style={{ flex: 1 }}>
            <label>Department</label>
            <select className="input" value={department} onChange={e=>setDepartment(e.target.value)} required>
              {[...deptList].sort((a, b) => (a.name || "").localeCompare(b.name || "")).map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
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

        {/* Row 2b: Location */}
        <div className="form-row">
          <div style={{ flex: 1 }}>
            <label>Location</label>
            <input className="input" placeholder="e.g. Kochi Office" value={location} onChange={e=>setLocation(e.target.value)} />
          </div>
        </div>
        
        {/* Row 3: Shift and Manager */}
        <div className="form-row">
          <div style={{ flex: 1 }}>
            <label>Shift</label>
            <select className="input" value={shift} onChange={e => setShift(e.target.value)}>
              {SHIFTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div style={{flex: 1}}>
            <label>Assign Manager (Optional)</label>
            <select className="input" value={managerId} onChange={e=>setManagerId(e.target.value)}>
              <option value="">-- No Manager Assigned --</option>
              {[...managers].sort((a, b) => (a.name || "").localeCompare(b.name || "")).map(m => (
                <option key={m._id} value={m._id}>{m.name} ({m.department})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 4: Employee ID and Date of Joining */}
        <div className="form-row">
          <div style={{flex: 1}}>
            <label>Employee ID</label>
            <input className="input" placeholder="e.g. GDMR-001" value={employeeCode} onChange={e=>setEmployeeCode(e.target.value)} />
          </div>
          <div style={{flex: 1}}>
            <label>Date of Joining</label>
            <input className="input" type="date" value={doj} onChange={e=>setDoj(e.target.value)} />
          </div>
        </div>

        {/* Row 4b: Confirmation Date and Promotion Date */}
        <div className="form-row">
          <div style={{flex: 1}}>
            <label>Confirmation Date</label>
            <input className="input" type="date" value={confirmationDate} onChange={e=>setConfirmationDate(e.target.value)} />
          </div>
          <div style={{flex: 1}}>
            <label>Promotion Date</label>
            <input className="input" type="date" value={promotionDate} onChange={e=>setPromotionDate(e.target.value)} />
          </div>
        </div>

        {/* Row 5: Employment Type and Contract Duration */}
        <div className="form-row">
          <div style={{flex: 1}}>
            <label>Employment Type</label>
            <select className="input" value={employmentType} onChange={e=>setEmploymentType(e.target.value)}>
              <option value="Permanent">Permanent</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
            </select>
          </div>
          {employmentType === "Contract" && (
            <div style={{flex: 1}}>
              <label>Contract Duration (months)</label>
              <input className="input" type="number" min="1" placeholder="e.g. 6" value={contractMonths} onChange={e=>setContractMonths(e.target.value)} required />
            </div>
          )}
        </div>
        {employmentType === "Contract" && (
          <div className="small" style={{color: "var(--muted, #64748b)", marginTop: -4, marginBottom: 8}}>
            Contract employees are stored as records only — no login/portal access or welcome email is created for them.
          </div>
        )}

        <div style={{marginTop:10}}>
          <button className="btn" disabled={saving}>{saving ? "Adding..." : "Add employee"}</button>
        </div>
      </form>
    </div>
  );
}