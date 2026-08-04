export type GoalStatus = "todo" | "doing" | "done" | "killed";
export type Category = "event" | "content" | "health" | "admin";

export type Goal = {
  id: string;
  title: string;
  week_number: number;
  month: string;
  status: GoalStatus;
  sort_order: number;
  category: Category;
};

export type Day = {
  id: string;
  date: string;
  one_thing_goal_id: string | null;
  mood: "low" | "ok" | "high" | null;
  post_done: boolean;
  log_done: boolean;
  two_min_used: boolean;
  one_thing_done: boolean;
  hook: string | null;
};

export type TodayState = {
  date: string;
  displayDate: string;
  streakDay: number; // the day number being attempted / completed
  complete: boolean;
  twoMin: boolean;
  oneThing: { id: string; title: string } | null;
  postDone: boolean;
  logDone: boolean;
  oneThingDone: boolean;
  hook: string | null;
};

export const TWO_MIN_TASK =
  "2-minute version: one bed affirmation post. That's the whole day.";

export const CATEGORY_COLORS: Record<Category, string> = {
  event: "bg-amber-400",
  content: "bg-sky-400",
  health: "bg-lime-500",
  admin: "bg-stone-400",
};
