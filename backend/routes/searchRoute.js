import express from 'express';
import meilisearchClient from '../config/meilisearch.js';

const searchRouter = express.Router();

// Main search endpoint
searchRouter.get('/', async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice, page = 1, limit = 20 } = req.query;
    
    const index = meilisearchClient.index('products');
    
    // Build filter
    let filter = [];
    if (category) filter.push(`category = "${category}"`);
    if (minPrice) filter.push(`price >= ${minPrice}`);
    if (maxPrice) filter.push(`price <= ${maxPrice}`);
    
    const searchParams = {
      q: q || '',
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      filter: filter.length > 0 ? filter : undefined,
    };
    
    const results = await index.search(q, searchParams);
    
    res.json({
      success: true,
      products: results.hits,
      total: results.estimatedTotalHits,
      page: parseInt(page),
      totalPages: Math.ceil(results.estimatedTotalHits / limit),
    });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Suggestions endpoint (for autocomplete)
searchRouter.get('/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ success: true, hits: [] });
    }
    
    const index = meilisearchClient.index('products');
    const results = await index.search(q, { limit: 6 });
    
    res.json({
      success: true,
      hits: results.hits,
    });
    
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default searchRouter;