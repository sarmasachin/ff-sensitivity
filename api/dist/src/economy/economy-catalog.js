"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MILESTONE_REWARDS = exports.BOOST_QUIZ = exports.BOOST_CHECKIN = exports.ECONOMY_AMOUNTS = void 0;
exports.utcDateKey = utcDateKey;
exports.ECONOMY_AMOUNTS = {
    checkin: 20,
    checkinBoostExtra: 20,
    quizCorrect: 50,
    quizWrong: -10,
    adBonus: 30,
};
exports.BOOST_CHECKIN = 'boost_checkin_plus';
exports.BOOST_QUIZ = 'boost_quiz_double';
exports.MILESTONE_REWARDS = {
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
function utcDateKey(d = new Date()) {
    return d.toISOString().slice(0, 10);
}
//# sourceMappingURL=economy-catalog.js.map