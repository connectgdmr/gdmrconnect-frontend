import React, { useState, useEffect } from "react";
import api from "../api"; 
import { 
    FaTrash, 
    FaUserShield, 
    FaSearch, 
    FaFilter, 
    FaUserTie, 
    FaUser,
    FaEdit
} from "react-icons/fa";

// Department list for the Edit Modal
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

export default function EmployeeList({ employees, onDelete, onRefresh, onPromote }) {
    // ============================================================================
    // STATE MANAGEMENT
    // ============================================================================
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("All");

    // Modal States
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [managers, setManagers] = useState([]);

    // ============================================================================
    // EFFECTS & API CALLS
    // ============================================================================
    // Load managers for the dropdown in the edit modal
    useEffect(() => {
        if (showEditModal) {
            const token = localStorage.getItem("token");
            api.getManagers(token).then(setManagers).catch(console.error);
        }
    }, [showEditModal]);

    // ============================================================================
    // HANDLERS (EDIT & DELETE)
    // ============================================================================
    const handleDeleteClick = (id) => {
        setSelectedId(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = () => {
        onDelete(selectedId);
        setShowDeleteModal(false);
        setSelectedId(null);
    };

    const handleEditClick = (employee) => {
        setEditingEmployee({ ...employee });
        setShowEditModal(true);
    };

    const handleEditSave = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        try {
            await api.editEmployee(editingEmployee._id, editingEmployee, token);
            alert("Employee updated successfully! Refreshing data...");
            
            if (onRefresh) {
                onRefresh(); 
            }
            setShowEditModal(false);
            setEditingEmployee(null);
        } catch (err) {
            alert("Error updating employee profile.");
        }
    };

    // ============================================================================
    // FILTERING LOGIC
    // ============================================================================
    const filteredEmployees = employees.filter((emp) => {
        const matchesSearch = 
            (emp.name && emp.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (emp.department && emp.department.toLowerCase().includes(searchTerm.toLowerCase()));
            
        const matchesRole = roleFilter === "All" || emp.role === roleFilter;
        
        return matchesSearch && matchesRole;
    });

    if (!employees) return <div className="loader-container"><div className="loader"></div></div>;

    // ============================================================================
    // RENDER
    // ============================================================================
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
                    margin-top: 6px;
                }
                .role-manager { background: #e0e7ff; color: #4f46e5; border: 1px solid #c7d2fe; }
                .role-employee { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }

                /* Action Buttons - UPDATED TO SQUARED ICON-ONLY BUTTONS */
                .action-btn-group {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    flex-wrap: wrap;
                }
                .btn-action {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 34px;      /* Fixed width for square icon button */
                    height: 34px;     /* Fixed height for square icon button */
                    border-radius: 6px;
                    font-size: 15px;  /* Icon size */
                    border: none;
                    cursor: pointer;
                    transition: opacity 0.2s, transform 0.1s;
                }
                .btn-action:active { transform: scale(0.95); }
                .btn-action:hover { opacity: 0.8; }
                
                .btn-edit { background: #f59e0b; color: white; }
                .btn-promote { background: #10b981; color: white; }
                .btn-remove { background: #ef4444; color: white; }

                /* Modal Specific Styles */
                .modal-overlay {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.6); z-index: 4000;
                    display: flex; justify-content: center; align-items: center;
                }
                .modal-box {
                    background: white; border-radius: 12px; padding: 25px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                    width: 450px; max-width: 90%;
                }
                .modern-input {
                    width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; 
                    border-radius: 6px; font-size: 14px; margin-top: 5px;
                }
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
                            <th>Role & Position</th>
                            <th>Manager Auth</th>
                            <th>Administrative Action</th>
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
                                        <div style={{ fontWeight: 600, color: '#334155', fontSize: '14px' }}>
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

                                    {/* Column 4: Administrative Actions (ICON-ONLY) */}
                                    <td>
                                        <div className="action-btn-group">
                                            {/* Edit Button */}
                                            <button 
                                                className="btn-action btn-edit"
                                                onClick={() => handleEditClick(emp)}
                                                title="Edit employee details"
                                            >
                                                <FaEdit />
                                            </button>

                                            {/* Promote Button (Only for standard employees) */}
                                            {emp.role === "employee" && (
                                                <button 
                                                    className="btn-action btn-promote"
                                                    onClick={() => onPromote(emp._id)}
                                                    title="Promote to Manager"
                                                >
                                                    <FaUserShield />
                                                </button>
                                            )}
                                            
                                            {/* Remove Button */}
                                            <button 
                                                className="btn-action btn-remove"
                                                onClick={() => handleDeleteClick(emp._id)}
                                                title="Permanently remove user"
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ============================================================================ */}
            {/* RESTORED MODALS (DELETE AND EDIT) */}
            {/* ============================================================================ */}
            
            {/* DELETE CONFIRMATION MODAL */}
            {showDeleteModal && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()} style={{textAlign: 'center'}}>
                        <FaTrash size={40} color="#dc2626" style={{marginBottom: 15}}/>
                        <h3 style={{marginTop: 0, color: '#0f172a'}}>Delete Employee?</h3>
                        <p style={{color: '#64748b'}}>This action cannot be undone and will erase all their historical attendance data.</p>
                        <div style={{display: 'flex', gap: 15, justifyContent: 'center', marginTop: 25}}>
                            <button className="btn" style={{background: '#dc2626'}} onClick={confirmDelete}>Yes, Delete Permanently</button>
                            <button className="btn ghost" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT EMPLOYEE MODAL */}
            {showEditModal && editingEmployee && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <h3 style={{color: "var(--red)", marginTop: 0, borderBottom: '1px solid #e2e8f0', paddingBottom: 10}}>
                            Edit Employee Profile
                        </h3>
                        <form onSubmit={handleEditSave}>
                            <div style={{textAlign: "left", marginBottom: 15}}>
                                <label style={{fontWeight: 600, color: '#334155', fontSize: 13}}>Full Name</label>
                                <input 
                                    className="modern-input" 
                                    value={editingEmployee.name} 
                                    onChange={e => setEditingEmployee({...editingEmployee, name: e.target.value})} 
                                    required 
                                />
                            </div>
                            
                            <div style={{textAlign: "left", marginBottom: 15}}>
                                <label style={{fontWeight: 600, color: '#334155', fontSize: 13}}>Email Address</label>
                                <input 
                                    className="modern-input" 
                                    type="email" 
                                    value={editingEmployee.email} 
                                    onChange={e => setEditingEmployee({...editingEmployee, email: e.target.value})} 
                                    required 
                                />
                            </div>
                            
                            <div style={{textAlign: "left", marginBottom: 15}}>
                                <label style={{fontWeight: 600, color: '#334155', fontSize: 13}}>Department</label>
                                <select 
                                    className="modern-input" 
                                    value={editingEmployee.department} 
                                    onChange={e => setEditingEmployee({...editingEmployee, department: e.target.value})}
                                >
                                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            
                            <div style={{textAlign: "left", marginBottom: 15}}>
                                <label style={{fontWeight: 600, color: '#334155', fontSize: 13}}>Position Title</label>
                                <input 
                                    className="modern-input" 
                                    value={editingEmployee.position} 
                                    onChange={e => setEditingEmployee({...editingEmployee, position: e.target.value})} 
                                />
                            </div>
                            
                            <div style={{textAlign: "left", marginBottom: 25}}>
                                <label style={{fontWeight: 600, color: '#334155', fontSize: 13}}>Assigned Manager</label>
                                <select 
                                    className="modern-input" 
                                    value={editingEmployee.manager_id || ""} 
                                    onChange={e => setEditingEmployee({...editingEmployee, manager_id: e.target.value || null})}
                                >
                                    <option value="">No Manager / Self-Managed</option>
                                    {managers.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                                </select>
                            </div>
                            
                            <div style={{display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: 15}}>
                                <button className="btn" type="submit" style={{background: '#10b981'}}>Save Changes</button>
                                <button className="btn ghost" type="button" onClick={() => setShowEditModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}