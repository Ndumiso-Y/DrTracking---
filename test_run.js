
    // --- DATA & CONFIGURATION ---
    const STATUS_MAP = {
        'G':    { label: 'Perfectly on Track', color: 'var(--status-g-color)', bg: 'var(--status-g-bg)' },
        'R':    { label: 'I Need Help',        color: 'var(--status-r-color)', bg: 'var(--status-r-bg)' },
        'A':    { label: 'Needs Attention',    color: 'var(--status-a-color)', bg: 'var(--status-a-bg)' },
        'B':    { label: 'Success / Goal Met', color: 'var(--status-b-color)', bg: 'var(--status-b-bg)' },
        'P':    { label: 'Let\'s Hold Off',    color: 'var(--status-p-color)', bg: 'var(--status-p-bg)' },
        'Grey': { label: 'Not Started Yet',    color: 'var(--status-grey-color)', bg: 'var(--status-grey-bg)' }
    };

    const INIT_DATA = [
        {
            id: 1, title: "Register Trade Name — Refodile Holdings", area: "Governance",
            short: { text: "CIPC name availability check and requirements research (Apr 2026)", due: "2026-04-30" },
            medium: { text: "Submit CIPC registration application (May 2026)", due: "2026-05-31" },
            long: { text: "Receive certificate and update all branding (Jun 2026)", due: "2026-06-30" }
        },
        {
            id: 2, title: "Identify Key Drivers for All Practices", area: "Leadership",
            short: { text: "Financial audit 2023–2026 initiated; practice audits in progress", due: "2026-04-30" },
            medium: { text: "Compile consolidated key driver report per practice", due: "2026-05-31" },
            long: { text: "Embed driver KPIs into practice scorecards", due: "2026-07-31" }
        },
        {
            id: 3, title: "Develop Individual Roadmaps for Each Practice", area: "Leadership",
            short: { text: "Draft roadmaps based on key driver analysis — post audit", due: "2026-05-31" },
            medium: { text: "Present and agree roadmaps with clinical leads", due: "2026-06-30" },
            long: { text: "Quarterly roadmap review cadence established", due: "2026-10-31" }
        },
        {
            id: 4, title: "Compile Partnership Agreement — Dr. Nape", area: "Governance",
            short: { text: "Engage attorney. Draft term sheet for Dr. Nape", due: "2026-04-30" },
            medium: { text: "Review, negotiate and finalise agreement", due: "2026-06-30" },
            long: { text: "Signed agreement executed and filed", due: "2026-07-31" }
        },
        {
            id: 5, title: "Compile Partnership Agreement — Dr. Seabi", area: "Governance",
            short: { text: "Draft term sheet for Dr. Seabi; align on equity and profit share", due: "2026-04-30" },
            medium: { text: "Review, negotiate and finalise agreement", due: "2026-06-30" },
            long: { text: "Signed agreement executed and filed", due: "2026-07-31" }
        },
        {
            id: 6, title: "Appoint a Practice Administrator", area: "HR",
            short: { text: "Linda identified; draft job profile and confirm appointment", due: "2026-04-30" },
            medium: { text: "Conduct induction and handover", due: "2026-05-31" },
            long: { text: "Administrator fully operational in daily management", due: "2026-07-31" }
        },
        {
            id: 7, title: "Solicit Team Buy-in Across All Practices", area: "HR",
            short: { text: "Run team engagement sessions; activate LabourNet for compliance", due: "2026-04-30" },
            medium: { text: "Address concerns and implement quick-win improvements", due: "2026-05-31" },
            long: { text: "Measure engagement and embed culture in onboarding", due: "2026-09-30" }
        },
        {
            id: 8, title: "Roll Out Social Media Strategy", area: "Marketing",
            short: { text: "Tshlodi to revamp and organise existing presence first", due: "2026-05-31" },
            medium: { text: "Go live on WhatsApp, Facebook and Website with 8 weeks content", due: "2026-07-31" },
            long: { text: "500+ followers; Active Google reviews programme", due: "2027-03-27" }
        },
        {
            id: 9, title: "Build & Deploy Intelligence System (Module Plan)", area: "Technology",
            short: { text: "Phase 1: Workflow Engine, Error Detection, Claims Management", due: "2026-06-30" },
            medium: { text: "Phase 2: Financial Intelligence, HR, Compliance Automation", due: "2026-09-30" },
            long: { text: "Full clinical/inventory system live across all 5 practices", due: "2027-03-27" }
        }
    ];

    // --- CLOUD CONFIGURATION ---
    // STEP 1: Create a free account at Supabase.com
    // STEP 2: Create a project and paste your keys below
    const SUPABASE_URL = 'https://qilgxzhmoclzgjibwbwz.supabase.co'; 
    const SUPABASE_KEY = 'sb_publishable_y9O47dwZTA2Ha_STUP5UUg_OvWj0G_V';
    const NOTIFICATION_EMAIL = 'sjdikhing@outlook.com';

    let supabase = null;
    try {
        if (SUPABASE_URL !== 'YOUR_SUPABASE_URL' && window.supabase) {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        }
    } catch (e) {
        console.warn("Supabase initialization failed, running in local-only mode.", e);
    }

    // --- STATE MANAGEMENT ---
    let appState = {};

    async function loadState() {
        // 1. Initial local load
        const saved = localStorage.getItem('dr_tebeila_app_v2');
        if (saved) {
            appState = JSON.parse(saved);
        }
        
        // Ensure every item is initialized
        INIT_DATA.forEach(m => {
            if (!appState[m.id]) appState[m.id] = { status: 'Grey', comments: [] };
        });

        // Render immediately with what we have
        refreshUI();

        // 2. Try to sync with Cloud
        if (supabase) {
            try {
                const { data, error } = await supabase.from('dr_tracking').select('*');
                if (!error && data && data.length > 0) {
                    data.forEach(row => {
                        appState[row.milestone_id] = { 
                            status: row.status, 
                            comments: row.comments || [] 
                        };
                    });
                    refreshUI(); // Re-render with cloud data
                    subscribeToChanges();
                } else if (error) {
                    console.info("Cloud table empty or missing. Waiting for first save.");
                }
            } catch (cloudErr) {
                console.warn("Cloud sync failed. Staying in local mode.", cloudErr);
            }
        }
    }

    function subscribeToChanges() {
        supabase
            .channel('public:dr_tracking')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'dr_tracking' }, payload => {
                const updated = payload.new;
                appState[updated.milestone_id] = { status: updated.status, comments: updated.comments };
                refreshUI();
            })
            .subscribe();
    }

    async function saveState(id) {
        if (supabase) {
            const { error } = await supabase
                .from('dr_tracking')
                .upsert({ 
                    milestone_id: id, 
                    status: appState[id].status, 
                    comments: appState[id].comments 
                }, { onConflict: 'milestone_id' });
            
            if (error) console.error("Cloud Save Error:", error);
            else checkAndNotify(id);
        } else {
            localStorage.setItem('dr_tebeila_app_v2', JSON.stringify(appState));
        }
    }

    // Simple Notify Logic
    function checkAndNotify(id) {
        const milestone = INIT_DATA.find(m => m.id === id);
        const st = appState[id].status;
        
        // Notify on high priority changes (e.g., Goal Met or Help Needed)
        if (st === 'B' || st === 'R') {
            const message = `Dr. Tebeila Update: Goal "${milestone.title}" is now "${STATUS_MAP[st].label}".`;
            console.log(`Sending email to ${NOTIFICATION_EMAIL}: ${message}`);
            // Note: In a production environment, this would trigger an Edge Function 
            // to actually send the email via SendGrid/Resend.
        }
    }

    function cycleStatus(id, event) {
        event.stopPropagation(); // Prevent card from opening/closing
        const stages = ['Grey', 'G', 'B', 'A', 'R', 'P'];
        const current = appState[id]?.status || 'Grey';
        const nextIndex = (stages.indexOf(current) + 1) % stages.length;
        updateMilestone(id, { status: stages[nextIndex] });
    }

    function updateMilestone(id, dataPatch) {
        if(!appState[id]) appState[id] = { status: 'Grey', comments: [] };
        appState[id] = { ...appState[id], ...dataPatch };
        saveState(id);
        refreshUI();
    }

    function addComment(id) {
        const input = document.getElementById(`comment-in-${id}`);
        const text = input.value.trim();
        if(!text) return;
        
        const dateStr = new Date().toLocaleDateString('en-ZA', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        
        const currentComments = appState[id].comments || [];
        updateMilestone(id, { comments: [...currentComments, { text, date: dateStr }] });
        input.value = '';
    }

    // --- UTILITIES ---
    function calcDays(dueStr) {
        const diff = new Date(dueStr) - new Date();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    function formatDate(dueStr) {
        return new Date(dueStr).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function getCountdownBadge(dueStr) {
        const days = calcDays(dueStr);
        if (days < 0) return `<span class="countdown-pill overdue">Overdue (${Math.abs(days)}d)</span>`;
        if (days <= 14) return `<span class="countdown-pill soon">${days}d left</span>`;
        return `<span class="countdown-pill ok">${days}d left</span>`;
    }

    // --- RENDERERS ---
    function renderDashboard() {
        // Initial setup for totals
        const totals = { total: INIT_DATA.length, G: 0, R: 0, A: 0, B: 0, P: 0, Grey: 0 };
        
        // Dynamically build area counts
        const areaCounts = {};
        
        INIT_DATA.forEach(m => {
            const st = appState[m.id]?.status || 'Grey';
            totals[st]++;
            
            // Initialize area if first time seeing it
            if (!areaCounts[m.area]) {
                areaCounts[m.area] = { tot: 0, done: 0 };
            }
            
            areaCounts[m.area].tot++;
            if (st === 'B') areaCounts[m.area].done++;
        });

        // Stats UI
        const completionRate = Math.round((totals.B / totals.total) * 100) || 0;
        const statsContainer = document.getElementById('stats-container');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="stat-card"><div class="stat-num color-main">${totals.total}</div><div class="stat-label">Total Items</div></div>
                <div class="stat-card"><div class="stat-num" style="color:var(--status-b-color)">${completionRate}%</div><div class="stat-label">Overall Completion</div></div>
                <div class="stat-card"><div class="stat-num" style="color:var(--status-g-color)">${totals.G}</div><div class="stat-label">On Track</div></div>
                <div class="stat-card"><div class="stat-num" style="color:var(--status-a-color)">${totals.A}</div><div class="stat-label">Action Needed</div></div>
            `;
        }

        // Area Progress
        const areaList = document.getElementById('area-progress-list');
        if (areaList) {
            areaList.innerHTML = Object.entries(areaCounts).map(([area, data]) => {
                const pct = data.tot ? Math.round((data.done / data.tot) * 100) : 0;
                return `
                <div class="prog-row">
                    <div class="prog-label">${area}</div>
                    <div class="prog-bar-container">
                        <div class="prog-bar-fill" style="width: ${pct}%; background: var(--primary-blue);"></div>
                    </div>
                    <div class="prog-value">${pct}%</div>
                </div>`;
            }).join('');
        }

        // Status Progress
        const statusList = document.getElementById('status-progress-list');
        const distOrder = ['B', 'G', 'A', 'R', 'P', 'Grey'];
        if (statusList) {
            statusList.innerHTML = distOrder.map(stKey => {
                const count = totals[stKey] || 0;
                const pct = Math.round((count / totals.total) * 100) || 0;
                const meta = STATUS_MAP[stKey];
                return `
                <div class="prog-row">
                    <div class="prog-label">
                        <div class="status-dot" style="background:${meta.color}"></div>
                        ${meta.label}
                    </div>
                    <div class="prog-bar-container">
                        <div class="prog-bar-fill" style="width: ${pct}%; background: ${meta.color};"></div>
                    </div>
                    <div class="prog-value">${count}</div>
                </div>`;
            }).join('');
        }
    }

    function toggleCard(id) {
        const el = document.getElementById(`m-card-${id}`);
        // Optional: close siblings
        // document.querySelectorAll('.milestone-card').forEach(c => { if(c.id !== `m-card-${id}`) c.classList.remove('open'); });
        el.classList.toggle('open');
    }

    function renderMilestones() {
        const areaF = document.getElementById('filter-area').value;
        const statusF = document.getElementById('filter-status').value;

        const filtered = INIT_DATA.filter(m => {
            const st = appState[m.id]?.status || 'Grey';
            const matchArea = areaF === 'all' || m.area === areaF;
            const matchStatus = statusF === 'all' || st === statusF;
            return matchArea && matchStatus;
        });

        const container = document.getElementById('milestone-container');
        
        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <p>No milestones found matching your criteria.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(m => {
            const st = appState[m.id]?.status || 'Grey';
            const sMeta = STATUS_MAP[st];
            const comments = appState[m.id]?.comments || [];
            
            // Build Status Selectors
            const statusBtns = Object.entries(STATUS_MAP).map(([k, v]) => `
                <button 
                    class="status-btn-selector ${st === k ? 'selected' : ''}" 
                    style="background-color: ${v.bg}; color: ${v.color};"
                    onclick="updateMilestone(${m.id}, {status: '${k}'})"
                >
                    ${v.label}
                </button>
            `).join('');

            // Build Comments
            const commentsHTML = comments.length > 0 
                ? comments.map(c => `<div class="comment-entry"><div class="comment-date">${c.date}</div><div>${c.text}</div></div>`).join('')
                : `<div style="color:var(--text-muted); font-size:13px; font-style:italic;">No notes yet. Add your thoughts below for your coach.</div>`;

            return `
            <div class="milestone-card" id="m-card-${m.id}">
                <div class="m-header" onclick="toggleCard(${m.id})">
                    <div class="m-id">${m.id}</div>
                    <div class="m-title">Goal: ${m.title}</div>
                    <div class="badge-area">Priority: ${m.area}</div>
                    <div class="badge-status" 
                         style="background:${sMeta.bg}; color:${sMeta.color};"
                         title="Click to quickly change status"
                         onclick="cycleStatus(${m.id}, event)">
                        <div class="status-dot" style="background:${sMeta.color}"></div>
                        ${sMeta.label}
                    </div>
                    <div class="chevron">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                </div>
                
                <div class="m-content">
                    <div class="m-content-inner">
                        <!-- Guidance Box -->
                        <div style="margin: 0 24px 20px; background: var(--secondary-blue); border-radius: var(--radius-md); padding: 16px; border-left: 4px solid var(--primary-blue); font-size: 14px;">
                            <strong style="color: var(--primary-blue); display: block; margin-bottom: 4px;">🎯 What should I do here?</strong>
                            Focus on the <strong>current phase</strong> below. Talk to your coach if you feel stuck or need to move a date.
                        </div>

                        <div class="phases-grid">
                            ${['short', 'medium', 'long'].map(pKey => `
                                <div class="phase-box">
                                    <div class="phase-name">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                        ${pKey.toUpperCase()} TERM
                                    </div>
                                    <div class="phase-desc">${m[pKey].text}</div>
                                    <div class="phase-meta">
                                        <div class="date-label">Due: ${formatDate(m[pKey].due)}</div>
                                        ${getCountdownBadge(m[pKey].due)}
                                    </div>
                                </div>
                            `).join('')}
                        </div>

                        <div class="controls-section">
                            <div class="status-update">
                                <div class="status-update-label">Update My Progress</div>
                                <div class="status-buttons">
                                    ${statusBtns}
                                </div>
                            </div>
                            <div class="comments-section">
                                <div class="status-update-label">My Private Notes & Coach Chat</div>
                                <div class="comments-list">
                                    ${commentsHTML}
                                </div>
                                <div class="comment-input-wrapper">
                                    <input type="text" class="comment-input" id="comment-in-${m.id}" placeholder="Type a message or note..." onkeydown="if(event.key==='Enter') addComment(${m.id})">
                                    <button class="btn btn-primary" style="padding: 8px 16px;" onclick="addComment(${m.id})">Send</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    function renderTimeline() {
        const phasesDef = [
            { key: 'short', title: 'Short Term Goals', target: '26 Jun 2026' },
            { key: 'medium', title: 'Medium Term Goals', target: '31 Jul 2026' },
            { key: 'long', title: 'Long Term Goals', target: '27 Mar 2027' }
        ];

        document.getElementById('timeline-container').innerHTML = phasesDef.map(phase => {
            const cards = INIT_DATA.map(m => {
                const st = appState[m.id]?.status || 'Grey';
                const sMeta = STATUS_MAP[st];
                return `
                <div class="tl-card">
                    <div class="tl-card-header">
                        <span class="badge-area" style="font-size:10px;">${m.area}</span>
                        <div class="badge-status" style="background:${sMeta.bg}; color:${sMeta.color}; font-size:11px; padding: 2px 8px;">${sMeta.label}</div>
                    </div>
                    <div class="tl-title">${m.title}</div>
                    <div class="tl-date">
                        <span>Due Date</span>
                        <strong>${formatDate(m[phase.key].due)}</strong>
                    </div>
                </div>`;
            }).join('');

            return `
            <div class="timeline-phase">
                <div class="timeline-phase-marker"><div class="dot"></div></div>
                <div class="timeline-phase-header">
                    <div class="timeline-phase-title">${phase.title}</div>
                    <span style="font-size:13px; color:var(--text-muted); font-weight:500;">By ${phase.target}</span>
                </div>
                <div class="timeline-cards">
                    ${cards}
                </div>
            </div>`;
        }).join('');
    }

    // --- MAIN ---
    function switchTab(tabId, el) {
        console.log("Switching to tab:", tabId);
        // 1. Clear all
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

        // 2. Activate button
        if (el) {
            el.classList.add('active');
        } else {
            const btns = document.querySelectorAll('.tab-btn');
            if (tabId === 'dashboard') btns[0].classList.add('active');
            if (tabId === 'milestones') btns[1].classList.add('active');
            if (tabId === 'timeline') btns[2].classList.add('active');
        }

        // 3. Activate Page
        const page = document.getElementById(`view-${tabId}`);
        if (page) {
            page.classList.add('active');
            console.log("Page activated:", tabId);
        }
        
        // 4. Update visuals
        refreshUI();
    }

    function refreshUI() {
        try {
            renderDashboard();
            const milesView = document.getElementById('view-milestones');
            const timelineView = document.getElementById('view-timeline');
            if(milesView && milesView.classList.contains('active')) renderMilestones();
            if(timelineView && timelineView.classList.contains('active')) renderTimeline();
        } catch (e) {
            console.error("UI Refresh error:", e);
        }
    }

    // EXPORT FUNC
    function exportData(format) {
        let content, mime, filename;
        
        if (format === 'csv') {
            const head = ['ID', 'Milestone', 'Area', 'Status', 'Short Term Due', 'Medium Term Due', 'Long Term Due', 'NotesCount'].join(',');
            const rows = INIT_DATA.map(m => {
                const st = STATUS_MAP[appState[m.id]?.status || 'Grey'].label;
                const cCount = (appState[m.id]?.comments || []).length;
                return `"${m.id}","${m.title}","${m.area}","${st}","${m.short.due}","${m.medium.due}","${m.long.due}","${cCount}"`;
            });
            content = [head, ...rows].join('\n');
            mime = 'text/csv';
            filename = 'Dr_Tebeila_Plan.csv';
        } else {
            content = "DR. TEBEILA ACTION PLAN SUMMARY\n" + "=".repeat(40) + "\n\n";
            INIT_DATA.forEach(m => {
                const st = STATUS_MAP[appState[m.id]?.status || 'Grey'].label;
                content += `[${m.id}] ${m.title}\nArea: ${m.area} | Status: ${st}\n\n`;
            });
            mime = 'text/plain';
            filename = 'Dr_Tebeila_Summary.txt';
        }

        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([content], {type: mime}));
        a.download = filename;
        a.click();
    }

    window.onload = () => {
        console.log("App loaded. Starting initialization.");
        // 1. Setup default state
        INIT_DATA.forEach(m => {
            if (!appState[m.id]) appState[m.id] = { status: 'Grey', comments: [] };
        });

        // 2. Initial Render
        refreshUI();

        // 3. Set Initial Tab
        switchTab('milestones');

        // 4. Background Cloud Load
        setTimeout(async () => {
            try {
                if (supabase) {
                    const { data, error } = await supabase.from('dr_tracking').select('*');
                    if (!error && data && data.length > 0) {
                        data.forEach(row => {
                            appState[row.milestone_id] = { 
                                status: row.status, 
                                comments: row.comments || [] 
                            };
                        });
                        console.log("Cloud data synced.");
                        refreshUI();
                        subscribeToChanges();
                    }
                }
            } catch (e) {
                console.warn("Cloud connection skipped or failed:", e);
            }
        }, 100);
    };

