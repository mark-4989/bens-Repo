import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductItem from '../components/ProductItem';
import './SearchResults.css';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `http://localhost:3000/api/search?q=${encodeURIComponent(query)}`
        );
        const data = await response.json();
        setProducts(data.products);
        setTotal(data.total);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    if (query) fetchResults();
  }, [query]);

  if (loading) return <div className="loading">Searching...</div>;

  return (
    <div className="search-results-page">
      <h1>Search Results for "{query}"</h1>
      <p className="results-count">{total} products found</p>
      
      <div className="products-grid">
        {products.map(product => (
          <ProductItem key={product.id} {...product} image={product.images} />
        ))}
      </div>
    </div>
  );
};

export default SearchResults;