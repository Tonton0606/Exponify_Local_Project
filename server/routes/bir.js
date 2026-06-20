/**
 * BIR Tax Compliance Routes
 * Covers: VAT records, EWT records, tax filing tracker, ATC codes, SAWT
 * Aligned with BIR RR 2-98, TRAIN Law (RA 10963), and PH GAAP
 */

const express = require('express');
const router  = express.Router();
const { supabase } = require('../config/supabase');

// ── Helpers ───────────────────────────────────────────────────────────────────

function ws(req) { return req.workspaceId; }

function vatPeriodDueDate(month, year) {
  // 2550M due: 20th of the following month (eBIRForms: 25th)
  const next = month === 12 ? { m: 1, y: year + 1 } : { m: month + 1, y: year };
  return `${next.y}-${String(next.m).padStart(2, '0')}-20`;
}

function ewtDueDate(month, year) {
  // 0619E due: 10th of the following month
  const next = month === 12 ? { m: 1, y: year + 1 } : { m: month + 1, y: year };
  return `${next.y}-${String(next.m).padStart(2, '0')}-10`;
}

// ── ATC CODES ─────────────────────────────────────────────────────────────────

router.get('/atc-codes', async (req, res) => {
  try {
    const { category } = req.query;
    let q = supabase.from('bir_atc_codes').select('*').eq('is_active', true).order('atc_code');
    if (category) q = q.eq('category', category);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── VAT RECORDS ───────────────────────────────────────────────────────────────

router.get('/vat', async (req, res) => {
  try {
    const { month, year, type } = req.query;
    let q = supabase
      .from('bir_vat_records')
      .select('*')
      .eq('workspace_id', ws(req))
      .order('transaction_date', { ascending: false });

    if (month) q = q.eq('period_month', parseInt(month));
    if (year)  q = q.eq('period_year',  parseInt(year));
    if (type)  q = q.eq('record_type', type);

    const { data, error } = await q;
    if (error) throw error;

    // Compute VAT summary
    const inputVat   = (data || []).filter(r => r.record_type === 'input_vat');
    const outputVat  = (data || []).filter(r => r.record_type === 'output_vat');
    const totalInput  = inputVat.reduce((s, r) => s + parseFloat(r.vat_amount || 0), 0);
    const totalOutput = outputVat.reduce((s, r) => s + parseFloat(r.vat_amount || 0), 0);
    const vatPayable  = totalOutput - totalInput;

    res.json({
      success: true,
      data,
      summary: {
        total_input_vat:  totalInput,
        total_output_vat: totalOutput,
        vat_payable:      vatPayable > 0 ? vatPayable : 0,
        vat_refundable:   vatPayable < 0 ? Math.abs(vatPayable) : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/vat', async (req, res) => {
  try {
    const {
      record_type, transaction_date, period_month, period_year,
      source_type, source_id, supplier_name, supplier_tin, or_number,
      gross_amount, vat_rate = 12, vat_amount, net_amount, vat_type = 'standard',
      is_vat_claimable = true, notes,
    } = req.body;

    if (!record_type || !transaction_date || !period_month || !period_year)
      return res.status(400).json({ success: false, error: 'record_type, transaction_date, period_month, period_year required' });

    const computed_vat   = vat_amount ?? parseFloat(gross_amount || 0) * (parseFloat(vat_rate) / 100);
    const computed_net   = net_amount  ?? parseFloat(gross_amount || 0) - computed_vat;

    const { data, error } = await supabase
      .from('bir_vat_records')
      .insert({
        workspace_id: ws(req), record_type, transaction_date,
        period_month, period_year, source_type, source_id,
        supplier_name, supplier_tin, or_number,
        gross_amount, vat_rate, vat_amount: computed_vat,
        net_amount: computed_net, vat_type, is_vat_claimable,
        notes, created_by: req.user.id,
      })
      .select().single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/vat/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('bir_vat_records')
      .delete()
      .eq('id', req.params.id)
      .eq('workspace_id', ws(req));
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── EWT RECORDS ───────────────────────────────────────────────────────────────

router.get('/ewt', async (req, res) => {
  try {
    const { month, year, remittance_status } = req.query;
    let q = supabase
      .from('bir_ewt_records')
      .select('*')
      .eq('workspace_id', ws(req))
      .order('transaction_date', { ascending: false });

    if (month) q = q.eq('period_month', parseInt(month));
    if (year)  q = q.eq('period_year',  parseInt(year));
    if (remittance_status) q = q.eq('remittance_status', remittance_status);

    const { data, error } = await q;
    if (error) throw error;

    const totalWithheld   = (data || []).reduce((s, r) => s + parseFloat(r.ewt_amount || 0), 0);
    const totalRemitted   = (data || []).filter(r => r.remittance_status === 'remitted')
                                        .reduce((s, r) => s + parseFloat(r.ewt_amount || 0), 0);

    res.json({
      success: true,
      data,
      summary: {
        total_ewt_withheld: totalWithheld,
        total_remitted:     totalRemitted,
        total_pending:      totalWithheld - totalRemitted,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/ewt', async (req, res) => {
  try {
    const {
      transaction_date, period_month, period_year,
      payee_name, payee_tin, atc_code,
      income_payment, ewt_rate, ewt_amount, net_payment,
      source_type, source_id, notes,
    } = req.body;

    if (!payee_name || !transaction_date || !period_month || !period_year)
      return res.status(400).json({ success: false, error: 'payee_name, transaction_date, period required' });

    // Look up EWT rate from ATC if not provided
    let rate = parseFloat(ewt_rate || 0);
    if (!rate && atc_code) {
      const { data: atc } = await supabase
        .from('bir_atc_codes')
        .select('tax_rate')
        .eq('atc_code', atc_code)
        .single();
      if (atc) rate = parseFloat(atc.tax_rate);
    }

    const computed_ewt = ewt_amount ?? parseFloat(income_payment || 0) * (rate / 100);
    const computed_net = net_payment ?? parseFloat(income_payment || 0) - computed_ewt;

    const { data, error } = await supabase
      .from('bir_ewt_records')
      .insert({
        workspace_id: ws(req),
        transaction_date, period_month, period_year,
        payee_name, payee_tin, atc_code,
        income_payment, ewt_rate: rate,
        ewt_amount: computed_ewt, net_payment: computed_net,
        source_type, source_id, notes,
        created_by: req.user.id,
      })
      .select().single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/ewt/:id', async (req, res) => {
  try {
    const allowed = ['remittance_status','remittance_date','cwt_issued','cwt_date','or_number','notes'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('bir_ewt_records')
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

// ── TAX FILINGS TRACKER ───────────────────────────────────────────────────────

router.get('/filings', async (req, res) => {
  try {
    const { year, form_type } = req.query;
    let q = supabase
      .from('bir_tax_filings')
      .select('*')
      .eq('workspace_id', ws(req))
      .order('due_date', { ascending: true });

    if (year)      q = q.eq('period_year', parseInt(year));
    if (form_type) q = q.eq('form_type', form_type);

    const { data, error } = await q;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/filings', async (req, res) => {
  try {
    const {
      form_type, form_label, period_month, period_quarter, period_year,
      due_date, tax_due, notes,
    } = req.body;

    if (!form_type || !period_year || !due_date)
      return res.status(400).json({ success: false, error: 'form_type, period_year, due_date required' });

    const { data, error } = await supabase
      .from('bir_tax_filings')
      .insert({
        workspace_id: ws(req), form_type, form_label, period_month,
        period_quarter, period_year, due_date, tax_due: tax_due || 0, notes,
        created_by: req.user.id,
      })
      .select().single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/filings/:id', async (req, res) => {
  try {
    const allowed = [
      'status','filing_date','tax_due','tax_paid','penalty_surcharge',
      'compromise_penalty','total_paid','bir_receipt_number','filed_by','notes','attachment_url',
    ];
    const updates = { updated_at: new Date().toISOString() };
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const { data, error } = await supabase
      .from('bir_tax_filings')
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

// Generate default BIR filing calendar for a given year
router.post('/filings/generate-calendar', async (req, res) => {
  try {
    const { year } = req.body;
    if (!year) return res.status(400).json({ success: false, error: 'year required' });

    const filings = [];

    for (let m = 1; m <= 12; m++) {
      const nextM = m === 12 ? 1 : m + 1;
      const nextY = m === 12 ? year + 1 : year;
      const pad = n => String(n).padStart(2, '0');

      // Monthly VAT (2550M) — due 20th of following month
      filings.push({
        workspace_id: ws(req), form_type: '2550M',
        form_label: `VAT Return – ${new Date(year, m - 1).toLocaleString('en-PH', { month: 'long' })} ${year}`,
        period_month: m, period_year: year,
        due_date: `${nextY}-${pad(nextM)}-20`,
        tax_due: 0, created_by: req.user.id,
      });

      // Monthly WHT on Compensation (1601-C) — due 10th of following month
      filings.push({
        workspace_id: ws(req), form_type: '1601C',
        form_label: `WHT Compensation – ${new Date(year, m - 1).toLocaleString('en-PH', { month: 'long' })} ${year}`,
        period_month: m, period_year: year,
        due_date: `${nextY}-${pad(nextM)}-10`,
        tax_due: 0, created_by: req.user.id,
      });

      // Monthly EWT (0619-E) — due 10th of following month
      filings.push({
        workspace_id: ws(req), form_type: '0619E',
        form_label: `EWT Remittance – ${new Date(year, m - 1).toLocaleString('en-PH', { month: 'long' })} ${year}`,
        period_month: m, period_year: year,
        due_date: `${nextY}-${pad(nextM)}-10`,
        tax_due: 0, created_by: req.user.id,
      });
    }

    // Quarterly EWT alphalist (1601-EQ) — Q1 Apr15, Q2 Jul15, Q3 Oct15, Q4 Jan15
    const qDates = [
      { q: 1, due: `${year}-04-15` }, { q: 2, due: `${year}-07-15` },
      { q: 3, due: `${year}-10-15` }, { q: 4, due: `${year + 1}-01-15` },
    ];
    qDates.forEach(({ q, due }) => filings.push({
      workspace_id: ws(req), form_type: '1601EQ',
      form_label: `EWT Alphalist Q${q} ${year}`, period_quarter: q, period_year: year,
      due_date: due, tax_due: 0, created_by: req.user.id,
    }));

    // Quarterly VAT (2550Q) — Q1 Apr25, Q2 Jul25, Q3 Oct25, Q4 Jan25
    qDates.forEach(({ q, due }) => filings.push({
      workspace_id: ws(req), form_type: '2550Q',
      form_label: `Quarterly VAT Q${q} ${year}`,
      period_quarter: q, period_year: year,
      due_date: due.replace('-15', '-25'),
      tax_due: 0, created_by: req.user.id,
    }));

    // Annual ITR (1702RT) — April 15 of following year
    filings.push({
      workspace_id: ws(req), form_type: '1702RT',
      form_label: `Annual Income Tax Return ${year}`,
      period_year: year, due_date: `${year + 1}-04-15`,
      tax_due: 0, created_by: req.user.id,
    });

    // AITR installment 2 (1702Q) — Q1-Q3 quarterly ITR
    [
      { q: 1, due: `${year}-05-29` }, { q: 2, due: `${year}-08-29` },
      { q: 3, due: `${year}-11-29` },
    ].forEach(({ q, due }) => filings.push({
      workspace_id: ws(req), form_type: '1702Q',
      form_label: `Quarterly ITR Q${q} ${year}`,
      period_quarter: q, period_year: year,
      due_date: due, tax_due: 0, created_by: req.user.id,
    }));

    // Insert idempotently — skip rows that already exist for this workspace+form+period
    const { data, error } = await supabase
      .from('bir_tax_filings')
      .upsert(filings, {
        onConflict:       'workspace_id,form_type,period_year,period_month,period_quarter',
        ignoreDuplicates: true,
      })
      .select();

    if (error) throw error;
    res.json({ success: true, data, count: filings.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DASHBOARD SUMMARY ─────────────────────────────────────────────────────────

router.get('/dashboard', async (req, res) => {
  try {
    const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;

    const [vatRes, ewtRes, filingsRes] = await Promise.all([
      supabase.from('bir_vat_records').select('record_type,vat_amount')
        .eq('workspace_id', ws(req)).eq('period_year', parseInt(year)),
      supabase.from('bir_ewt_records').select('ewt_amount,remittance_status')
        .eq('workspace_id', ws(req)).eq('period_year', parseInt(year)),
      supabase.from('bir_tax_filings').select('status,due_date,form_type,form_label,tax_due,period_month,period_quarter,period_year')
        .eq('workspace_id', ws(req)).eq('period_year', parseInt(year))
        .order('due_date', { ascending: true }),
    ]);

    const vatData  = vatRes.data  || [];
    const ewtData  = ewtRes.data  || [];
    const filings  = filingsRes.data || [];

    const outputVat   = vatData.filter(r => r.record_type === 'output_vat').reduce((s, r) => s + parseFloat(r.vat_amount || 0), 0);
    const inputVat    = vatData.filter(r => r.record_type === 'input_vat' ).reduce((s, r) => s + parseFloat(r.vat_amount || 0), 0);
    const totalEwt    = ewtData.reduce((s, r) => s + parseFloat(r.ewt_amount || 0), 0);
    const pendingEwt  = ewtData.filter(r => r.remittance_status === 'pending').reduce((s, r) => s + parseFloat(r.ewt_amount || 0), 0);
    const today       = new Date().toISOString().split('T')[0];
    const overdue     = filings.filter(f => f.due_date < today && f.status === 'upcoming');
    const upcoming7d  = filings.filter(f => {
      const d = new Date(f.due_date);
      const now = new Date();
      return f.status === 'upcoming' && d >= now && (d - now) / 86400000 <= 7;
    });

    res.json({
      success: true,
      data: {
        vat: {
          output_vat: outputVat, input_vat: inputVat,
          vat_payable: Math.max(outputVat - inputVat, 0),
          vat_refundable: Math.max(inputVat - outputVat, 0),
        },
        ewt: { total_withheld: totalEwt, pending_remittance: pendingEwt },
        filings: {
          all: filings,
          overdue_count: overdue.length,
          upcoming_7d:   upcoming7d,
          overdue,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
