import React, { useState, useEffect } from "react";
import {
  TbSchool, TbBook, TbVideo, TbFileText, TbLink,
  TbCircleCheck, TbChevronDown, TbChevronRight, TbLock,
} from "react-icons/tb";
import { SkeletonStats, SkeletonList } from "./Skeleton";

import { API_URL as BASE } from "../api";

const TYPE_ICON = { Video: <TbVideo size={12} />, Document: <TbFileText size={12} />, Article: <TbLink size={12} /> };

const CAT_COLORS = {
  Technical:     { color: "#34a06a", bg: "#f0fdf4" },
  "Soft Skills": { color: "#0f766e", bg: "#effdf8" },
  Compliance:    { color: "#15803d", bg: "#ecfdf5" },
  Leadership:    { color: "#4d7c5f", bg: "#f3f8f4" },
  Product:       { color: "#059669", bg: "#ecfdf5" },
  Other:         { color: "#64748b", bg: "#f8fafc" },
};

function ProgressBar({ pct }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(pct), 100); return () => clearTimeout(t); }, [pct]);
  return (
    <div style={{ height: 7, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${w}%`, background: w >= 100 ? "#16a34a" : "#3b82f6", borderRadius: 99, transition: "width 0.7s cubic-bezier(.4,0,.2,1)" }} />
    </div>
  );
}

export default function EmployeeLMS({ token }) {
  const [courses, setCourses]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [completing, setCompleting] = useState(null);

  const toArr = (d) => Array.isArray(d) ? d : (d?.courses || d?.data || []);

  // Normalize each course's modules/lessons regardless of backend field naming
  const normalizeCourse = (c) => {
    const rawMods = c.modules || c.course_modules || [];
    const modules = (Array.isArray(rawMods) ? rawMods : []).filter(m => m && typeof m === "object").map(m => ({
      title: m.title || m.name || m.module_title || "",
      lessons: (Array.isArray(m.lessons) ? m.lessons : (m.module_lessons || []))
        .filter(l => l && typeof l === "object")
        .map(l => ({
          _id:       l._id || l.id || l.lesson_id,
          title:     l.title || l.name || l.lesson_title || "",
          type:      l.type || l.lesson_type || "Video",
          url:       l.url || l.resource_url || l.link || "",
          completed: l.completed ?? l.is_completed ?? false,
        })),
    }));
    const totalLessons = modules.reduce((s, m) => s + m.lessons.length, 0);
    const doneLessons  = modules.reduce((s, m) => s + m.lessons.filter(l => l.completed).length, 0);
    return {
      ...c,
      modules,
      total_lessons:     c.total_lessons     ?? totalLessons,
      completed_lessons: c.completed_lessons ?? doneLessons,
      percent_complete:  c.percent_complete  ?? (totalLessons ? Math.round(doneLessons / totalLessons * 100) : 0),
    };
  };

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/my/lms/courses`, { headers: { Authorization: `Bearer ${token}` } });
      const data = r.ok ? toArr(await r.json()) : [];
      setCourses(data.filter(c => c && typeof c === "object").map(normalizeCourse));
    } catch { setCourses([]); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function markComplete(courseId, moduleIdx, lessonIdx, lessonId) {
    const key = `${courseId}_${moduleIdx}_${lessonIdx}`;
    setCompleting(key);

    // Optimistic update — reflect immediately in the UI
    setCourses(prev => prev.map(c => {
      if (c._id !== courseId) return c;
      const modules = c.modules.map((m, mi) => {
        if (mi !== moduleIdx) return m;
        return { ...m, lessons: m.lessons.map((l, li) => li === lessonIdx ? { ...l, completed: true } : l) };
      });
      const total = modules.reduce((s, m) => s + m.lessons.length, 0);
      const done  = modules.reduce((s, m) => s + m.lessons.filter(l => l.completed).length, 0);
      return { ...c, modules, completed_lessons: done, percent_complete: total ? Math.round(done / total * 100) : 0 };
    }));

    try {
      await fetch(`${BASE}/my/lms/lessons/${lessonId || "by-index"}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ course_id: courseId, module_index: moduleIdx, lesson_index: lessonIdx, lesson_id: lessonId }),
      });
      // Re-sync from server (keeps optimistic state if server agrees)
      load();
    } catch { /* optimistic state already applied */ } finally { setCompleting(null); }
  }

  if (loading) return <div style={{ marginTop: 16 }}><SkeletonStats count={3} /><div style={{ marginTop: 14 }}><SkeletonList count={3} /></div></div>;

  if (courses.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8", marginTop: 16 }}>
        <TbSchool size={48} style={{ opacity: 0.15, marginBottom: 16 }} />
        <h4 style={{ margin: "0 0 8px", color: "#64748b" }}>No courses assigned yet</h4>
        <p style={{ margin: 0, fontSize: 13 }}>Your admin will assign learning courses to you. Check back soon.</p>
      </div>
    );
  }

  const totalLessons   = courses.reduce((s, c) => s + (c.total_lessons   || 0), 0);
  const doneLessons    = courses.reduce((s, c) => s + (c.completed_lessons || 0), 0);
  const completedCourses = courses.filter(c => (c.percent_complete || 0) >= 100).length;

  return (
    <div style={{ marginTop: 16 }}>
      {/* Summary strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Assigned",  value: courses.length,    color: "#2563eb", bg: "#eff6ff" },
          { label: "Completed", value: completedCourses,  color: "#16a34a", bg: "#f0fdf4" },
          { label: "Lessons Done", value: `${doneLessons}/${totalLessons}`, color: "#7c3aed", bg: "#f5f3ff" },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: "center", padding: "14px 10px", background: s.bg }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500, marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Course list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {courses.map(course => {
          const pct = Math.round(course.percent_complete || 0);
          const cat = CAT_COLORS[course.category] || CAT_COLORS.Other;
          const isOpen = expandedId === course._id;

          return (
            <div key={course._id} className="card" style={{ padding: 0, overflow: "hidden" }}>
              {/* Course header */}
              <div
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", cursor: "pointer", background: isOpen ? "#fafafa" : "#fff" }}
                onClick={() => setExpandedId(isOpen ? null : course._id)}
              >
                <div style={{ width: 44, height: 44, borderRadius: 10, background: cat.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <TbBook size={18} color={cat.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{course.title}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: cat.color, background: cat.bg, padding: "1px 7px", borderRadius: 4 }}>{course.category}</span>
                    {pct >= 100 && <span style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", background: "#f0fdf4", padding: "1px 7px", borderRadius: 4, display: "flex", alignItems: "center", gap: 3 }}><TbCircleCheck size={9} /> Done</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <ProgressBar pct={pct} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#334155", flexShrink: 0 }}>{pct}%</span>
                  </div>
                </div>
                {isOpen ? <TbChevronDown size={13} color="#94a3b8" /> : <TbChevronRight size={13} color="#94a3b8" />}
              </div>

              {/* Expanded modules */}
              {isOpen && (
                <div style={{ borderTop: "1px solid #f1f5f9" }}>
                  {course.modules?.length ? course.modules.map((mod, mi) => (
                    <div key={mi}>
                      <div style={{ padding: "10px 20px", background: "#f8fafc", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {mod.title || `Module ${mi + 1}`}
                      </div>
                      {mod.lessons?.map((ls, li) => {
                        const done = ls.completed;
                        const key  = `${course._id}_${mi}_${li}`;
                        return (
                          <div key={li} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderTop: "1px solid #f8fafc", background: done ? "#fafffe" : "#fff" }}>
                            <span style={{ color: done ? "#16a34a" : "#94a3b8", flexShrink: 0 }}>
                              {done ? <TbCircleCheck size={15} /> : <TbLock size={13} />}
                            </span>
                            <span style={{ color: TYPE_ICON[ls.type] ? "#64748b" : "#94a3b8", flexShrink: 0 }}>
                              {TYPE_ICON[ls.type] || <TbFileText size={12} />}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: done ? 500 : 600, color: done ? "#94a3b8" : "#334155", textDecoration: done ? "line-through" : "none" }}>{ls.title}</div>
                              {ls.url && (
                                <a href={ls.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#3b82f6" }} onClick={e => e.stopPropagation()}>
                                  Open resource ↗
                                </a>
                              )}
                            </div>
                            {done ? (
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", flexShrink: 0 }}>Completed</span>
                            ) : (
                              <button
                                className="btn ghost"
                                style={{ fontSize: 11, padding: "4px 10px", flexShrink: 0 }}
                                disabled={completing === key}
                                onClick={e => { e.stopPropagation(); markComplete(course._id, mi, li, ls._id); }}
                              >
                                {completing === key ? "…" : "Mark Done"}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )) : (
                    <div style={{ padding: "20px", color: "#94a3b8", fontSize: 13, textAlign: "center" }}>No lessons in this course yet.</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
