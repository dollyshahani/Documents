"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { CATEGORY_COLORS, Goal, GoalStatus } from "@/lib/types";

const COLUMNS: { key: GoalStatus; label: string }[] = [
  { key: "todo", label: "This Week" },
  { key: "doing", label: "Doing" },
  { key: "done", label: "Done" },
  { key: "killed", label: "Killed" },
];

export default function WeekPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const load = useCallback(async () => {
    const res = await fetch("/api/goals");
    if (res.ok) setGoals(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const findColumn = (id: string): GoalStatus | null => {
    if (COLUMNS.some((c) => c.key === id)) return id as GoalStatus;
    const goal = goals.find((g) => g.id === id);
    return goal ? goal.status : null;
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const from = findColumn(String(active.id));
    const to = findColumn(String(over.id));
    if (!from || !to || from === to) return;
    setGoals((gs) =>
      gs.map((g) => (g.id === active.id ? { ...g, status: to } : g))
    );
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const to = findColumn(String(over.id));
    if (!to) return;

    // reorder within target column
    setGoals((gs) => {
      const col = gs.filter((g) => g.status === to && g.id !== active.id);
      const moving = gs.find((g) => g.id === active.id);
      if (!moving) return gs;
      const overIndex = col.findIndex((g) => g.id === over.id);
      const insertAt = overIndex === -1 ? col.length : overIndex;
      col.splice(insertAt, 0, { ...moving, status: to });
      const rest = gs.filter((g) => g.status !== to && g.id !== active.id);
      const reordered = col.map((g, i) => ({ ...g, sort_order: i }));
      // persist
      fetch("/api/goals", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          reordered.map((g) => ({ id: g.id, status: g.status, sort_order: g.sort_order }))
        ),
      });
      return [...rest, ...reordered];
    });

    if (to === "killed") {
      setToast("killed. good.");
      setTimeout(() => setToast(null), 1600);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-bold">Week</h1>
        <p className="text-stone-500 mt-1 text-sm">Drag it. Killing is a feature.</p>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex flex-col gap-5">
          {COLUMNS.map((col) => (
            <Column
              key={col.key}
              id={col.key}
              label={col.label}
              goals={goals
                .filter((g) => g.status === col.key)
                .sort((a, b) => a.sort_order - b.sort_order)}
            />
          ))}
        </div>
      </DndContext>

      {toast && (
        <div className="fixed bottom-24 inset-x-0 flex justify-center pointer-events-none">
          <span className="bg-ink text-paper px-5 py-2.5 rounded-full font-bold">
            {toast}
          </span>
        </div>
      )}
    </div>
  );
}

function Column({ id, label, goals }: { id: string; label: string; goals: Goal[] }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="rounded-2xl bg-stone-100/70 p-3">
      <p className="text-xs uppercase tracking-widest text-stone-400 mb-2 px-1">
        {label} {goals.length > 0 && `· ${goals.length}`}
      </p>
      <SortableContext items={goals.map((g) => g.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 min-h-[2.5rem]">
          {goals.map((g) => (
            <Card key={g.id} goal={g} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function Card({ goal }: { goal: Goal }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: goal.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-xl bg-white border border-stone-200 px-4 py-3 flex items-center gap-3 touch-none ${
        isDragging ? "opacity-60 shadow-lg" : ""
      } ${goal.status === "done" ? "opacity-60" : ""} ${
        goal.status === "killed" ? "opacity-40 line-through" : ""
      }`}
    >
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${CATEGORY_COLORS[goal.category]}`} />
      <span className="text-sm leading-snug">{goal.title}</span>
    </div>
  );
}
