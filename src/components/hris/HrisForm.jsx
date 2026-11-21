import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { TbPlus, TbTrash, TbCheck, TbUpload } from "react-icons/tb";
import { DateInput, Field, Row, Section, PhoneInput, TabBar } from "./shared";
import { useApi, setIn, getIn, addMonthsIso, fmtDate, tab, todayIso } from "./util";

const EMPTY = () => ({
  personal: { phone_cc: "+971", emergency: { phone_cc: "+971" }, dependants: [] },
  job: { employment_type: "Permanent", shift: "general", role: "employee", notice_days: "30" },
  docs: { passport: {}, visa: {}, eid: {}, mohre: {}, insurance: {}, iloe: {} },
  salary: { pay_mode: "Bank", currency: "AED", bank: {}, air_ticket: {} },
  leave: {},
});
const RELIGIONS = ["", "Muslim", "Christian", "Hindu", "Buddhist", "Sikh", "Other", "Prefer not to say"];
const BLOOD = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const SHIFTS = [["general", "General (9 AM - 6 PM)"], ["morning", "Morning (10 AM - 7 PM)"], ["night", "Night (7 PM - 4 AM)"]];
const DOC_KINDS = [["passport", "Passport copy"], ["visa", "Residence visa copy"], ["emirates_id", "Emirates ID copy"], ["offer_letter", "Offer letter"], ["contract", "Signed contract"],
  ["nda", "NDA"], ["non_solicit", "Non-solicit undertaking"], ["education", "Education certificate"], ["experience", "Experience letter"], ["noc", "No-objection letter (previous employer)"], ["other", "Other"]];
const tabOf = path => path.split(".")[0];
// field wrapper that reads its error / warning from the form (module level, so inputs keep focus while typing)
const FormCtx = createContext({ err: () => undefined, warn: () => undefined });
function F({ path, label, req, hint, children }) {
  const { err, warn } = useContext(FormCtx);
  return <Field label={label} req={req} hint={hint} error={err(path)} warn={warn(path)}>{children}</Field>;
}
const money = n => Number(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isMd = job => !!job?.is_md || /managing director/i.test(job?.job_title || "");

export default function HrisForm({ token, mode, empId, meta, managers, draft, onSaved, onCancel }) {
  const { call } = useApi(token);
  const isEdit = mode === "edit";
  const canSalary = !!meta?.can_see_salary;
  const [p, setP] = useState(() => (draft?.profile ? merge(EMPTY(), draft.profile) : EMPTY()));
  const [extra, setExtra] = useState({ promotions: [], employee: null });
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState({});
  const [touched, setTouched] = useState({});
  const [showAll, setShowAll] = useState(false);
  const [tabKey, setTabKey] = useState("personal");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);                 // {type: ok|err, text}
  const [created, setCreated] = useState(null);
  const [draftId, setDraftId] = useState(draft?._id || null);
  const [loading, setLoading] = useState(isEdit);
  const [newDept, setNewDept] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const r = await call(`/hris/employees/${empId}`);
      if (r.ok) { setP(merge(EMPTY(), r.data)); setExtra({ promotions: r.data.promotions || [], employee: r.data.employee }); }
      else setMsg({ type: "err", text: r.data?.message || "Could not load this employee." });
      setLoading(false);
    })();
  }, [empId]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = useMemo(() => ["basic", "housing", "transport", "other"].reduce((s, k) => s + (parseFloat(p.salary?.[k]) || 0), 0), [p.salary]);
  const payload = useMemo(() => ({ ...p, salary: canSalary ? { ...p.salary, total: Math.round(total * 100) / 100 } : undefined }), [p, total, canSalary]);

  // ask the server (the single source of truth for the rules) whenever something has been touched
  const check = useCallback(async () => {
    const r = await call("/hris/validate", { method: "POST", body: { profile: payload, employee_id: isEdit ? empId : undefined } });
    if (r.ok) {
      setErrors(r.data.errors || {}); setWarnings(r.data.warnings || {});
      if (!isEdit && r.data.derived?.confirmation_date) setP(x => (x.job.confirmation_date === r.data.derived.confirmation_date ? x : setIn(x, "job.confirmation_date", r.data.derived.confirmation_date)));
    }
    return r;
  }, [payload]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (loading || (!showAll && !Object.keys(touched).length)) return;
    clearTimeout(timer.current); timer.current = setTimeout(check, 450);
    return () => clearTimeout(timer.current);
  }, [payload, touched, showAll, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (path, v) => setP(x => setIn(x, path, v));
  const touch = path => setTouched(t => (t[path] ? t : { ...t, [path]: true }));
  const err = path => (showAll || touched[path] ? errors[path] : undefined);
  const warn = path => warnings[path];
  const bind = path => ({ value: getIn(p, path) ?? "", onChange: e => set(path, e.target.value), onBlur: () => touch(path),
    style: { margin: 0, borderColor: err(path) ? "#ef4444" : undefined }, className: "modern-input" });
  const date = path => ({ value: getIn(p, path) || "", onChange: v => set(path, v), onBlur: () => touch(path), invalid: !!err(path) });
  const ctx = useMemo(() => ({ err, warn }), [errors, warnings, touched, showAll]); // eslint-disable-line react-hooks/exhaustive-deps

  const errCount = useMemo(() => {
    const c = {};
    Object.keys(errors).forEach(k => { if (showAll || touched[k]) c[tabOf(k)] = (c[tabOf(k)] || 0) + 1; });
    return c;
  }, [errors, touched, showAll]);

  const office = (meta?.offices || []).find(o => o.name === p.job.office);
  const confirmation = !isEdit || p.job.confirmation_date ? (addMonthsIso(p.job.doj, p.job.probation_months) || p.job.confirmation_date || "") : "";

  async function save() {
    setShowAll(true); setMsg(null); setSaving(true);
    try {
      const r = isEdit
        ? await call(`/hris/employees/${empId}`, { method: "PUT", body: { profile: payload } })
        : await call("/hris/employees", { method: "POST", body: { profile: payload, draft_id: draftId } });
      if (r.ok) {
        setErrors({}); setWarnings(r.data.warnings || {});
        if (isEdit) { setMsg({ type: "ok", text: "Saved." }); onSaved && onSaved(r.data); }
        else setCreated(r.data);
        return;
      }
      if (r.status === 422) {
        setErrors(r.data.errors || {}); setWarnings(r.data.warnings || {});
        const first = Object.keys(r.data.errors || {})[0];
        if (first) setTabKey(tabOf(first));
        setMsg({ type: "err", text: `Please fix the ${Object.keys(r.data.errors).length} highlighted field(s).` });
      } else setMsg({ type: "err", text: r.data?.message || "Could not save." });
    } finally { setSaving(false); }
  }
  async function saveDraft() {
    const r = await call("/hris/drafts", { method: "POST", body: { profile: payload, draft_id: draftId } });
    if (r.ok) { setDraftId(r.data.draft_id); setMsg({ type: "ok", text: "Draft saved - you can finish it later from 'Add employee' > Drafts." }); }
    else setMsg({ type: "err", text: r.data?.message || "Could not save the draft." });
  }

  if (loading) return <div className="card"><div className="loader" style={{ margin: "30px auto" }} /></div>;

  if (created) {
    return (
      <div className="card">
        <h3 style={{ color: "#166534", marginTop: 0 }}><TbCheck /> Employee added</h3>
        <p style={{ margin: "6px 0" }}><b>{p.job.full_name}</b> can now log in with:</p>
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px 14px", display: "inline-block", fontSize: 14 }}>
          <div>Login: <b>{created.login}</b></div><div>Temporary password: <b style={{ fontFamily: "monospace" }}>{created.temp_password}</b></div>
        </div>
        <p className="small" style={{ color: "#64748b" }}>{created.email_note} They will be asked to choose a new password the first time they log in.</p>
        {Object.keys(created.warnings || {}).length > 0 && <div style={{ color: "#b45309", fontSize: 13, marginBottom: 8 }}>{Object.values(created.warnings).map((w, i) => <div key={i}>⚠ {w}</div>)}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button className="btn" onClick={() => { setCreated(null); setP(EMPTY()); setTouched({}); setErrors({}); setWarnings({}); setShowAll(false); setTabKey("personal"); setDraftId(null); setMsg(null); }}>Add another employee</button>
          <button className="btn ghost" onClick={() => onSaved && onSaved(created)}>Back to the list</button>
        </div>
      </div>
    );
  }

  const tabs = [["personal", "Personal"], ["job", "Job Details"], ["docs", "UAE Documents"], ...(canSalary ? [["salary", "Salary"]] : []), ["leave", "Leave"], ...(isEdit ? [["documents", "Documents"], ["checklists", "Checklists"]] : [])];

  return (
    <FormCtx.Provider value={ctx}>
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
        <h3 style={{ color: "var(--brand)", margin: 0, flex: 1 }}>{isEdit ? (p.job.full_name || "Employee") : "Add employee"}{isEdit && extra.employee?.code && <span className="small" style={{ color: "#94a3b8", marginLeft: 10 }}>{extra.employee.code}</span>}</h3>
      </div>
      <p className="small" style={{ color: "#64748b", margin: "0 0 12px" }}>Fields marked <span style={{ color: "#dc2626" }}>*</span> are compulsory. The employee ID is created automatically.</p>
      <TabBar>
        {tabs.map(([k, l]) => (
          <button key={k} type="button" style={tab(tabKey === k)} onClick={() => setTabKey(k)}>{l}{errCount[k] ? <span style={{ marginLeft: 6, background: "#dc2626", color: "#fff", borderRadius: 99, padding: "0 6px", fontSize: 11 }}>{errCount[k]}</span> : null}</button>
        ))}
      </TabBar>

      {tabKey === "personal" && (
        <div>
          <Section title="About the employee">
            <Row>
              <F path="personal.dob" label="Date of birth" req><DateInput {...date("personal.dob")} /></F>
              <F path="personal.gender" label="Gender" req><select {...bind("personal.gender")}><option value="">Select…</option>{(meta?.genders || []).map(g => <option key={g}>{g}</option>)}</select></F>
              <F path="personal.nationality" label="Nationality" req><input {...bind("personal.nationality")} placeholder="e.g. Indian" /></F>
              <F path="personal.marital_status" label="Marital status" req><select {...bind("personal.marital_status")}><option value="">Select…</option>{(meta?.marital || []).map(g => <option key={g}>{g}</option>)}</select></F>
            </Row>
            <Row>
              <F path="personal.religion" label="Religion" hint="Some leave rules depend on it (e.g. Hajj leave)."><select {...bind("personal.religion")}>{RELIGIONS.map(g => <option key={g} value={g}>{g || "Select…"}</option>)}</select></F>
              <F path="personal.blood_group" label="Blood group"><select {...bind("personal.blood_group")}>{BLOOD.map(g => <option key={g} value={g}>{g || "Select…"}</option>)}</select></F>
              <F path="personal.personal_email" label="Personal email"><input {...bind("personal.personal_email")} type="email" placeholder="name@gmail.com" /></F>
              <F path="personal.phone" label="Mobile number"><PhoneInput cc={p.personal.phone_cc} num={p.personal.phone} onCc={v => set("personal.phone_cc", v)} onNum={v => set("personal.phone", v)} onBlur={() => touch("personal.phone")} invalid={!!err("personal.phone")} /></F>
            </Row>
          </Section>
          <Section title="Emergency contact">
            <Row>
              <F path="personal.emergency.name" label="Name" req><input {...bind("personal.emergency.name")} /></F>
              <F path="personal.emergency.relationship" label="Relationship" req><input {...bind("personal.emergency.relationship")} placeholder="e.g. Spouse, Father" /></F>
              <F path="personal.emergency.phone" label="Phone" req><PhoneInput cc={p.personal.emergency?.phone_cc} num={p.personal.emergency?.phone} onCc={v => set("personal.emergency.phone_cc", v)} onNum={v => set("personal.emergency.phone", v)} onBlur={() => touch("personal.emergency.phone")} invalid={!!err("personal.emergency.phone")} /></F>
            </Row>
          </Section>
          <Section title="Addresses">
            <Row>
              <F path="personal.address_uae" label="Address in the UAE"><textarea {...bind("personal.address_uae")} rows={2} /></F>
              <F path="personal.address_home" label="Address in the home country"><textarea {...bind("personal.address_home")} rows={2} /></F>
            </Row>
          </Section>
          <Section title="Dependants (for visas, insurance and air tickets)" right={<button type="button" className="btn ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => set("personal.dependants", [...(p.personal.dependants || []), { name: "", relationship: "", dob: "" }])}><TbPlus /> Add</button>}>
            {(p.personal.dependants || []).length === 0 && <div className="small" style={{ color: "#94a3b8" }}>No dependants added.</div>}
            {(p.personal.dependants || []).map((d, i) => (
              <Row key={i} style={{ alignItems: "flex-end" }}>
                <Field label="Name"><input className="modern-input" style={{ margin: 0 }} value={d.name} onChange={e => set(`personal.dependants.${i}.name`, e.target.value)} /></Field>
                <Field label="Relationship"><input className="modern-input" style={{ margin: 0 }} value={d.relationship} onChange={e => set(`personal.dependants.${i}.relationship`, e.target.value)} placeholder="Spouse, Child…" /></Field>
                <Field label="Date of birth"><DateInput value={d.dob} onChange={v => set(`personal.dependants.${i}.dob`, v)} /></Field>
                <button type="button" aria-label="Remove dependant" className="btn ghost" style={{ padding: "8px 10px", marginBottom: 1 }} onClick={() => set("personal.dependants", p.personal.dependants.filter((_, j) => j !== i))}><TbTrash /></button>
              </Row>
            ))}
          </Section>
        </div>
      )}

      {tabKey === "job" && (
        <div>
          <Section title="Position">
            <Row>
              <F path="job.full_name" label="Full name" req><input {...bind("job.full_name")} /></F>
              <F path="job.work_email" label="Work email (also the login)" req><input {...bind("job.work_email")} type="email" onChange={e => set("job.work_email", e.target.value.toLowerCase())} /></F>
              <F path="job.attendance_id" label="Attendance machine / fingerprint ID" req hint="Matches the person to their attendance punches."><input {...bind("job.attendance_id")} /></F>
            </Row>
            <Row>
              <F path="job.department" label="Department" req hint={newDept ? "A new department - it is added to the Departments page when you save." : ""}>
                <select value={newDept ? "__new__" : (p.job.department || "")} onChange={e => { if (e.target.value === "__new__") { setNewDept(true); set("job.department", ""); } else { setNewDept(false); set("job.department", e.target.value); } touch("job.department"); }}
                  className="modern-input" style={{ margin: 0, borderColor: err("job.department") ? "#ef4444" : undefined }}>
                  <option value="">Select…</option>{(meta?.departments || []).map(d => <option key={d} value={d}>{d}</option>)}<option value="__new__">+ New department…</option></select>
                {newDept && <input {...bind("job.department")} autoFocus placeholder="New department name" style={{ margin: "6px 0 0", borderColor: err("job.department") ? "#ef4444" : undefined }} />}</F>
              <F path="job.job_title" label="Job title" req><input {...bind("job.job_title")} /></F>
              <F path="job.grade" label="Grade / level"><input {...bind("job.grade")} placeholder="e.g. L3" /></F>
            </Row>
            <Row>
              <F path="job.office" label="Office" req hint={office ? `Country: ${office.country} - ${office.country}'s leave and legal rules apply.` : "Chosen from your list of offices (Settings)."}>
                <select {...bind("job.office")}><option value="">Select…</option>{(meta?.offices || []).map(o => <option key={o.name} value={o.name}>{o.name} ({o.country})</option>)}</select></F>
              <F path="job.manager_id" label={isMd(p.job) ? "Manager" : "Manager"} req={!isMd(p.job)} hint="Leave and attendance approvals go to this person.">
                <select {...bind("job.manager_id")}><option value="">{isMd(p.job) ? "No manager (Managing Director)" : "Select…"}</option>{(managers || []).filter(m => m._id !== empId).map(m => <option key={m._id} value={m._id}>{m.name} ({m.department || m.role})</option>)}</select></F>
              <F path="job.role" label="Login access"><select {...bind("job.role")} disabled={isEdit}><option value="employee">Employee</option><option value="manager">Manager</option></select></F>
            </Row>
            <label style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}><input type="checkbox" checked={!!p.job.is_md} onChange={e => set("job.is_md", e.target.checked)} /> This person is the Managing Director (the only role that may have no manager)</label>
          </Section>
          <Section title="Employment">
            <Row>
              <F path="job.employment_type" label="Employment type" req><select {...bind("job.employment_type")}>{(meta?.employment_types || []).map(t => <option key={t}>{t}</option>)}</select></F>
              <F path="job.doj" label="Date of joining" req><DateInput {...date("job.doj")} /></F>
              <F path="job.probation_months" label="Probation period (months)" hint={`Maximum ${meta?.probation_max_months || 6} months in the UAE.`}><input {...bind("job.probation_months")} type="number" min="0" max={meta?.probation_max_months || 6} /></F>
              <F path="job.confirmation_date" label="Confirmation date" hint="Worked out from the joining date and probation."><input className="modern-input" style={{ margin: 0, background: "#f8fafc" }} readOnly value={fmtDate(confirmation) || "—"} /></F>
            </Row>
            <Row>
              <F path="job.contract_start" label="Contract start date"><DateInput {...date("job.contract_start")} /></F>
              <F path="job.contract_end" label={`Contract end date${p.job.employment_type === "Fixed-term" ? "" : " (fixed-term only)"}`} req={p.job.employment_type === "Fixed-term"}><DateInput {...date("job.contract_end")} /></F>
              <F path="job.notice_days" label="Notice period (days)" req><input {...bind("job.notice_days")} inputMode="numeric" /></F>
              <F path="job.status" label="Current status" req hint={!p.job.status ? "Left empty it is set automatically (On Probation or Active)." : ""}><select {...bind("job.status")}><option value="">Automatic</option>{(meta?.statuses || []).map(s => <option key={s}>{s}</option>)}</select></F>
            </Row>
            <Row>
              <F path="job.shift" label="Shift"><select {...bind("job.shift")}>{SHIFTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></F>
              <F path="job.hired_via" label="How was the person hired?"><select {...bind("job.hired_via")}><option value="">Select…</option>{(meta?.hired_via || []).map(s => <option key={s}>{s}</option>)}</select></F>
              {p.job.hired_via === "Referral" && <F path="job.referral_ref" label="Referral record" hint="Name or reference of the referral."><input {...bind("job.referral_ref")} /></F>}
            </Row>
            <Row>
              <F path="job.prev_employer" label="Previous employer"><input {...bind("job.prev_employer")} /></F>
              <F path="job.experience_years" label="Total years of experience"><input {...bind("job.experience_years")} inputMode="decimal" /></F>
              <F path="job.education" label="Education"><input {...bind("job.education")} placeholder="e.g. BCom, MBA" /></F>
            </Row>
          </Section>
          {isEdit && <Promotions empId={empId} call={call} list={extra.promotions} onAdded={(entry) => { setExtra(x => ({ ...x, promotions: [...x.promotions, entry] })); set("job.job_title", entry.new_title); }} currentTitle={p.job.job_title} />}
        </div>
      )}

      {tabKey === "docs" && (
        <div>
          <Section title="Passport"><Row>
            <F path="docs.passport.number" label="Passport number"><input {...bind("docs.passport.number")} onChange={e => set("docs.passport.number", e.target.value.toUpperCase())} /></F>
            <F path="docs.passport.issue" label="Issue date"><DateInput {...date("docs.passport.issue")} /></F>
            <F path="docs.passport.expiry" label="Expiry date"><DateInput {...date("docs.passport.expiry")} /></F>
          </Row></Section>
          <Section title="Residence visa"><Row>
            <F path="docs.visa.type" label="Visa type"><select {...bind("docs.visa.type")}><option value="">Select…</option>{(meta?.visa_types || []).map(s => <option key={s}>{s}</option>)}</select></F>
            <F path="docs.visa.file_no" label="File number"><input {...bind("docs.visa.file_no")} /></F>
            <F path="docs.visa.uid_no" label="Unified number"><input {...bind("docs.visa.uid_no")} /></F>
          </Row><Row>
            <F path="docs.visa.issue" label="Issue date"><DateInput {...date("docs.visa.issue")} /></F>
            <F path="docs.visa.expiry" label="Expiry date"><DateInput {...date("docs.visa.expiry")} /></F>
          </Row></Section>
          <Section title="Emirates ID"><Row>
            <F path="docs.eid.number" label="Emirates ID number" hint="15 digits: 784-YYYY-NNNNNNN-N"><input {...bind("docs.eid.number")} placeholder="784-____-_______-_" /></F>
            <F path="docs.eid.expiry" label="Expiry date"><DateInput {...date("docs.eid.expiry")} /></F>
          </Row></Section>
          <Section title="Ministry of Human Resources (MOHRE)"><Row>
            <F path="docs.mohre.labour_card" label="Labour card number"><input {...bind("docs.mohre.labour_card")} /></F>
            <F path="docs.mohre.person_code" label="Person code"><input {...bind("docs.mohre.person_code")} /></F>
            <F path="docs.mohre.contract_no" label="Contract number"><input {...bind("docs.mohre.contract_no")} /></F>
            <F path="docs.mohre.labour_card_expiry" label="Labour card expiry"><DateInput {...date("docs.mohre.labour_card_expiry")} /></F>
          </Row></Section>
          <Section title="Health insurance"><Row>
            <F path="docs.insurance.company" label="Company"><input {...bind("docs.insurance.company")} /></F>
            <F path="docs.insurance.policy_no" label="Policy number"><input {...bind("docs.insurance.policy_no")} /></F>
            <F path="docs.insurance.category" label="Category"><input {...bind("docs.insurance.category")} placeholder="e.g. Basic, Enhanced" /></F>
            <F path="docs.insurance.expiry" label="Expiry date"><DateInput {...date("docs.insurance.expiry")} /></F>
          </Row></Section>
          <Section title="Unemployment insurance (ILOE)"><Row>
            <Field label="Enrolled?"><label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, paddingTop: 8 }}><input type="checkbox" checked={!!p.docs.iloe?.enrolled} onChange={e => set("docs.iloe.enrolled", e.target.checked)} /> Yes, enrolled</label></Field>
            {p.docs.iloe?.enrolled && <F path="docs.iloe.expiry" label="Expiry date"><DateInput {...date("docs.iloe.expiry")} /></F>}
          </Row></Section>
        </div>
      )}

      {tabKey === "salary" && canSalary && (
        <div>
          <div className="small" style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", borderRadius: 8, padding: "7px 10px", marginBottom: 12 }}>🔒 Only Admin and HR can see this section.</div>
          <Section title="Monthly salary">
            <Row>
              <F path="salary.basic" label="Basic salary"><input {...bind("salary.basic")} inputMode="decimal" /></F>
              <F path="salary.housing" label="Housing allowance"><input {...bind("salary.housing")} inputMode="decimal" /></F>
              <F path="salary.transport" label="Transport allowance"><input {...bind("salary.transport")} inputMode="decimal" /></F>
              <F path="salary.other" label="Other allowances"><input {...bind("salary.other")} inputMode="decimal" /></F>
            </Row>
            <Row>
              <F path="salary.total" label="Total (adds up automatically)"><input className="modern-input" readOnly value={`${p.salary.currency || "AED"} ${money(total)}`} style={{ margin: 0, background: "#f8fafc", fontWeight: 800 }} /></F>
              <F path="salary.pay_mode" label="Paid by"><select {...bind("salary.pay_mode")}>{(meta?.pay_modes || []).map(s => <option key={s}>{s}</option>)}</select></F>
              <F path="salary.currency" label="Currency"><select {...bind("salary.currency")}>{(meta?.currencies || ["AED"]).map(s => <option key={s}>{s}</option>)}</select></F>
              <F path="salary.gratuity_start" label="Gratuity counted from" hint="Defaults to the joining date."><DateInput {...date("salary.gratuity_start")} /></F>
            </Row>
          </Section>
          <Section title="Bank details (Wages Protection System)">
            <Row>
              <F path="salary.bank.name" label="Bank name"><input {...bind("salary.bank.name")} /></F>
              <F path="salary.bank.iban" label="IBAN" hint="UAE IBAN: 23 characters, starts with AE."><input {...bind("salary.bank.iban")} onChange={e => set("salary.bank.iban", e.target.value.toUpperCase())} placeholder="AE.. .... .... .... .... ..." /></F>
              <F path="salary.bank.routing" label="Routing code" hint="9 digits."><input {...bind("salary.bank.routing")} inputMode="numeric" /></F>
              <F path="salary.bank.wps_person_id" label="WPS person ID"><input {...bind("salary.bank.wps_person_id")} /></F>
            </Row>
          </Section>
          <Section title="Other pay">
            <Row>
              <Field label="Overtime"><label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, paddingTop: 8 }}><input type="checkbox" checked={!!p.salary.overtime_eligible} onChange={e => set("salary.overtime_eligible", e.target.checked)} /> Eligible for overtime</label></Field>
              <F path="salary.commission" label="Commission / incentive"><input {...bind("salary.commission")} placeholder="e.g. 2% of sales" /></F>
            </Row>
            <Row>
              <F path="salary.air_ticket.amount" label="Yearly air ticket - amount"><input {...bind("salary.air_ticket.amount")} /></F>
              <F path="salary.air_ticket.class" label="Class"><input {...bind("salary.air_ticket.class")} placeholder="Economy" /></F>
              <F path="salary.air_ticket.frequency" label="How often"><input {...bind("salary.air_ticket.frequency")} placeholder="Yearly / every 2 years" /></F>
            </Row>
          </Section>
          {isEdit && <Gratuity empId={empId} call={call} />}
        </div>
      )}

      {tabKey === "leave" && (
        <div>
          <Section title="Leave policy and opening balance">
            <Row>
              <F path="leave.policy" label="Leave policy"><select {...bind("leave.policy")}><option value="">Select…</option>{(meta?.leave_policies || []).map(s => <option key={s}>{s}</option>)}</select></F>
              <F path="leave.opening_annual" label="Annual leave already available (days)" hint="Needed when moving existing staff into the system."><input {...bind("leave.opening_annual")} inputMode="decimal" /></F>
              <F path="leave.opening_sick" label="Sick leave already used (days)"><input {...bind("leave.opening_sick")} inputMode="decimal" /></F>
              <F path="leave.opening_as_of" label="Balances as of"><DateInput {...date("leave.opening_as_of")} /></F>
            </Row>
          </Section>
          <Entitlement empId={isEdit ? empId : null} call={call} />
        </div>
      )}

      {tabKey === "documents" && isEdit && <Documents empId={empId} call={call} />}
      {tabKey === "checklists" && isEdit && <Checklists empId={empId} call={call} />}

      {msg && <div role="status" style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, fontSize: 13, background: msg.type === "ok" ? "#f0fdf4" : "#fef2f2", color: msg.type === "ok" ? "#166534" : "#b91c1c" }}>{msg.text}</div>}
      {Object.keys(warnings).length > 0 && <div style={{ marginTop: 8, fontSize: 12.5, color: "#b45309" }}>{Object.entries(warnings).map(([k, w]) => <div key={k}>⚠ {w}</div>)}</div>}
      {!["documents", "checklists"].includes(tabKey) && (
        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <button type="button" className="btn" disabled={saving} onClick={save}>{saving ? "Saving…" : isEdit ? "Save changes" : "Add employee"}</button>
          {!isEdit && <button type="button" className="btn ghost" disabled={saving} onClick={saveDraft}>Save as draft</button>}
          <button type="button" className="btn ghost" disabled={saving} onClick={() => onCancel && onCancel()}>Cancel</button>
        </div>
      )}
    </div>
    </FormCtx.Provider>
  );
}

function merge(base, extra) {
  const out = { ...base };
  for (const k of Object.keys(extra || {})) {
    const v = extra[k];
    out[k] = v && typeof v === "object" && !Array.isArray(v) && base[k] && typeof base[k] === "object" && !Array.isArray(base[k]) ? merge(base[k], v) : v;
  }
  return out;
}

function Promotions({ empId, call, list, onAdded, currentTitle }) {
  const [f, setF] = useState({ date: todayIso(), new_title: "", new_salary: "" });
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  async function add() {
    setMsg("");
    const r = await call(`/hris/employees/${empId}/promotions`, { method: "POST", body: f });
    if (r.ok) { onAdded(r.data.promotion); setOpen(false); setF({ date: todayIso(), new_title: "", new_salary: "" }); }
    else setMsg(r.data?.message || "Could not record the promotion.");
  }
  return (
    <Section title="Promotion history" right={<button type="button" className="btn ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setOpen(!open)}><TbPlus /> Record promotion</button>}>
      {open && (
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <Row style={{ marginBottom: 8 }}>
            <Field label="Promotion date" req><DateInput value={f.date} onChange={v => setF({ ...f, date: v })} /></Field>
            <Field label={`New job title (now: ${currentTitle || "—"})`} req><input className="modern-input" style={{ margin: 0 }} value={f.new_title} onChange={e => setF({ ...f, new_title: e.target.value })} /></Field>
            <Field label="New salary (optional)"><input className="modern-input" style={{ margin: 0 }} inputMode="decimal" value={f.new_salary} onChange={e => setF({ ...f, new_salary: e.target.value })} /></Field>
          </Row>
          {msg && <div style={{ color: "#b91c1c", fontSize: 12.5, marginBottom: 6 }}>{msg}</div>}
          <button type="button" className="btn" onClick={add}>Save promotion</button>
        </div>
      )}
      {list.length === 0 ? <div className="small" style={{ color: "#94a3b8" }}>No promotions recorded yet.</div> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ textAlign: "left", color: "#64748b" }}><th style={{ padding: 6 }}>Date</th><th>Old job title</th><th>New job title</th><th>New salary</th></tr></thead>
          <tbody>{[...list].reverse().map((x, i) => <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}><td style={{ padding: 6 }}>{fmtDate(x.date)}</td><td>{x.old_title || "—"}</td><td><b>{x.new_title}</b></td><td>{x.new_salary ? money(x.new_salary) : "—"}</td></tr>)}</tbody>
        </table>
      )}
    </Section>
  );
}

function Gratuity({ empId, call }) {
  const [end, setEnd] = useState(todayIso());
  const [r, setR] = useState(null);
  async function run() { const x = await call(`/hris/employees/${empId}/gratuity?end=${end}`); setR(x.ok ? x.data : { error: x.data?.message || "Could not calculate." }); }
  return (
    <Section title="End-of-service gratuity (UAE labour law)">
      <Row style={{ alignItems: "flex-end" }}>
        <Field label="If the last working day is"><DateInput value={end} onChange={setEnd} /></Field>
        <button type="button" className="btn ghost" onClick={run} style={{ marginBottom: 1 }}>Calculate</button>
      </Row>
      <div className="small" style={{ color: "#64748b", marginBottom: 6 }}>Save the salary first. 21 days' basic pay for each of the first 5 years and 30 days for each year after, pro-rated, capped at 2 years' pay.</div>
      {r?.error && <div style={{ color: "#b91c1c", fontSize: 13 }}>{r.error}</div>}
      {r && !r.error && <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 14px", fontSize: 13.5 }}>
        <div>Service: <b>{r.years} years</b> ({fmtDate(r.start)} to {fmtDate(r.end)})</div>
        <div>Gratuity due: <b style={{ fontSize: 16 }}>{r.currency} {money(r.amount)}</b></div>{r.note && <div style={{ color: "#64748b" }}>{r.note}</div>}</div>}
    </Section>
  );
}

function Entitlement({ empId, call }) {
  const [e, setE] = useState(null);
  useEffect(() => { if (empId) call(`/hris/employees/${empId}/leave-entitlement`).then(r => r.ok && setE(r.data)); }, [empId]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Section title="Yearly leave entitlement (UAE labour law)">
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: "#334155", lineHeight: 1.7 }}>
        <li>Annual leave: <b>30 calendar days per year</b>. In the first year, after 6 months of service, <b>2 days for each month</b> worked.</li>
        <li>Sick leave: up to 90 days a year after probation (15 days full pay, 30 days half pay, 45 days unpaid).</li>
        <li>Hajj: one unpaid leave of up to 30 days after 1 year of service.</li>
      </ul>
      {e && <div style={{ marginTop: 10, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 14px", fontSize: 13.5 }}>
        Service so far: <b>{e.service_months} months</b> - entitlement now: <b>{e.annual_days} days</b> <span style={{ color: "#64748b" }}>({e.annual_note})</span>
        <div style={{ color: "#64748b" }}>{e.hajj} Up to {e.carry_forward_max_days} days can be carried to next year.</div></div>}
    </Section>
  );
}

function Documents({ empId, call }) {
  const [list, setList] = useState([]);
  const [kind, setKind] = useState("passport");
  const [expiry, setExpiry] = useState("");
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  const load = useCallback(() => call(`/hris/employees/${empId}/documents`).then(r => r.ok && setList(r.data)), [empId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);
  async function upload() {
    setMsg(null);
    if (!file) return setMsg({ type: "err", text: "Choose a file first." });
    const form = new FormData(); form.append("file", file); form.append("kind", kind); form.append("expiry", expiry);
    setBusy(true);
    const r = await call(`/hris/employees/${empId}/documents`, { method: "POST", form });
    setBusy(false);
    if (r.ok) { setList(r.data); setFile(null); setExpiry(""); if (input.current) input.current.value = ""; setMsg({ type: "ok", text: "Uploaded. Older versions are kept." }); }
    else setMsg({ type: "err", text: r.data?.message || "Upload failed." });
  }
  const needsExpiry = ["passport", "visa", "emirates_id"].includes(kind);
  return (
    <div>
      <Section title="Upload a document">
        <Row style={{ alignItems: "flex-end" }}>
          <Field label="Type"><select className="modern-input" style={{ margin: 0 }} value={kind} onChange={e => setKind(e.target.value)}>{DOC_KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          <Field label="Expiry date" req={needsExpiry}><DateInput value={expiry} onChange={setExpiry} /></Field>
          <Field label="File (PDF or image, up to 10 MB)"><input ref={input} type="file" accept=".pdf,image/*,.doc,.docx" onChange={e => setFile(e.target.files?.[0] || null)} /></Field>
          <button type="button" className="btn" onClick={upload} disabled={busy} style={{ marginBottom: 1 }}><TbUpload /> {busy ? "Uploading…" : "Upload"}</button>
        </Row>
        {msg && <div style={{ fontSize: 13, color: msg.type === "ok" ? "#166534" : "#b91c1c" }}>{msg.text}</div>}
        <div className="small" style={{ color: "#94a3b8" }}>In this trial, uploaded files are not stored - a placeholder is kept with the details.</div>
      </Section>
      <Section title="Documents on file">
        {list.length === 0 ? <div className="small" style={{ color: "#94a3b8" }}>Nothing uploaded yet.</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ textAlign: "left", color: "#64748b" }}><th style={{ padding: 6 }}>Type</th><th>File</th><th>Version</th><th>Expiry</th><th>Uploaded</th></tr></thead>
            <tbody>{list.map(d => (
              <tr key={d._id} style={{ borderTop: "1px solid #f1f5f9", opacity: d.current ? 1 : 0.6 }}>
                <td style={{ padding: 6 }}>{(DOC_KINDS.find(k => k[0] === d.kind) || [0, d.kind])[1]}</td><td>{d.name}</td>
                <td>v{d.version}{d.current ? " (current)" : ""}</td><td>{fmtDate(d.expiry) || "—"}</td><td>{fmtDate(d.uploaded_at)} by {d.uploaded_by}</td></tr>))}</tbody>
          </table>
        )}
      </Section>
    </div>
  );
}

function Checklists({ empId, call }) {
  const [data, setData] = useState({});
  const load = useCallback(async () => {
    const [a, b] = await Promise.all([call(`/hris/employees/${empId}/checklist/onboarding`), call(`/hris/employees/${empId}/checklist/offboarding`)]);
    setData({ onboarding: a.data, offboarding: b.data });
  }, [empId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);
  async function toggle(kind, key, done) {
    const r = await call(`/hris/employees/${empId}/checklist/${kind}`, { method: "PUT", body: { key, done } });
    if (r.ok) setData(d => ({ ...d, [kind]: r.data }));
  }
  const block = (kind, title) => {
    const d = data[kind];
    if (!d) return null;
    const done = d.items.filter(i => i.done).length;
    return (
      <Section title={`${title} - ${done} of ${d.items.length} done`}>
        {d.items.map(i => (
          <label key={i.key} style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13.5, cursor: "pointer" }}>
            <input type="checkbox" checked={i.done} onChange={e => toggle(kind, i.key, e.target.checked)} />
            <span style={{ flex: 1, textDecoration: i.done ? "line-through" : "none", color: i.done ? "#94a3b8" : "#0f172a" }}>{i.label}</span>
            {i.done && <span className="small" style={{ color: "#94a3b8" }}>{i.by} · {fmtDate((i.at || "").slice(0, 10))}</span>}
          </label>
        ))}
        {(d.assets || []).length > 0 && <div style={{ marginTop: 8, fontSize: 13 }}><b>Assets on record</b> (from Manage Assets): {d.assets.map(a => `${a.name} (${a.status})`).join(", ")}</div>}
      </Section>
    );
  };
  return <div>{block("onboarding", "When someone joins")}{block("offboarding", "When someone leaves")}</div>;
}
