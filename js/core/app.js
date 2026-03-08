import * as THREE from 'three';
import { CONFIG } from './config.js';
import { SceneManager } from '../components/scene.js';
import { UIManager } from '../components/ui.js';
import { APIService } from '../services/api.js';
import { DiagnosticsEngine } from '../services/diagnostics.js';
import { PromptManager } from '../data/prompts.js';
import { DegradationEngine } from '../services/simulation.js';
import { PRODUCT_PROFILE, createQCItems, evaluateQCItem } from '../data/domain.js';

class App {
    constructor() {
        this.canvas = document.getElementById('canvas-webgl');
        this.sceneManager = new SceneManager(this.canvas);
        this.uiManager = new UIManager();
        this.apiService = new APIService(CONFIG.API_KEY);
        this.diagnostics = new DiagnosticsEngine();
        this.simulation = new DegradationEngine(); 
        
        this.chatHistory = []; 
        this.scanInProgress = false;

        this.init();
        console.log(`${PRODUCT_PROFILE.name} Loaded`);
        
        setTimeout(() => {
            this.uiManager.addChatMessage('system', `${PRODUCT_PROFILE.name} online: ${PRODUCT_PROFILE.architecture}`);
        }, 1000);
    }

    async init() {
        this.uiManager.init(this);

        try {
            await this.sceneManager.loadCar((percent) => {
                this.uiManager.setLoading(percent);
            });
            this.uiManager.log("Vehicle twin loaded successfully.");
            
            // Listen for Mesh Clicks (Direct interaction)
            window.addEventListener('mesh-clicked', (e) => {
                this.handleMeshClick(e.detail.meshName);
            });

        } catch (e) {
            console.error(e);
            this.uiManager.log("Failed to load vehicle model.", "error");
        }
    }

    handleMeshClick(meshName) {
        console.log("Part Selected:", meshName);
        
        // QC Manual Mode Interception
        if (this.qcState && this.qcState.active && this.qcState.mode === 'manual') {
            this.handleManualQCInspection(meshName);
            return;
        }

        // Check for active faults on this part first
        if (this.sceneManager.highlightedPart && meshName.includes(this.sceneManager.highlightedPart)) {
             // Re-trigger active code logic if it exists
             if (this.sceneManager.activeCode) {
                 this.handleSensorClick(this.sceneManager.activeCode);
                 return;
             }
        }

        // Fallback: Check DB for any faults related to this part type
        let relevantCode = null;
        const db = this.diagnostics.dtcDatabase;
        for (const code in db) {
             const desc = db[code].description_jp.toLowerCase();
             if (meshName.toLowerCase().includes("wheel") && (desc.includes("tire") || desc.includes("brake"))) {
                 relevantCode = code;
                 break;
             }
             if (meshName.toLowerCase().includes("engine") && (desc.includes("misfire") || desc.includes("pressure"))) {
                 relevantCode = code;
                 break;
             }
        }
        
        if (relevantCode) {
             this.handleSensorClick(relevantCode);
        } else {
             // Generic Component Info
            this.uiManager.addChatMessage('ai', `Analyzing component: ${meshName}`);
             this.uiManager.addChatMessage('ai', `
                <strong>Component status: Normal</strong><br>
                Component ID: ${meshName}<br>
                Estimated wear: 12%<br>
                Recommendation: include in next routine inspection
             `, true);
        }
    }

    handleManualQCInspection(meshName) {
        this.uiManager.addChatMessage('system', `Manual QC started: ${meshName}`);
        
        let pos = { x: 0, y: 1, z: 0 };
        if (this.sceneManager.carGroup) {
            let mesh = null;
            this.sceneManager.carGroup.traverse(c => {
                if(c.name === meshName) mesh = c;
            });
            if (mesh) {
                const worldPos = new THREE.Vector3();
                mesh.getWorldPosition(worldPos);
                pos = { x: worldPos.x, y: worldPos.y, z: worldPos.z };
            }
        }

        // Visual Feedback
        this.sceneManager.startPartScan(meshName);
        setTimeout(() => this.sceneManager.stopPartScan(), 1200);

        // Check if item exists in checklist
        const existingItem = this.qcState.items.find(i => meshName.includes(i.target));
        
        if (existingItem) {
            existingItem.status = 'pass';
            this.uiManager.addChatMessage('ai', `QC result: ${existingItem.name} - <span style="color:var(--c-success)">PASS</span>`, true);
            this.sceneManager.createARLabel(existingItem.position, "PASS", "Manual Check OK", "pass");
            setTimeout(() => this.sceneManager.removeLabelsByType('pass'), 1500);
        } else {
             const newId = this.qcState.items.length + 1;
             this.qcState.items.push({
                 id: newId,
                name: `Ad-hoc spot check: ${meshName}`,
                 target: meshName,
                 position: pos,
                 status: 'pass'
             });
             this.uiManager.addChatMessage('ai', `Added spot check: ${meshName} - <span style="color:var(--c-success)">PASS</span>`, true);
             this.sceneManager.createARLabel(pos, "PASS", "Spot Check OK", "pass");
             setTimeout(() => this.sceneManager.removeLabelsByType('pass'), 1500);
        }
        
        this.qcState.checkedCount++;
        this.uiManager.renderQCChecklist(this.qcState.items);
        this.uiManager.updateQCStats(this.qcState.checkedCount, this.qcState.defectsCount);
    }

    handleSensorClick(code) {
        const dtc = this.diagnostics.getDTC(code);
        if (!dtc) return;

        setTimeout(() => {
            const msg = `Fault Detected: ${code}\nSystem: ${dtc.description_jp}`;
            this.uiManager.addChatMessage('ai', msg);

            this.sceneManager.focusOnPosition(dtc.position);
            
            const type = dtc.severity === 'critical' ? 'critical' : 'warning';
            this.sceneManager.createARLabel(dtc.position, code, dtc.description_jp, type);
            
            if (dtc.target_part) {
                this.sceneManager.highlightPartMesh(dtc.target_part, dtc.position, dtc.severity);
            }
            
            this.triggerMarketAnalysis(code, dtc);
        }, 300);
    }

    async triggerMarketAnalysis(code, dtc) {
        this.uiManager.addChatMessage('ai', `<i class="fa-solid fa-magnifying-glass fa-fade"></i> Retrieving maintenance data...`, true);

        try {
            const data = await this.apiService.analyzeMarketPrice(code, dtc.description_jp);
            this.renderAnalysisResult(data);
        } catch (error) {
            console.warn("Market Analysis Failed, using fallback");
            const fallbackData = this.diagnostics.getFallbackMarketAnalysis();
            this.renderAnalysisResult(fallbackData, true);
        }
    }

    renderAnalysisResult(data, isFallback = false) {
        const color = data.action_type === 'REPLACE' ? "var(--c-danger)" : "var(--c-success)";
        const title = isFallback ? "Cost Assessment (Local Fallback)" : "Cost Assessment Recommendation";
        
        const resultMsg = `
            <div class="analysis-result" style="border: 1px solid var(--border-light); padding: 12px; margin-top: 5px; border-radius: 6px; background: rgba(59, 130, 246, 0.1);">
                <div style="color: var(--c-text-muted); font-size: 11px; letter-spacing: 1px; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">
                    <i class="fa-solid fa-clipboard-check"></i> ${title}
                </div>
                <div style="font-weight: bold; font-size: 15px; color: ${color}; margin-bottom: 8px;">
                    ${data.recommendation}
                </div>
                <div style="font-family: var(--f-mono); color: #fff; font-size: 13px;">
                    <i class="fa-solid fa-tags" style="color: var(--c-primary)"></i> Estimated Cost: 
                    <span style="color: #fff;">¥${Number(data.price_min || 0).toLocaleString()} - ¥${Number(data.price_max || 0).toLocaleString()}</span>
                </div>
            </div>
        `;
        this.uiManager.addChatMessage('ai', resultMsg, true);
    }

    async startFullScan() {
        if (this.scanInProgress) {
            this.uiManager.addChatMessage('system', "Full-system inspection is running. Please wait.");
            return;
        }

        this.scanInProgress = true;
        console.log("Starting Full Scan...");
        
        // Use UI Manager to handle progress bar if it exists, or just log
            this.uiManager.addChatMessage('system', "Starting edge full-vehicle intelligent diagnosis...");
        this.uiManager.setScanStatus(true);
        this.sceneManager.startScanningEffect();

        try {
            // 1. Progress Simulation
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 2. Data Fetching
            this.sceneManager.clearARLabels();
            const report = await this.apiService.generateScanReport();

            // 3. Show Result
            this.uiManager.addChatMessage('system', "Edge full-vehicle diagnosis completed.");
            this.showScanResult(report);
            this.uiManager.renderScanReport(report);
        } catch (e) {
            const report = this.diagnostics.getFallbackScanReport();
            this.uiManager.addChatMessage('system', "Cloud diagnosis unavailable. Switched to edge local results.");
            this.showScanResult(report);
            this.uiManager.renderScanReport(report);
        } finally {
            this.sceneManager.stopScanningEffect();
            this.uiManager.setScanStatus(false);
            this.scanInProgress = false;
        }
    }

    showScanResult(report) {
        // Simplified Result Display in Chat
        const color = report.score > 80 ? 'var(--c-success)' : 'var(--c-warning)';
        let html = `
            <div style="background: var(--c-bg-card); padding: 15px; border-radius: 8px; border: 1px solid var(--border-light);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <span style="font-weight:700;">System Health Score</span>
                    <span style="font-family:var(--f-mono); font-size:18px; color:${color};">${report.score}/100</span>
                </div>
                <div style="font-size:13px; color:var(--c-text-muted); margin-bottom:10px;">${report.summary}</div>
        `;

        if (report.issues && report.issues.length > 0) {
            html += `<div style="border-top:1px solid var(--border-light); padding-top:10px;">`;
            report.issues.forEach(issue => {
                const sevColor = issue.severity === 'critical' ? 'var(--c-danger)' : 'var(--c-warning)';
                html += `
                    <div style="margin-bottom:8px; font-size:13px;">
                        <span style="color:${sevColor}; font-weight:600;">[${issue.code}]</span> 
                        <span style="color:#fff;">${issue.system}</span>
                        <div style="color:var(--c-text-muted); font-size:12px; padding-left:10px;">${issue.description}</div>
                    </div>
                `;
                
                // Highlight in 3D
                const dbEntry = this.diagnostics.getDTC(issue.code);
                if (dbEntry) {
                    const severity = dbEntry.severity || 'warning';
                    if (dbEntry.target_part) {
                        this.sceneManager.highlightPartMesh(dbEntry.target_part, dbEntry.position, severity);
                    }
                    this.sceneManager.createARLabel(dbEntry.position, issue.code, issue.description, severity === 'critical' ? 'critical' : 'warning');
                }
            });
            html += `</div>`;
        } else {
            html += `<div style="color:var(--c-success); text-align:center;"><i class="fa-solid fa-check"></i> No abnormal faults detected</div>`;
        }
        
        html += `</div>`;
        this.uiManager.addChatMessage('ai', html, true);
    }

    handleLocalCommand(text) {
        const input = (text || '').toLowerCase();
        const has = (keywords) => keywords.some(k => input.includes(k));

        if (has(['explode', 'expand'])) {
            this.sceneManager.toggleExplodeView();
            this.uiManager.addChatMessage('system', "Exploded view toggled.");
            return true;
        }

        if (has(['reset', 'reset view', 'recenter'])) {
            this.sceneManager.resetView();
            this.uiManager.addChatMessage('system', "View has been reset.");
            return true;
        }

        if (has(['predict', 'future', 'forecast'])) {
            this.uiManager.addChatMessage('system', "Starting future impact assessment...");
            const code = this.sceneManager.activeCode || "P0300";
            const desc = this.diagnostics.getDTC(code)?.description_jp || "Engine misfire";
            this.triggerFutureImpact(code, desc);
            return true;
        }

        if (has(['scan', 'full scan', 'inspection'])) {
            const scanBtn = document.getElementById('nav-scan');
            if (scanBtn) scanBtn.click();
            else this.startFullScan();
            return true;
        }

        return false;
    }

    normalizeAIData(aiData) {
        if (!aiData || typeof aiData !== 'object') {
            return { message: 'No valid diagnostic result returned. Please try again.', action: null };
        }
        if (!aiData.message || typeof aiData.message !== 'string') {
            aiData.message = 'Analysis complete. See the structured diagnostic result below.';
        }
        return aiData;
    }

    async processAIInput(text) {
        if (this.handleLocalCommand(text)) return;
        
        // AI Chat
        const systemPrompt = PromptManager.getSystemPrompt({
            dtcList: Object.keys(this.diagnostics.dtcDatabase)
        });
        
        try {
            const messages = [
                { role: "system", content: systemPrompt },
                ...this.chatHistory.slice(-5),
                { role: "user", content: text }
            ];

            const aiData = this.normalizeAIData(await this.apiService.chat(messages));

            // Save History
            this.chatHistory.push({ role: "user", content: text });
            this.chatHistory.push({ role: "assistant", content: aiData.message });
            this.chatHistory = this.chatHistory.slice(-20);

            // Display
            this.uiManager.addChatMessage('ai', aiData.message);
            
            // Voice Output
            this.uiManager.speak(aiData.message);
            
            // Enterprise Report Card
            if (aiData.root_cause || aiData.estimated_hours) {
                const reportHtml = `
                    <div style="margin-top: 10px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-light); border-radius: 6px; padding: 12px;">
                        <div style="font-size: 11px; font-weight: 700; color: var(--c-primary); margin-bottom: 8px; letter-spacing: 1px;">Engineering Diagnostic Report</div>
                        
                        ${aiData.root_cause ? `
                        <div style="margin-bottom: 6px;">
                            <span style="color: var(--c-text-muted); font-size: 12px;">Root Cause:</span><br>
                            <span style="color: #fff; font-size: 13px;">${aiData.root_cause}</span>
                        </div>` : ''}

                        ${aiData.parts_required ? `
                        <div style="margin-bottom: 6px;">
                            <span style="color: var(--c-text-muted); font-size: 12px;">Recommended Parts:</span><br>
                            <span style="color: var(--c-warning); font-size: 13px; font-family: var(--f-mono);">${aiData.parts_required.join(', ')}</span>
                        </div>` : ''}

                        ${aiData.estimated_hours ? `
                        <div>
                            <span style="color: var(--c-text-muted); font-size: 12px;">Estimated Labor:</span>
                            <span style="color: #fff; font-size: 13px; font-weight: 600;">${aiData.estimated_hours} hours</span>
                        </div>` : ''}
                    </div>
                `;
                this.uiManager.addChatMessage('ai', reportHtml, true);
            }

            // Handle Actions
            this.handleAIActions(aiData);

        } catch (error) {
            console.warn("AI Chat Failed:", error);
            const fallback = this.diagnostics.processLocalFallback(text);
            this.uiManager.addChatMessage('ai', fallback.message);
            this.handleAIActions(fallback);
        }
    }

    handleAIActions(data) {
        if (data.action === 'focus_dtc') {
            const code = data.dtc_code || data.code;
            const dtc = this.diagnostics.getDTC(code) || (data.dtcData);

            if (dtc) {
                this.sceneManager.focusOnPosition(dtc.position);
                
                const severity = dtc.severity || 'warning';
                if (dtc.target_part) {
                    this.sceneManager.highlightPartMesh(dtc.target_part, dtc.position, severity);
                } else {
                    this.sceneManager.highlightPartMesh("Engine", null, severity);
                }

                const type = severity === 'critical' ? 'critical' : 'warning';
                this.sceneManager.createARLabel(dtc.position, code, dtc.description_jp, type);
                
                this.triggerMarketAnalysis(code, dtc);
            }
        } else if (data.action === 'focus_part' && data.target_part) {
            this.sceneManager.focusPart(data.target_part);
        } else if (data.action === 'predict_impact') {
             this.triggerFutureImpact(data.dtc_code || "P0300", "Engine Fault");
        }
    }

    async triggerFutureImpact(code, description) {
        try {
            const faultType = this.simulation.mapDTCToPhysics(code);
            const decayCurve = this.simulation.simulateDecay(faultType, 0.5);
            
            const prompt = PromptManager.getFutureImpactPrompt(code, description);
            const messages = [{ role: "system", content: prompt }, { role: "user", content: "Analyze Future Impact" }];
            
            const data = await this.apiService.chat(messages); 
            
            this.uiManager.showTimeline(data.timeline, decayCurve); 
            this.uiManager.addChatMessage('ai', data.summary);

        } catch (e) {
            console.error(e);
            this.uiManager.showTimeline([
                { period: "1 Month", impact: "Reduced Fuel Efficiency (-15%)", severity: "warning" },
                { period: "6 Months", impact: "Catalytic Converter Failure", severity: "critical" },
                { period: "1 Year", impact: "Engine Seizure Risk", severity: "fatal" }
            ], this.simulation.simulateDecay('mechanical', 0.8));
        }
    }

    resetAIConversation() {
        this.chatHistory = [];
        this.uiManager.clearChat();
        this.uiManager.addChatMessage('system', 'AI conversation has been reset.');
    }

    resetSystem() {
        console.log("Executing Full System Reset...");
        
        // 1. Reset Scene
        this.sceneManager.resetView();
        this.sceneManager.clearARLabels();
        
        // 2. Stop Processes
        this.stopQCScan();
        
        // 3. Reset UI View
        this.uiManager.switchView('dashboard');
        const navDashboard = document.getElementById('nav-dashboard');
        if (navDashboard) navDashboard.click(); // Sync UI tabs
        
        // 4. Clear State
        this.chatHistory = [];
        this.uiManager.clearChat();
        
        // 5. Reset Diagnostics
        this.sceneManager.highlightedPart = null;
        this.sceneManager.activeCode = null;
        this.sceneManager.resolveGlitch();
        
        this.uiManager.addChatMessage('system', 'Full system reset completed.');
    }

    // --- QC / Production Line Mode ---
    
    initQC() {
        this.qcState = {
            active: false,
            mode: 'idle',
            items: createQCItems(),
            checkedCount: 0,
            defectsCount: 0,
            currentItemName: null,
            startedAt: null
        };
        this.uiManager.renderQCChecklist(this.qcState.items);
        this.uiManager.updateQCStats(0, 0);
    }

    // Called when entering the QC View
    enterQCMode() {
        console.log("Entering QC Mode...");
        if (!this.qcState) this.initQC();
        this.uiManager.addChatMessage('system', "Scenario A is ready: choose Auto Inspection or Manual Final Review.");
        this.uiManager.refreshQCOverview();
        this.uiManager.pushQCEvent('info', 'QC workbench is ready');
    }

    startQCScan() {
        console.log("Starting Auto QC Scan...");
        this.stopQCScan();
        
        if (!this.qcState) this.initQC();
        
        this.qcState.active = true;
        this.qcState.mode = 'auto';
        this.qcState.startedAt = Date.now();
        this.qcState.currentItemName = 'Preparing';
        this.uiManager.addChatMessage('system', "Production auto inspection started");
        this.uiManager.pushQCEvent('info', 'Auto inspection started');
        
        this.qcState.items.forEach(i => {
            i.status = 'pending';
            i.defect = null;
        });
        this.qcState.checkedCount = 0;
        this.qcState.defectsCount = 0;
        this.uiManager.renderQCChecklist(this.qcState.items);
        this.uiManager.updateQCStats(0, 0);

        this.processNextQCItem(0);
    }

    async processNextQCItem(index) {
        if (!this.qcState.active || this.qcState.mode !== 'auto') return;
        
        if (index >= this.qcState.items.length) {
            this.uiManager.addChatMessage('system', "QC SEQUENCE COMPLETE.");
            this.generateQCReport();
            this.qcState.mode = 'idle';
            this.qcState.currentItemName = 'Completed';
            this.sceneManager.stopPartScan();
            this.uiManager.refreshQCOverview();
            this.uiManager.pushQCEvent('info', 'Auto inspection completed');
            return;
        }

        const item = this.qcState.items[index];
        item.status = 'active';
        this.qcState.currentItemName = item.name;
        this.uiManager.renderQCChecklist(this.qcState.items);
        this.uiManager.refreshQCOverview();
        
        // Dynamic Positioning Logic
        let targetPos = item.position;
        let camPos = {
            x: item.position.x * 1.5,
            y: item.position.y + 0.5,
            z: item.position.z * 1.5
        };

        const partData = this.sceneManager.getPartPosition(item.target);
        if (partData) {
            // Update item position with real data
            item.position = partData.position; 
            targetPos = partData.position;
            const size = partData.size;
            const maxDim = Math.max(size.x, size.y, size.z);
            
            // Calculate optimal camera position based on bounding box
            const offsetDir = new THREE.Vector3().copy(targetPos).normalize();
            if (offsetDir.lengthSq() < 0.1) offsetDir.set(0, 0, 1); 

            // Dynamic distance
            const distance = Math.max(2.5, maxDim * 2.0); 
            
            camPos = {
                x: targetPos.x + offsetDir.x * distance,
                y: targetPos.y + Math.max(1.0, size.y) + 0.5, 
                z: targetPos.z + offsetDir.z * distance
            };
            
            // Special case adjustments
            if (item.target.includes('Wheel') || item.target.includes('Rim') || item.target.includes('Tire')) {
                camPos.x = targetPos.x + (targetPos.x > 0 ? 2.5 : -2.5);
                camPos.y = targetPos.y + 0.5;
                camPos.z = targetPos.z + 1.5;
            }
        }

        this.sceneManager.focusOnPosition(targetPos, camPos); 
        this.sceneManager.startPartScan(item.target);
        
        const checkSteps = ["Sensor alignment", "Surface data capture", "Tolerance deviation assessment"];
        for(let step of checkSteps) {
            this.uiManager.showInspectionHUD(`${item.name}<br><span style='font-size:12px;color:#aaa'>${step}</span>`);
            await new Promise(r => setTimeout(r, 800)); 
        }
        
        const evaluation = evaluateQCItem(item, index);
        item.status = evaluation.status;
        item.defect = evaluation.defect;
        this.qcState.checkedCount++;
        
        this.sceneManager.stopPartScan();

        if (evaluation.status === 'fail') {
            this.qcState.defectsCount++;
            this.sceneManager.createARLabel(item.position, "FAIL", evaluation.defect, "fail");
            this.uiManager.addChatMessage('ai', `QC exception: ${item.name} - ${evaluation.defect}`, true);
            this.uiManager.pushQCEvent('fail', `${item.name} defect detected: ${evaluation.defect}`);
        } else {
             this.sceneManager.createARLabel(item.position, "PASS", "Within tolerance", "pass");
             this.uiManager.pushQCEvent('pass', `${item.name} passed`);
        }
        
        this.uiManager.hideInspectionHUD();
        this.uiManager.renderQCChecklist(this.qcState.items);
        this.uiManager.updateQCStats(this.qcState.checkedCount, this.qcState.defectsCount);
        
        setTimeout(() => {
            this.sceneManager.removeLabelsByType('pass');
            this.processNextQCItem(index + 1);
        }, 1500);
    }

    generateQCReport() {
        const score = Math.round(((this.qcState.items.length - this.qcState.defectsCount) / this.qcState.items.length) * 100);
        let grade = 'A';
        let color = 'var(--c-success)';
        if (score < 95) { grade = 'B'; color = 'var(--c-primary)'; }
        if (score < 85) { grade = 'C'; color = 'var(--c-warning)'; }
        if (score < 70) { grade = 'F'; color = 'var(--c-danger)'; }

        const html = `
            <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid ${color}; border-radius: 8px; padding: 20px; text-align: center; margin-top: 10px;">
                <div style="font-size: 12px; color: var(--c-text-muted); margin-bottom: 5px; letter-spacing: 2px;">Scenario A Final Inspection Report</div>
                <div style="font-size: 42px; font-weight: 800; color: ${color}; margin-bottom: 5px; line-height: 1;">Grade ${grade}</div>
                <div style="font-size: 14px; color: #fff; margin-bottom: 15px;">Quality Score: ${score}%</div>
                
                <div style="display: flex; justify-content: space-around; margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px;">
                    <div>
                        <div style="font-size: 20px; color: #fff; font-weight: 700;">${this.qcState.items.length}</div>
                        <div style="font-size: 10px; color: var(--c-text-muted);">Checked Items</div>
                    </div>
                    <div>
                        <div style="font-size: 20px; color: var(--c-danger); font-weight: 700;">${this.qcState.defectsCount}</div>
                        <div style="font-size: 10px; color: var(--c-text-muted);">Defective Items</div>
                    </div>
                    <div>
                        <div style="font-size: 20px; color: var(--c-success); font-weight: 700;">${Math.round((this.qcState.checkedCount / this.qcState.items.length) * 100)}%</div>
                        <div style="font-size: 10px; color: var(--c-text-muted);">Completion Rate</div>
                    </div>
                </div>
                <div style="margin-top: 20px;">
                    <button class="btn btn-sm btn-primary" style="width: 100%;" onclick="document.getElementById('nav-history').click()">
                        <i class="fa-solid fa-file-export"></i> Archive to Closed-Loop Records
                    </button>
                </div>
            </div>
        `;
        this.uiManager.addChatMessage('ai', html, true);
    }

    exportQCReport() {
        if (!this.qcState || !this.qcState.items) return;
        const score = Math.round(((this.qcState.items.length - this.qcState.defectsCount) / this.qcState.items.length) * 100);
        const payload = {
            reportId: `QC-${Date.now()}`,
            generatedAt: new Date().toISOString(),
            mode: this.qcState.mode,
            checked: this.qcState.checkedCount,
            defects: this.qcState.defectsCount,
            yield: `${score}%`,
            items: this.qcState.items.map(item => ({
                id: item.id,
                name: item.name,
                status: item.status,
                defect: item.defect || null
            }))
        };
        const content = JSON.stringify(payload, null, 2);
        const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qc-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        this.uiManager.addChatMessage('system', 'QC report exported.');
        this.uiManager.pushQCEvent('info', 'QC report exported');
    }

    enableManualQC() {
        // Stop any auto scan
        this.qcState.active = false; 
        
        if (!this.qcState) this.initQC();
        
        this.qcState.active = true;
        this.qcState.mode = 'manual';
        this.qcState.currentItemName = 'Manual selection';
        this.uiManager.addChatMessage('system', "Manual QC mode enabled: click a component for final review.");
        this.uiManager.hideInspectionHUD();
        this.uiManager.refreshQCOverview();
        this.uiManager.pushQCEvent('info', 'Switched to manual QC mode');
        
        // Reset camera to allow user control
        this.sceneManager.resetCamera();
    }

    stopQCScan() {
        this.qcState = this.qcState || {};
        this.qcState.active = false;
        this.qcState.mode = 'idle';
        this.qcState.currentItemName = 'Standby';
        this.uiManager.hideInspectionHUD();
        this.sceneManager.clearARLabels();
        this.uiManager.refreshQCOverview();
    }

    focusQCItem(id) {
        const item = this.qcState.items.find(i => i.id === id);
        if (item) {
            const camPos = {
                x: item.position.x * 1.5,
                y: item.position.y + 0.5,
                z: item.position.z * 1.5
            };
            this.sceneManager.focusOnPosition(item.position, camPos);
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
