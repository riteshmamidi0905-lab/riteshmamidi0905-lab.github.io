# Synthetic enterprise integration contract — proposed extension

**NASHA Enterprise — Fictional Business Simulation Using Synthetic Data.** This specification does not claim the following expanded transaction/campaign/brewing system is implemented. Reuse existing tested inventory/enterprise models; do not replace them with arbitrary dashboard values.

## Existing implementation and boundaries

The browser enterprise engine (`demo/engine.js`, `demo/data.js`) uses seeded data, integer cents, deterministic clocking and cloned transactional actions. The separate inventory model and eighteen-event operating day add explicit review/rejection, outages, recovery, one receipt, idempotent retry, balanced daily movements and replay. Historical agent recordings and lab/twin summaries use other datasets. They cannot be joined merely by matching similar product names, currency labels or agent names.

## Proposed common synthetic records

Every row carries `simulation_id`, scenario/version, source fixture ID and deterministic event sequence. Join only on explicit stable synthetic keys. Keep currencies in integer minor units and quantities in stated units, with no silent kg/serving/stock-unit conversions.

| Domain | Required source rows | Derived measures and checks |
|---|---|---|
| Revenue | orders, order_lines, unit_price_cents, discount allocations, refunds, location/product/day keys | Gross sales = sum(quantity × price); net sales = gross − allocated discounts − refunds; AOV = net/eligible-order count, with denominator shown |
| Finance | COGS postings, cost layers, actual synthetic expense rows and posting dates | Gross profit = net sales − COGS; operating profit = gross profit − operating expenses; totals reconcile to journal/transaction rows; no invented tax or cash/accrual equivalence |
| Inventory | opening balances and immutable receive/consume/waste/adjust entries with request/idempotency keys | Opening + receipts − consumption − waste + adjustments = closing; reject negative/unbalanced movements and duplicate receipts |
| Marketing | campaign budget/spend rows, impression/click/conversion events, synthetic customer/order keys, attribution rule/version | CPC/CPA/CAC use explicitly stated denominators; attributable revenue links to actual net order lines; ROI = (attributed contribution − spend)/spend with zero-spend behavior defined; do not call revenue/spend profit ROI |
| Retention | synthetic customer/cohort/calendar tables and repeated eligible orders | Cohort retention uses customers eligible to return; show cohort window, denominator and censoring; no unsupported real-world customer retention claim |
| Brewing/kitchen | batches, approved synthetic BOM versions, ingredient reservations/consumption, yields, waste, schedule/capacity and check events | Explicit units/yield, reservation release on cancellation and inventory posting once per completed synthetic batch; no claim recipes were physically tested or beer brewed |
| Governance | request, policy/version, independent actor decision, bounds, refusal/recovery events | Human approval never inferred from motion or viewing a recording; real authentication/persistence are proposed production concerns, not browser role selectors |
| AI operations | actual tool/result/evaluation/failure/recovery records with correlated event IDs | Show recorded versus newly executed/simulated activity separately; reliability denominators include failures and expected refusals distinctly |
| Forecasting | versioned scenario assumptions, input history and forecast result | Label heuristic/scenario arithmetic honestly; trained-model status requires model/data/evaluation evidence, not a demand multiplier |

## Event contract

Preserve event ID, deterministic simulation time, responsible specialist, triggering inputs, recommendation/decision, required authorization, before/after state, tool contract, ledger postings, evidence refs and audit link. Replay reconstructs state from commands and source fixtures, not from animation counters. Historical timestamps remain historical. Proposed business dashboards have no right to mutate stock or auto-approve requests.

Before implementing a combined twin: map actual existing fixture schemas and units; define migrations/adapters; write reconciliation/negative/duplicate/outage/rejection checks; confirm deterministic replay and cross-view state equality; then expose dashboards derived exclusively from those rows. The original founder business model's unknown financial inputs remain unknown. Synthetic success scenarios are separately labeled hypotheses, never real financial evidence.
