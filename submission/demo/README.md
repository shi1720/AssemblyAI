# Fictional demonstration files

1. Sign in and load **practice purchases**. Open WO-418 / INV-8042 / line 1.
2. Inspect via live voice or the form. Confirm the purchase match, prepare a return, and record a fictional dispatch reference dated on or before these credit memos.
3. In Credit ledger, import `01-partial-credit.csv`, preview, then confirm. Expect $200 credited / $40 open.
4. Import `02-followup-credit.csv`. Expect $240 credited / $0 open.

The public scripted example uses the same fictional purchase identifiers. A refresh resets that example. The signed-in workspace persists changes.

To regenerate credit dates for a later recording, run `node scripts/demo-fixtures.mjs YYYY-MM-DD`. Never use a future credit date or a date before recorded dispatch. Supplier receipt is a separate recorded event and starts the follow-up clock. These files are not real supplier documents.
