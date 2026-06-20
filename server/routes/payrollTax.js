/**
 * Payroll Tax Routes
 * TRAIN Law (RA 10963) withholding tax brackets
 * SSS 2024 rates, PhilHealth 2024, Pag-IBIG
 */

const express = require('express');
const router  = express.Router();
const { supabase } = require('../config/supabase');

function ws(req) { return req.workspaceId; }

// ── TRAIN Law WT Computation (monthly) ───────────────────────────────────────

const TRAIN_BRACKETS_MONTHLY = [
  { min: 0,       max: 20833,   base: 0,      rate: 0    },
  { min: 20834,   max: 33332,   base: 0,      rate: 0.15 },
  { min: 33333,   max: 66666,   base: 1875,   rate: 0.20 },
  { min: 66667,   max: 166666,  base: 8541.8, rate: 0.25 },
  { min: 166667,  max: 666666,  base: 33541.8,rate: 0.30 },
  { min: 666667,  max: Infinity,base: 183541.8,rate: 0.35 },
];

function computeMonthlyWT(taxableCompensation) {
  const tc = parseFloat(taxableCompensation || 0);
  const bracket = TRAIN_BRACKETS_MONTHLY.find(b => tc >= b.min && tc <= b.max);
  if (!bracket) return 0;
  return bracket.base + (tc - bracket.min) * bracket.rate;
}

// ── SSS 2024 Table ────────────────────────────────────────────────────────────
// MSC range; rates: EE 4.5%, ER 9.5%, EC flat ₱10-30, MPF 2.5% on excess of 20k

function computeSSS(monthlySalary) {
  const salary = parseFloat(monthlySalary || 0);
  // MSC floor 5000, ceiling 35000 for regular; MPF up to 35000
  const msc       = Math.min(Math.max(Math.ceil(salary / 500) * 500, 5000), 35000);
  const ee        = parseFloat((msc * 0.045).toFixed(2));
  const er        = parseFloat((msc * 0.095).toFixed(2));
  const ec        = salary <= 14750 ? 10 : 30; // simplified EC
  // MPF: 2.5% EE + 2.5% ER on compensation in excess of ₱20,000 up to ₱35,000
  const mpfBase   = Math.min(Math.max(salary - 20000, 0), 15000);
  const mpfEe     = parseFloat((mpfBase * 0.025).toFixed(2));
  const mpfEr     = parseFloat((mpfBase * 0.025).toFixed(2));

  return { ee, er, ec, mpf_ee: mpfEe, mpf_er: mpfEr, total_ee: ee + mpfEe, total_er: er + ec + mpfEr };
}

// ── PhilHealth 2024 (5% total, 2.5/2.5 split) ────────────────────────────────

function computePhilHealth(monthlySalary) {
  const salary  = parseFloat(monthlySalary || 0);
  const floor   = 10000, ceiling = 100000;
  const base    = Math.min(Math.max(salary, floor), ceiling);
  const total   = parseFloat((base * 0.05).toFixed(2));
  const share   = parseFloat((total / 2).toFixed(2));
  return { ee: share, er: share, total };
}

// ── Pag-IBIG (HDMF) ──────────────────────────────────────────────────────────

function computePagibig(monthlySalary) {
  const salary = parseFloat(monthlySalary || 0);
  // 1% EE + 2% ER if salary ≤ 1500; 2% EE + 2% ER if > 1500; EE max ₱100
  const eeRate = salary <= 1500 ? 0.01 : 0.02;
  const ee     = Math.min(parseFloat((salary * eeRate).toFixed(2)), 100);
  const er     = Math.min(parseFloat((salary * 0.02).toFixed(2)), 100);
  return { ee, er, total: ee + er };
}

// ── Calculator endpoint (stateless) ──────────────────────────────────────────

router.post('/calculate', (req, res) => {
  try {
    const {
      monthly_salary,
      de_minimis = 0,        // non-taxable benefits
      other_taxable = 0,     // commissions, allowances, etc.
    } = req.body;

    const salary     = parseFloat(monthly_salary || 0);
    const sss        = computeSSS(salary);
    const ph         = computePhilHealth(salary);
    const pagibig    = computePagibig(salary);

    // Taxable compensation = gross + other_taxable - mandatory ee deductions - de minimis
    const deductions = sss.total_ee + ph.ee + pagibig.ee;
    const taxableComp = Math.max(salary + parseFloat(other_taxable) - deductions - parseFloat(de_minimis), 0);
    const withholdingTax = computeMonthlyWT(taxableComp);
    const netPay = salary - deductions - withholdingTax;

    res.json({
      success: true,
      data: {
        gross_salary:    salary,
        sss, philhealth: ph, pagibig,
        mandatory_ee_deductions: deductions,
        de_minimis: parseFloat(de_minimis),
        other_taxable: parseFloat(other_taxable),
        taxable_compensation: taxableComp,
        withholding_tax: withholdingTax,
        net_pay: netPay,
        total_employer_cost: salary + sss.total_er + ph.er + pagibig.er,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PAYROLL RUNS ──────────────────────────────────────────────────────────────

router.get('/runs', async (req, res) => {
  try {
    const { year, month, status } = req.query;
    let q = supabase
      .from('payroll_runs')
      .select('*')
      .eq('workspace_id', ws(req))
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false });

    if (year)   q = q.eq('period_year',  parseInt(year));
    if (month)  q = q.eq('period_month', parseInt(month));
    if (status) q = q.eq('status', status);

    const { data, error } = await q;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/runs/:id', async (req, res) => {
  try {
    const [runRes, linesRes] = await Promise.all([
      supabase.from('payroll_runs').select('*').eq('id', req.params.id).eq('workspace_id', ws(req)).single(),
      supabase.from('payroll_tax_lines').select('*').eq('payroll_run_id', req.params.id).order('employee_name'),
    ]);
    if (runRes.error) throw runRes.error;
    res.json({ success: true, data: { ...runRes.data, lines: linesRes.data || [] } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/runs', async (req, res) => {
  try {
    const { period_year, period_month, payroll_type = 'regular', notes, cut_off_date, payment_date } = req.body;
    if (!period_year || !period_month)
      return res.status(400).json({ success: false, error: 'period_year and period_month required' });

    const runName = `${new Date(period_year, period_month - 1).toLocaleString('en-PH', { month: 'long' })} ${period_year} – ${payroll_type.replace('_', ' ')}`;
    const defaultCutoff = `${period_year}-${String(period_month).padStart(2,'0')}-${payroll_type === 'mid_month' ? '15' : new Date(period_year, period_month, 0).getDate()}`;

    const { data, error } = await supabase
      .from('payroll_runs')
      .insert({
        workspace_id: ws(req), period_year, period_month,
        run_name: runName,
        cut_off_date: cut_off_date || defaultCutoff,
        payment_date: payment_date || null,
        payroll_type, status: 'draft', notes,
        total_basic_pay: 0, total_allowances: 0, total_gross_pay: 0,
        total_sss_employee: 0, total_sss_employer: 0,
        total_philhealth_employee: 0, total_philhealth_employer: 0,
        total_pagibig_employee: 0, total_pagibig_employer: 0,
        total_wt_compensation: 0, total_other_deductions: 0, total_net_pay: 0,
        created_by: req.user.id,
      })
      .select().single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add employee lines to a payroll run
router.post('/runs/:id/lines', async (req, res) => {
  try {
    const { employees } = req.body; // array of { employee_id, employee_name, employee_tin, position, basic_salary, de_minimis, other_taxable, thirteenth_month }
    if (!employees || !employees.length)
      return res.status(400).json({ success: false, error: 'employees array required' });

    const { data: run, error: runErr } = await supabase
      .from('payroll_runs')
      .select('*').eq('id', req.params.id).eq('workspace_id', ws(req)).single();
    if (runErr || !run) return res.status(404).json({ success: false, error: 'Payroll run not found' });
    if (run.status === 'posted') return res.status(400).json({ success: false, error: 'Cannot modify a posted payroll run' });

    const lines = employees.map(emp => {
      const salary   = parseFloat(emp.basic_salary || 0);
      const sss      = computeSSS(salary);
      const ph       = computePhilHealth(salary);
      const pagibig  = computePagibig(salary);
      const deductions = sss.total_ee + ph.ee + pagibig.ee;
      const taxable  = Math.max(salary + parseFloat(emp.other_taxable || 0) - deductions - parseFloat(emp.de_minimis || 0), 0);
      const wt       = computeMonthlyWT(taxable);
      const net      = salary - deductions - wt;
      const totalDeductions = deductions + wt;
      return {
        payroll_run_id: req.params.id,
        workspace_id:   ws(req),
        employee_id:    emp.employee_id || null,
        employee_name:  emp.employee_name,
        employee_tin:   emp.employee_tin  || null,
        basic_pay:      salary,
        allowances:     parseFloat(emp.other_taxable || 0),
        gross_pay:      salary + parseFloat(emp.other_taxable || 0),
        taxable_compensation: taxable,
        sss_ee:         sss.ee,   sss_er:     sss.er,
        sss_ec:         sss.ec,   sss_mpf_ee: sss.mpf_ee, sss_mpf_er: sss.mpf_er,
        philhealth_ee:  ph.ee,    philhealth_er: ph.er,
        pagibig_ee:     pagibig.ee, pagibig_er: pagibig.er,
        wt_compensation: wt,
        thirteenth_month_pay: parseFloat(emp.thirteenth_month || 0),
        total_deductions: totalDeductions,
        net_pay:        salary - totalDeductions,
      };
    });

    const { data: savedLines, error: lineErr } = await supabase
      .from('payroll_tax_lines')
      .upsert(lines, { onConflict: 'payroll_run_id,employee_id' })
      .select();
    if (lineErr) throw lineErr;

    // Recompute run totals — use exact DB column names from payroll_runs schema
    const totals = savedLines.reduce((acc, l) => {
      acc.total_gross_pay           += parseFloat(l.gross_pay || 0) || (parseFloat(l.basic_salary || 0) + parseFloat(l.other_taxable_income || 0));
      acc.total_basic_pay           += parseFloat(l.basic_pay || 0) || parseFloat(l.basic_salary || 0);
      acc.total_sss_employee        += parseFloat(l.sss_ee || 0) + parseFloat(l.sss_mpf_ee || 0);
      acc.total_sss_employer        += parseFloat(l.sss_er || 0) + parseFloat(l.sss_ec || 0) + parseFloat(l.sss_mpf_er || 0);
      acc.total_philhealth_employee += parseFloat(l.philhealth_ee || 0);
      acc.total_philhealth_employer += parseFloat(l.philhealth_er || 0);
      acc.total_pagibig_employee    += parseFloat(l.pagibig_ee || 0);
      acc.total_pagibig_employer    += parseFloat(l.pagibig_er || 0);
      acc.total_wt_compensation     += parseFloat(l.wt_compensation || 0);
      acc.total_net_pay             += parseFloat(l.net_pay || 0);
      return acc;
    }, {
      total_basic_pay: 0, total_gross_pay: 0, total_allowances: 0,
      total_sss_employee: 0, total_sss_employer: 0,
      total_philhealth_employee: 0, total_philhealth_employer: 0,
      total_pagibig_employee: 0, total_pagibig_employer: 0,
      total_wt_compensation: 0, total_other_deductions: 0, total_net_pay: 0,
    });

    const { error: updateErr } = await supabase
      .from('payroll_runs')
      .update({ ...totals, employee_count: savedLines.length, updated_at: new Date().toISOString() })
      .eq('id', req.params.id);
    if (updateErr) throw updateErr;

    res.json({ success: true, data: savedLines, totals });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/runs/:id', async (req, res) => {
  try {
    const allowed = ['status','notes','posted_by','posted_at'];
    const updates = { updated_at: new Date().toISOString() };
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    if (req.body.status === 'posted') {
      updates.posted_by = req.user.id;
      updates.posted_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('payroll_runs')
      .update(updates)
      .eq('id', req.params.id)
      .eq('workspace_id', ws(req))
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Yearly BIR Contributions Summary (for Alphalist & 1601C) ─────────────────

router.get('/summary/:year', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('payroll_tax_lines')
      .select(`
        employee_name, employee_tin, position,
        basic_salary, taxable_compensation, wt_compensation,
        sss_ee, sss_er, philhealth_ee, philhealth_er, pagibig_ee, pagibig_er,
        thirteenth_month_pay,
        payroll_runs!inner(period_year, period_month, status)
      `)
      .eq('workspace_id', ws(req))
      .eq('payroll_runs.period_year', parseInt(req.params.year))
      .eq('payroll_runs.status', 'posted');

    if (error) throw error;

    // Aggregate by employee
    const byEmployee = {};
    (data || []).forEach(l => {
      const key = l.employee_tin || l.employee_name;
      if (!byEmployee[key]) {
        byEmployee[key] = {
          employee_name: l.employee_name, employee_tin: l.employee_tin, position: l.position,
          annual_gross: 0, annual_taxable: 0, annual_wt: 0,
          annual_sss_ee: 0, annual_sss_er: 0,
          annual_ph_ee: 0, annual_ph_er: 0,
          annual_pagibig_ee: 0, annual_pagibig_er: 0,
          thirteenth_month_pay: 0,
        };
      }
      const e = byEmployee[key];
      e.annual_gross          += parseFloat(l.basic_salary || 0);
      e.annual_taxable        += parseFloat(l.taxable_compensation || 0);
      e.annual_wt             += parseFloat(l.wt_compensation || 0);
      e.annual_sss_ee         += parseFloat(l.sss_ee || 0);
      e.annual_sss_er         += parseFloat(l.sss_er || 0);
      e.annual_ph_ee          += parseFloat(l.philhealth_ee || 0);
      e.annual_ph_er          += parseFloat(l.philhealth_er || 0);
      e.annual_pagibig_ee     += parseFloat(l.pagibig_ee || 0);
      e.annual_pagibig_er     += parseFloat(l.pagibig_er || 0);
      e.thirteenth_month_pay  += parseFloat(l.thirteenth_month_pay || 0);
    });

    res.json({ success: true, data: Object.values(byEmployee) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
