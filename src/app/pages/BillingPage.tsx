import React, { useState, useEffect } from 'react';
import { P } from '../utils/palette';
import { Plus, TrendingUp, AlertCircle, DollarSign, Printer, MessageCircle, X, CheckCircle } from 'lucide-react';
import { Btn, Card, StatCard, Bdg, Inp, Sel, fmtDate } from '../components/common/SharedUI';
import { listInvoices } from '../../lib/services/invoices.service';
import { generateReceiptPDF } from '../../lib/pdf/receipt';
import type { Invoice } from '../../types';

export function BillingPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    listInvoices({}).then(setInvoices);
  }, []);

  const revenueThisMonth = invoices.reduce((sum, i) => sum + (i.amountPaid || 0), 0);
  const outstanding = invoices.reduce((sum, i) => sum + (i.amountDue || 0), 0);
  
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
          <Btn variant="primary" size="sm" icon={<Plus size={13}/>} onClick={() => setDrawerOpen(true)}>Record payment</Btn>
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr>{["Date","Patient","Visit #","Consultation","Medicines","Total","Status","Actions"].map(h => <th key={h} style={{ padding:"9px 16px", textAlign:"left", fontSize:10, fontWeight:500, color:P.textMuted, letterSpacing:"0.06em", textTransform:"uppercase", borderBottom:`1px solid ${P.border}` }}>{h}</th>)}</tr></thead>
          <tbody>
            {invoices.length === 0 ? (
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
                    {inv.status !== "PAID" && <Btn variant="subtle" size="sm" onClick={() => setDrawerOpen(true)}>Record</Btn>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {drawerOpen&&(
        <div style={{ position:"fixed", inset:0, zIndex:50, display:"flex" }}>
          <div style={{ flex:1, background:"rgba(28,26,23,0.48)", cursor:"pointer" }} onClick={() => setDrawerOpen(false)}/>
          <div style={{ width:400, background:P.bgSurface, display:"flex", flexDirection:"column", boxShadow:"0 8px 32px rgba(28,26,23,0.14)" }}>
            <div style={{ padding:"16px 20px", borderBottom:`1px solid ${P.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:15, fontWeight:500, color:P.textPrimary }}>Record payment</span>
              <button onClick={() => setDrawerOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", color:P.textMuted, display:"flex" }}><X size={18}/></button>
            </div>
            <div style={{ padding:20, flex:1, display:"flex", flexDirection:"column", gap:16 }}>
              <Inp label="Amount received" pre={<span style={{ fontFamily:"JetBrains Mono, monospace", fontSize:12 }}>₹</span>} placeholder="400"/>
              <Sel label="Payment method" options={["Cash","UPI","Card","Insurance"].map(m => ({ value:m, label:m }))}/>
              <Inp label="Reference / UPI ID" placeholder="Optional"/>
              <Btn variant="primary" fullWidth icon={<CheckCircle size={14}/>} onClick={() => setDrawerOpen(false)}>Generate receipt</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
