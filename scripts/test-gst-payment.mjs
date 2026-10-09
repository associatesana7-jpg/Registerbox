import assert from 'node:assert/strict';
import { paymentContext, preparePayment, emptyCredit } from '../supabase/functions/_shared/gst-payment.ts';

const heads = ['igst', 'cgst', 'sgst', 'cess'];
const charges = (tx = 0) => Object.fromEntries(heads.map(head => [head, { tx: head === 'igst' ? tx : 0, intr: 0, fee: 0 }]));
const snapshot = { gstin: '29CZYPB0744D1Z8', tx_pmt: { net_tax_pay: [{ liab_ldg_id: 1, trans_typ: 30002, ...charges(100) }] } };
const ledger = { gstin: snapshot.gstin,
  cash_bal: Object.fromEntries(heads.map(head => [head, { tx: 100, intr: 0, fee: 0 }])),
  itc_bal: Object.fromEntries(heads.map(head => [head + '_bal', head === 'igst' ? 40 : 0])),
  itc_blck_bal: Object.fromEntries(heads.map(head => [head + '_blck_bal', 0])),
};
const context = paymentContext(snapshot, ledger);
const cashOnly = preparePayment(context, emptyCredit(), 100);
assert.equal(cashOnly.ready, true);
assert.equal(cashOnly.allocation.pdcash[0].ipd, 100);
assert.throws(() => preparePayment(context, emptyCredit(), undefined), /minimum|amount|decimals/i);
assert.throws(() => preparePayment(context, { ...emptyCredit(), i_pdi: 41 }, 0), /available/i);
const mixed = preparePayment(context, { ...emptyCredit(), i_pdi: 40 }, 60);
assert.equal(mixed.allocation.pdcash[0].ipd, 60);
assert.equal(mixed.ready, true);
assert.throws(() => preparePayment(context, { ...emptyCredit(), i_pdi: 40 }, 61), /minimum/i);
assert.throws(() => paymentContext(snapshot, { ...ledger, gstin: 'different' }), /GSTIN/i);
console.log('GST payment validation passed; no provider writes performed.');
