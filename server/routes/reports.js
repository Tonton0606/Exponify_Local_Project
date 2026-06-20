const logger = require('../config/logger');
const express = require('express');
const { supabase } = require('../config/supabase.js');

const router = express.Router();

// Get all saved reports
router.get('/', async (req, res) => {
  try {
    const { created_by, is_public } = req.query;
    
    let query = supabase
      .from('saved_reports')
      .select('*, created_by:auth.users(email)')
      .order('created_at', { ascending: false });
    
    if (created_by) query = query.eq('created_by', created_by);
    if (is_public) query = query.eq('is_public', is_public === 'true');
    
    const { data, error } = await query;
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error fetching reports:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create report
router.post('/', async (req, res) => {
  try {
    const { name, description, report_type, filters, schedule, created_by, is_public } = req.body;
    
    const { data, error } = await supabase
      .from('saved_reports')
      .insert([{ name, description, report_type, filters, schedule, created_by, is_public }])
      .select()
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error creating report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Run report and get data
router.post('/:id/run', async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.body;
    
    // Get report configuration
    const { data: report, error: reportError } = await supabase
      .from('saved_reports')
      .select('*')
      .eq('id', id)
      .single();
    
    if (reportError) throw reportError;
    
    // Run the report based on type
    let reportData = {};
    
    switch (report.report_type) {
      case 'sales':
        reportData = await generateSalesReport(start_date, end_date, report.filters);
        break;
      case 'revenue':
        reportData = await generateRevenueReport(start_date, end_date, report.filters);
        break;
      case 'performance':
        reportData = await generatePerformanceReport(start_date, end_date, report.filters);
        break;
      default:
        reportData = await generateCustomReport(start_date, end_date, report.filters);
    }
    
    // Update last run info
    await supabase
      .from('saved_reports')
      .update({
        last_run_at: new Date().toISOString(),
        last_run_result: reportData
      })
      .eq('id', id);
    
    res.json({ success: true, data: reportData });
  } catch (error) {
    logger.error('Error running report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export report
router.post('/:id/export', async (req, res) => {
  try {
    const { id } = req.params;
    const { format, created_by } = req.body;
    
    // Create export record
    const { data: exportRecord, error: exportError } = await supabase
      .from('report_exports')
      .insert([{ report_id: id, format, created_by, status: 'processing' }])
      .select()
      .single();
    
    if (exportError) throw exportError;
    
    // Run report to get data
    const { data: report } = await supabase
      .from('saved_reports')
      .select('*')
      .eq('id', id)
      .single();
    
    // Generate file based on format (simplified)
    const fileData = await generateExportFile(report, format);
    
    // Update export record
    const { data: updated, error: updateError } = await supabase
      .from('report_exports')
      .update({
        status: 'completed',
        file_url: fileData.url,
        completed_at: new Date().toISOString()
      })
      .eq('id', exportRecord.id)
      .select()
      .single();
    
    if (updateError) throw updateError;
    
    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Error exporting report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete report
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('saved_reports')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    res.json({ success: true, message: 'Report deleted' });
  } catch (error) {
    logger.error('Error deleting report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper functions for report generation
async function generateExportFile(report, format) {
  // Simplified export - in production, this would generate actual files
  // For now, return a mock URL
  return {
    url: `/exports/report_${report.id}_${Date.now()}.${format}`
  };
}

async function generateSalesReport(startDate, endDate, filters) {
  const { data: deals, error } = await supabase
    .from('deals')
    .select('*, client:clients(name), assigned_to:team_members(name)')
    .gte('created_at', startDate)
    .lte('created_at', endDate);
  
  if (error) throw error;
  
  return {
    totalDeals: deals.length,
    totalValue: deals.reduce((sum, d) => sum + (d.value || 0), 0),
    wonDeals: deals.filter(d => d.status === 'closed_won').length,
    wonValue: deals.filter(d => d.status === 'closed_won').reduce((sum, d) => sum + (d.value || 0), 0),
    lostDeals: deals.filter(d => d.status === 'closed_lost').length,
    avgDealSize: deals.length > 0 ? deals.reduce((sum, d) => sum + (d.value || 0), 0) / deals.length : 0,
    dealsByStage: deals.reduce((acc, d) => {
      acc[d.stage] = (acc[d.stage] || 0) + 1;
      return acc;
    }, {}),
    deals
  };
}

async function generateRevenueReport(startDate, endDate, filters) {
  const { data: revenue, error } = await supabase
    .from('revenue_entries')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);
  
  if (error) throw error;
  
  return {
    totalRevenue: revenue.reduce((sum, r) => sum + Number(r.amount), 0),
    bySource: revenue.reduce((acc, r) => {
      acc[r.source] = (acc[r.source] || 0) + Number(r.amount);
      return acc;
    }, {}),
    byCategory: revenue.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + Number(r.amount);
      return acc;
    }, {}),
    byMonth: revenue.reduce((acc, r) => {
      const month = r.date.substring(0, 7);
      acc[month] = (acc[month] || 0) + Number(r.amount);
      return acc;
    }, {}),
    entries: revenue
  };
}

async function generatePerformanceReport(startDate, endDate, filters) {
  const { data: teamMembers, error } = await supabase
    .from('team_members')
    .select('*, deals:deals!deals_assigned_to_fkey(*)');
  
  if (error) throw error;
  
  return {
    teamPerformance: teamMembers.map(member => ({
      id: member.id,
      name: member.name,
      totalDeals: member.deals.length,
      wonDeals: member.deals.filter(d => d.status === 'closed_won').length,
      totalRevenue: member.deals
        .filter(d => d.status === 'closed_won')
        .reduce((sum, d) => sum + (d.value || 0), 0),
      conversionRate: member.deals.length > 0
        ? (member.deals.filter(d => d.status === 'closed_won').length / member.deals.length) * 100
        : 0
    })).sort((a, b) => b.totalRevenue - a.totalRevenue)
  };
}

async function generateCustomReport(startDate, endDate, filters) {
  // Generic report that combines multiple data sources
  const [deals, revenue, tasks] = await Promise.all([
    supabase.from('deals').select('*').gte('created_at', startDate).lte('created_at', endDate),
    supabase.from('revenue_entries').select('*').gte('date', startDate).lte('date', endDate),
    supabase.from('tasks').select('*').gte('created_at', startDate).lte('created_at', endDate)
  ]);
  
  return {
    deals: deals.data || [],
    revenue: revenue.data || [],
    tasks: tasks.data || [],
    summary: {
      totalDeals: deals.data?.length || 0,
      totalRevenue: revenue.data?.reduce((sum, r) => sum + Number(r.amount), 0) || 0,
      totalTasks: tasks.data?.length || 0,
      completedTasks: tasks.data?.filter(t => t.status === 'done').length || 0
    }
  };
}

module.exports = router;
