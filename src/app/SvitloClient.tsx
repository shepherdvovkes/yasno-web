"use client";

import { useEffect, useMemo, useState } from "react";

type ScheduleInterval = {
  start: string; // ISO
  end: string; // ISO
  kind: "planned" | "emergency";
  state: "off" | "on";
};

type Option = { id: string; name: string };

const OBLASTS: Option[] = [
  { id: "kyiv", name: "Київська" },
  { id: "lviv", name: "Львівська" },
  { id: "odesa", name: "Одеська" },
];

const CITIES_BY_OBLAST: Record<string, Option[]> = {
  kyiv: [
    { id: "kyiv-city", name: "Київ" },
    { id: "bila-tserkva", name: "Біла Церква" },
  ],
  lviv: [
    { id: "lviv-city", name: "Львів" },
    { id: "drogobych", name: "Дрогобич" },
  ],
  odesa: [
    { id: "odesa-city", name: "Одеса" },
    { id: "izmail", name: "Ізмаїл" },
  ],
};

const GROUPS_BY_CITY: Record<string, Option[]> = {
  "kyiv-city": [
    { id: "g1", name: "Група 1" },
    { id: "g2", name: "Група 2" },
    { id: "g3", name: "Група 3" },
  ],
  "bila-tserkva": [
    { id: "g1", name: "Група 1" },
    { id: "g2", name: "Група 2" },
  ],
  "lviv-city": [
    { id: "g1", name: "Група 1" },
    { id: "g2", name: "Група 2" },
  ],
  drogobych: [{ id: "g1", name: "Група 1" }],
  "odesa-city": [
    { id: "g1", name: "Група 1" },
    { id: "g2", name: "Група 2" },
  ],
  izmail: [{ id: "g1", name: "Група 1" }],
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const s = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m = totalMinutes % 60;
  const h = Math.floor(totalMinutes / 60);

  if (h <= 0) return `${m}:${pad2(s)}`;
  return `${h}:${pad2(m)}:${pad2(s)}`;
}

function parseISO(s: string) {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function statusAt(now: Date, intervals: ScheduleInterval[]) {
  // Find latest interval that covers now. If none, assume ON.
  const covering = intervals.find((x) => {
    const start = parseISO(x.start);
    const end = parseISO(x.end);
    if (!start || !end) return false;
    return start <= now && now < end;
  });

  const isOn = covering ? covering.state === "on" : true;

  const nextChange = intervals
    .map((x) => {
      const start = parseISO(x.start);
      const end = parseISO(x.end);
      if (!start || !end) return null;
      // next boundary after now
      const candidates: Date[] = [];
      if (start > now) candidates.push(start);
      if (end > now) candidates.push(end);
      return candidates.length ? candidates.sort((a, b) => a.getTime() - b.getTime())[0] : null;
    })
    .filter((d): d is Date => Boolean(d))
    .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

  return { isOn, nextChange };
}

function mockSchedule(now: Date, groupId: string): ScheduleInterval[] {
  // Deterministic mock based on group id.
  const seed = groupId === "g2" ? 2 : groupId === "g3" ? 3 : 1;
  const base = new Date(now);
  base.setMinutes(0, 0, 0);

  const plannedStart = new Date(base.getTime() + (seed % 3) * 60 * 60 * 1000);
  const plannedEnd = new Date(plannedStart.getTime() + 90 * 60 * 1000);

  const emergencyStart = new Date(base.getTime() + (seed * 2) * 30 * 60 * 1000);
  const emergencyEnd = new Date(emergencyStart.getTime() + 30 * 60 * 1000);

  return [
    {
      start: plannedStart.toISOString(),
      end: plannedEnd.toISOString(),
      kind: "planned",
      state: "off",
    },
    {
      start: emergencyStart.toISOString(),
      end: emergencyEnd.toISOString(),
      kind: "emergency",
      state: "off",
    },
  ].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

export default function SvitloClient() {
  const [oblastId, setOblastId] = useState<string>(OBLASTS[0]?.id ?? "");
  const cities = useMemo(() => CITIES_BY_OBLAST[oblastId] ?? [], [oblastId]);

  const [cityId, setCityId] = useState<string>(cities[0]?.id ?? "");
  useEffect(() => {
    setCityId(cities[0]?.id ?? "");
  }, [cities]);

  const groups = useMemo(() => GROUPS_BY_CITY[cityId] ?? [], [cityId]);

  const [groupId, setGroupId] = useState<string>(groups[0]?.id ?? "");
  useEffect(() => {
    setGroupId(groups[0]?.id ?? "");
  }, [groups]);

  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const schedule = useMemo(() => mockSchedule(now, groupId || "g1"), [now, groupId]);
  const computed = useMemo(() => statusAt(now, schedule), [now, schedule]);

  const nextLabel = useMemo(() => {
    if (!computed.nextChange) return "Немає даних";
    return computed.nextChange.toLocaleString("uk-UA", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
  }, [computed.nextChange]);

  const remainingMs = computed.nextChange ? computed.nextChange.getTime() - now.getTime() : null;

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-2">
            <span className="text-sm text-black/70 dark:text-white/70">Область</span>
            <select
              value={oblastId}
              onChange={(e) => setOblastId(e.target.value)}
              className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-black"
            >
              {OBLASTS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm text-black/70 dark:text-white/70">Місто</span>
            <select
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
              className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-black"
            >
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm text-black/70 dark:text-white/70">Група / черга</span>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-black"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-black/60 dark:text-white/60">
          <span className="rounded-full border border-black/10 px-2 py-1 dark:border-white/10">Демо-дані</span>
          <span>Далі підключимо реальні ендпоінти через `/api/ua`.</span>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="text-sm text-black/60 dark:text-white/60">Статус зараз</div>
          <div className="mt-2 flex items-baseline gap-3">
            <div
              className={`text-3xl font-semibold tracking-tight ${
                computed.isOn ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              }`}
            >
              {computed.isOn ? "Світло є" : "Світла немає"}
            </div>
            <div className="text-sm text-black/50 dark:text-white/50">
              {now.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
          </div>

          <div className="mt-4 grid gap-1 text-sm">
            <div className="text-black/70 dark:text-white/70">Наступна зміна: {nextLabel}</div>
            <div className="text-black/50 dark:text-white/50">
              Залишилось: {remainingMs == null ? "—" : formatCountdown(remainingMs)}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="text-sm text-black/60 dark:text-white/60">Сьогоднішні події (демо)</div>
          <div className="mt-3 grid gap-3">
            {schedule.map((x, idx) => (
              <div key={`${x.kind}-${idx}`} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-black/80 dark:text-white/80">
                    {x.kind === "planned" ? "Планове" : "Екстрене"} — {x.state === "off" ? "Відключення" : "Включення"}
                  </div>
                  <div className="text-xs text-black/50 dark:text-white/50">
                    {new Date(x.start).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })} —{" "}
                    {new Date(x.end).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <div
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                    x.kind === "planned"
                      ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {x.kind === "planned" ? "planned" : "emergency"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
