import React, { useContext } from 'react'
import { ShopContext } from '../context/ShopContext'
import Title from './Title'
import './CartTotal.css'

const CartTotal = () => {
    const { currency, delivery_fee, getCartAmount } = useContext(ShopContext)

    // Safe calculation with error handling
    const getSubtotal = () => {
        try {
            const amount = getCartAmount()
            return amount || 0
        } catch (error) {
            console.error('Error calculating subtotal:', error)
            return 0
        }
    }

    const getTotal = () => {
        try {
            const subtotal = getSubtotal()
            const fee = delivery_fee || 0
            return subtotal === 0 ? 0 : subtotal + fee
        } catch (error) {
            console.error('Error calculating total:', error)
            return 0
        }
    }

    const subtotal = getSubtotal()
    const total = getTotal()
    const shippingFee = delivery_fee || 0

    return (
        <div className='carttotal-container'>
            <div className="title-box">
                <Title text1={'CART'} text2={'TOTALS'} />
            </div>
            <div className="cart-total-mini">
                <div className="total-row">
                    <span className="total-label">Subtotal</span>
                    <span className="total-value">{currency} {subtotal.toLocaleString()}</span>
                </div>
                <div className="total-divider"></div>
                <div className="total-row">
                    <span className="total-label">Shipping Fee</span>
                    <span className="total-value shipping">{currency} {shippingFee.toLocaleString()}</span>
                </div>
                <div className="total-divider"></div>
                <div className="total-row total-final">
                    <span className="total-label-bold">Total</span>
                    <span className="total-value-bold">{currency} {total.toLocaleString()}</span>
                </div>
            </div>
        </div>
    )
}

export default CartTotal