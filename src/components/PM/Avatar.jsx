import React from "react";
import styles from "./pm.module.css";

// Small circular avatar that gracefully falls back to initials
// when a user has no profilePicture. Used by the task card,
// assignee picker, team panel, and member rows.
const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

export default function Avatar({ user, size = "default", title }) {
  const sizeClass = size === "sm" ? styles.sm : size === "lg" ? styles.lg : "";
  const src = user?.profilePicture;
  const isUsable =
    typeof src === "string" &&
    src !== "default.jpg" &&
    (src.startsWith("http") || src.startsWith("data:"));
  return (
    <span
      className={`${styles.avatar} ${sizeClass}`}
      title={title || user?.name || user?.email || ""}
      aria-label={user?.name || user?.email || ""}
    >
      {isUsable ? <img src={src} alt={user?.name || "user"} /> : initials(user?.name || user?.email || "?")}
    </span>
  );
}

// Stack of avatars used by the task card and team summary rows.
// Overflows past `max` are summarised as a "+N" pill so the
// card stays compact regardless of team size.
export function AvatarStack({ users = [], max = 3, size = "sm" }) {
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  return (
    <span className={styles.avatarStack}>
      {shown.map((u, i) => (
        <Avatar key={u?.user || u?._id || i} user={u} size={size} />
      ))}
      {extra > 0 && (
        <span className={`${styles.avatar} ${size === "sm" ? styles.sm : ""}`} title={`${extra} more`}>
          +{extra}
        </span>
      )}
    </span>
  );
}
