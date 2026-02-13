import meilisearchClient from '../config/meilisearch.js';
import productModel from '../models/productModel.js'; // Your product model

const indexAllProducts = async () => {
  try {
    const products = await productModel.find({});
    const index = meilisearchClient.index('products');
    
    // Transform products for search
    const transformedProducts = products.map(product => ({
      id: product._id.toString(),
      name: product.name,
      description: product.description || '',
      brand: product.brand || 'Naivas',
      category: product.category,
      categoryName: getCategoryName(product.category),
      subcategory: product.subCategory,
      price: product.price,
      images: product.image || [],
      inStock: product.stock > 0,
      tags: generateTags(product),
      createdAt: product.date || Date.now(),
    }));
    
    // Add documents to Meilisearch
    const result = await index.addDocuments(transformedProducts);
    console.log(`✅ Indexed ${transformedProducts.length} products!`);
    console.log('Task:', result);
    
  } catch (error) {
    console.error('❌ Indexing error:', error);
  }
};

function getCategoryName(category) {
  const names = {
    'fresh-foods': 'Fresh Food',
    'baby-kids': 'Baby & Kids',
    'electronics': 'Electronics',
    'liquor-store': 'Naivas Liquor',
    'food-cupboard': 'Food Cupboard',
  };
  return names[category] || category;
}

function generateTags(product) {
  const tags = [];
  if (product.bestseller) tags.push('bestseller');
  if (product.price < 500) tags.push('affordable');
  if (product.stock > 50) tags.push('in-stock');
  return tags;
}

// Run the script
indexAllProducts();