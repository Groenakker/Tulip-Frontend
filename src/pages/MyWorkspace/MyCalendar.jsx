import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import WhiteIsland from "../../components/Whiteisland";
import CalendarMonth from "../../components/PM/CalendarMonth";
import { pm } from "../../components/PM/pmApi";
import { useAuth } from "../../context/AuthContext";
import toast from "../../components/Toaster/toast";

// Personal calendar — every task the user is assigned to,
// plotted on a month grid. Click a chip to open the project
// detail page in context.
export default function MyCalendar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);

  const load = useCallback(async () => {
    if (!user?._id) return;
    try {
      const r = await pm.listTasks({ mine: "true" });
      setTasks(r.tasks || []);
    } catch (err) {
      toast.error(err.message || "Failed to load tasks");
    }
  }, [user?._id]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <Header title="My Calendar" />
      <WhiteIsland>
        <CalendarMonth
          tasks={tasks}
          onOpenTask={(t) => navigate(`/Projects/ProjectDetails/${t.project}`)}
        />
      </WhiteIsland>
    </>
  );
}
