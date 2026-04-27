import React, { useState } from "react";
import { 
    FaTrash, 
    FaUserShield, 
    FaSearch, 
    FaFilter, 
    FaUserTie, 
    FaUser 
} from "react-icons/fa";

export default function EmployeeList({ employees, onDelete, onRefresh, onPromote }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("All");

    // Filter logic for Search and Role dropdown
    const filteredEmployees = employees.filter((emp) => {
        const matchesSearch = 
            (emp.name && emp.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (emp.department && emp.department.toLowerCase().includes(searchTerm.toLowerCase()));
            
        const matchesRole = roleFilter === "All" || emp.role === roleFilter;
        
        return matchesSearch && matchesRole;
    });

    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <style>{`
                .list-header {
                    padding: 20px;
                    border-bottom: 1px solid #e2e8f0;
                    background: #f8fafc;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 15px;
                }
                .search-bar {
                    display: flex;
                    align-items: center;
                    background: #fff;
                    border: 1px solid #cbd5e1;
                    border-radius: 6px;
                    padding: 0 10px;
                    flex: 1;
                    min-width: 250px;
                }
                .search-bar input {
                    border: none;
                    outline: none;
                    padding: 10px;
                    width: 100%;
                    font-size: 14px;
                }
                .filter-select {
                    padding: 10px 15px;
                    border: 1px solid #cbd5e1;
                    border-radius: 6px;
                    background: #fff;
                    font-size: 14px;
                    outline: none;
                    cursor: pointer;
                }
                
                /* Table Styles */
                .styled-table-global { 
                    width: 100%; 
                    border-collapse: collapse; 
                    font-size: 14px; 
                }
                .styled-table-global th { 
                    background-color: #fff; 
                    color: #475569; 
                    font-weight: 600; 
                    text-align: left; 
                    padding: 15px 20px;
                    border-bottom: 2px solid #e2e8f0; 
                }
                .styled-table-global td { 
                    padding: 15px 20px; 
                    border-bottom: 1px solid #f1f5f9; 
                    vertical-align: middle; 
                }
                .styled-table-global tr:hover {
                    background-color: #f8fafc;
                }

                /* Badges & Text */
                .emp-name { font-weight: 700; color: #0f172a; font-size: 15px; }
                .emp-email { color: #64748b; font-size: 12px; margin-top: 4px; }
                .role-badge { 
                    display: inline-flex; 
                    align-items: center; 
                    gap: 5px; 
                    padding: 5px 10px; 
                    border-radius: 20px; 
                    font-size: 11px; 
                    font-weight: 700; 
                    text-transform: uppercase; 
                }
                .role-manager { background: #e0e7ff; color: #4f46e5; border: 1px solid #c7d2fe; }
                .role-employee { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }

                /* Action Buttons */
                .btn-action {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    padding: 6px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 600;
                    border: none;
                    cursor: pointer;
                    transition: opacity 0.2s;
                    margin-right: 8px;
                }
                .btn-action:hover { opacity: 0.8; }
                .btn-promote { background: #10b981; color: white; }
                .btn-delete { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
            `}</style>

            {/* HEADER: Search & Filters */}
            <div className="list-header">
                <div className="search-bar">
                    <FaSearch color="#94a3b8" />
                    <input 
                        type="text" 
                        placeholder="Search by name, email, or department..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FaFilter color="#94a3b8" />
                    <select 
                        className="filter-select"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                    >
                        <option value="All">All Roles</option>
                        <option value="employee">Employees Only</option>
                        <option value="manager">Managers Only</option>
                    </select>
                </div>
            </div>

            {/* DATA TABLE */}
            <div style={{ overflowX: 'auto' }}>
                <table className="styled-table-global">
                    <thead>
                        <tr>
                            <th>Employee Details</th>
                            <th>Department & Role</th>
                            <th>Direct Manager</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEmployees.length === 0 ? (
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                    No employees found matching your criteria.
                                </td>
                            </tr>
                        ) : (
                            filteredEmployees.map((emp) => (
                                <tr key={emp._id}>
                                    {/* Column 1: Identity */}
                                    <td>
                                        <div className="emp-name">{emp.name}</div>
                                        <div className="emp-email">{emp.email}</div>
                                    </td>

                                    {/* Column 2: Department & Role Badge */}
                                    <td>
                                        <div style={{ fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            {emp.department || "No Department"}
                                        </div>
                                        <span className={`role-badge ${emp.role === 'manager' ? 'role-manager' : 'role-employee'}`}>
                                            {emp.role === 'manager' ? <FaUserTie /> : <FaUser />} 
                                            {emp.role}
                                        </span>
                                    </td>

                                    {/* Column 3: Manager Reference */}
                                    <td>
                                        {emp.role === 'manager' ? (
                                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>Department Head</span>
                                        ) : (
                                            <span style={{ color: '#475569', fontSize: '14px', fontWeight: 500 }}>
                                                {emp.manager_name || "Unassigned"}
                                            </span>
                                        )}
                                    </td>

                                    {/* Column 4: Administrative Actions */}
                                    <td>
                                        {/* Only show "Promote to Manager" if the user is currently a standard employee */}
                                        {emp.role === "employee" && (
                                            <button 
                                                className="btn-action btn-promote"
                                                onClick={() => onPromote(emp._id)}
                                                title="Promote this user to Department Manager"
                                            >
                                                <FaUserShield /> Promote
                                            </button>
                                        )}
                                        
                                        <button 
                                            className="btn-action btn-delete"
                                            onClick={() => onDelete(emp._id)}
                                            title="Permanently remove user"
                                        >
                                            <FaTrash /> Remove
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}