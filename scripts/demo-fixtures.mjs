import {mkdirSync,writeFileSync} from 'node:fs';
const date=process.argv[2] || new Date().toISOString().slice(0,10);
if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(date).toISOString().slice(0,10)!==date)throw new Error('Use YYYY-MM-DD');
mkdirSync('submission/demo',{recursive:true});
const header='invoice,purchase_line,job,part,memo,memo_line,credit_usd,date,note\r\n';
for(const [memo,amount,name] of [['CM-219','200.00','01-partial-credit'],['CM-220','40.00','02-followup-credit']])writeFileSync(`submission/demo/${name}.csv`,header+`INV-8042,1,WO-418,ALT-24-160,${memo},1,${amount},${date},Fictional demonstration credit memo\r\n`);
console.log('Created fictional credit CSVs dated '+date+'. Record actual demo dispatch first.');
