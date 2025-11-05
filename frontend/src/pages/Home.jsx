import React from 'react'
import Hero from '../components/Hero'
import LatestCollection from '../components/LatestCollection'
import Bestseller from '../components/Bestseller'
import OurPolicy from '../components/OurPolicy'
import Newsletter from '../components/Newsletter'
import Sidebar from '../components/Sidebar'
import TrendingNow from '../components/TrendingNow'
import NewArrivals from '../components/NewArrival'

const Home = () => {
  return (
    <div className="home-container">
      <Sidebar />
      <div className="home-content">
        <Hero />
        <LatestCollection />
        <TrendingNow/>
        <Bestseller />
        <NewArrivals/>
        <OurPolicy />
        <Newsletter />
      </div>
    </div>
  )
}

export default Home