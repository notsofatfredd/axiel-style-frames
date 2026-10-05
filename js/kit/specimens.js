/*
 * The 12 strata specimens (§3.2 [R2]), AXIEL's own work only [G2-2], oldest at the bedrock (002) to newest under
 * the lip (013), ordered by the earliest evidence on disk (first commit, or file dates where a repo has no history).
 * PROPOSED at G3 (docs/proposals.md P3-S); the CD signs the list.
 *
 * A graph specimen is the system's real runtime flow cast in brass: every node is a stage that exists in that
 * system's code, every edge a hand-off between them. Nodes sit on a 4 × 3 grid [col, row] (row 0 at the top).
 * The cliff shows only the brass and "SPECIMEN No. 0xx"; the names here are for the record.
 */
export const ARTEFACTS = [
  { name: 'ATLAS', code: null, since: '2026-07-17', type: 'graph', src: 'ATLAS_IDENTITY_OS: 01_TEAM to 05_REVIEW, DESIGN_SYSTEM_COMPILER',
    nodes: [['Team', 0, 1], ['Audit', 1, 1], ['Strategy', 2, 0], ['Design', 3, 1], ['Review', 2, 2], ['Compile', 1, 2]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [4, 2]] },                       // Review → Strategy: restart; → Design: revise
  { name: 'The AXIEL symbol', code: null, since: null, type: 'symbol', src: 'assets/axiel-symbol-ink.png (the approved raster)' },
  { name: 'Autonomous Content Pipeline', code: 'ATL-26218', since: '2026-08-06', type: 'graph', src: 'clipgen agents/orchestrator.py run() (matched by the catalog description)',
    nodes: [['Focus', 0, 0], ['Capture', 1, 0], ['Review', 2, 0], ['Split', 3, 0], ['Encode', 3, 1], ['Caption', 2, 1], ['Post', 1, 1], ['Feedback', 0, 1]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 2]] },        // feedback reaches the review gate
  { name: 'SEO Agent', code: 'ATL-26220', since: '2026-08-07', type: 'graph', src: 'axiel-seo-agent src/index.ts, src/lib/*',
    nodes: [['IMAP', 0, 0], ['Screenshot', 1, 0], ['Analyse', 2, 0], ['Operator email', 3, 0], ['Approval', 3, 1], ['Fix', 2, 2], ['Rejected', 3, 2]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [4, 6]] },
  { name: 'axiel.co.za', code: null, since: '2026-08-15', type: 'site', src: 'the live site structure (SITE in js/kit/city.js)' },
  { name: 'Workflow Agent', code: 'ATL-26222', since: '2026-08-18', type: 'graph', src: 'projects/atlas-workflow src/app/api/capture/route.ts',
    nodes: [['Capture', 0, 1], ['Classify', 1, 1], ['Tasks', 2, 0], ['Ideas', 3, 0], ['Blockers', 3, 1], ['Rules', 3, 2], ['Triangulation', 2, 2]],
    edges: [[0, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [4, 2]] },               // a blocker marks its task BLOCKED
  { name: 'AXIEL Marketplace Demo', code: 'ATL-26241', since: '2026-08-29', type: 'graph', src: 'axiel-marketplace-demo-atl-26241 app.js, stores/*',
    nodes: [['Store switcher', 0, 1], ['Store 1', 1, 0], ['Store 2', 1, 1], ['Store 3', 1, 2], ['Age gate', 2, 0], ['Catalogue', 2, 1], ['Bag', 3, 1], ['Checkout', 3, 2]],
    edges: [[0, 1], [0, 2], [0, 3], [1, 4], [4, 5], [2, 5], [3, 5], [5, 6], [6, 7]] },
  { name: 'Snipe Console', code: 'ATL-26244', since: '2026-09-01', type: 'graph', src: 'snipe-console watcher.mjs, classifier.mjs',
    nodes: [['Config', 0, 0], ['Poll', 1, 0], ['Hash diff', 2, 0], ['Classify', 3, 0], ['Report', 3, 1], ['Backoff', 1, 1]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 1]] },                       // no change: back off, poll again
  { name: 'DevOS', code: 'ATL-26245-B', since: '2026-09-02', type: 'graph', src: 'axiel-developer-os scripts/devos_runtime.py, SYSTEM.md',
    nodes: [['Preflight', 0, 0], ['Specialist wave', 1, 0], ['Collaboration', 2, 0], ['Synthesis', 3, 0], ['Build + QA', 3, 1], ['Release check', 2, 1], ['Learnings', 1, 1]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0]] },               // the maintenance loop
  { name: 'AXIEL Backend Template V2', code: null, since: '2026-09-14', type: 'graph', src: 'reusable-booking-platform-demo app-v2.js bookingFlow, completeBooking',
    nodes: [['Service', 0, 2], ['Specialist', 0.6, 1], ['Time', 1.2, 2], ['Details', 1.8, 1], ['Deposit', 2.4, 2], ['Booked', 3, 1]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]] },
  { name: 'The Gallery Beneath', code: null, since: '2026-10-02', type: 'graph', src: 'this repo, js/camera.js SCENES',
    nodes: [['Surface', 0, 0], ['Fall', 0, 1], ['ATLAS', 0, 2], ['INDEX', 1, 2], ['DEVOS', 2, 2], ['AMOS', 3, 2], ['Proof', 3, 1], ['Seal', 3, 0]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]] },
  { name: 'AXIEL Backend', code: null, since: '2026-10-03', type: 'graph', src: 'axiel-backend workers/app.ts, app/.server/*',
    nodes: [['Worker', 0, 0], ['Resolve site', 1, 0], ['Session', 1, 1], ['Book page', 2, 1], ['Availability', 2, 2], ['Create booking', 3, 2], ['Audit', 3, 1]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]] },
];
