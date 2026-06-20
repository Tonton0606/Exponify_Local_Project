const logger = require('../config/logger');
const express = require('express');
const { supabase } = require('../config/supabase.js');

const router = express.Router();

// Get all revenue entries with filters
router.get('/entries', async (req, res) => {
  try {
    const { start_date, end_date, source, category, client_id } = req.query;
    
    let query = supabase
      .from('revenue_entries')
      .select('*')
      .order('date', { ascending: false });
    
    if (start_date) query = query.gte('date', start_date);
    if (end_date) query = query.lte('date', end_date);
    if (source) query = query.eq('source', source);
    if (category) query = query.eq('category', category);
    if (client_id) query = query.eq('client_id', client_id);
    
    const { data, error } = await query;
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error fetching revenue entries:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create revenue entry
router.post('/entries', async (req, res) => {
  try {
    const { date, amount, source, category, description, deal_id, client_id, created_by } = req.body;
    
    const { data, error } = await supabase
      .from('revenue_entries')
      .insert([{ date, amount, source, category, description, deal_id, client_id, created_by }])
      .select()
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error creating revenue entry:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update revenue entry
router.put('/entries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('revenue_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error updating revenue entry:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete revenue entry
router.delete('/entries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('revenue_entries')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    res.json({ success: true, message: 'Revenue entry deleted' });
  } catch (error) {
    logger.error('Error deleting revenue entry:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get revenue summary (for dashboard)
router.get('/summary', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    const { data, error } = await supabase.rpc('get_revenue_summary', { period_type: period });
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    // Fallback to manual calculation
    try {
      const { data: entries, error: entriesError } = await supabase
        .from('revenue_entries')
        .select('amount, date, source, category');
      
      if (entriesError) throw entriesError;
      
      const summary = {
        total: entries.reduce((sum, e) => sum + Number(e.amount), 0),
        bySource: {},
        byCategory: {},
        byMonth: {}
      };
      
      entries.forEach(entry => {
        summary.bySource[entry.source] = (summary.bySource[entry.source] || 0) + Number(entry.amount);
        summary.byCategory[entry.category] = (summary.byCategory[entry.category] || 0) + Number(entry.amount);
        
        const month = entry.date.substring(0, 7);
        summary.byMonth[month] = (summary.byMonth[month] || 0) + Number(entry.amount);
      });
      
      res.json({ success: true, data: summary });
    } catch (fallbackError) {
      res.status(500).json({ success: false, error: fallbackError.message });
    }
  }
});

// Get revenue projections
router.get('/projections', async (req, res) => {
  try {
    const { year } = req.query;
    
    let query = supabase
      .from('revenue_projections')
      .select('*')
      .order('month', { ascending: true });
    
    if (year) {
      query = query.gte('month', `${year}-01-01`).lte('month', `${year}-12-31`);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error fetching projections:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create projection
router.post('/projections', async (req, res) => {
  try {
    const { month, projected_amount, confidence_score, notes, created_by } = req.body;
    
    const { data, error } = await supabase
      .from('revenue_projections')
      .insert([{ month, projected_amount, confidence_score, notes, created_by }])
      .select()
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error creating projection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update actual amount on projection
router.put('/projections/:id/actual', async (req, res) => {
  try {
    const { id } = req.params;
    const { actual_amount } = req.body;
    
    const { data, error } = await supabase
      .from('revenue_projections')
      .update({ actual_amount })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error updating projection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
