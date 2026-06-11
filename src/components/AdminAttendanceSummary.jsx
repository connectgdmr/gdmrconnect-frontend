import React, { useEffect, useState } from "react";
import { FaFileCsv, FaFilePdf } from "react-icons/fa";
import { SkeletonStats, SkeletonTable } from "./Skeleton";

// Count helper — backend may return arrays of IDs or plain numbers
const cnt = (v) => Array.isArray(v) ? v.length : (Number(v) || 0);

// Extract employee names for a category. Resolves, in order:
//  1) an explicit "<key>_names" array from the backend
//  2) objects in the array that already carry a name
//  3) plain employee-ID strings mapped via idMap (id -> name)
function getNames(d, key, idMap = {}) {
  const named = d[`${key}_names`];
  if (Array.isArray(named) && named.length) return named.filter(Boolean);
  const arr = d[key];
  if (Array.isArray(arr)) {
    return arr.map(x => {
      if (x && typeof x === "object") return x.name || x.employee_name || x.full_name || idMap[String(x._id || x.id)] || "";
      return idMap[String(x)] || "";
    }).filter(Boolean);
  }
  return [];
}
const nameList = (d, key, idMap) => { const n = getNames(d, key, idMap); return n.length ? n.join(" | ") : "—"; };

// Only include days up to and including today — future dates haven't happened.
function visibleDayEntries(summary) {
  const todayStr = new Date().toISOString().slice(0, 10);
  return Object.entries(summary?.days || {})
    .filter(([date]) => date <= todayStr)
    .sort(([a], [b]) => a.localeCompare(b));
}

// CSV — counts + names for every category
function convertToCSV(summary, idMap) {
    let csv = 'Date,Present,Present (Names),Absent,Absent (Names),On Leave,On Leave (Names),Not Checked-in,Not Checked-in (Names)\n';
    visibleDayEntries(summary).forEach(([date, d]) => {
        const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
        csv += [
            date,
            cnt(d.present),        q(nameList(d, "present", idMap)),
            cnt(d.absent),         q(nameList(d, "absent", idMap)),
            cnt(d.leave),          q(nameList(d, "leave", idMap)),
            cnt(d.not_checked_in), q(nameList(d, "not_checked_in", idMap)),
        ].join(",") + "\n";
    });
    return csv;
}

// PDF — detailed, multi-page report with full names per category per day
function buildPDFHtml(summary, month, idMap = {}) {
  const days = visibleDayEntries(summary);
  const fmtDate = (iso) => { try { return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); } catch { return iso; } };

  // Month-wide totals for the cover summary
  const totals = days.reduce((a, [, d]) => ({
    present: a.present + cnt(d.present), absent: a.absent + cnt(d.absent),
    leave: a.leave + cnt(d.leave), nci: a.nci + cnt(d.not_checked_in),
  }), { present: 0, absent: 0, leave: 0, nci: 0 });

  // Overview table (counts per day)
  const overviewRows = days.map(([date, d]) => `<tr>
      <td style="padding:7px 10px;border-bottom:1px solid #eef1f5;font-weight:600">${date}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #eef1f5;color:#16a34a;font-weight:700">${cnt(d.present)}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #eef1f5;color:#dc2626;font-weight:700">${cnt(d.absent)}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #eef1f5;color:#d97706;font-weight:700">${cnt(d.leave)}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #eef1f5;color:#64748b;font-weight:700">${cnt(d.not_checked_in)}</td>
    </tr>`).join("");

  // A category block listing every name (numbered)
  const catBlock = (d, key, title, color, bg) => {
    const names = getNames(d, key, idMap);
    const list = names.length
      ? `<ol style="margin:0;padding-left:20px;font-size:12px;color:#334155;line-height:1.8">${names.map(n => `<li>${n}</li>`).join("")}</ol>`
      : `<div style="font-size:12px;color:#94a3b8;font-style:italic">No one in this category.</div>`;
    return `<div style="flex:1;min-width:200px;border:1px solid #eef1f5;border-radius:8px;overflow:hidden">
        <div style="background:${bg};padding:8px 12px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #eef1f5">
          <span style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:${color}">${title}</span>
          <span style="font-size:14px;font-weight:800;color:${color}">${cnt(d[key])}</span>
        </div>
        <div style="padding:10px 12px">${list}</div>
      </div>`;
  };

  // Detailed per-day pages
  const detailPages = days.map(([date, d]) => `
    <div style="page-break-inside:avoid;margin-bottom:26px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div style="width:6px;height:22px;background:#34a06a;border-radius:3px"></div>
        <h3 style="margin:0;font-size:15px;color:#0f172a">${fmtDate(date)}</h3>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:12px">
        ${catBlock(d, "present", "Present", "#16a34a", "#f0fdf4")}
        ${catBlock(d, "leave", "On Leave", "#d97706", "#fffbeb")}
        ${catBlock(d, "absent", "Absent", "#dc2626", "#fef2f2")}
        ${catBlock(d, "not_checked_in", "Not Checked-in", "#64748b", "#f1f5f9")}
      </div>
    </div>`).join("");

  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return `<html><head><title>Attendance Report ${month}</title>
    <style>@media print { @page { margin: 14mm; } } body{font-family:Arial,sans-serif;color:#0f172a;margin:0}</style></head>
    <body>
      <!-- Cover / summary -->
      <div style="padding:40px 48px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #34a06a;padding-bottom:16px;margin-bottom:22px">
          <div>
            <h1 style="color:#34a06a;margin:0;font-size:24px">GDMR Connect</h1>
            <div style="font-size:15px;font-weight:700;margin-top:4px">Monthly Attendance Report</div>
          </div>
          <div style="text-align:right;font-size:12px;color:#64748b">
            <div><b>Period:</b> ${month}</div>
            <div><b>Total Employees:</b> ${summary.total_employees ?? "—"}</div>
            <div><b>Generated:</b> ${today}</div>
          </div>
        </div>

        <div style="display:flex;gap:12px;margin-bottom:24px">
          ${[["Total Present", totals.present, "#16a34a", "#f0fdf4"], ["Total On Leave", totals.leave, "#d97706", "#fffbeb"], ["Total Absent", totals.absent, "#dc2626", "#fef2f2"], ["Not Checked-in", totals.nci, "#64748b", "#f1f5f9"]]
            .map(([l, v, c, b]) => `<div style="flex:1;background:${b};border-radius:10px;padding:14px 16px;text-align:center"><div style="font-size:24px;font-weight:800;color:${c}">${v}</div><div style="font-size:11px;color:#64748b;margin-top:3px">${l}</div></div>`).join("")}
        </div>

        <h3 style="margin:0 0 10px;font-size:14px;color:#334155">Daily Overview</h3>
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px">
          <thead><tr>${["Date","Present","Absent","On Leave","Not Checked-in"].map(h => `<th style="text-align:left;padding:8px 10px;border-bottom:2px solid #34a06a;font-size:10.5px;text-transform:uppercase;color:#475569">${h}</th>`).join("")}</tr></thead>
          <tbody>${overviewRows}</tbody>
        </table>
      </div>

      <!-- Detailed breakdown (new page) -->
      <div style="padding:40px 48px;page-break-before:always">
        <h2 style="color:#34a06a;margin:0 0 4px;font-size:18px">Detailed Daily Breakdown</h2>
        <div style="color:#64748b;font-size:12px;margin-bottom:20px">Every employee grouped by their status, day by day.</div>
        ${detailPages}
      </div>
    </body></html>`;
}

export default function AdminAttendanceSummary({ token, api }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [idMap, setIdMap] = useState({});   // employee _id -> name

  async function loadSummary() {
    setLoading(true);
    try {
        const data = await api.getAttendanceSummary(month, token);
        setSummary(data);
    } catch (error) {
        console.error("Error loading summary");
    } finally {
        setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
  }, [month]);

  // Load the employee roster once so we can resolve category ID arrays to names
  useEffect(() => {
    api.listEmployees(token)
      .then(list => {
        const m = {};
        (Array.isArray(list) ? list : list?.employees || []).forEach(e => { if (e?._id) m[String(e._id)] = e.name; });
        setIdMap(m);
      })
      .catch(() => {});
  }, [token]);
  
  function handleExport(format) {
    if (!summary) return;
    if (format === 'csv') {
        const csvData = convertToCSV(summary, idMap);
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Attendance_Summary_${month}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else if (format === 'pdf') {
        const printWindow = window.open('', '', 'height=700,width=900');
        if (!printWindow) return;
        printWindow.document.write(buildPDFHtml(summary, month, idMap));
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 300);
    }
  }

  if (loading || !summary) {
      return (
          <div style={{ marginTop: 16 }}>
              <SkeletonStats count={4} />
              <div style={{ marginTop: 14 }}><SkeletonTable rows={6} cols={5} /></div>
          </div>
      );
  }

  return (
    <>
      <div className="card">
        <h3 style={{ color: "var(--brand)" }}>Monthly Attendance Summary</h3>

        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: 10}}>
             {/* Month Selector */}
            <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="input"
                style={{ width: "200px", marginBottom: 0 }}
            />
            
            {/* Export Buttons */}
            <div className="export-buttons">
                <button 
                    className="btn ghost" 
                    onClick={() => handleExport('csv')}
                    style={{padding: '8px 12px', display:'flex', alignItems:'center', gap: 5}}
                >
                    <FaFileCsv /> CSV
                </button>
                 <button 
                    className="btn" 
                    onClick={() => handleExport('pdf')}
                    style={{padding: '8px 12px', display:'flex', alignItems:'center', gap: 5}}
                >
                    <FaFilePdf /> PDF
                </button>
            </div>
        </div>

        <h4>Total Employees: {summary.total_employees}</h4>

        <div className="table-container">
          <table className="styled-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Present</th>
                <th>Absent</th>
                <th>On Leave</th>
                <th>Not Checked-in</th>
              </tr>
            </thead>
            <tbody>
              {visibleDayEntries(summary).length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>No attendance data for this month yet.</td></tr>
              ) : visibleDayEntries(summary).map(([date, d]) => (
                <tr key={date}>
                  <td>{date}</td>
                  <td>{cnt(d.present)}</td>
                  <td>{cnt(d.absent)}</td>
                  {/* Table displays count to keep UI clean; names are in CSV export */}
                  <td>{cnt(d.leave)}</td>
                  <td>{cnt(d.not_checked_in)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}