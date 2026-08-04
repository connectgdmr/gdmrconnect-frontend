import React from "react";
import { HOLIDAYS as holidays } from "../data/holidays";

export default function HolidayCalendar() {
  return (
    <div className="card" style={{ padding: 0, border: "none", boxShadow: "none" }}>
      <div style={{ padding: "20px", borderBottom: "1px solid #f0f0f0" }}>
        <h3 style={{ color: "var(--brand)", margin: 0 }}>Holiday Calendar 2026</h3>
      </div>
      
      <div style={{ overflowX: "auto" }}>
        <table className="styled-table">
          <thead>
            <tr>
              <th>SL No</th>
              <th>Date</th>
              <th>Day</th>
              <th>Holiday</th>
            </tr>
          </thead>
          <tbody>
            {holidays.map((h) => (
              <tr key={h.id}>
                <td style={{ textAlign: "center", width: "80px" }}>{h.id}</td>
                <td style={{ fontWeight: 500 }}>{h.date}</td>
                <td>{h.day}</td>
                <td style={{ color: "var(--brand)", fontWeight: 600 }}>{h.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
