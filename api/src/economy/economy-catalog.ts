// --- Start: Economy live wire (Sachin) ---
/** Fixed earn amounts — server decides, client cannot pick amount. */
export const ECONOMY_AMOUNTS = {
  checkin: 20,
  checkinBoostExtra: 20,
  quizCorrect: 50,
  quizWrong: -10,
  adBonus: 30,
} as const;

export const BOOST_CHECKIN = 'boost_checkin_plus';
export const BOOST_QUIZ = 'boost_quiz_double';

export const MILESTONE_REWARDS: Record<number, number> = {
  7: 50,
  15: 75,
  20: 100,
  30: 150,
  45: 200,
  60: 250,
  75: 300,
  90: 400,
  100: 500,
  120: 600,
  150: 750,
  180: 1000,
  200: 1200,
  240: 1500,
  260: 1700,
  290: 2000,
  300: 2200,
  350: 2500,
  360: 2800,
  365: 5000,
};

export function utcDateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}
// --- End: Economy live wire (Sachin) ---
