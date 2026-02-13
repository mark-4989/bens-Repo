import { MeiliSearch } from 'meilisearch';

const client = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_KEY || 'YOUR_MASTER_KEY_12345',
});

// Initialize product index
export const initializeProductIndex = async () => {
  try {
    const index = client.index('products');
    
    // Searchable attributes (what to search in)
    await index.updateSearchableAttributes([
      'name',
      'description',
      'brand',
      'category',
      'subcategory',
      'tags',
    ]);
    
    // Filterable attributes (what can be filtered)
    await index.updateFilterableAttributes([
      'category',
      'subcategory',
      'inStock',
      'price',
    ]);
    
    // Sortable attributes
    await index.updateSortableAttributes([
      'price',
      'createdAt',
    ]);
    
    console.log('✅ Meilisearch index configured!');
  } catch (error) {
    console.error('❌ Meilisearch config error:', error);
  }
};

export default client;