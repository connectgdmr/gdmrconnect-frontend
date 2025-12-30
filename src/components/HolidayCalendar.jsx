import React from "react";

const holidays = [
  { id: 1, date: "January 1", day: "Thursday", name: "New Year" },
  { id: 2, date: "January 26", day: "Monday", name: "Republic Day" },
  { id: 3, date: "February 15", day: "Sunday", name: "Shivaratri" },
  { id: 4, date: "March 4", day: "Wednesday", name: "Holi" },
  { id: 5, date: "March 21", day: "Saturday", name: "Eid-ul-Fitr" },
  { id: 6, date: "April 3", day: "Friday", name: "Good Friday" },
  { id: 7, date: "April 5", day: "Sunday", name: "Easter" },
  { id: 8, date: "May 1", day: "Friday", name: "Labour Day" },
  { id: 9, date: "May 27", day: "Wednesday", name: "Bakrid" },
  { id: 10, date: "June 26", day: "Friday", name: "Muharram" },
  { id: 11, date: "August 15", day: "Saturday", name: "Independence Day" },
  { id: 12, date: "August 26", day: "Wednesday", name: "Thiruvonam" },
  { id: 13, date: "September 4", day: "Friday", name: "Janmashtami" },
  { id: 14, date: "October 2", day: "Friday", name: "Gandhi Jayanti" },
  { id: 15, date: "October 20", day: "Tuesday", name: "Vijayadashami" },
  { id: 16, date: "November 8", day: "Sunday", name: "Diwali" },
  { id: 17, date: "December 25", day: "Friday", name: "Christmas" },
];

export default function HolidayCalendar() {
  return (
    <div className="card" style={{ padding: 0, border: "none", boxShadow: "none" }}>
      <div style={{ padding: "20px", borderBottom: "1px solid #f0f0f0" }}>
        <h3 style={{ color: "#b91c1c", margin: 0 }}>Holiday Calendar 2026</h3>
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
                <td style={{ color: "#b91c1c", fontWeight: 600 }}>{h.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
