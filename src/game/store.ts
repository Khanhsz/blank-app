import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { defaults, loadState, persist, migrate, type GameState } from "./state";
import {captureDecision} from "./weekly";

export interface Fx { toast: (msg: string) => void; log: (msg: string) => void }

let state: GameState = defaults();
let loaded = false;
const listeners = new Set<() => void>();

export function initStore() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  state = loadState();
  listeners.forEach((l) => l());
}

export function getState() { return state; }

/** All gameplay mutations go through act(): clone → mutate → persist → notify. */
export function act(fn: (s: GameState, fx: Fx) => void) {
  const draft = structuredClone(state);
  const toasts: string[] = [];
  const fx: Fx = {
    toast: (m) => toasts.push(m),
    log: (m) => { draft.log.unshift({ t: Date.now(), msg: m }); draft.log = draft.log.slice(0, 80); },
  };
  fn(draft, fx);
  captureDecision(state,draft);
  state = draft;
  persist(state);
  listeners.forEach((l) => l());
  toasts.forEach((m) => toast(m));
}

/** Safe manual save loading, accepting migrated saves from previous versions. */
export function restoreGame(raw:unknown){
  if(!raw||typeof raw!=="object"||!("campaign" in raw)) throw new Error("This is not a Marketing Tycoon save.");
  const next=migrate(raw);
  if(!next.campaign||!next.character) throw new Error("Save data is incomplete.");
  state=next;
  persist(state);
  listeners.forEach(l=>l());
  toast.success("Game restored");
}
export function saveNow(){
  persist(state);
  toast.success("Game saved to this browser");
}
export function resetGame() {
  state = defaults();
  persist(state);
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
export function useGame<T>(sel: (s: GameState) => T): T {
  return useSyncExternalStore(subscribe, () => sel(state), () => sel(state));
}