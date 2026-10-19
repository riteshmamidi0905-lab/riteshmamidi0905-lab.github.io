# Tool and connector audit — 2026-10-19

All observations refer to this session. Do not infer availability in another client.

| Capability | Observation | Decision / limit |
|---|---|---|
| GitHub MCP | Connected; both public repositories readable; engineering metadata reports push permission | Use connector for public read/write on an isolated development branch. No merge/deploy authorization. |
| Git HTTPS / shell HTTP | Proxy connection / socket permission failures in normal sandbox | Connector successfully read branches, trees, workflows and logs. Do not bypass proxy or expose credentials. |
| Managed cloud | Running; no configured secrets, runtime variables or outbound identities reported | No credential provisioning needed for this offline prototype. HTTP desired unrestricted; readiness state unknown; actual shell requests failed. |
| Runway | Authenticated personal workspace; Free; 500 plan credits, 0 purchased; no visible brand kits; no video models | No generation submitted. Paid generation and credit use require explicit approval. Local FFmpeg alternative used. |
| Runway image availability | nano-banana-pro, nano-banana-2.1, nano-banana-2, nano-banana-2-lite, seedream-5, seedream-5-pro, muse-image, gen-4, gen-4-image-turbo | Availability is not a quoted price. Per-model consumption not established through a pricing read. No cost estimate invented; any future proposal needs a current quote before approval. |
| Image generation | Native tool callable; usage billing not established | Not invoked; twelve original SVG visuals made locally. |
| Video generation | Runway tools callable but current workspace video entitlement absent | No subscription purchased. Render local review cut instead. |
| Figma | No callable connected Figma tool found | No sensitive authorization requested; use existing CSS and HTML. |
| Node / Python | Node 24.19.0 and Python available | Existing CI pins Node 22; local runtime difference recorded. No additional packages required. |
| FFmpeg | 7.1.5 present | Encode local capture-based film; no narration or third-party soundtrack. |
| Playwright / axe | Existing repository dependencies; system Chromium available | Local tests run outside restrictive process sandbox using approved exec escalation; normal sandbox blocked Chromium process sockets. |
| Lighthouse | Not resolvable as a local package | Do not claim newly measured Lighthouse 99/100. Retain baseline as historical report; local transfer/CLS budgets measured. |
| Remotion / Three.js / GSAP | Not resolvable in repository node_modules | Not installed; CSS perspective, native controls and FFmpeg suffice. |
| Docker | CLI present | No new containers started; engineering CI #132 Docker job independently verified successful. Local daemon readiness not established. |
| FastAPI | Python module present | No backend modifications needed for the browser prototype. |
| LangGraph | Python module not found in current interpreter | Existing engineering CI includes LangGraph checks; not a newly executed local backend suite. |
| Evaluation | Existing Node assertions, Playwright, axe; pandas/matplotlib import specs present | Use existing tools; pytest, deepeval, mlflow not found in current interpreter. No framework installed for this frontend increment. |
| Analytics / visualization | Existing static assets and local charting modules | No tracking or real customer data introduced. |

Security: public source and synthetic fixtures only. No API keys, passcodes, private policy or raw credential bindings copied into deliverables. Browser audit is disposable and is never presented as a real security log. Runway outputs would be external data transfers and credit-consuming; no assets were sent for generation.
