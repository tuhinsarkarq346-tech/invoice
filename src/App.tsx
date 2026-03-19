import React, { useState, useRef, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Download, RefreshCw, BarChart3, Receipt, Share2, Users, MessageCircle } from 'lucide-react';

const upiID = "debabratabiswas9400@okhdfcbank";

const initialServices = [
    { id: 1, name: 'Car Wash (Small)', price: 300, selected: false, quantity: 1 },
    { id: 2, name: 'Car Wash (Big)', price: 350, selected: false, quantity: 1 },
    { id: 3, name: 'Bike Wash', price: 100, selected: false, quantity: 1 },
    { id: 4, name: 'Scooty Wash', price: 100, selected: false, quantity: 1 },
    { id: 5, name: 'Wax Polish', price: 150, selected: false, quantity: 1 },
];

interface Transaction {
    id: string;
    date: string;
    amount: number;
    customerName: string;
}

export default function App() {
    const [mainView, setMainView] = useState<'billing' | 'dashboard'>('billing');
    const [currentView, setCurrentView] = useState<'form' | 'payment' | 'invoice'>('form');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [services, setServices] = useState(initialServices);
    const [isPaid, setIsPaid] = useState(true);
    const [invoiceDate, setInvoiceDate] = useState('');
    const [invoiceNo, setInvoiceNo] = useState('');
    const [scale, setScale] = useState(1);
    
    const [transactions, setTransactions] = useState<Transaction[]>(() => {
        const saved = localStorage.getItem('bcw_transactions');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('bcw_transactions', JSON.stringify(transactions));
    }, [transactions]);
    
    const invoiceContainerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const currentTotal = services.reduce((acc, s) => acc + (s.selected ? s.price * s.quantity : 0), 0);

    const handleServiceToggle = (id: number) => {
        setServices(services.map(s => s.id === id ? { ...s, selected: !s.selected } : s));
    };

    const handleQuantityChange = (id: number, qty: number) => {
        if (qty < 1) return;
        setServices(services.map(s => s.id === id ? { ...s, quantity: qty } : s));
    };

    const handleGenerateBill = () => {
        if (currentTotal === 0) {
            alert("Please select services!");
            return;
        }
        setCurrentView('payment');
    };

    const handleSetupInvoice = (paidMode: boolean) => {
        setIsPaid(paidMode);
        const newInvoiceNo = "BCW-" + Math.floor(10000 + Math.random() * 90000);
        const newInvoiceDate = new Date().toLocaleDateString('en-GB');
        setInvoiceDate(newInvoiceDate);
        setInvoiceNo(newInvoiceNo);
        setCurrentView('invoice');

        if (paidMode) {
            const newTx: Transaction = {
                id: newInvoiceNo,
                date: new Date().toISOString(),
                amount: currentTotal,
                customerName: customerName || 'Valued Customer'
            };
            setTransactions(prev => [newTx, ...prev]);
        }

        // Automatically open WhatsApp text message if paid and phone is available
        if (paidMode && customerPhone) {
            const text = `Hello ${customerName ? customerName : 'Customer'},\n\nHere are your bill details from Biswas Car Wash:\nInvoice No: ${newInvoiceNo}\nDate: ${newInvoiceDate}\nTotal Amount: ₹${currentTotal}\nStatus: PAID\n\nThank you for choosing us!`;
            const phone = customerPhone.length === 10 ? `91${customerPhone}` : customerPhone.replace(/\D/g, '');
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
        }
    };

    useEffect(() => {
        if (currentView === 'invoice' && wrapperRef.current && invoiceContainerRef.current) {
            const wrapper = wrapperRef.current;
            const newScale = wrapper.clientWidth / 800;
            setScale(newScale);
            window.scrollTo(0, 0);
        }
    }, [currentView]);

    const downloadPdf = async () => {
        if (!invoiceContainerRef.current || !wrapperRef.current) return;
        const container = invoiceContainerRef.current;
        const wrapper = wrapperRef.current;
        
        const originalTransform = container.style.transform;
        const originalHeight = wrapper.style.height;
        
        try {
            container.style.transform = 'none';
            wrapper.style.height = 'auto';
            
            // Allow DOM to update before capturing
            await new Promise(resolve => setTimeout(resolve, 150));
            
            const imgData = await toJpeg(container, {
                quality: 0.95,
                backgroundColor: '#ffffff',
                pixelRatio: 2,
                style: {
                    transform: 'none'
                }
            });
            
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [800, container.offsetHeight]
            });
            
            pdf.addImage(imgData, 'JPEG', 0, 0, 800, container.offsetHeight);
            pdf.save(`BCW_Invoice_${isPaid ? 'Paid' : 'Unpaid'}_${Date.now()}.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            container.style.transform = originalTransform;
            wrapper.style.height = originalHeight;
        }
    };

    const sharePdf = async () => {
        if (!invoiceContainerRef.current || !wrapperRef.current) return;
        const container = invoiceContainerRef.current;
        const wrapper = wrapperRef.current;
        
        const originalTransform = container.style.transform;
        const originalHeight = wrapper.style.height;
        
        try {
            container.style.transform = 'none';
            wrapper.style.height = 'auto';
            
            await new Promise(resolve => setTimeout(resolve, 150));
            
            const imgData = await toJpeg(container, {
                quality: 0.95,
                backgroundColor: '#ffffff',
                pixelRatio: 2,
                style: {
                    transform: 'none'
                }
            });
            
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [800, container.offsetHeight]
            });
            
            pdf.addImage(imgData, 'JPEG', 0, 0, 800, container.offsetHeight);
            const pdfBlob = pdf.output('blob');
            const fileName = `BCW_Invoice_${isPaid ? 'Paid' : 'Unpaid'}_${Date.now()}.pdf`;
            const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Biswas Car Wash Invoice',
                    text: 'Here is your invoice from Biswas Car Wash.',
                });
            } else {
                alert("File sharing is not supported on this device. Downloading instead.");
                pdf.save(fileName);
            }
        } catch (error) {
            console.error("Error sharing PDF:", error);
            alert("Failed to share PDF. Please try again.");
        } finally {
            container.style.transform = originalTransform;
            wrapper.style.height = originalHeight;
        }
    };

    const sendWhatsAppText = () => {
        if (!customerPhone) {
            alert("Please enter a customer phone number first.");
            return;
        }
        const text = `Hello ${customerName ? customerName : 'Customer'},\n\nHere are your bill details from Biswas Car Wash:\nInvoice No: ${invoiceNo}\nDate: ${invoiceDate}\nTotal Amount: ₹${currentTotal}\nStatus: ${isPaid ? 'PAID' : 'UNPAID'}\n\nThank you for choosing us!`;
        const phone = customerPhone.length === 10 ? `91${customerPhone}` : customerPhone.replace(/\D/g, '');
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleSelectContact = async () => {
        if ('contacts' in navigator && 'ContactsManager' in window) {
            try {
                const contacts = await (navigator as any).contacts.select(['name', 'tel'], { multiple: false });
                if (contacts.length > 0) {
                    if (contacts[0].name?.length > 0) setCustomerName(contacts[0].name[0]);
                    if (contacts[0].tel?.length > 0) {
                        let phone = contacts[0].tel[0].replace(/\D/g, '');
                        if (phone.length === 12 && phone.startsWith('91')) phone = phone.substring(2);
                        setCustomerPhone(phone);
                    }
                }
            } catch (ex) {
                console.error("Error selecting contact:", ex);
            }
        } else {
            alert("Contact selection is not supported on this device/browser. Please enter manually.");
        }
    };

    const upiUrl = `upi://pay?pa=${upiID}&pn=Biswas%20Car%20Wash&am=${currentTotal}&cu=INR`;

    const today = new Date();
    const dailyTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate.getDate() === today.getDate() &&
               txDate.getMonth() === today.getMonth() &&
               txDate.getFullYear() === today.getFullYear();
    });
    const dailyIncome = dailyTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    const monthlyTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate.getMonth() === today.getMonth() &&
               txDate.getFullYear() === today.getFullYear();
    });
    const monthlyIncome = monthlyTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    return (
        <div className="bg-slate-100 min-h-screen font-sans">
            <div className="max-w-xl mx-auto bg-white min-h-screen shadow-2xl flex flex-col">
                
                <header className="bg-[#1e3a8a] text-white p-6 text-center border-b-4 border-[#06b6d4]">
                    <h1 className="text-2xl font-black uppercase tracking-tighter italic">BISWAS CAR WASH</h1>
                    <p className="text-xs font-bold text-[#06b6d4] tracking-widest mt-1 uppercase">Smart Billing System</p>
                    
                    <div className="flex justify-center gap-4 mt-6">
                        <button 
                            onClick={() => setMainView('billing')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-sm transition-all ${mainView === 'billing' ? 'bg-[#06b6d4] text-white shadow-lg scale-105' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                        >
                            <Receipt className="w-4 h-4" /> BILLING
                        </button>
                        <button 
                            onClick={() => setMainView('dashboard')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-sm transition-all ${mainView === 'dashboard' ? 'bg-[#06b6d4] text-white shadow-lg scale-105' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                        >
                            <BarChart3 className="w-4 h-4" /> DASHBOARD
                        </button>
                    </div>
                </header>

                {mainView === 'dashboard' && (
                    <main className="p-6 space-y-6 flex-grow bg-slate-50">
                        <h2 className="text-2xl font-black text-[#1e3a8a] uppercase tracking-wide">Income Overview</h2>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-5 rounded-3xl border-2 border-green-100 shadow-sm relative overflow-hidden">
                                <div className="absolute -right-4 -top-4 w-16 h-16 bg-green-50 rounded-full"></div>
                                <p className="text-green-600 font-black uppercase text-xs mb-1 tracking-wider relative z-10">Today's Income</p>
                                <p className="text-4xl font-black text-green-600 tracking-tighter relative z-10">₹{dailyIncome}</p>
                                <p className="text-xs font-bold text-slate-400 mt-2 relative z-10">{dailyTransactions.length} Bills Generated</p>
                            </div>
                            <div className="bg-white p-5 rounded-3xl border-2 border-blue-100 shadow-sm relative overflow-hidden">
                                <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-50 rounded-full"></div>
                                <p className="text-blue-600 font-black uppercase text-xs mb-1 tracking-wider relative z-10">This Month</p>
                                <p className="text-4xl font-black text-blue-600 tracking-tighter relative z-10">₹{monthlyIncome}</p>
                                <p className="text-xs font-bold text-slate-400 mt-2 relative z-10">{monthlyTransactions.length} Bills Generated</p>
                            </div>
                        </div>

                        <div className="mt-8">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Recent Transactions</h3>
                            <div className="space-y-3">
                                {transactions.slice(0, 10).map(tx => (
                                    <div key={tx.id} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                        <div>
                                            <p className="font-black text-slate-700 capitalize">{tx.customerName}</p>
                                            <p className="text-xs font-bold text-slate-400 mt-0.5">{new Date(tx.date).toLocaleDateString('en-GB')} • {tx.id}</p>
                                        </div>
                                        <p className="font-black text-xl text-[#1e3a8a]">₹{tx.amount}</p>
                                    </div>
                                ))}
                                {transactions.length === 0 && (
                                    <div className="text-center py-10 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                                        <p className="text-slate-400 font-bold">No transactions yet.</p>
                                        <p className="text-xs text-slate-400 mt-1">Generate a paid bill to see it here.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </main>
                )}

                {mainView === 'billing' && currentView === 'form' && (
                    <main className="p-6 space-y-6">
                        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm">
                            <div>
                                <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Today's Income</p>
                                <p className="text-xl font-black text-green-700">₹{dailyIncome}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">This Month</p>
                                <p className="text-xl font-black text-blue-700">₹{monthlyIncome}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <button 
                                onClick={handleSelectContact}
                                className="w-full bg-slate-100 text-[#1e3a8a] py-3 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 font-bold"
                                title="Select from Contacts"
                            >
                                <Users className="w-5 h-5" /> Select Customer from Contacts
                            </button>
                            <input 
                                type="text" 
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:border-[#06b6d4] outline-none font-bold" 
                                placeholder="Customer Name" 
                            />
                            <input 
                                type="tel" 
                                value={customerPhone}
                                onChange={e => setCustomerPhone(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:border-[#06b6d4] outline-none font-bold" 
                                placeholder="Phone Number" 
                            />
                        </div>

                        <div className="bg-blue-50/50 p-5 rounded-3xl border border-blue-100">
                            <h3 className="text-sm font-black text-[#1e3a8a] mb-4 uppercase">Select Services</h3>
                            <div className="space-y-3">
                                {services.map(service => (
                                    <div key={service.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border shadow-sm">
                                        <input 
                                            type="checkbox" 
                                            checked={service.selected}
                                            onChange={() => handleServiceToggle(service.id)}
                                            className="w-5 h-5 accent-[#1e3a8a]" 
                                        />
                                        <span className="flex-grow font-bold text-slate-700">{service.name} - ₹{service.price}</span>
                                        <input 
                                            type="number" 
                                            value={service.quantity}
                                            onChange={e => handleQuantityChange(service.id, parseInt(e.target.value) || 1)}
                                            className="w-12 border rounded text-center font-bold bg-slate-50" 
                                            min="1" 
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="mt-5 pt-4 border-t border-blue-100 flex justify-between items-center">
                                <span className="text-slate-400 font-bold uppercase text-xs">Total:</span>
                                <span className="text-3xl font-black text-[#1e3a8a]">₹<span>{currentTotal}</span></span>
                            </div>
                        </div>

                        <button 
                            onClick={handleGenerateBill}
                            className="w-full bg-[#1e3a8a] text-white font-black py-4 rounded-2xl shadow-xl uppercase tracking-wider"
                        >
                            Generate Bill
                        </button>
                    </main>
                )}

                {mainView === 'billing' && currentView === 'payment' && (
                    <main className="p-8 flex flex-col items-center space-y-6">
                        <h2 className="text-2xl font-black text-[#1e3a8a] uppercase">Payment Options</h2>
                        <div className="p-6 bg-white border-8 border-slate-50 rounded-[2.5rem] shadow-2xl mb-4">
                            <QRCodeCanvas value={upiUrl} size={220} fgColor="#1e3a8a" />
                        </div>
                        <div className="w-full space-y-4">
                            <button 
                                onClick={() => handleSetupInvoice(true)}
                                className="w-full bg-[#22c55e] text-white font-black py-5 rounded-2xl shadow-lg uppercase"
                            >
                                Received (Paid Bill)
                            </button>
                            <button 
                                onClick={() => handleSetupInvoice(false)}
                                className="w-full bg-[#f97316] text-white font-black py-5 rounded-2xl shadow-lg uppercase text-lg"
                            >
                                Send Unpaid Bill (2 Pages)
                            </button>
                            <button 
                                onClick={() => setCurrentView('form')}
                                className="w-full text-slate-300 font-bold uppercase text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </main>
                )}

                {mainView === 'billing' && currentView === 'invoice' && (
                    <main className="p-4 bg-slate-200 flex-grow flex flex-col">
                        <div 
                            ref={wrapperRef}
                            className="w-full overflow-hidden bg-white rounded-2xl shadow-inner border border-slate-300"
                            style={{ height: invoiceContainerRef.current ? invoiceContainerRef.current.offsetHeight * scale : 'auto' }}
                        >
                            <div 
                                ref={invoiceContainerRef}
                                style={{ 
                                    background: 'white', 
                                    transform: `scale(${scale})`, 
                                    transformOrigin: 'top left',
                                    width: '800px'
                                }}
                            >
                                <div className="bg-white p-12 relative flex flex-col" style={{ width: '800px', minHeight: '1131px' }}>
                                    <div className="flex justify-between border-b-4 border-[#1e3a8a] pb-8 mb-10">
                                        <div>
                                            <h1 className="text-5xl font-black text-[#1e3a8a]">BISWAS CAR WASH</h1>
                                            <p className="text-[#06b6d4] font-black uppercase text-sm tracking-[0.3em] mt-1">Home Service | Kalyani</p>
                                            <div className="mt-6 text-slate-500 font-bold text-lg leading-relaxed">
                                                Natun Palli, Kalyani, Nadia, 741235<br/>
                                                Mob: +91 94337 02319<br/>
                                                Email: debabratabiswas9400@gmail.com
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <h2 className="text-6xl font-black text-slate-100 mb-4 tracking-widest uppercase">Invoice</h2>
                                            <p className="font-bold text-xl text-slate-700">Date: <span>{invoiceDate}</span></p>
                                            <p className="font-bold text-xl text-slate-700">No: <span>{invoiceNo}</span></p>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-8 rounded-[2rem] mb-10 border-l-[16px] border-[#1e3a8a] w-3/4 shadow-sm">
                                        <p className="text-xs font-black text-[#1e3a8a] uppercase tracking-[0.3em] mb-2 opacity-50">Invoice To</p>
                                        <h3 className="text-4xl font-black text-slate-800 capitalize mb-1">{customerName || "Valued Customer"}</h3>
                                        <p className="text-2xl font-bold text-slate-400">{customerPhone ? "+91 " + customerPhone : ""}</p>
                                    </div>

                                    <div className="flex-grow">
                                        <div className="border-2 border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                                            <table className="w-full text-left">
                                                <thead className="bg-[#1e3a8a] text-white">
                                                    <tr>
                                                        <th className="p-5 font-black uppercase text-sm">Description</th>
                                                        <th className="p-5 text-center font-black uppercase text-sm">Qty</th>
                                                        <th className="p-5 text-right font-black uppercase text-sm">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-2xl">
                                                    {services.filter(s => s.selected).map(service => (
                                                        <tr key={service.id} className="border-b border-slate-50 last:border-0">
                                                            <td className="p-6 font-bold text-slate-700 text-2xl">{service.name}</td>
                                                            <td className="p-6 text-center font-bold text-slate-400 text-2xl">{service.quantity}</td>
                                                            <td className="p-6 text-right font-black text-slate-800 text-2xl tracking-tighter">₹{service.price * service.quantity}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="mt-12 flex justify-between items-end border-t-2 border-slate-50 pt-10">
                                        {isPaid ? (
                                            <div className="border-[8px] border-green-500 text-green-500 px-10 py-4 rounded-3xl font-black text-5xl uppercase -rotate-12 opacity-90 bg-green-50/30">
                                                PAID IN FULL
                                            </div>
                                        ) : (
                                            <div></div>
                                        )}
                                        <div className="bg-[#1e3a8a] p-10 rounded-[2.5rem] text-right min-w-[360px] shadow-2xl relative">
                                            <p className="text-[#06b6d4] font-bold uppercase text-xs mb-1">Total Amount</p>
                                            <p className="text-white text-6xl font-black tracking-tighter">₹<span>{currentTotal}</span></p>
                                        </div>
                                    </div>
                                </div>

                                {!isPaid && (
                                    <div className="bg-white p-12 flex flex-col items-center justify-center" style={{ width: '800px', height: '1131px', borderTop: '4px dashed #cbd5e1' }}>
                                        <h2 className="text-4xl font-black text-[#1e3a8a] mb-12 uppercase tracking-widest border-b-4 border-[#06b6d4] pb-2">Payment Request</h2>
                                        <div className="p-10 bg-white border-[12px] border-slate-100 rounded-[3rem] shadow-xl">
                                            <QRCodeCanvas value={upiUrl} size={350} fgColor="#1e3a8a" />
                                        </div>
                                        <div className="mt-12 text-center space-y-6">
                                            <p className="text-3xl font-bold text-slate-600">Scan to pay <span className="text-[#1e3a8a] font-black">₹<span>{currentTotal}</span></span></p>
                                            <p className="text-xl font-bold text-slate-400">UPI ID: {upiID}</p>
                                            <p className="pt-32 text-[#06b6d4] font-black text-3xl uppercase tracking-[0.6em]">Thank You!</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-8 pb-10">
                            <button 
                                onClick={sharePdf}
                                className="bg-[#25D366] text-white py-4 rounded-2xl font-black text-lg shadow-lg uppercase tracking-wider flex items-center justify-center"
                            >
                                <Share2 className="mr-2 w-5 h-5" /> Share PDF
                            </button>
                            <button 
                                onClick={sendWhatsAppText}
                                className="bg-[#128C7E] text-white py-4 rounded-2xl font-black text-lg shadow-lg uppercase tracking-wider flex items-center justify-center"
                            >
                                <MessageCircle className="mr-2 w-5 h-5" /> WA Text
                            </button>
                            <button 
                                onClick={downloadPdf}
                                className="bg-[#1e3a8a] text-white py-4 rounded-2xl font-black text-lg shadow-lg uppercase tracking-wider flex items-center justify-center"
                            >
                                <Download className="mr-2 w-5 h-5" /> Download
                            </button>
                            <button 
                                onClick={() => {
                                    setCustomerName('');
                                    setCustomerPhone('');
                                    setServices(initialServices);
                                    setCurrentView('form');
                                }}
                                className="bg-white text-slate-400 py-4 rounded-2xl font-black border-2 border-slate-100 uppercase flex items-center justify-center"
                            >
                                <RefreshCw className="mr-2 w-5 h-5" /> New Bill
                            </button>
                        </div>
                    </main>
                )}
            </div>
        </div>
    );
}
