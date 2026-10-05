import React, { useState, useEffect } from 'react';
import { P } from '../utils/palette';
import { Plus, TrendingUp, AlertCircle, DollarSign, Printer, MessageCircle, X, CheckCircle } from 'lucide-react';
import { Btn, Card, StatCard, Bdg, Inp, Sel, fmtDate } from '../components/common/SharedUI';
import { listInvoices, recordPayment } from '../../lib/services/invoices.service';
import { generateReceiptPDF } from '../../lib/pdf/receipt';
import type { Invoice } from '../../types';

export function BillingPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('CASH');
  const [payRef, setPayRef] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const reload = () => {
    setLoading(true);
    listInvoices({}).then(data => { setInvoices(data); setLoading(false); });
  };

  useEffect(() => { reload(); }, []);

  const revenueThisMonth = invoices.reduce((sum, i) => sum + (i.amountPaid || 0), 0);
  const outstanding = invoices.reduce((sum, i) => sum + (i.amountDue || 0), 0);
  
  const openDrawer = (inv?: Invoice) => {
    setSelectedInvoice(inv ?? null);
    setPayAmount(inv ? String(inv.amountDue) : '');
    setPayMethod('CASH');
    setPayRef('');
    setSuccessMsg('');
    setDrawerOpen(true);
  };

  const closeDrawer = () => { setDrawerOpen(false); setSelectedInvoice(null); setSuccessMsg(''); };

  const handlePayment = async () => {
    if (!selectedInvoice) { alert('Please select an invoice.'); return; }
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) { alert('Enter a valid amount.'); return; }
    setSaving(true);
    try {
      await recordPayment(selectedInvoice.id, {
        amount,
        method: payMethod as any,
        reference: payRef,
        paidAt: new Date() as any,
        recordedBy: 'system',
      });
      setSuccessMsg(`✓ ₹${amount} recorded successfully!`);
      reload();
      setTimeout(() => closeDrawer(), 1400);
    } catch (err) {
      console.error(err);
      alert('Failed to record payment. Check console.');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div>
      <h1 style={{ fontSize:18, fontWeight:500, color:P.textPrimary, marginBottom:18 }}>Billing & Invoices</h1>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:20 }}>
        <StatCard icon={<TrendingUp size={18}/>} label="Total collected revenue" value={`₹${revenueThisMonth.toLocaleString('en-IN')}`} highlight/>
        <StatCard icon={<AlertCircle size={18}/>} label="Outstanding balance" value={`₹${outstanding.toLocaleString('en-IN')}`} subColor={P.sienna}/>
        <StatCard icon={<DollarSign size={18}/>} label="Total invoices" value={invoices.length}/>
      </div>
      <Card>
        <div style={{ padding:"14px 20px", borderBottom:`1px solid ${P.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontSize:14, fontWeight:500, color:P.textPrimary }}>Invoices</span>
          <Btn variant="primary" size="sm" icon={<Plus size={13}/>} onClick={() => openDrawer()}>Record payment</Btn>
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr>{["Date","Patient","Visit #","Consultation","Medicines","Total","Status","Actions"].map(h => <th key={h} style={{ padding:"9px 16px", textAlign:"left", fontSize:10, fontWeight:500, color:P.textMuted, letterSpacing:"0.06em", textTransform:"uppercase", borderBottom:`1px solid ${P.border}` }}>{h}</th>)}</tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 20, textAlign: 'center', color: P.textMuted }}>Loading invoices...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 20, textAlign: 'center', color: P.textMuted }}>No invoices found</td></tr>
            ) : invoices.map((inv,i) => (
              <tr key={i} style={{ borderBottom:`1px solid ${P.border}` }}>
                <td style={{ padding:"10px 16px", fontSize:12, color:P.textSecondary }}>{inv.createdAt ? fmtDate(inv.createdAt) : 'N/A'}</td>
                <td style={{ padding:"10px 16px" }}><div style={{ fontSize:13, fontWeight:500, color:P.textPrimary }}>{inv.patientName}</div><div style={{ fontSize:10, color:P.textMuted, fontFamily:"JetBrains Mono, monospace" }}>{inv.patientRefId}</div></td>
                <td style={{ padding:"10px 16px", fontSize:12, color:P.textMuted }}>{inv.invoiceNumber}</td>
                <td style={{ padding:"10px 16px", fontSize:12, fontFamily:"JetBrains Mono, monospace", color:P.textSecondary }}>₹{inv.consultationFee}</td>
                <td style={{ padding:"10px 16px", fontSize:12, fontFamily:"JetBrains Mono, monospace", color:P.textSecondary }}>₹{inv.medicineFee}</td>
                <td style={{ padding:"10px 16px", fontSize:13, fontFamily:"JetBrains Mono, monospace", fontWeight:600, color:P.textPrimary }}>₹{inv.total}</td>
                <td style={{ padding:"10px 16px" }}>
                  <Bdg variant={inv.status === 'PAID' ? 'green' : inv.status === 'PARTIAL' ? 'gold' : 'sienna'}>{inv.status}</Bdg>
                </td>
                <td style={{ padding:"10px 16px" }}>
                  <div style={{ display:"flex", gap:4 }}>
                    <Btn variant="ghost" size="sm" icon={<Printer size={12}/>} onClick={() => generateReceiptPDF(inv, {})} />
                    <Btn variant="ghost" size="sm" icon={<MessageCircle size={12}/>}/>
                    {inv.status !== "PAID" && <Btn variant="subtle" size="sm" onClick={() => openDrawer(inv)}>Record</Btn>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {drawerOpen&&(
        <div style={{ position:"fixed", inset:0, zIndex:50, display:"flex" }}>
          <div style={{ flex:1, background:"rgba(28,26,23,0.48)", cursor:"pointer" }} onClick={closeDrawer}/>
          <div style={{ width:420, background:P.bgSurface, display:"flex", flexDirection:"column", boxShadow:"0 8px 32px rgba(28,26,23,0.14)" }}>
            <div style={{ padding:"16px 20px", borderBottom:`1px solid ${P.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:15, fontWeight:500, color:P.textPrimary }}>Record payment</span>
              <button onClick={closeDrawer} style={{ background:"none", border:"none", cursor:"pointer", color:P.textMuted, display:"flex" }}><X size={18}/></button>
            </div>
            <div style={{ padding:20, flex:1, display:"flex", flexDirection:"column", gap:16 }}>
              {successMsg ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: P.sage, fontSize: 16, fontWeight: 500 }}>{successMsg}</div>
              ) : (
                <>
                  {/* Invoice selector — shown when opened from top button (no pre-selection) */}
                  <div>
                    <div style={{ fontSize:11, fontWeight:500, color:P.textSecondary, marginBottom:4, letterSpacing:'0.04em' }}>Invoice</div>
                    <select
                      value={selectedInvoice?.id ?? ''}
                      onChange={e => {
                        const inv = invoices.find(i => i.id === e.target.value) ?? null;
                        setSelectedInvoice(inv);
                        setPayAmount(inv ? String(inv.amountDue) : '');
                      }}
                      style={{ width:'100%', height:38, padding:'0 10px', background:P.bgSunken, border:`1.5px solid ${P.border}`, borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', color: selectedInvoice ? P.textPrimary : P.textMuted }}
                    >
                      <option value="">— Select invoice —</option>
                      {invoices.filter(i => i.status !== 'PAID').map(inv => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoiceNumber} · {inv.patientName} · ₹{inv.amountDue} due
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedInvoice && (
                    <div style={{ background:P.bgSunken, borderRadius:8, padding:'10px 14px', fontSize:12, color:P.textSecondary }}>
                      Total: <strong style={{ color:P.textPrimary }}>₹{selectedInvoice.total}</strong>
                      &nbsp;·&nbsp;Paid: <strong style={{ color:P.sage }}>₹{selectedInvoice.amountPaid}</strong>
                      &nbsp;·&nbsp;Due: <strong style={{ color:P.sienna }}>₹{selectedInvoice.amountDue}</strong>
                    </div>
                  )}
                  <Inp label="Amount received" pre={<span style={{ fontFamily:"JetBrains Mono, monospace", fontSize:12 }}>₹</span>} value={payAmount} onChange={setPayAmount} placeholder="Amount"/>
                  <Sel label="Payment method" value={payMethod} onChange={setPayMethod} options={['CASH','UPI','CARD','INSURANCE','CHEQUE','ONLINE','OTHER'].map(m => ({ value:m, label:m }))}/>
                  <Inp label="Reference / UPI ID" value={payRef} onChange={setPayRef} placeholder="Optional"/>
                  <Btn variant="primary" fullWidth icon={<CheckCircle size={14}/>} onClick={handlePayment}>
                    {saving ? 'Recording...' : 'Record Payment'}
                  </Btn>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
