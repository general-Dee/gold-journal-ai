import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  getDoc,
  query,
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import {
  TradeSchema,
  DailyChecklistSchema,
  PsychologyEntrySchema,
  PlaybookPageSchema,
  RiskSettingsSchema,
  EconomicEventSchema
} from "./schemas";
import type {
  Trade,
  DailyChecklist,
  PsychologyEntry,
  PlaybookPage,
  RiskSettings,
  EconomicEvent
} from "./types";

// Firestore rejects any field whose value is `undefined` (as opposed to a missing
// key or `null`), which optional Trade/EconomicEvent fields become when left blank in a form.
function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

// ---------- Trades ----------
export async function listTrades(uid: string): Promise<Trade[]> {
  const q = query(collection(db, "users", uid, "trades"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => TradeSchema.parse(d.data()));
}

export async function saveTrade(uid: string, trade: Trade): Promise<void> {
  await setDoc(doc(db, "users", uid, "trades", trade.id), stripUndefined(TradeSchema.parse(trade)));
}

export async function deleteTrade(uid: string, tradeId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "trades", tradeId));
}

export async function getTrade(uid: string, tradeId: string): Promise<Trade | null> {
  const snap = await getDoc(doc(db, "users", uid, "trades", tradeId));
  return snap.exists() ? TradeSchema.parse(snap.data()) : null;
}

export async function uploadTradeScreenshot(uid: string, tradeId: string, dataUrl: string): Promise<string> {
  const storageRef = ref(storage, `users/${uid}/trades/${tradeId}.jpg`);
  await uploadString(storageRef, dataUrl, "data_url");
  return getDownloadURL(storageRef);
}

// ---------- Checklist ----------
export async function getChecklist(uid: string, dateId: string): Promise<DailyChecklist | null> {
  const snap = await getDoc(doc(db, "users", uid, "checklists", dateId));
  return snap.exists() ? DailyChecklistSchema.parse(snap.data()) : null;
}

export async function saveChecklist(uid: string, checklist: DailyChecklist): Promise<void> {
  await setDoc(doc(db, "users", uid, "checklists", checklist.id), DailyChecklistSchema.parse(checklist));
}

// ---------- Psychology ----------
export async function listPsychology(uid: string): Promise<PsychologyEntry[]> {
  const q = query(collection(db, "users", uid, "psychology"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => PsychologyEntrySchema.parse(d.data()));
}

export async function savePsychology(uid: string, entry: PsychologyEntry): Promise<void> {
  await setDoc(doc(db, "users", uid, "psychology", entry.id), PsychologyEntrySchema.parse(entry));
}

// ---------- Playbook ----------
export async function listPlaybookPages(uid: string): Promise<PlaybookPage[]> {
  const q = query(collection(db, "users", uid, "playbook"), orderBy("updatedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => PlaybookPageSchema.parse(d.data()));
}

export async function savePlaybookPage(uid: string, page: PlaybookPage): Promise<void> {
  await setDoc(doc(db, "users", uid, "playbook", page.id), PlaybookPageSchema.parse(page));
}

export async function deletePlaybookPage(uid: string, pageId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "playbook", pageId));
}

// ---------- Risk settings ----------
export async function getRiskSettings(uid: string): Promise<RiskSettings | null> {
  const snap = await getDoc(doc(db, "users", uid, "riskSettings", "config"));
  return snap.exists() ? RiskSettingsSchema.parse(snap.data()) : null;
}

export async function saveRiskSettings(uid: string, settings: RiskSettings): Promise<void> {
  await setDoc(doc(db, "users", uid, "riskSettings", "config"), RiskSettingsSchema.parse(settings));
}

// ---------- Economic events ----------
export async function listEconomicEvents(uid: string): Promise<EconomicEvent[]> {
  const q = query(collection(db, "users", uid, "economicEvents"), orderBy("date", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => EconomicEventSchema.parse(d.data()));
}

export async function saveEconomicEvent(uid: string, event: EconomicEvent): Promise<void> {
  await setDoc(doc(db, "users", uid, "economicEvents", event.id), stripUndefined(EconomicEventSchema.parse(event)));
}

export async function deleteEconomicEvent(uid: string, eventId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "economicEvents", eventId));
}

export const serverTs = serverTimestamp;
