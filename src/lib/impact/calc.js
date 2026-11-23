// Financial Impact Calculator math (PREVIEW). Pure functions shared by the
// browser script and the tests; no rates live here. Every figure is a plain
// sum of level monthly premiums: no interest, no investment return, no
// premium changes, and it assumes the policy stays in force.

import { CP_MAX_UNITS, CP_UNIT_PRICE } from './products.js';

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Colonial Penn units for a coverage target: whole units, at least the target.
 * @param {{ perUnit: number }} row @param {number} target
 */
export function colonialPennUnits(row, target) {
  const units = Math.ceil(target / row.perUnit);
  return { units, coverage: units * row.perUnit, premium: round2(units * CP_UNIT_PRICE), overMax: units > CP_MAX_UNITS };
}

/**
 * Premium difference and its long-term and food equivalents.
 * @param {number} higher monthly premium of the higher-priced plan
 * @param {number} lower monthly premium of the comparison plan
 * @param {{ years: number, mealCost: number, caloriesPerMeal: number, caloriesPerDay: number, monthlyIncome?: number | null }} a
 */
export function impact(higher, lower, a) {
  const monthly = round2(higher - lower);
  const annual = round2(monthly * 12);
  const totals = Object.fromEntries([5, 10, 20].map((y) => [y, round2(annual * y)]));
  const period = round2(annual * a.years);
  const meals = a.mealCost > 0 ? period / a.mealCost : 0;
  const calories = meals * a.caloriesPerMeal;
  const foodDays = a.caloriesPerDay > 0 ? calories / a.caloriesPerDay : 0;
  const incomeShare = a.monthlyIncome && a.monthlyIncome > 0 ? monthly / a.monthlyIncome : null;
  return {
    monthly,
    annual,
    totals,
    period,
    years: a.years,
    mealsPerMonth: a.mealCost > 0 ? monthly / a.mealCost : 0,
    meals,
    calories,
    foodDays,
    incomeShare,
  };
}

/**
 * What the family receives if death from natural causes happens in a given
 * policy month, from the product's verified schedule.
 * @param {{ schedule: { months: string, natural: string }[] }} product
 * @param {number} premium @param {number} coverage @param {number} month
 * @returns {{ amount: number, kind: 'face' | 'premiums-plus-10' | 'at-least-premiums' }}
 */
export function benefitAt(product, premium, coverage, month) {
  const paid = round2(premium * month);
  const inWait = product.schedule.length > 1 && month <= 24;
  const rule = inWait ? product.schedule[0].natural : 'face';
  if (rule === 'premiums-plus-10') return { amount: round2(paid * 1.1), kind: 'premiums-plus-10' };
  if (rule === 'premiums-plus-contract') return { amount: paid, kind: 'at-least-premiums' };
  return { amount: coverage, kind: 'face' };
}

/** Formatting helpers (en-US). */
export const fmtMoney = (n, cents = true) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
export const fmtWhole = (n) => Math.round(n).toLocaleString('en-US');
