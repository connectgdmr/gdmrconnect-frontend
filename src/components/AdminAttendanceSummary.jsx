import React, { useEffect, useState } from "react";
import { FaFileCsv, FaFilePdf } from "react-icons/fa";
import { SkeletonStats, SkeletonTable } from "./Skeleton";

// Count helper — backend may return arrays of IDs or plain numbers
const cnt = (v) => Array.isArray(v) ? v.length : (Number(v) || 0);

// Extract employee names for a category. Prefers an explicit "<key>_names"
// array from the backend; otherwise pulls .name from object arrays.
function getNames(d, key) {
  const named = d[`${key}_names`];
  if (Array.isArray(named) && named.length) return named.filter(Boolean);
  const arr = d[key];
  if (Array.isArray(arr)) {
    return arr.map(x => (x && typeof x === "object" ? (x.name || x.employee_name || x.full_name || "") : "")).filter(Boolean);
  }
  return [];
}
const nameList = (d, key) => { const n = getNames(d, key); return n.length ? n.join(" | ") : "—"; };

// Only include days up to and including today — future dates haven't happened.
function visibleDayEntries(summary) {
  const todayStr = new Date().toISOString().slice(0, 10);
  return Object.entries(summary?.days || {})
    .filter(([date]) => date <= todayStr)
    .sort(([a], [b]) => a.localeCompare(b));
}

// CSV — counts + names for On Leave, Absent and Not Checked-in
function convertToCSV(summary) {
    let csv = 'Date,Present,Absent,Absent (Names),On Leave,On Leave (Names),Not Checked-in,Not Checked-in (Names)\n';
    visibleDayEntries(summary).forEach(([date, d]) => {
        const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
        csv += [date, cnt(d.present), cnt(d.absent), q(nameList(d, "absent")), cnt(d.leave), q(nameList(d, "leave")), cnt(d.not_checked_in), q(nameList(d, "not_checked_in"))].join(",") + "\n";
    });
    return csv;
}

// PDF — clean HTML table with name lists per category
function buildPDFHtml(summary, month) {
  const rows = visibleDayEntries(summary).map(([date, d]) => {
    const cell = (count, key, color) => `<td style="padding:8px 10px;border-bottom:1px solid #eef1f5;vertical-align:top">
        <div style="font-weight:700;color:${color}">${count}</div>
        <div style="font-size:10px;color:#64748b;line-height:1.5;margin-top:2px">${getNames(d, key).join("<br>") || "—"}</div></td>`;
    return `<tr>
      <td style="padding:8px 10px;border-bottom:1px solid #eef1f5;font-weight:600;white-space:nowrap;vertical-align:top">${date}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eef1f5;font-weight:700;color:#16a34a;vertical-align:top">${cnt(d.present)}</td>
      ${cell(cnt(d.absent), "absent", "#dc2626")}
      ${cell(cnt(d.leave), "leave", "#d97706")}
      ${cell(cnt(d.not_checked_in), "not_checked_in", "#64748b")}
    </tr>`;
  }).join("");
  return `<html><head><title>Attendance Summary ${month}</title></head>
    <body style="font-family:Arial,sans-serif;padding:32px;color:#0f172a">
      <h2 style="color:#34a06a;margin:0">GDMR Connect — Monthly Attendance Summary</h2>
      <div style="color:#64748b;margin:4px 0 18px">${month} · Total Employees: ${summary.total_employees ?? "—"}</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr>${["Date","Present","Absent","On Leave","Not Checked-in"].map(h => `<th style="text-align:left;padding:8px 10px;border-bottom:2px solid #34a06a;font-size:11px;text-transform:uppercase;color:#475569">${h}</th>`).join("")}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`;
}

export default function AdminAttendanceSummary({ token, api }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadSummary() {
    setLoading(true);
    try {
        // This calls the updated backend endpoint which now returns 'leave_names'
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
  
  function handleExport(format) {
    if (!summary) return;
    if (format === 'csv') {
        const csvData = convertToCSV(summary);
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
        printWindow.document.write(buildPDFHtml(summary, month));
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