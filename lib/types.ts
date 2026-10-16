export type Category = 'sightseeing' | 'food' | 'culture' | 'nature' | 'transport' | 'stay' | 'other';
export type Currency = 'USD' | 'VND' | 'EUR' | 'JPY';
export type Pace = 'relaxed' | 'balanced' | 'packed';

export type Activity = {
  id: string;
  time: string;
  title: string;
  location: string;
  description: string;
  durationMinutes: number;
  category: Category;
  cost: number;
  lat?: number;
  lng?: number;
};
export type TripDay = { date: string; theme: string; activities: Activity[] };
export type Expense = { id: string; title: string; category: Category; amount: number };
export type Trip = {
  id: string;
  destination: string;
  country: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budget: number;
  currency: Currency;
  pace: Pace;
  interests: string[];
  notes: string;
  summary: string;
  tips: string[];
  days: TripDay[];
  expenses: Expense[];
  createdAt: string;
  mode: 'demo' | 'ai';
};
export type TripInput = Pick<Trip, 'destination' | 'startDate' | 'endDate' | 'travelers' | 'budget' | 'currency' | 'pace' | 'interests' | 'notes'>;
export const CATEGORIES: Category[] = ['sightseeing','food','culture','nature','transport','stay','other'];
export const CATEGORY_LABEL: Record<Category, string> = {
  sightseeing: 'Sightseeing', food: 'Food & drink', culture: 'Culture', nature: 'Nature',
  transport: 'Transport', stay: 'Stay', other: 'Other'
};
export const money = (value: number, currency: Currency) => new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: currency === 'VND' || currency === 'JPY' ? 0 : 0 }).format(value);
export const dateLabel = (str: string) => new Date(`${str}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
export const dateLong = (str: string) => new Date(`${str}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
export const uuid = () => globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
export const activitiesTotal = (trip: Trip) => trip.days.reduce((sum, day) => sum + day.activities.reduce((s, a) => s + a.cost, 0), 0);
export const expensesTotal = (trip: Trip) => trip.expenses.reduce((s, e) => s + e.amount, 0);
export const tripTotal = (trip: Trip) => activitiesTotal(trip) + expensesTotal(trip);