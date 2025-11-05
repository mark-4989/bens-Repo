import React, { useContext, useEffect, useState } from 'react'
import "./SearchBar.css"
import { ShopContext } from '../context/ShopContext';
import { assets } from '../assets/frontend_assets/assets';
import { useLocation } from 'react-router-dom';
const SearchBar = () => {
    const { search, setSearch, showSearch, setShowSearch } = useContext(ShopContext);
    const [visible, setVisible] =  useState(false)
    const location = useLocation();

    useEffect(() => {
      if (location.pathname.includes('collection')) {
        setVisible(true);
      }
      else {
        setVisible(false);
        
      }
 
    },[location])


  return showSearch && visible ?(
    <div className='searchbar-container'>
        <div className="input-holder">
            <input value={search} onChange={(e) => setSearch(e.target.value)} type="text" />
            <img src={assets.search_icon} alt="" />
        </div>
        <img onClick={()=>setShowSearch(false)} src={assets.cross_icon} alt="" />
    </div>
  ) : null
}

export default SearchBar