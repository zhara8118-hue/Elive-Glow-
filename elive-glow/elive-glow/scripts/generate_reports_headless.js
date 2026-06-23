const fs = require('fs');
const fetch = globalThis.fetch || require('node-fetch');
const SUPA_URL = process.env.SUPABASE_URL || 'https://tuckseawirhrlvzohkyh.supabase.co';
const ANON = process.env.SUPABASE_ANON || 'sb_publishable_MzFR2mhePaeNl0n9bFGcQQ_Dd0-nv0z';
const DATE = process.env.DATE || new Date().toISOString().slice(0,10);

async function fetchJSON(path) {
  const res = await fetch(`${SUPA_URL}${path}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} when fetching ${path}`);
  return res.json();
}

function toCSV(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map(h => {
      const v = r[h] ?? '';
      if (typeof v === 'string' && v.includes(',')) return `"${v.replace(/"/g,'""')}"`;
      return v;
    }).join(','));
  }
  return lines.join('\n');
}

(async ()=>{
  try {
    console.log('Using date', DATE);
    const sales = await fetchJSON(`/rest/v1/sale_transactions?select=*,staff:staff_members(*),branch:branches(*)&sale_date=eq.${DATE}`);
    const expenses = await fetchJSON(`/rest/v1/expenses?select=*,branch:branches(*),category:expense_categories(*)&expense_date=eq.${DATE}`);

    const salesRows = sales.map(s=>({
      Date: s.sale_date, Time: s.appointment_time||'', Customer: s.customer_name||'', Service: s.service_name||'', Staff: (s.staff?.[0]?.name)||'', Branch: s.branch?.[0]?.name||'', Payment: s.payment_type||'', Amount: s.amount||0
    }));

    const expenseRows = expenses.map(e=>({
      Date: e.expense_date, Branch: e.branch?.[0]?.name||'', Category: e.category?.name||'', Amount: e.amount||0, Note: e.note||''
    }));

    const expenseTotal = expenseRows.reduce((s,r)=>s + Number(r.Amount||0),0);
    if (expenseRows.length) expenseRows.push({Date:'', Branch:'', Category:'Total', Amount: expenseTotal, Note: ''});

    const salesCsv = toCSV(salesRows);
    const expCsv = toCSV(expenseRows);

    const salesPath = '/tmp/reports-sales.csv';
    const expPath = '/tmp/reports-expenses.csv';
    fs.writeFileSync(salesPath, salesCsv);
    fs.writeFileSync(expPath, expCsv);

    console.log('Sales sample:');
    console.log(salesCsv.split('\n').slice(0,10).join('\n'));
    console.log('\nExpenses sample:');
    console.log(expCsv.split('\n').slice(0,10).join('\n'));
    console.log('\nFiles written:', salesPath, expPath);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
