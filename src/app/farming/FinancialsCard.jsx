'use client';
import React from 'react';

export default function FinancialsCard({ financials }) {
  if (!financials) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-800">💰 Profit & Loss Summary</h2>
        <span className="text-[10px] font-bold text-slate-400">TOTAL LIFETIME</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
          <p className="text-[9px] font-black uppercase text-emerald-600 mb-1">Total Revenue</p>
          <p className="text-2xl font-black text-emerald-700">₹{Number(financials.totalRevenue || 0).toLocaleString('en-IN')}</p>
          <p className="text-[8px] text-emerald-500 mt-1 font-bold">Sales & Production income</p>
        </div>
        <div className="bg-red-50 p-5 rounded-2xl border border-red-100">
          <p className="text-[9px] font-black uppercase text-red-600 mb-1">Total Expenses</p>
          <p className="text-2xl font-black text-red-700">₹{Number(financials.totalExpenses || 0).toLocaleString('en-IN')}</p>
          <p className="text-[8px] text-red-400 mt-1 font-bold">Feed + Health + Purchase + General</p>
        </div>
        <div className={`p-5 rounded-2xl border ${financials.netProfit >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
          <p className={`text-[9px] font-black uppercase mb-1 ${financials.netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Net Profit/Loss</p>
          <p className={`text-2xl font-black ${financials.netProfit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
            {financials.netProfit < 0 ? '-' : ''}₹{Math.abs(Number(financials.netProfit || 0)).toLocaleString('en-IN')}
          </p>
          <p className={`text-[8px] mt-1 font-bold ${financials.netProfit >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
            {financials.netProfit >= 0 ? 'Excellent performance' : 'Loss - review expenses'}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
        <div className="text-center p-2 bg-slate-50 rounded-xl">
          <p className="text-[8px] text-slate-400 uppercase font-bold">Feed Cost</p>
          <p className="text-xs font-black text-slate-700">₹{Number(financials.totalFeedCost || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="text-center p-2 bg-slate-50 rounded-xl">
          <p className="text-[8px] text-slate-400 uppercase font-bold">Health Cost</p>
          <p className="text-xs font-black text-slate-700">₹{Number(financials.totalHealthCost || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="text-center p-2 bg-slate-50 rounded-xl">
          <p className="text-[8px] text-slate-400 uppercase font-bold">Purchase Cost</p>
          <p className="text-xs font-black text-slate-700">₹{Number(financials.totalPurchaseCost || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="text-center p-2 bg-red-50 rounded-xl border border-red-100">
          <p className="text-[8px] text-red-500 uppercase font-bold">Death Loss</p>
          <p className="text-xs font-black text-red-700">₹{Number(financials.totalDeathLoss || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="text-center p-2 bg-slate-50 rounded-xl col-span-2 md:col-span-1">
          <p className="text-[8px] text-slate-400 uppercase font-bold">General Exp</p>
          <p className="text-xs font-black text-slate-700">₹{Number(financials.totalGeneralExpense || 0).toLocaleString('en-IN')}</p>
        </div>
      </div>
    </div>
  );
}
