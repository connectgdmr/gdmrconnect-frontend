import React, { useEffect, useState } from "react";
import { FaFileCsv, FaFilePdf } from "react-icons/fa";
import { SkeletonStats, SkeletonTable } from "./Skeleton";

// Count helper — backend may return arrays of IDs or plain numbers
const cnt = (v) => Array.isArray(v) ? v.length : (Number(v) || 0);

// Only include days up to and including today — future dates haven't happened,
// so showing everyone as "not checked in" for them is misleading.
function visibleDayEntries(summary) {
  const todayStr = new Date().toISOString().slice(0, 10);
  return Object.entries(summary?.days || {})
    .filter(([date]) => date <= todayStr)
    .sort(([a], [b]) => a.localeCompare(b));
}

// Helper function to convert data to CSV format
function convertToCSV(summary) {
    let csv = 'Date,Present,Absent,On Leave (Names),Not Checked-in\n';
    visibleDayEntries(summary).forEach(([date, d]) => {
        const leaveNames = d.leave_names && d.leave_names.length > 0
            ? d.leave_names.join(" | ")
            : "None";
        csv += `${date},${cnt(d.present)},${cnt(d.absent)},"${leaveNames}",${cnt(d.not_checked_in)}\n`;
    });
    return csv;
}

// Helper function to convert data to PDF text
function convertToPDFText(summary, month) {
  let text = `Monthly Attendance Summary: ${month}\n`;
  text += `Total Employees: ${summary.total_employees}\n\n`;
  text += '----------------------------------------------------------\n';
  text += 'Date       | Present | Absent | On Leave | Not Checked-in\n';
  text += '----------------------------------------------------------\n';
  visibleDayEntries(summary).forEach(([date, d]) => {
      text += `${date} | ${String(cnt(d.present)).padEnd(7)} | ${String(cnt(d.absent)).padEnd(6)} | ${String(cnt(d.leave)).padEnd(8)} | ${cnt(d.not_checked_in)}\n`;
  });
  text += '----------------------------------------------------------\n';
  return text;
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
        const pdfText = convertToPDFText(summary, month);
        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write('<pre>');
        printWindow.document.write(pdfText);
        printWindow.document.write('</pre>');
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
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