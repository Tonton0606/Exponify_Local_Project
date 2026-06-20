const logger = require('../config/logger');
const express = require('express');
const { supabase } = require('../config/supabase.js');

const router = express.Router();

// Get all KB categories
router.get('/categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('kb_categories')
      .select('*')
      .order('order_index', { ascending: true });
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create category
router.post('/categories', async (req, res) => {
  try {
    const { name, slug, description, icon, order_index, parent_id } = req.body;
    
    const { data, error } = await supabase
      .from('kb_categories')
      .insert([{ name, slug, description, icon, order_index, parent_id }])
      .select()
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error creating category:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all KB articles
router.get('/articles', async (req, res) => {
  try {
    const { category_id, status, search, limit = 50 } = req.query;
    
    let query = supabase
      .from('kb_articles')
      .select('*, category:kb_categories(name, slug), author:team_members(name)')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (category_id) query = query.eq('category_id', category_id);
    if (status) query = query.eq('status', status);
    if (search) query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    
    const { data, error } = await query;
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error fetching articles:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single article
router.get('/articles/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Increment view count
    await supabase.rpc('increment_article_views', { article_slug: slug });
    
    const { data, error } = await supabase
      .from('kb_articles')
      .select('*, category:kb_categories(*), author:team_members(name), attachments:kb_attachments(*)')
      .eq('slug', slug)
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error fetching article:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create article
router.post('/articles', async (req, res) => {
  try {
    const { title, slug, content, excerpt, category_id, tags, author_id, status } = req.body;
    
    const { data, error } = await supabase
      .from('kb_articles')
      .insert([{
        title,
        slug,
        content,
        excerpt,
        category_id,
        tags,
        author_id,
        status,
        published_at: status === 'published' ? new Date().toISOString() : null
      }])
      .select()
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error creating article:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update article
router.put('/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    if (updates.status === 'published' && !updates.published_at) {
      updates.published_at = new Date().toISOString();
    }
    
    const { data, error } = await supabase
      .from('kb_articles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error updating article:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete article
router.delete('/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('kb_articles')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    res.json({ success: true, message: 'Article deleted' });
  } catch (error) {
    logger.error('Error deleting article:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Article feedback
router.post('/articles/:id/feedback', async (req, res) => {
  try {
    const { id } = req.params;
    const { helpful } = req.body;
    
    const field = helpful ? 'helpful_count' : 'not_helpful_count';
    
    const { data, error } = await supabase.rpc('increment_article_feedback', {
      article_id: id,
      field_name: field
    });
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error recording feedback:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get KB stats
router.get('/stats', async (req, res) => {
  try {
    const { data: articles, error } = await supabase
      .from('kb_articles')
      .select('status, view_count, helpful_count, not_helpful_count');
    
    if (error) throw error;
    
    const stats = {
      totalArticles: articles.length,
      publishedArticles: articles.filter(a => a.status === 'published').length,
      draftArticles: articles.filter(a => a.status === 'draft').length,
      totalViews: articles.reduce((sum, a) => sum + (a.view_count || 0), 0),
      helpfulRate: articles.length > 0 
        ? (articles.reduce((sum, a) => sum + (a.helpful_count || 0), 0) / 
           (articles.reduce((sum, a) => sum + (a.helpful_count || 0) + (a.not_helpful_count || 0), 0) || 1)) * 100
        : 0
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
