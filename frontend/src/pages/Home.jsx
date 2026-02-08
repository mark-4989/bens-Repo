import { useEffect } from 'react';
import Hero from '../components/Hero';
import SecondaryHero from '../components/SecondaryHero';
import PromoBanner from '../components/PromoBanner';
import LatestCollection from '../components/LatestCollection';
import Bestseller from '../components/Bestseller';
import TrendingNow from '../components/TrendingNow';
import NewArrivals from '../components/NewArrival';
import OurPolicy from '../components/OurPolicy';
import Newsletter from '../components/Newsletter';
import './Home.css';

const Home = () => {
  return (
    <div className="home-page">
      {/* Main Hero Banner - Fresh & Fast Delivery */}
      <Hero />
      
      {/* Latest Collection Products */}
      <LatestCollection />
      
      {/* Promotional Banner - 50% OFF Summer Sale */}
      <PromoBanner />
      
      {/* Trending Products */}
      <TrendingNow />
      
      {/* Secondary Hero - Fresh Groceries */}
      <SecondaryHero />
      
      {/* Bestseller Products */}
      <Bestseller />

      <SecondaryHero />
      
      {/* New Arrivals */}
      <NewArrivals />
      
      {/* Our Policy */}
      <OurPolicy />
      
      {/* Newsletter Signup */}
      <Newsletter />
    </div>
  );
};

export default Home;