import {  useEffect } from 'react';
import Hero from '../components/Hero';
import LatestCollection from '../components/LatestCollection';
import Bestseller from '../components/Bestseller';
import TrendingNow from '../components/TrendingNow';
import NewArrivals from '../components/NewArrival';
import OurPolicy from '../components/OurPolicy';
import Newsletter from '../components/Newsletter';
import Sidebar from '../components/Sidebar';
import './Home.css';

const Home = () => {
  // Add body class for home page to show sidebar
  useEffect(() => {
    document.body.classList.add('home-page');
    
    return () => {
      document.body.classList.remove('home-page');
    };
  }, []);

  return (
    <div className="home-container">
      <Sidebar />
      <div className="home-content">
        <Hero />
        <LatestCollection />
        <TrendingNow />
        <Bestseller />
        <NewArrivals />
        <OurPolicy />
        <Newsletter />
      </div>
    </div>
  );
};

export default Home;