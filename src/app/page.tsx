import SvitloClient from "./SvitloClient";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white px-5 py-10 text-black dark:from-black dark:to-black dark:text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <div className="text-xs font-medium uppercase tracking-widest text-black/50 dark:text-white/50">
            Світло UA
          </div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
            Статус світла та графіки відключень
          </h1>
          <p className="max-w-2xl text-base leading-7 text-black/60 dark:text-white/60">
            Обери область, місто та групу/чергу. Далі підключимо реальні дані через офіційне API.
          </p>
        </header>

        <SvitloClient />

        <footer className="pt-2 text-xs text-black/40 dark:text-white/40">
          Порада: збережи ключ API в змінній оточення <span className="font-mono">UKRAINEALARM_API_KEY</span>.
        </footer>
      </div>
    </div>
  );
}
