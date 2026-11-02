import { describe, expect, it } from 'vitest';
import { accountBalance, summarize, toCents, totalNetWorth } from '../src/lib/finance';
import type { Account, Transaction } from '../src/lib/finance';
const account: Account = {id:'a',name:'Principal',institution:'CaixaBank',kind:'bank',openingBalance:100,currency:'EUR',active:true,updatedAt:'2026-11-01T00:00:00.000Z'};
const tx: Transaction[] = [
 {id:'1',description:'Nómina',amount:1500.10,type:'income',date:'2026-11-01',account:'a',category:'Nómina',createdAt:'2026-11-01T00:00:00.000Z',source:'manual'},
 {id:'2',description:'Compra',amount:42.35,type:'expense',date:'2026-11-02',account:'a',category:'Alimentación',createdAt:'2026-11-02T00:00:00.000Z',source:'manual'},
 {id:'3',description:'Transferencia',amount:20,type:'transfer',date:'2026-11-02',account:'a',destinationAccount:'b',category:'Transferencias',createdAt:'2026-11-02T00:00:00.000Z',source:'manual'},
];
describe('financial helpers',()=>{
 it('uses integer cents for monetary arithmetic',()=>expect(toCents(0.1)+toCents(0.2)).toBe(30));
 it('excludes transfers from income and expense totals',()=>{const s=summarize(tx,new Date('2026-11-15T12:00:00'));expect(s.income).toBe(1500.1);expect(s.expense).toBe(42.35);expect(s.savings).toBe(1457.75)});
 it('debits the source account and credits the destination account',()=>{const destination:Account={...account,id:'b',openingBalance:0};expect(accountBalance(account,tx)).toBe(1537.75);expect(accountBalance(destination,tx)).toBe(20)});
 it('does not count reconciliation adjustments as income or spending',()=>{const adjustment:Transaction={id:'4',description:'Ajuste',amount:25,type:'adjustment',date:'2026-11-03',account:'a',category:'Ajuste de saldo',createdAt:'2026-11-03T00:00:00.000Z',source:'manual'};const s=summarize([...tx,adjustment],new Date('2026-11-15T12:00:00'));expect(s.income).toBe(1500.1);expect(s.expense).toBe(42.35);expect(accountBalance(account,[adjustment])).toBe(125)});
 it('treats a refund as a reduction of spending, not as income',()=>{const refund:Transaction={id:'5',description:'Devolución',amount:10,type:'refund',date:'2026-11-04',account:'a',category:'Alimentación',createdAt:'2026-11-04T00:00:00.000Z',source:'manual'};const s=summarize([...tx,refund],new Date('2026-11-15T12:00:00'));expect(s.income).toBe(1500.1);expect(s.expense).toBe(32.35);});
 it('returns null savings rate when there is no income',()=>expect(summarize([],new Date('2026-11-15')).savingsRate).toBeNull());
 it('includes account balances in net worth',()=>expect(totalNetWorth([account],[])).toBe(100));
});

import { fundCashFlows, fundCostBasis, fundUnits, investmentSummary, portfolioTwr, xirr } from '../src/lib/finance';
import type { InvestmentTransaction, PortfolioSnapshot } from '../src/lib/finance';
const ops: InvestmentTransaction[] = [
 {id:'b1',fundId:'f1',date:'2025-01-01',type:'buy',amount:1000,units:10,price:100,fees:0,currency:'EUR',fxRate:1},
 {id:'b2',fundId:'f1',date:'2025-06-01',type:'buy',amount:500,units:5,price:100,fees:0,currency:'EUR',fxRate:1},
 {id:'s1',fundId:'f1',date:'2025-09-01',type:'sell',amount:300,units:3,price:100,fees:0,currency:'EUR',fxRate:1},
];
describe('investment calculations',()=>{
 it('calculates current units after partial sales',()=>expect(fundUnits('f1',ops)).toBe(12));
 it('reduces weighted acquisition cost proportionally after a partial sale',()=>expect(fundCostBasis('f1',ops)).toBeCloseTo(1200,2));
 it('creates XIRR from dated cash flows and a terminal value',()=>{const rate=xirr(fundCashFlows('f1',ops),1500,'2026-01-01');expect(rate).not.toBeNull();expect(rate!).toBeGreaterThan(0);});
 it('calculates time-weighted return from snapshots after external flows',()=>{const snapshots:PortfolioSnapshot[]=[{id:'1',date:'2025-01-01',marketValue:1000,netExternalFlow:0,source:'manual'},{id:'2',date:'2025-06-01',marketValue:1600,netExternalFlow:500,source:'manual'}];expect(portfolioTwr(snapshots)).toBeCloseTo(0.1,6);});
});

import type { Fund, FundPrice } from '../src/lib/finance';
describe('currency conversion for investments',()=>{
 it('converts foreign-currency market value into euros using the stored FX rate',()=>{const fund:Fund={id:'usd',name:'US fund',isin:'IE0000000000',currency:'USD',broker:'Test',productType:'fund'};const prices:FundPrice[]=[{id:'p1',fundId:'usd',date:'2026-11-01',price:100,currency:'USD',fxRate:0.92,source:'manual',fetchedAt:'2026-11-01'}];const op:InvestmentTransaction={id:'b',fundId:'usd',date:'2026-01-01',type:'buy',amount:920,units:10,price:100,fees:0,currency:'USD',fxRate:0.92};expect(investmentSummary(fund,[op],prices).value).toBe(920);});
});
