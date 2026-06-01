import React, { useEffect, useState } from "react";
import { FaPlus, FaTrash, FaUserCog } from "react-icons/fa";
import styles from "./pm.module.css";
import Avatar from "./Avatar";
import { pm } from "./pmApi";
import toast from "../Toaster/toast";

// Project team manager. Lists current members with their
// per-project role + workload counters, and offers an
// "Add member" picker that pulls every user in the tenant.
//
// Role legend on a project:
//   Owner    - full control, including team management
//   Manager  - assign tasks, manage tags, override workload
//   Member   - work on their own tasks
//   Viewer   - read-only
const ROLES = ["Owner", "Manager", "Member", "Viewer"];

export default function TeamPanel({ projectId, canEdit, onChanged }) {
  const [summary, setSummary] = useState({ members: [] });
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [allUsers, setAllUsers] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const s = await pm.getTeamSummary(projectId);
      setSummary(s);
    } catch (err) {
      toast.error(err.message || "Failed to load team");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (projectId) load(); /* eslint-disable-next-line */ }, [projectId]);

  const openPicker = async () => {
    setPickerOpen(true);
    if (allUsers.length === 0) {
      try {
        const users = await pm.listUsers();
        setAllUsers(Array.isArray(users) ? users : (users.users || []));
      } catch (err) {
        toast.error(err.message || "Failed to load users");
      }
    }
  };

  const add = async (user, role = "Member") => {
    try {
      await pm.addMember(projectId, { user: user._id, role });
      toast.success(`${user.name} added to project`);
      setPickerOpen(false);
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err.message || "Failed to add member");
    }
  };

  const changeRole = async (memberId, role) => {
    try {
      await pm.updateMember(projectId, memberId, { role });
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err.message || "Failed to update role");
    }
  };

  const remove = async (memberId, name) => {
    if (!window.confirm(`Remove ${name || "this member"} from the project?`)) return;
    try {
      await pm.removeMember(projectId, memberId);
      toast.success("Member removed");
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err.message || "Failed to remove");
    }
  };

  const updateCapacity = async (member) => {
    const next = window.prompt(`New daily capacity for ${member.user.name} (hours/day):`, member.user.dailyCapacityHours);
    if (next === null) return;
    const v = Number(next);
    if (Number.isNaN(v) || v < 0 || v > 24) {
      toast.error("Capacity must be a number between 0 and 24.");
      return;
    }
    try {
      await pm.updateCapacity(member.user._id, v);
      toast.success("Capacity updated");
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err.message || "Failed to update capacity");
    }
  };

  const memberIds = new Set(summary.members.map((m) => String(m.user._id)));
  const candidates = allUsers.filter((u) => !memberIds.has(String(u._id)));

  return (
    <div>
      <div className={styles.toolbarSingle}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <strong style={{ fontSize: 14 }}>Team members</strong>
          <span className={styles.kpiLabel}>({summary.members.length})</span>
        </div>
        {canEdit && (
          <div className={styles.popoverAnchor}>
            <button className={styles.primaryBtn} onClick={openPicker}>
              <FaPlus /> Add member
            </button>
            {pickerOpen && (
              <div className={`${styles.popover} ${styles.right}`}>
                {candidates.length === 0 && (
                  <div className={styles.popoverEmpty}>
                    Every user is already on this project.
                  </div>
                )}
                {candidates.map((u) => (
                  <div key={u._id} className={styles.popoverItem} onClick={() => add(u)}>
                    <Avatar size="sm" user={u} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</div>
                      <div className={styles.memberMeta}>{u.email}</div>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.sectionCard}>
        {loading && <div className={styles.emptyState}>Loading team…</div>}
        {!loading && summary.members.length === 0 && (
          <div className={styles.emptyState}>
            No team members yet. Add people to start assigning tasks.
          </div>
        )}
        {summary.members.map((m) => {
          const cap = m.user.dailyCapacityHours || 8;
          // Rough utilisation: total booked hours / (cap * days of project)
          const ratio = Math.min(1.2, m.bookedHours / Math.max(1, cap * 14));
          return (
            <div key={m._id} className={styles.memberRow}>
              <div className={styles.memberCore}>
                <Avatar size="lg" user={m.user} />
                <div className={styles.memberInfo}>
                  <div className={styles.memberName}>{m.user.name}</div>
                  <div className={styles.memberMeta}>{m.user.email} · {cap}h/day capacity</div>
                  <div className={styles.capacityRow}>
                    <div className={styles.capacityBar}>
                      <div
                        className={`${styles.capacityFill} ${ratio > 1 ? styles.overloaded : ""}`}
                        style={{ width: `${Math.min(100, ratio * 100)}%` }}
                      />
                    </div>
                    <span className={styles.memberMeta}>{m.bookedHours}h booked</span>
                  </div>
                </div>
              </div>

              <div className={styles.memberStats}>
                <div className={styles.memberStat}>
                  <span className={styles.memberStatNum}>{m.counts.open}</span>
                  <span className={styles.memberStatLabel}>Open</span>
                </div>
                <div className={styles.memberStat}>
                  <span className={styles.memberStatNum}>{m.counts.done}</span>
                  <span className={styles.memberStatLabel}>Done</span>
                </div>
                <div className={styles.memberStat}>
                  <span className={styles.memberStatNum} style={{ color: m.counts.overdue ? "#dc2626" : "#1f2937" }}>
                    {m.counts.overdue}
                  </span>
                  <span className={styles.memberStatLabel}>Overdue</span>
                </div>
              </div>

              <div className={styles.memberActions}>
                {canEdit ? (
                  <select
                    className={styles.select}
                    value={m.role}
                    onChange={(e) => changeRole(m._id, e.target.value)}
                    style={{ minWidth: 110 }}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                ) : (
                  <span className={styles.memberMeta}>{m.role}</span>
                )}

                {canEdit && (
                  <>
                    <button
                      className={styles.ghostBtn}
                      onClick={() => updateCapacity(m)}
                      title="Adjust this member's daily hours capacity"
                    >
                      <FaUserCog /> Capacity
                    </button>
                    <button
                      className={styles.dangerBtn}
                      onClick={() => remove(m._id, m.user.name)}
                      title="Remove member"
                    >
                      <FaTrash />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
