import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Smartphone, Banknote, CheckCircle2, Loader2, Download, MapPin, Receipt } from 'lucide-react';
import { useApp } from '@/app/contexts/AppContext';
import api from '@/api/axios';
import { toast } from 'sonner';

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onPaymentSuccess: (paymentMethod: string, totalAmount: number) => void;
}

// Declare Razorpay global type
declare global {
  interface Window {
    Razorpay: any;
  }
}

export function PaymentModal({ open, onOpenChange, order, onPaymentSuccess }: PaymentModalProps) {
  const { currentUser } = useApp();
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'cod'>('upi');
  const [paymentStep, setPaymentStep] = useState<'select' | 'processing' | 'success'>('select');
  const [receipt, setReceipt] = useState('');
  const [dots, setDots] = useState('');

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (open) { setPaymentStep('select'); setSelectedMethod('upi'); setReceipt(''); }
  }, [open]);

  useEffect(() => {
    if (paymentStep !== 'processing') return;
    const iv = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400);
    return () => clearInterval(iv);
  }, [paymentStep]);

  if (!order) return null;

  const itemTotal = order.total;
  const deliveryCharges = 30;
  const totalAmount = itemTotal + deliveryCharges;
  const amountInPaise = Math.round(totalAmount * 100); // Razorpay expects amount in paise

  const paymentMethods = [
    { id: 'upi' as const, name: 'UPI Payment', icon: Smartphone, description: 'Google Pay, PhonePe, Paytm, etc.', badge: 'Recommended' },
    { id: 'cod' as const, name: 'Cash on Delivery', icon: Banknote, description: 'Pay when you receive your order', badge: null },
  ];

  const handleRazorpayPayment = async () => {
    try {
      setPaymentStep('processing');

      // Step 1: Create Razorpay order from backend (backend will create DB order if needed)
      const createOrderResponse = await api.post('/payments/create-razorpay-order', {
        amount: totalAmount,
        currency: 'INR',
        // Omit frontend-generated orderId so backend creates a new one
        ...(order.id && !order.id.startsWith('ORD') ? { orderId: order.id } : {}),
        items: order.items || order.products || [],
        vendorId: order.vendorId,
        deliveryAddress: order.deliveryAddress,
        paymentMethod: 'UPI'
      });

      if (!createOrderResponse.data.success) {
        throw new Error('Failed to create payment order');
      }

      const { razorpayOrderId, key, orderId: createdOrderId } = createOrderResponse.data.data;

      // Step 2: Initialize Razorpay checkout
      const options = {
        key: key,
        amount: amountInPaise,
        currency: 'INR',
        name: 'IITKart',
        description: `Order ${createdOrderId}`,
        order_id: razorpayOrderId,
        handler: async (response: any) => {
          try {
            // Step 3: Verify payment from backend
            const verifyResponse = await api.post('/payments/verify', {
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
              orderId: createdOrderId,
              method: 'upi'
            });

            if (verifyResponse.data.success) {
              const paymentID = response.razorpay_payment_id;
              const receiptText = `\n╔════════════════════════════════╗\n║       PAYMENT RECEIPT         ║\n║          IITKart              ║\n╠════════════════════════════════╣\n║ Order: ${createdOrderId}\n║ Payment: ${paymentID}\n║ Date: ${new Date().toLocaleString('en-IN')}\n║\n║ Item Total:     ₹${itemTotal.toFixed(2)}\n║ Delivery:       ₹${deliveryCharges.toFixed(2)}\n║ ────────────────────────────\n║ TOTAL:          ₹${totalAmount.toFixed(2)}\n║\n║ Method: UPI Payment\n║ Status: SUCCESS ✓\n║\n║ Address: ${order.deliveryAddress}\n╚════════════════════════════════╝\n\nThank you for ordering with IITKart!`;
              setReceipt(receiptText);
              setPaymentStep('success');
              toast.success('Payment successful! 🎉');
            }
          } catch (error) {
            toast.error('Payment verification failed');
            setPaymentStep('select');
          }
        },
        prefill: {
          name: currentUser?.name || '',
          email: currentUser?.email || '',
          contact: currentUser?.phone || ''
        },
        modal: {
          ondismiss: () => {
            toast.error('Payment cancelled');
            setPaymentStep('select');
          }
        },
        theme: {
          color: '#1E3A8A'
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      toast.error('Failed to initiate payment');
      setPaymentStep('select');
    }
  };

  const handleCODPayment = () => {
    setPaymentStep('processing');
    setTimeout(() => {
      const paymentID = `PAY${Date.now()}`;
      const receiptText = `\n╔════════════════════════════════╗\n║       PAYMENT RECEIPT         ║\n║          IITKart              ║\n╠════════════════════════════════╣\n║ Order: ${order.id}\n║ Payment: ${paymentID}\n║ Date: ${new Date().toLocaleString('en-IN')}\n║\n║ Item Total:     ₹${itemTotal.toFixed(2)}\n║ Delivery:       ₹${deliveryCharges.toFixed(2)}\n║ ────────────────────────────\n║ TOTAL:          ₹${totalAmount.toFixed(2)}\n║\n║ Method: Cash on Delivery\n║ Status: PENDING (COD)\n║\n║ Address: ${order.deliveryAddress}\n╚════════════════════════════════╝\n\nThank you for ordering with IITKart!`;
      setReceipt(receiptText);
      setPaymentStep('success');
      toast.success('Order placed! Pay on delivery.');
    }, 1800);
  };

  const initiatePayment = () => {
    if (selectedMethod === 'upi') {
      handleRazorpayPayment();
    } else {
      handleCODPayment();
    }
  };

  const downloadReceipt = () => {
    const blob = new Blob([receipt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `IITKart-Receipt-${order.id}.txt`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    toast.success('Receipt downloaded!');
  };

  const handleCompleteOrder = () => {
    const methodName = selectedMethod === 'upi' ? 'UPI Payment' : 'Cash on Delivery';
    onPaymentSuccess(methodName, totalAmount);
    setPaymentStep('select'); setSelectedMethod('upi'); setReceipt('');
  };

  const handleClose = () => { 
    if (paymentStep === 'success') { 
      handleCompleteOrder(); 
    } else { 
      setPaymentStep('select'); 
      setSelectedMethod('upi'); 
      onOpenChange(false); 
    } 
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0F1E3A] border border-blue-100 dark:border-blue-900/30 rounded-2xl p-0">
        <div className="p-6">
          <DialogHeader className="mb-6">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
              paymentStep === 'success' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
            }`}>
              {paymentStep === 'success' ? (
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              ) : paymentStep === 'processing' ? (
                <Loader2 className="w-6 h-6 text-[#1E3A8A] dark:text-blue-400 animate-spin" />
              ) : (
                <Receipt className="w-6 h-6 text-[#1E3A8A] dark:text-blue-400" />
              )}
            </div>
            <DialogTitle className="text-xl font-extrabold text-[#0F172A] dark:text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
              {paymentStep === 'select' && 'Complete Payment'}
              {paymentStep === 'processing' && `Processing${dots}`}
              {paymentStep === 'success' && 'Order Confirmed! 🎉'}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
              {paymentStep === 'select' && 'Choose your preferred payment method'}
              {paymentStep === 'processing' && "Please don't close this window"}
              {paymentStep === 'success' && 'Your order has been placed successfully'}
            </DialogDescription>
          </DialogHeader>

          {paymentStep === 'select' && (
            <div className="space-y-5">
              {/* Order summary */}
              <div className="bg-[#F0F4FF] dark:bg-[#0A1628] rounded-2xl p-4 border border-blue-100 dark:border-blue-900/30">
                <p className="text-xs font-bold text-[#1E3A8A] dark:text-blue-400 uppercase tracking-wider mb-3">Order Summary</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Order ID</span>
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 text-xs">{order.id}</span>
                  </div>
                  <div className="flex items-start justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" />Address</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-xs max-w-[160px] text-right">{order.deliveryAddress}</span>
                  </div>
                  <div className="border-t border-blue-100 dark:border-blue-900/30 my-2 pt-2 space-y-1">
                    <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                      <span>Item Total</span><span>₹{itemTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                      <span>Delivery</span><span>₹{deliveryCharges.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-[#0F172A] dark:text-white text-base pt-1 border-t border-blue-100 dark:border-blue-900/30">
                      <span>Total</span><span className="text-[#1E3A8A] dark:text-blue-300">₹{totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment methods */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Method</p>
                {paymentMethods.map(method => {
                  const Icon = method.icon;
                  const selected = selectedMethod === method.id;
                  return (
                    <button
                      key={method.id} type="button"
                      onClick={() => setSelectedMethod(method.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                        selected
                          ? 'border-[#1E3A8A] bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                          : 'border-blue-100 dark:border-blue-900/30 bg-white dark:bg-[#0A1628] hover:border-blue-200 dark:hover:border-blue-800'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                        selected ? 'bg-[#1E3A8A] text-white' : 'bg-blue-100 dark:bg-blue-900/30 text-[#1E3A8A] dark:text-blue-400'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${selected ? 'text-[#1E3A8A] dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}>
                            {method.name}
                          </span>
                          {method.badge && (
                            <span className="text-[10px] font-bold bg-orange-100 text-[#EA580C] rounded-full px-2 py-0.5">{method.badge}</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{method.description}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        selected ? 'border-[#1E3A8A] bg-[#1E3A8A]' : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={handleClose}
                  className="flex-1 h-12 rounded-xl border-2 border-blue-100 dark:border-blue-900/30 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button" onClick={initiatePayment}
                  className="flex-1 h-12 rounded-xl bg-[#1E3A8A] hover:bg-[#2B4FBA] text-white font-bold text-sm transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl active:scale-95"
                >
                  {selectedMethod === 'cod' ? 'Place Order' : `Pay ₹${totalAmount.toFixed(2)}`}
                </button>
              </div>
            </div>
          )}

          {paymentStep === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full bg-blue-100 dark:bg-blue-900/30 animate-ping" />
                <div className="relative w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-[#1E3A8A] dark:text-blue-400 animate-spin" />
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-center text-sm">
                {selectedMethod === 'cod' ? 'Confirming your order...' : 'Processing your payment...'}
              </p>
            </div>
          )}

          {paymentStep === 'success' && (
            <div className="space-y-5">
              <div className="flex flex-col items-center text-center py-4 space-y-3">
                <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-green-600 dark:text-green-400" style={{ fontFamily: 'Syne, sans-serif' }}>
                    {selectedMethod === 'cod' ? 'Order Confirmed!' : 'Payment Successful!'}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    Order <span className="font-mono font-semibold">{order.id}</span>
                  </p>
                </div>
              </div>

              <div className="bg-[#F0F4FF] dark:bg-[#0A1628] rounded-2xl p-4 border border-blue-100 dark:border-blue-900/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-[#1E3A8A] dark:text-blue-400 uppercase tracking-wider">Receipt</p>
                  <button onClick={downloadReceipt} className="flex items-center gap-1.5 text-xs text-[#1E3A8A] dark:text-blue-400 font-semibold hover:underline">
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </div>
                <pre className="text-[10px] font-mono text-slate-600 dark:text-slate-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">{receipt}</pre>
              </div>

              <button
                onClick={handleCompleteOrder}
                className="w-full h-12 rounded-xl bg-[#1E3A8A] hover:bg-[#2B4FBA] text-white font-bold text-sm transition-all shadow-lg shadow-blue-900/20 active:scale-95"
              >
                View Order Details →
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
