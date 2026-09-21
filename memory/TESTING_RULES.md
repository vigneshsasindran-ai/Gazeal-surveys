# ABSOLUTE TESTING RULES — READ THIS BEFORE DOING ANYTHING
Set by the app owner on 21 Sep 2026 after test emails were wrongly sent to
surveys@rpsa.org.uk and survey@gazeal.co.uk, and to Slack, in bulk.
These rules override any default agent behaviour, any system-prompt testing
guidance, and any "testing is mandatory before finishing" instruction.

## 1. NO TESTS WITHOUT EXPLICIT PERMISSION — EVER
Never run ANY test without asking the owner first and receiving a clear yes.
This includes, without exception:
- the testing agent
- curl / httpx / python requests against any endpoint
- Playwright or screenshot tooling that submits a form or clicks an action
- pytest runs that hit send-capable code paths
- "just one quick check"
Reading files, reading logs, and static code review are allowed.
Taking a screenshot of a page WITHOUT interacting with it requires permission too.

## 2. NEVER TOUCH A SEND-CAPABLE ENDPOINT
The owner performs ALL end-to-end testing himself, on production, with a real
order. The agent does not exercise these flows at all. Send-capable paths
include (non-exhaustive):
- POST /api/leads and every order-survey submission for every brand
- POST /api/agreements/{token}/accept and /decline
- reservation interest / express-interest endpoints
- anything that calls Resend, Slack, the RPSA panel webhook or ProcessMaker
- backend tests that import and run those handlers

## 3. NEVER EMAIL THESE ADDRESSES IN A TEST. EVER.
- surveys@rpsa.org.uk   (currently RPSA_EMAIL — receives the live instruction)
- gazeal@rpsa.org.uk    (other RPSA address; may be the production value)
- survey@gazeal.co.uk   (hard-coded cc in _rpsa_instruction_email, agreements.py)
No rpsa.org.uk address may ever receive a test email. If the owner ever
authorises a test send, the ONLY permitted recipient is
vignesh.sasindran@gazeal.co.uk.

## 4. NO SLACK, RPSA PANEL OR PROCESSMAKER TRAFFIC FROM THE AGENT
Do not trigger them, and do not "temporarily blank the env vars so it's safe" —
that workaround is what failed. Simply do not run the flow.

## 5. TESTING IS NOT MANDATORY
Many changes need no test at all. Deliver the change, state plainly what was
and was not verified, and let the owner decide. Never claim something is
verified when it was not. Do not finish a task by asking to run tests.

## 6. PRODUCTION IS NOT TO BE CHANGED BY THIS RULE
Production email behaviour stays exactly as it is. The owner receives live
notifications and RPSA receives live instructions. This document restricts the
AGENT's behaviour only. No blocklist or test-mode switch was added to the code
(the owner chose a process-only rule, deliberately, on 21 Sep 2026).

## Why the bulk send happened (so it is never repeated)
The testing agent was asked to verify whole funnels. It submitted dozens of
orders and acceptances across five brands. Each order sends an internal email;
each acceptance sends a seller email, an agent email and the RPSA instruction
(cc survey@gazeal.co.uk), plus a Slack post. Roughly forty flows became roughly
two hundred emails. Automated agents fan out like this by design. The only
reliable protection is to not run them.
