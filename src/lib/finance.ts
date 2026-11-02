export type TransactionType = 'income' | 'expense' | 'transfer' | 'investment' | 'refund' | 'fee' | 'adjustment';
export interface Transaction {
  id: string; description: string; amount: number; type: TransactionType; date: string;
  account: string; destinationAccount?: string; category: string; notes?: string; transferId?: string;
  createdAt: string; source: 'manual' | 'import' | 'assistant'; externalId?: string;
}
export interface Account {
  id: string; name: string; institution: string; kind: 'bank' | 'broker' | 'cash' | 'other';
  openingBalance: number; currency: string; active: boolean; updatedAt: string;
}
export interface Budget { id: string; category: string; amount: number; month: string; }
export interface SavingsGoal { id: string; name: string; target: number; current: number; targetDate?: string; monthlyContribution?: number; }
export interface InvestmentPosition { id: string; name: string; isin: string; value: number; contributed: number; }
export interface Fund { id:string; name:string; isin:string; manager?:string; benchmark?:string; category?:string; currency:string; broker:string; productType:'fund'|'etf'|'other'; }
export type InvestmentOperationType='buy'|'sell'|'transfer_in'|'transfer_out'|'dividend'|'reinvestment'|'fee'|'tax'|'correction';
export interface InvestmentTransaction { id:string; fundId:string; date:string; type:InvestmentOperationType; amount:number; units:number; price:number; fees:number; currency:string; fxRate:number; notes?:string; externalRef?:string; }
export interface FundPrice { id:string; fundId:string; date:string; price:number; currency:string; fxRate:number; source:string; fetchedAt:string; }
export interface PortfolioSnapshot { id:string; date:string; marketValue:number; netExternalFlow:number; source:'manual'|'import'; }
export interface WealthSnapshot { id:string; date:string; netWorth:number; }
export interface AppData {
  accounts: Account[]; transactions: Transaction[]; budgets: Budget[]; goals: SavingsGoal[]; investments: InvestmentPosition[];
  funds:Fund[]; investmentTransactions:InvestmentTransaction[]; fundPrices:FundPrice[]; snapshots:PortfolioSnapshot[]; wealthSnapshots:WealthSnapshot[];
}
export const DEFAULT_CATEGORIES = ['Vivienda','Alimentación','Restaurantes','Transporte','Ocio','Suscripciones','Compras','Salud','Formación','Viajes','Nómina','Inversiones','Otros'];
export const toCents = (value: number): number => Math.round((value + Number.EPSILON) * 100);
export const fromCents = (value: number): number => value / 100;
export const euro = (value: number): string => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
export const monthKey = (date = new Date()): string => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
export const todayKey = (): string => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export const uid=()=>globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const initialData: AppData = {
  accounts: [
    { id:'caixabank', name:'Cuenta principal', institution:'CaixaBank', kind:'bank', openingBalance:0, currency:'EUR', active:true, updatedAt:new Date().toISOString() },
    { id:'revolut', name:'Ahorro', institution:'Revolut', kind:'bank', openingBalance:0, currency:'EUR', active:true, updatedAt:new Date().toISOString() },
    { id:'myinvestor', name:'Efectivo', institution:'MyInvestor', kind:'broker', openingBalance:0, currency:'EUR', active:true, updatedAt:new Date().toISOString() },
  ], transactions: [], budgets: [], goals: [], investments: [], funds:[], investmentTransactions:[], fundPrices:[], snapshots:[], wealthSnapshots:[]
};
export function accountBalance(account: Account, transactions: Transaction[]): number {
  let cents = toCents(account.openingBalance);
  for (const t of transactions) {
    const amount = toCents(t.amount);
    if (t.account === account.id) {
      if (t.type === 'income' || t.type === 'refund') cents += amount;
      else if (t.type === 'expense' || t.type === 'fee' || t.type === 'investment' || t.type === 'transfer') cents -= amount;
      else if (t.type === 'adjustment') cents += amount;
    }
    if (t.type === 'transfer' && t.destinationAccount === account.id) cents += amount;
  }
  return fromCents(cents);
}
export function summarize(transactions: Transaction[], now = new Date()) {
  const key = monthKey(now); const current = transactions.filter(t => t.date.slice(0,7) === key);
  const income = current.filter(t => t.type === 'income').reduce((s,t)=>s+toCents(t.amount),0);
  const expense = current.reduce((sum,t)=>sum + (t.type==='expense'||t.type==='fee'?toCents(t.amount):t.type==='refund'?-toCents(t.amount):0),0);
  const savings = income-expense;
  return { income:fromCents(income), expense:fromCents(expense), savings:fromCents(savings), savingsRate:income>0?savings/income*100:null };
}
export function totalNetWorth(accounts: Account[], transactions: Transaction[]): number { return accounts.filter(a=>a.active).reduce((sum,a)=>sum+toCents(accountBalance(a,transactions)),0)/100; }
export function categorySpend(transactions: Transaction[], month = monthKey()): Record<string,number> {
  return transactions.filter(t=>t.date.slice(0,7)===month && ['expense','fee','refund'].includes(t.type)).reduce<Record<string,number>>((acc,t)=>{acc[t.category]=(acc[t.category]??0)+(t.type==='refund'?-toCents(t.amount):toCents(t.amount));return acc;},{});
}
export function csvEscape(value: unknown): string { const s=String(value??''); return /[",\n\r;]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; }

export function fundUnits(fundId:string, operations:InvestmentTransaction[]):number {
  return operations.filter(o=>o.fundId===fundId).reduce((n,o)=>n+(['buy','transfer_in','reinvestment'].includes(o.type)?o.units:['sell','transfer_out'].includes(o.type)?-o.units:o.type==='correction'?o.units:0),0);
}
export function fundCostBasis(fundId:string, operations:InvestmentTransaction[]):number {
  let units=0,cost=0;
  const ordered=operations.filter(o=>o.fundId===fundId).slice().sort((a,b)=>a.date.localeCompare(b.date));
  for(const o of ordered){const amount=toCents(o.amount+o.fees)/100; if(['buy','transfer_in','reinvestment'].includes(o.type)){units+=o.units;cost+=amount;} else if(['sell','transfer_out'].includes(o.type)&&units>0){const sold=Math.min(o.units,units);cost-=cost*(sold/units);units-=sold;} else if(o.type==='fee'||o.type==='tax')cost+=amount; else if(o.type==='correction'){units+=o.units;cost+=amount;}}
  return Math.max(0,cost);
}
export function latestFundPrice(fundId:string, prices:FundPrice[]):FundPrice|undefined {return prices.filter(p=>p.fundId===fundId).sort((a,b)=>b.date.localeCompare(a.date))[0];}
export function investmentSummary(fund:Fund,operations:InvestmentTransaction[],prices:FundPrice[]){const units=fundUnits(fund.id,operations);const price=latestFundPrice(fund.id,prices);const value=price?units*price.price*(price.fxRate||1):0;const cost=fundCostBasis(fund.id,operations);return {units,cost,value,profit:value-cost,price:price?.price,priceDate:price?.date,returnPct:cost>0?(value-cost)/cost*100:null};}
export interface CashFlow {date:string;amount:number}
export function xirr(flows:CashFlow[], terminalValue=0, valuationDate=todayKey()):number|null {
  const all=[...flows.filter(f=>f.amount!==0),...(terminalValue>0?[{date:valuationDate,amount:terminalValue}]:[])].sort((a,b)=>a.date.localeCompare(b.date));
  if(!all.some(f=>f.amount<0)||!all.some(f=>f.amount>0))return null;
  const start=new Date(`${all[0].date}T12:00:00`).getTime();
  const npv=(rate:number)=>all.reduce((sum,f)=>sum+f.amount/Math.pow(1+rate,(new Date(`${f.date}T12:00:00`).getTime()-start)/86400000/365),0);
  let low=-0.9999,high=10,fl=npv(low),fh=npv(high);if(!Number.isFinite(fl)||!Number.isFinite(fh)||fl*fh>0)return null;
  for(let i=0;i<180;i++){const mid=(low+high)/2,fm=npv(mid);if(Math.abs(fm)<1e-7)return mid;if(fl*fm<=0){high=mid;fh=fm;}else{low=mid;fl=fm;}}
  return (low+high)/2;
}
export function fundCashFlows(fundId:string,operations:InvestmentTransaction[]):CashFlow[]{return operations.filter(o=>o.fundId===fundId).map(o=>({date:o.date,amount:['buy','fee','tax'].includes(o.type)?-(o.amount+o.fees):['sell','dividend'].includes(o.type)?o.amount-o.fees:0})).filter(f=>f.amount!==0);}
export function portfolioTwr(snapshots:PortfolioSnapshot[]):number|null {
  const sorted=snapshots.slice().sort((a,b)=>a.date.localeCompare(b.date));if(sorted.length<2)return null;let factor=1;let used=0;
  for(let i=1;i<sorted.length;i++){const prev=sorted[i-1],cur=sorted[i];if(prev.marketValue<=0)continue;const r=(cur.marketValue-cur.netExternalFlow)/prev.marketValue;if(r<0||!Number.isFinite(r))continue;factor*=r;used++;}
  return used?factor-1:null;
}
export function monthlyReport(transactions:Transaction[],months=12,now=new Date()) {return Array.from({length:months},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-(months-1-i),1);const key=monthKey(d);return {month:key,...summarize(transactions,d)};});}
