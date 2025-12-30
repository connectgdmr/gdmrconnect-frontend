import React, { useEffect, useState } from "react";
import { FaFileCsv, FaFilePdf } from "react-icons/fa";

// Helper function to convert data to CSV format
function convertToCSV(summary) {
    let csv = 'Date,Present,Absent,On Leave,Not Checked-in\n';
    Object.entries(summary.days).forEach(([date, d]) => {
        csv += `${date},${d.present.length},${d.absent.length},${d.leave.length},${d.not_checked_in.length}\n`;
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
  Object.entries(summary.days).forEach(([date, d]) => {
      text += `${date} | ${String(d.present.length).padEnd(7)} | ${String(d.absent.length).padEnd(6)} | ${String(d.leave.length).padEnd(8)} | ${d.not_checked_in.length}\n`;
  });
  text += '----------------------------------------------------------\n';
  return text;
}

export default function AdminAttendanceSummary({ token, api }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false); // Change #4

  async function loadSummary() {
    setLoading(true); // Change #4
    try {
        const data = await api.getAttendanceSummary(month, token);
        setSummary(data);
    } catch (error) {
        console.error("Error loading summary");
    } finally {
        setLoading(false); // Change #4
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

  // Change #4: Loading Circle Logic
  if (loading || !summary) {
      return (
          <div className="card loader-container">
              <div className="loader"></div>
          </div>
      );
  }

  return (
    <>
      <div className="card">
        <h3 style={{ color: "#b91c1c" }}>Monthly Attendance Summary</h3>

        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: 10}}>
             {/* Month Selector */}
            <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="input"
                style={{ width: "200px", marginBottom: 0 }}
            />
            
            {/* Change #3: Export Buttons Aligned */}
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
              {Object.entries(summary.days).map(([date, d]) => (
                <tr key={date}>
                  <td>{date}</td>
                  <td>{d.present.length}</td>
                  <td>{d.absent.length}</td>
                  <td>{d.leave.length}</td>
                  <td>{d.not_checked_in.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}