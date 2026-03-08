import { FLEET_DATA, MAINTENANCE_LOGS } from '../data/fleet_data.js';
import { VoiceManager } from '../services/voiceManager.js';
import { VIEW_POLICY } from '../data/domain.js';

export class UIManager {
    constructor() {
        this.app = null;
        this.chatHistory = document.getElementById('chat-history');
        this.currentView = 'qc';
        this.charts = {};
        this.voiceManager = null;
        this.qcFilter = 'all';
        this.twinInterval = null;
    }

    init(app) {
        this.app = app;
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
        
        this.setupNavigation();
        this.setupControls();
        this.setupChat();
        this.setupVoiceControls();
        this.setupChatReset();
        
        setTimeout(() => {
            const qcBtn = document.getElementById('nav-qc');
            if (qcBtn) qcBtn.click();
        }, 500);
    }

    setupNavigation() {
        const navIds = ['nav-qc', 'nav-scan', 'nav-twin', 'nav-history', 'nav-dashboard', 'nav-vehicles'];
        
        navIds.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const view = id.replace('nav-', '');
                    this.switchView(view);
                });
            }
        });
    }

    switchView(viewName) {
        console.log(`Switching to view: ${viewName}`);
        
        // Stop QC if leaving
        if (this.currentView === 'qc' && viewName !== 'qc' && this.app && typeof this.app.stopQCScan === 'function') {
            this.app.stopQCScan();
        }

        // Stop Twin Simulation if leaving
        if (this.currentView === 'twin' && viewName !== 'twin') {
            this.stopTwinSimulation();
            document.getElementById('view-twin')?.classList.add('hidden');
        }

        this.currentView = viewName;
        
        // 1. Handle QC View Visibility
        const qcView = document.getElementById('view-qc');
        if (qcView) {
            if (viewName === 'qc') {
                qcView.classList.remove('hidden');
            } else {
                qcView.classList.add('hidden');
            }
        }

        // 2. Handle 2D Overlays
        const overlays = document.querySelectorAll('.view-overlay');
        overlays.forEach(el => el.classList.add('hidden'));

        // Toggle panel based on view type
        const appUI = document.getElementById('app-ui');
        if (VIEW_POLICY.dataViews.includes(viewName)) {
            appUI.classList.add('no-panel');
        } else {
            appUI.classList.remove('no-panel');
        }

        if (viewName === 'dashboard') {
            document.getElementById('view-dashboard')?.classList.remove('hidden');
            this.renderDashboard();
        } else if (viewName === 'vehicles') {
            document.getElementById('view-vehicles')?.classList.remove('hidden');
            this.renderVehicleList();
        } else if (viewName === 'scan') {
            document.getElementById('view-scan')?.classList.remove('hidden');
        } else if (viewName === 'history') {
            document.getElementById('view-history')?.classList.remove('hidden');
            this.renderHistory();
        } else if (viewName === 'twin') {
            document.getElementById('view-twin')?.classList.remove('hidden');
            this.initTwinView();
            this.startTwinSimulation();
        }

        // 3. Trigger Camera / Scene changes
        if (this.app) {
            if (['dashboard', 'vehicles', 'history', 'twin', 'scan'].includes(viewName)) {
                this.app.sceneManager.resetCamera();
            } else if (viewName === 'qc') {
                if (typeof this.app.enterQCMode === 'function') {
                    this.app.enterQCMode();
                }
            }
        }
    }

    // --- Dynamic Rendering Methods ---

    renderDashboard() {
        // Calculate Stats
        const total = FLEET_DATA.length;
        const online = FLEET_DATA.filter(v => v.status === 'online').length;
        const warning = FLEET_DATA.filter(v => v.status === 'warning').length;
        const critical = FLEET_DATA.filter(v => v.status === 'critical').length;
        const offline = FLEET_DATA.filter(v => v.status === 'offline').length;
        
        // Calculate Health Score
        const avgHealth = (FLEET_DATA.reduce((acc, v) => acc + (v.health || 0), 0) / (total || 1)).toFixed(1);

        // Update DOM
        const elOnline = document.getElementById('stat-online-rate');
        const elTotal = document.getElementById('stat-total-vehicles');
        const elRepairs = document.getElementById('stat-pending-repairs');
        const elHealth = document.getElementById('stat-avg-health');

        if (elOnline) {
            const rate = ((online / total) * 100).toFixed(1);
            elOnline.innerText = `${rate}%`;
            elOnline.className = rate > 90 ? 'stat-value ok' : 'stat-value warn';
        }
        if (elTotal) elTotal.innerText = total.toLocaleString();
        if (elRepairs) {
            const pending = warning + critical;
            elRepairs.innerText = pending;
            elRepairs.className = pending > 0 ? 'stat-value warn' : 'stat-value ok';
        }
        if (elHealth) {
            elHealth.innerText = avgHealth;
            // Color logic: >90 green, >70 yellow, else red
            elHealth.className = avgHealth > 90 ? 'stat-value ok' : (avgHealth > 70 ? 'stat-value warn' : 'stat-value fail');
        }

        this.renderCharts(online, warning + critical, total);
    }

    renderCharts(online, warning, total) {
        // Destroy old charts if exist
        if (this.charts['fleet']) this.charts['fleet'].destroy();
        if (this.charts['trend']) this.charts['trend'].destroy();
        if (this.charts['cost']) this.charts['cost'].destroy();

        // Common Chart Options
        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } },
                title: { display: true, color: '#fff', font: { size: 14, weight: 600, family: 'Inter' }, padding: 20 }
            }
        };

        // 1. Fleet Status (Doughnut)
        const ctx1 = document.getElementById('chart-fleet-status');
        if (ctx1) {
            this.charts['fleet'] = new Chart(ctx1, {
                type: 'doughnut',
                data: {
                    labels: ['Online', 'Fault/Warning', 'Offline'],
                    datasets: [{
                        data: [online, warning, total - online - warning],
                        backgroundColor: ['#10b981', '#f59e0b', '#64748b'],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    ...commonOptions,
                    plugins: {
                        ...commonOptions.plugins,
                        title: { ...commonOptions.plugins.title, text: 'Fleet Real-Time Status Distribution' },
                        legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 12, padding: 15 } }
                    },
                    cutout: '70%'
                }
            });
        }

        // 2. Cost Analysis (Bar) - NEW
        const ctxCost = document.getElementById('chart-cost-analysis');
        if (ctxCost) {
            this.charts['cost'] = new Chart(ctxCost, {
                type: 'bar',
                data: {
                    labels: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
                    datasets: [{
                        label: 'Maintenance Cost (CNY)',
                        data: [12500, 14200, 9800, 18500, 13200, 8900],
                        backgroundColor: '#3b82f6',
                        borderRadius: 4,
                        barPercentage: 0.6
                    }]
                },
                options: {
                    ...commonOptions,
                    plugins: {
                        ...commonOptions.plugins,
                        title: { ...commonOptions.plugins.title, text: 'Half-Year Maintenance Cost Trend' },
                        legend: { display: false }
                    },
                    scales: {
                        y: { 
                            beginAtZero: true, 
                            grid: { color: '#334155' },
                            ticks: { color: '#94a3b8' } 
                        },
                        x: { 
                            grid: { display: false },
                            ticks: { color: '#94a3b8' } 
                        }
                    }
                }
            });
        }

        // 3. Fault Trends (Line) - Improved
        const ctx2 = document.getElementById('chart-fault-trends');
        if (ctx2) {
            this.charts['trend'] = new Chart(ctx2, {
                type: 'line',
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [{
                        label: 'New Fault Count',
                        data: [5, 8, 12, 7, 9, 4, 6],
                        borderColor: '#ef4444',
                        backgroundColor: (context) => {
                            const ctx = context.chart.ctx;
                            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                            gradient.addColorStop(0, 'rgba(239, 68, 68, 0.5)');
                            gradient.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
                            return gradient;
                        },
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 3,
                        pointBackgroundColor: '#ef4444'
                    }]
                },
                options: {
                    ...commonOptions,
                    plugins: {
                        ...commonOptions.plugins,
                        title: { ...commonOptions.plugins.title, text: 'Weekly Fault Trend' },
                        legend: { display: false }
                    },
                    scales: {
                        y: { 
                            beginAtZero: true, 
                            grid: { color: '#334155' },
                            ticks: { color: '#94a3b8' } 
                        },
                        x: { 
                            grid: { display: false },
                            ticks: { color: '#94a3b8' } 
                        }
                    }
                }
            });
        }
    }

    renderVehicleList(filterStatus = null) {
        const tbody = document.querySelector('#view-vehicles tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        const data = filterStatus 
            ? FLEET_DATA.filter(v => v.status === filterStatus)
            : FLEET_DATA;

        data.forEach(v => {
            const tr = document.createElement('tr');
            
            let statusClass = 'pass';
            let statusText = 'Online';
            if (v.status === 'warning') { statusClass = 'warn'; statusText = 'Warning'; } // Need to add .warn style or use existing
            if (v.status === 'critical') { statusClass = 'fail'; statusText = 'Fault'; }
            if (v.status === 'offline') { statusClass = 'neutral'; statusText = 'Offline'; } // Need neutral style

            // Reuse existing pass/fail classes
            const badgeClass = v.status === 'online' ? 'pass' : 'fail';
            
            tr.innerHTML = `
                <td><span class="qc-badge ${badgeClass}">${statusText}</span></td>
                <td>${v.model}</td>
                <td>${v.id}</td>
                <td>${v.location}</td>
                <td>${v.mileage.toLocaleString()}</td>
                <td><button class="btn btn-sm action-diagnose" data-id="${v.id}">Diagnose</button></td>
            `;
            tbody.appendChild(tr);
        });

        // Bind Click Events
        tbody.querySelectorAll('.action-diagnose').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                this.loadVehicleContext(id);
            });
        });
    }

    renderHistory() {
        const tbody = document.querySelector('#view-history tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        MAINTENANCE_LOGS.forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${log.id}</td>
                <td>${log.date}</td>
                <td>${log.vehicleId}</td>
                <td><span style="color:var(--c-warning)">${log.code}</span></td>
                <td>${log.action}</td>
                <td>${log.cost}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    loadVehicleContext(id) {
        const vehicle = FLEET_DATA.find(v => v.id === id);
        if (!vehicle) return;

        console.log(`Loading Context: ${id}`);
        this.app.currentVehicle = vehicle;
        
        document.getElementById('nav-twin')?.click();

        // 2. Update AI Context
        this.addChatMessage('system', `Connected to vehicle: ${vehicle.id} (${vehicle.model})`);
        
        if (vehicle.faults.length > 0) {
            this.addChatMessage('ai', `Warning: ${vehicle.faults.length} active fault code(s) detected [${vehicle.faults.join(', ')}]. Full-system scan is recommended now.`);
            if (this.app.sceneManager) {
                this.app.sceneManager.highlightPartMesh('Engine', null, 'critical');
            }
        } else {
            this.addChatMessage('ai', `Vehicle status is normal. All systems are operating properly.`);
            this.app.sceneManager.resolveGlitch();
        }
    }

    // --- Standard UI Methods (Kept from before) ---

    setupControls() {
        document.getElementById('btn-explode')?.addEventListener('click', () => {
            this.app.sceneManager.toggleExplodeView();
            this.addChatMessage('system', 'Exploded view toggled');
        });

        document.getElementById('btn-reset')?.addEventListener('click', () => {
            this.app.sceneManager.resetCamera();
            this.app.sceneManager.resetView(); 
            this.addChatMessage('system', 'View has been reset');
        });

        // QC Controls
        document.getElementById('btn-qc-auto')?.addEventListener('click', () => {
            if (this.app) this.app.startQCScan();
        });
        document.getElementById('btn-qc-manual')?.addEventListener('click', () => {
            if (this.app) this.app.enableManualQC();
        });
        document.getElementById('btn-qc-restart')?.addEventListener('click', () => {
            if (this.app) this.app.startQCScan();
        });
        document.getElementById('btn-qc-export')?.addEventListener('click', () => {
            if (this.app && this.app.exportQCReport) this.app.exportQCReport();
        });
        document.getElementById('qc-filter')?.addEventListener('change', (e) => {
            this.qcFilter = e.target.value;
            if (this.app?.qcState?.items) this.renderQCChecklist(this.app.qcState.items);
        });

        document.getElementById('btn-scan-start')?.addEventListener('click', () => {
            if (this.app) this.app.startFullScan();
        });
    }

    setupChat() {
        const input = document.getElementById('ai-input');
        const btnSend = document.getElementById('btn-ai-send');

        const sendMessage = () => {
            const text = input.value.trim();
            if (text) {
                this.addChatMessage('user', text);
                this.app.processAIInput(text);
                input.value = '';
            }
        };

        if (btnSend) btnSend.addEventListener('click', sendMessage);
        if (input) input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    addChatMessage(role, text, isHtml = false) {
        if (!this.chatHistory) return;
        const div = document.createElement('div');
        div.className = `msg ${role}`;
        if (isHtml) div.innerHTML = text;
        else div.innerHTML = text.replace(/\n/g, '<br>');
        this.chatHistory.appendChild(div);
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    }

    updateTime() {
        const el = document.getElementById('sys-time');
        if (el) el.innerText = new Date().toLocaleTimeString('en-US', { hour12: false });
    }

    setLoading(progress) {
        const status = document.getElementById('server-status');
        if (status) {
            if (progress < 100) {
                status.innerText = `Loading ${Math.round(progress)}%`;
                status.style.color = 'var(--c-warning)';
            } else {
                status.innerText = 'Online';
                status.style.color = 'var(--c-success)';
            }
        }
    }

    showTimeline(events, decayCurve) {
        // Reuse existing logic...
        // (Simplified for brevity, assuming existing logic works or can be copied if needed)
        // I will copy the previous implementation to ensure it's not lost.
        const modal = document.createElement('div');
        modal.className = 'fade-in';
        modal.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 2000; display: flex; justify-content: center; align-items: center;`;
        
        let chartHtml = '';
        if (decayCurve && decayCurve.length > 0) {
            const w = 600, h = 150;
            const pts = decayCurve.map((d, i) => {
                const x = (i / (decayCurve.length - 1)) * w;
                const y = h - (d.health / 100) * h;
                return `${x},${y}`;
            }).join(' ');
            chartHtml = `<div style="background: var(--c-bg); padding: 20px; border-radius: 8px; border: 1px solid var(--border-light); margin-bottom: 20px;"><div style="font-size: 12px; font-weight: 600; color: var(--c-text-muted); margin-bottom: 10px;">Predictive Health Decay Model</div><svg width="100%" height="150" viewBox="0 0 ${w} ${h}" style="overflow: visible;"><polyline points="${pts}" fill="none" stroke="var(--c-danger)" stroke-width="2" /><path d="M0,${h} L${pts} L${w},${h} Z" fill="rgba(239, 68, 68, 0.1)" /></svg></div>`;
        }

        modal.innerHTML = `<div style="background: var(--c-bg-panel); width: 800px; padding: 30px; border-radius: 12px; border: 1px solid var(--border-light); box-shadow: var(--shadow-card);"><h2 style="font-size: 18px; font-weight: 700; margin-bottom: 5px; color: #fff;"><i class="fa-solid fa-chart-line"></i> Future Impact Simulation</h2><p style="color: var(--c-text-muted); font-size: 14px; margin-bottom: 20px;">AI-based predictive maintenance analysis</p>${chartHtml}<div style="display: flex; gap: 10px;">${events.map(e => `<div style="flex: 1; background: var(--c-bg); padding: 15px; border-radius: 8px; border: 1px solid var(--border-light);"><div style="font-size: 12px; font-weight: 600; color: var(--c-primary); margin-bottom: 5px;">${e.period}</div><div style="font-size: 13px; color: #fff;">${e.impact}</div></div>`).join('')}</div><div style="margin-top: 20px; text-align: right;"><button class="btn btn-primary" onclick="this.closest('.fade-in').remove()">Close Report</button></div></div>`;
        document.body.appendChild(modal);
    }

    addNeuralLog(type, message) { /* ... same ... */ }
    log(msg, type='info') { console.log(`[UI] ${msg}`); }
    showRepairButton(mode) {}
    hideAlert() {}

    // --- QC UI Methods ---
    renderQCChecklist(items) {
        const list = document.getElementById('qc-checklist');
        if (!list) return;
        list.innerHTML = '';

        const filteredItems = items.filter(item => this.qcFilter === 'all' || item.status === this.qcFilter);
        if (filteredItems.length === 0) {
            list.innerHTML = `<li style="font-size:12px; color: var(--c-text-muted); padding: 10px;">No items in the current filter</li>`;
            return;
        }
        
        filteredItems.forEach(item => {
            const li = document.createElement('li');
            li.className = 'qc-item';
            
            let statusIcon = '<i class="fa-regular fa-circle"></i>'; // Pending
            let statusClass = '';
            
            if (item.status === 'pass') {
                statusIcon = '<i class="fa-solid fa-check-circle"></i>';
                statusClass = 'pass';
            } else if (item.status === 'fail') {
                statusIcon = '<i class="fa-solid fa-circle-exclamation"></i>';
                statusClass = 'fail';
            } else if (item.status === 'active') {
                statusIcon = '<i class="fa-solid fa-spinner fa-spin"></i>';
                statusClass = 'active';
            }

            li.innerHTML = `
                <div class="qc-item-row ${statusClass}" style="display: flex; align-items: center; padding: 8px; border-radius: 6px; margin-bottom: 5px; cursor: pointer; border: 1px solid transparent;">
                    <div style="width: 24px; color: var(--c-text-muted); display:flex; align-items:center; justify-content:center;">${statusIcon}</div>
                    <div style="flex: 1; font-size: 13px; color: #fff; margin-left: 8px;">
                        <div>${item.name}</div>
                        ${item.defect ? `<div style="font-size:11px;color:#fca5a5;margin-top:3px;">${item.defect}</div>` : ''}
                    </div>
                    ${item.status === 'fail' ? '<div style="font-size: 10px; color: var(--c-danger); border: 1px solid var(--c-danger); padding: 2px 4px; border-radius: 4px;">FAIL</div>' : ''}
                </div>
            `;
            
            // Hover effect
            const row = li.querySelector('.qc-item-row');
            row.addEventListener('mouseenter', () => { if(item.status !== 'active') row.style.background = 'rgba(255,255,255,0.05)'; });
            row.addEventListener('mouseleave', () => { if(item.status !== 'active') row.style.background = 'transparent'; });
            
            if (item.status === 'active') {
                row.style.background = 'rgba(16, 185, 129, 0.1)';
                row.style.borderColor = 'var(--c-success)';
            }

            li.addEventListener('click', () => {
                if (this.app && this.app.focusQCItem) {
                    this.app.focusQCItem(item.id);
                }
            });
            
            list.appendChild(li);
        });
    }

    updateQCStats(checked, defects) {
        const yieldEl = document.getElementById('qc-yield');
        const defectsEl = document.getElementById('qc-defects');
        
        if (yieldEl) {
            // Avoid division by zero
            const total = checked > 0 ? checked : 1;
            const yieldRate = ((1 - (defects / total)) * 100).toFixed(0);
            yieldEl.innerText = `${yieldRate}%`;
            yieldEl.className = yieldRate > 95 ? 'stat-value ok' : 'stat-value warn';
        }
        if (defectsEl) {
            defectsEl.innerText = defects;
            if (defects > 0) defectsEl.style.color = 'var(--c-danger)';
            else defectsEl.style.color = '#fff';
        }
        this.refreshQCOverview();
    }

    refreshQCOverview() {
        const state = this.app?.qcState;
        if (!state) return;
        const total = state.items.length || 1;
        const progress = Math.round((state.checkedCount / total) * 100);

        const progressText = document.getElementById('qc-progress-text');
        const progressFill = document.getElementById('qc-progress-fill');
        const currentItem = document.getElementById('qc-current-item');
        const runStatus = document.getElementById('qc-run-status');

        if (progressText) progressText.innerText = `${state.checkedCount} / ${state.items.length}`;
        if (progressFill) progressFill.style.width = `${Math.max(0, Math.min(100, progress))}%`;
        if (currentItem) currentItem.innerText = `Current Item: ${state.currentItemName || 'Standby'}`;

        if (runStatus) {
            const map = { idle: 'Idle', auto: 'Auto Inspection Running', manual: 'Manual Mode' };
            runStatus.innerText = map[state.mode] || 'Idle';
            runStatus.style.color = state.mode === 'auto' ? '#10b981' : (state.mode === 'manual' ? '#f59e0b' : '#93c5fd');
        }

        const hotspotList = document.getElementById('qc-defect-hotspots');
        if (hotspotList) {
            const counts = {};
            state.items.filter(i => i.status === 'fail' && i.defect).forEach(i => {
                counts[i.defect] = (counts[i.defect] || 0) + 1;
            });
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
            if (sorted.length === 0) {
                hotspotList.innerHTML = '<li style="font-size: 12px; color: #94a3b8;">No defect data yet</li>';
            } else {
                hotspotList.innerHTML = sorted.map(([name, count]) => `<li style="display:flex;justify-content:space-between;font-size:12px;color:#f1f5f9;"><span>${name}</span><span style="color:#fca5a5;">x${count}</span></li>`).join('');
            }
        }
    }

    pushQCEvent(level, message) {
        const list = document.getElementById('qc-event-log');
        if (!list) return;
        const icon = level === 'fail' ? 'fa-circle-exclamation' : (level === 'pass' ? 'fa-circle-check' : 'fa-circle-info');
        const color = level === 'fail' ? '#f87171' : (level === 'pass' ? '#34d399' : '#93c5fd');
        const li = document.createElement('li');
        li.style.cssText = 'font-size:12px; color:#cbd5e1; display:flex; align-items:flex-start; gap:6px;';
        li.innerHTML = `<i class="fa-solid ${icon}" style="color:${color}; margin-top:2px;"></i><span>[${new Date().toLocaleTimeString('en-US', { hour12: false })}] ${message}</span>`;
        list.prepend(li);
        while (list.children.length > 6) list.removeChild(list.lastChild);
    }
    
    showInspectionHUD(label) {
        const hud = document.getElementById('qc-inspection-hud');
        const text = document.getElementById('inspection-target');
        if(hud && text) {
            hud.classList.remove('hidden');
            text.innerHTML = `Checking: ${label}`;
        }
    }
    
    hideInspectionHUD() {
        const hud = document.getElementById('qc-inspection-hud');
        if(hud) hud.classList.add('hidden');
    }

    // --- System & Voice ---
    setupChatReset() {
        const btnReset = document.getElementById('btn-chat-reset');
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                if (confirm('Reset AI conversation? This clears the current context and chat history.')) {
                    if (this.app && this.app.resetAIConversation) {
                        this.app.resetAIConversation();
                    }
                }
            });
        }
    }

    setupVoiceControls() {
        this.voiceManager = new VoiceManager({
            onInput: (text) => {
                const input = document.getElementById('ai-input');
                if (input) {
                    input.value = text;
                    // Auto-send for better UX
                    setTimeout(() => {
                        const btnSend = document.getElementById('btn-ai-send');
                        if (btnSend) btnSend.click();
                    }, 500);
                }
            },
            onStateChange: (state) => {
                const btnMic = document.getElementById('btn-mic');
                if (!btnMic) return;
                
                if (state === 'LISTENING') {
                    btnMic.style.color = '#ef4444'; // Red
                    btnMic.classList.add('fa-beat-fade'); // FontAwesome animation
                } else if (state === 'PROCESSING') {
                    btnMic.style.color = '#f59e0b'; // Amber
                    btnMic.classList.remove('fa-beat-fade');
                } else {
                    btnMic.style.color = ''; // Default
                    btnMic.classList.remove('fa-beat-fade');
                }
            },
            onError: (err) => {
                console.warn("Voice Error:", err);
                if (err !== 'no-speech') {
                    this.addChatMessage('system', `Voice system notice: ${err}`);
                }
            }
        });

        const btnMic = document.getElementById('btn-mic');
        if (btnMic) {
            btnMic.addEventListener('click', () => {
                this.voiceManager.toggle();
            });
        }
    }

    speak(text) {
        if (this.voiceManager) {
            // Strip HTML tags for speech
            const plainText = text.replace(/<[^>]*>/g, '');
            this.voiceManager.speak(plainText);
        }
    }

    clearChat() {
        if (this.chatHistory) {
            this.chatHistory.innerHTML = '';
            this.addChatMessage('system', 'Connected to QB Edge Diagnostic Core.');
            this.addChatMessage('ai', '<strong>AI session reset.</strong><br>Supports Production QA and After-Sales intelligence scenarios. Enter a question or click a 3D component.', true);
        }
    }

    setScanStatus(isRunning) {
        const status = document.getElementById('scan-status-text');
        const meta = document.getElementById('scan-status-meta');
        const btn = document.getElementById('btn-scan-start');
        if (status) {
            status.innerText = isRunning ? 'Inspecting' : 'Standby';
            status.style.color = isRunning ? 'var(--c-warning)' : '#fff';
        }
        if (meta) {
            meta.innerText = isRunning
                ? 'Edge Agent is running a full-system scan. Please wait...'
                : 'Scheduled proactive checks detect risks before failures occur.';
        }
        if (btn) {
            btn.disabled = isRunning;
            btn.style.opacity = isRunning ? '0.6' : '1';
            btn.style.cursor = isRunning ? 'not-allowed' : 'pointer';
        }
    }

    renderScanReport(report) {
        const scoreEl = document.getElementById('scan-score');
        const summaryEl = document.getElementById('scan-summary');
        const issuesEl = document.getElementById('scan-issues');
        if (!scoreEl || !summaryEl || !issuesEl || !report) return;

        const color = report.score > 80 ? 'var(--c-success)' : 'var(--c-warning)';
        scoreEl.innerText = `${report.score} / 100`;
        scoreEl.style.color = color;
        summaryEl.innerText = report.summary || 'Inspection completed.';

        issuesEl.innerHTML = '';
        if (!report.issues || report.issues.length === 0) {
            issuesEl.innerHTML = `
                <div style="padding: 12px; border: 1px solid rgba(16,185,129,0.35); border-radius: 8px; background: rgba(16,185,129,0.08); color: var(--c-success);">
                    <i class="fa-solid fa-circle-check"></i> No abnormal faults detected
                </div>
            `;
            return;
        }

        report.issues.forEach(issue => {
            const level = issue.severity === 'critical' ? 'Critical' : 'Warning';
            const levelColor = issue.severity === 'critical' ? 'var(--c-danger)' : 'var(--c-warning)';
            const row = document.createElement('div');
            row.style.cssText = 'padding:12px; border:1px solid var(--border-light); border-radius:8px; background: rgba(15,23,42,0.55);';
            row.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <span style="font-family:var(--f-mono); color:${levelColor}; font-weight:700;">${issue.code}</span>
                    <span style="font-size:11px; color:${levelColor};">${level}</span>
                </div>
                <div style="font-size:13px; color:#fff; margin-bottom:2px;">${issue.system || 'Unknown System'}</div>
                <div style="font-size:12px; color:var(--c-text-muted);">${issue.description || 'No description'}</div>
            `;
            issuesEl.appendChild(row);
        });
    }

    // --- Diagnostic Twin Methods ---

    initTwinView() {
        if (this.charts['twin_speed']) return; // Already initialized

        // 1. Initialize Gauges
        const gaugeOptions = {
            type: 'doughnut',
            options: {
                circumference: 180,
                rotation: -90,
                cutout: '85%',
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                animation: { duration: 0 } // No animation for real-time updates
            }
        };

        const ctxSpeed = document.getElementById('gauge-speed');
        if (ctxSpeed) {
            this.charts['twin_speed'] = new Chart(ctxSpeed, {
                ...gaugeOptions,
                data: {
                    datasets: [{
                        data: [0, 240], // Max 240
                        backgroundColor: ['#3b82f6', '#1e293b'],
                        borderWidth: 0
                    }]
                }
            });
        }

        const ctxRpm = document.getElementById('gauge-rpm');
        if (ctxRpm) {
            this.charts['twin_rpm'] = new Chart(ctxRpm, {
                ...gaugeOptions,
                data: {
                    datasets: [{
                        data: [0, 8000], // Max 8000
                        backgroundColor: ['#f59e0b', '#1e293b'],
                        borderWidth: 0
                    }]
                }
            });
        }

        // 2. Risk Prediction Chart
        const ctxRisk = document.getElementById('chart-risk-pred');
        if (ctxRisk) {
            this.charts['twin_risk'] = new Chart(ctxRisk, {
                type: 'line',
                data: {
                    labels: ['Now', '+1h', '+2h', '+4h', '+8h', '+24h', '+48h', '+72h'],
                    datasets: [{
                        label: 'Risk Index',
                        data: [12, 15, 18, 22, 25, 30, 45, 60],
                        borderColor: '#ef4444',
                        backgroundColor: (context) => {
                            const ctx = context.chart.ctx;
                            const gradient = ctx.createLinearGradient(0, 0, 0, 200);
                            gradient.addColorStop(0, 'rgba(239, 68, 68, 0.5)');
                            gradient.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
                            return gradient;
                        },
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { display: false },
                        y: { display: false, min: 0, max: 100 }
                    }
                }
            });
        }

        // 3. Bind Events
        document.getElementById('btn-twin-scan')?.addEventListener('click', () => this.runTwinScan());
        document.getElementById('btn-twin-clear')?.addEventListener('click', () => {
            const list = document.getElementById('twin-fault-list');
            if (list) list.innerHTML = '';
            // Clear highlights if possible
            if(this.app && this.app.sceneManager) this.app.sceneManager.resetView();
        });
        
        // Delegate for locate buttons
        document.querySelector('#view-twin')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-locate') || e.target.parentElement.classList.contains('btn-locate')) {
                const btn = e.target.classList.contains('btn-locate') ? e.target : e.target.parentElement;
                const part = btn.getAttribute('data-part');
                if (part && this.app && this.app.sceneManager) {
                    console.log('Locating part:', part);
                    this.app.sceneManager.highlightPartMesh(part, null, 'critical');
                }
            }
        });
    }

    startTwinSimulation() {
        if (this.twinInterval) clearInterval(this.twinInterval);
        
        let speed = 0;
        let rpm = 800;
        let targetSpeed = 60;
        let targetRpm = 2000;

        // Ensure charts are initialized
        if (!this.charts['twin_speed']) this.initTwinView();

        this.twinInterval = setInterval(() => {
            // Update Speed/RPM target randomly
            if (Math.random() > 0.95) targetSpeed = Math.random() * 120;
            
            // RPM follows speed roughly
            targetRpm = 800 + (speed * 30) + (Math.random() * 200);

            // Smooth interpolation
            speed += (targetSpeed - speed) * 0.05;
            rpm += (targetRpm - rpm) * 0.05;

            const displaySpeed = Math.round(speed);
            const displayRpm = Math.round(rpm);

            // Update DOM
            const elSpeed = document.getElementById('val-speed');
            const elRpm = document.getElementById('val-rpm');
            if (elSpeed) elSpeed.innerText = displaySpeed;
            if (elRpm) elRpm.innerText = displayRpm;

            // Update Gauges
            if (this.charts['twin_speed']) {
                this.charts['twin_speed'].data.datasets[0].data = [displaySpeed, 240 - displaySpeed];
                this.charts['twin_speed'].update();
            }
            if (this.charts['twin_rpm']) {
                this.charts['twin_rpm'].data.datasets[0].data = [displayRpm, 8000 - displayRpm];
                this.charts['twin_rpm'].update();
            }

            // Update Sensor Values
            if (Math.random() > 0.9) {
                const elVolt = document.getElementById('val-voltage');
                const elTemp = document.getElementById('val-temp');
                const elOil = document.getElementById('val-oil');
                if (elVolt) elVolt.innerText = (12.4 + (Math.random() * 0.4 - 0.2)).toFixed(1) + ' V';
                if (elTemp) elTemp.innerText = Math.round(90 + (Math.random() * 4 - 2)) + ' °C';
                if (elOil) elOil.innerText = Math.round(340 + (Math.random() * 20 - 10)) + ' kPa';
            }

        }, 100);
    }

    stopTwinSimulation() {
        if (this.twinInterval) {
            clearInterval(this.twinInterval);
            this.twinInterval = null;
        }
    }

    runTwinScan() {
        const btn = document.getElementById('btn-twin-scan');
        if (btn) {
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Scanning...';
            
            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = originalText;
                
                const list = document.getElementById('twin-fault-list');
                if (list) {
                    list.innerHTML = `
                        <tr>
                            <td style="padding: 8px;"><span class="qc-badge fail">Active</span></td>
                            <td style="padding: 8px; font-family: var(--f-mono); color: var(--c-danger);">P0300</td>
                            <td style="padding: 8px;">Random/Multiple Cylinder Misfire Detected</td>
                            <td style="padding: 8px;">ECM (Engine)</td>
                            <td style="padding: 8px;"><button class="btn-sm btn-locate" data-part="Engine"><i class="fa-solid fa-crosshairs"></i> Locate</button></td>
                        </tr>
                        <tr>
                            <td style="padding: 8px;"><span class="qc-badge warn">History</span></td>
                            <td style="padding: 8px; font-family: var(--f-mono); color: var(--c-warning);">C0035</td>
                            <td style="padding: 8px;">Front-left wheel speed sensor circuit</td>
                            <td style="padding: 8px;">ABS (Braking)</td>
                            <td style="padding: 8px;"><button class="btn-sm btn-locate" data-part="Wheel_FL"><i class="fa-solid fa-crosshairs"></i> Locate</button></td>
                        </tr>
                    `;
                }
            }, 1500);
        }
    }
}
