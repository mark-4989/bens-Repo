import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './SearchBar.css';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `http://localhost:3000/api/search/suggestions?q=${encodeURIComponent(query)}`
        );
        const data = await response.json();
        setSuggestions(data.hits || []);
        setIsOpen(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = () => {
    if (!query.trim()) return;
    navigate(`/search?q=${encodeURIComponent(query)}`);
    setIsOpen(false);
  };

  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div className="search-bar-container" ref={searchRef}>
      <div className="search-input-wrapper">
        <input
          type="text"
          className="search-input"
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button className="search-btn" onClick={handleSearch}>
          🔍
        </button>
      </div>

      {isOpen && (
        <div className="search-dropdown">
          {loading ? (
            <div className="search-loading">Searching...</div>
          ) : suggestions.length > 0 ? (
            <>
              {suggestions.map((item) => (
                <div
                  key={item.id}
                  className="suggestion-item"
                  onClick={() => handleProductClick(item.id)}
                >
                  <img src={item.images[0]} alt={item.name} />
                  <div className="suggestion-info">
                    <div className="suggestion-name">{item.name}</div>
                    <div className="suggestion-meta">
                      <span className="category-badge">{item.categoryName}</span>
                      <span className="price">KSH {item.price}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="view-all" onClick={handleSearch}>
                View all results →
              </div>
            </>
          ) : (
            <div className="no-results">No products found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;