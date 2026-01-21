
import { CONFIG } from './config.js';
import { SceneManager } from './scene.js';
import { UIManager } from './ui.js';
import { VoiceManager } from './voiceManager.js';
import { APIService } from './api.js';
import { DiagnosticsEngine } from './diagnostics.js';
import { PromptManager } from './prompts.js';

class App {
    constructor() {
        this.canvas = document.getElementById('canvas-webgl');
        this.sceneManager = new SceneManager(this.canvas);
        this.uiManager = new UIManager();
        this.apiService = new APIService(CONFIG.API_KEY);
        this.diagnostics = new DiagnosticsEngine();
        
        this.lastInputSource = 'text'; // 'voice' or 'text'
        this.chatHistory = []; 

        this.init();
        console.log("MeltingHack v4.0 (Refactored) Loaded");

        // Initialize Voice Manager
        this.voiceManager = new VoiceManager({
            onInput: (text) => this.handleVoiceInput(text),
            onStateChange: (state) => this.handleVoiceStateChange(state),
            onError: (err) => this.handleVoiceError(err)
        });
        
        // Welcome Message
        setTimeout(() => {
            this.uiManager.addChatMessage('system', 'MeltingHack v4.0 起動完了。\nシステムオールグリーン。');
        }, 1000);
    }

    async init() {
        this.uiManager.init(this);

        try {
            await this.sceneManager.loadCar((percent) => {
                this.uiManager.setLoading(percent);
            });
            this.uiManager.log("Vehicle twin loaded successfully.");
            
            // Add Diagnostic Hotspots
            // Access DTC database directly from diagnostics engine for markers
            this.sceneManager.addSensorMarkers(this.diagnostics.dtcDatabase, (code) => {
                this.handleSensorClick(code);
            });
            
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
        // Find if this mesh corresponds to any active fault or DTC
        // Simple heuristic: check if any DTC description matches the part name
        // OR check if it is the currently highlighted part
        
        console.log("Mesh clicked:", meshName);
        
        // If the part is currently highlighted, we should show the repair info again
        if (this.sceneManager.highlightedPart && meshName.includes(this.sceneManager.highlightedPart)) {
             // 1. Check if we have a known active code stored in SceneManager
             if (this.sceneManager.activeCode) {
                 console.log("Re-triggering active code:", this.sceneManager.activeCode);
                 this.handleSensorClick(this.sceneManager.activeCode);
                 return;
             }

             // 2. Fallback: Try to find relevant code from DB if no active code stored
             let relevantCode = null;
             const db = this.diagnostics.dtcDatabase;
             for (const code in db) {
                 if (meshName.toLowerCase().includes("wheel") && (db[code].description_jp.includes("タイヤ") || db[code].description_jp.includes("ブレーキ"))) {
                     relevantCode = code;
                     break;
                 }
             }
             
             if (relevantCode) {
                 this.handleSensorClick(relevantCode);
             } else {
                 // Fallback if no specific code found but part is highlighted
                 this.uiManager.addChatMessage('ai', "この部品の診断データを表示します。");
                 // Trigger generic market analysis
                 this.triggerMarketAnalysis("GENERIC", { description_jp: "関連部品" });
             }
        }
    }

    handleSensorClick(code) {
        const dtc = this.diagnostics.getDTC(code);
        if (!dtc) return;

        // Simulate AI diagnosis
        setTimeout(() => {
            const msg = `センサー検知: ${code}\nシステム: ${dtc.description_jp}`;
            this.uiManager.addChatMessage('ai', msg);

            this.sceneManager.focusOnPosition(dtc.position);
            this.sceneManager.highlightMarker(code);
            
            if (dtc.severity === 'critical') {
                this.triggerFaultWithCode(code, dtc.description_jp, dtc.position);
            } else {
                this.sceneManager.createARLabel(dtc.position, code, dtc.description_jp);
                this.uiManager.showRepairButton('close');
            }
            
            this.triggerMarketAnalysis(code, dtc);
        }, 500);
    }

    async triggerMarketAnalysis(code, dtc) {
        this.uiManager.addChatMessage('ai', `<i class="fa-solid fa-magnifying-glass fa-beat"></i> 修理ソリューションと市場価格を検索中...`, true);

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
        const color = data.action_type === 'REPLACE' ? "var(--c-alert)" : "var(--c-success)";
        const title = isFallback ? "AI RECOMMENDATION (OFFLINE)" : "AI RECOMMENDATION";
        
        const resultMsg = `
            <div class="analysis-result" style="border: 1px solid var(--c-primary); padding: 12px; margin-top: 5px; border-radius: 6px; background: rgba(0, 243, 255, 0.05);">
                <div style="color: var(--c-text-dim); font-size: 11px; letter-spacing: 1px; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">
                    <i class="fa-solid fa-clipboard-check"></i> ${title}
                </div>
                <div style="font-weight: bold; font-size: 16px; color: ${color}; margin-bottom: 8px;">
                    ${data.recommendation}
                </div>
                <div style="font-family: var(--f-mono); color: #fff; font-size: 14px;">
                    <i class="fa-solid fa-tags" style="color: var(--c-primary)"></i> 市場価格目安:<br>
                    <span style="font-size: 18px; color: var(--c-success);">¥${data.price_min.toLocaleString()} - ¥${data.price_max.toLocaleString()}</span>
                </div>
            </div>
        `;
        this.uiManager.addChatMessage('ai', resultMsg, true);
    }

    onViewChanged(mode) {
        this.sceneManager.moveCameraTo(mode);
    }

    async startFullScan() {
        console.log("Starting Full Scan...");
        
        const bar = document.querySelector('.scan-bar-fill');
        const statusText = document.querySelector('.scan-status-text');
        const logContainer = document.getElementById('scan-logs');
        
        if(bar) bar.style.width = '0%';
        if(logContainer) logContainer.innerHTML = '';
        
        this.sceneManager.startScanningEffect();

        // 1. Progress Bar Animation Promise
        const progressPromise = new Promise(resolve => {
            let startTime = Date.now();
            const duration = 5000; // 5 seconds fixed duration
            
            const timer = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const pct = Math.min(100, (elapsed / duration) * 100);
                
                if (bar) bar.style.width = `${pct}%`;
                if (statusText) statusText.innerText = `SYSTEM SCANNING... ${Math.round(pct)}%`;
                
                // Add Logs at specific percentages
                if (Math.abs(pct - 20) < 1) this.addScanLog(logContainer, "ECU接続中...");
                if (Math.abs(pct - 50) < 1) this.addScanLog(logContainer, "エンジン制御モジュール応答... OK");
                if (Math.abs(pct - 80) < 1) this.addScanLog(logContainer, "ABS/ESPセンサー較正... 完了");

                if (pct >= 100) {
                    clearInterval(timer);
                    resolve();
                }
            }, 50);
        });

        // 2. Data Fetching Promise (Parallel)
        const dataPromise = (async () => {
             try {
                 this.sceneManager.clearARLabels();
                 // Simulate slight delay if API is too fast, or just wait for it
                 const report = await this.apiService.generateScanReport();
                 return { success: true, report };
             } catch (e) {
                 console.error(e);
                 const fallback = this.diagnostics.getFallbackScanReport();
                 return { success: false, report: fallback };
             }
        })();

        // Wait for BOTH (Animation finished AND Data ready)
        // This ensures the bar always reaches 100% and doesn't hang or jump
        const [_, dataResult] = await Promise.all([progressPromise, dataPromise]);

        // 3. Show Result
        this.sceneManager.stopScanningEffect();
        this.addScanLog(logContainer, "分析完了。AIレポート生成中...");
        
        // Force UI update immediately without timeout
        const progressContainer = document.getElementById('scan-progress-container');
        if (progressContainer) progressContainer.classList.add('hidden');
        
        this.showScanResult(dataResult.report);
    }

    addScanLog(container, msg) {
        if (!container) return;
        // Avoid duplicates if interval hits multiple times
        if (container.lastChild && container.lastChild.innerText.includes(msg)) return;
        
        const div = document.createElement('div');
        div.innerText = `> ${msg}`;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    showScanResult(report) {
        const resultContainer = document.getElementById('scan-result-container');
        const scoreEl = document.getElementById('health-score');
        const reportBox = document.getElementById('ai-scan-report');

        document.getElementById('scan-progress-container')?.classList.add('hidden');
        if (resultContainer) {
            resultContainer.classList.remove('hidden');
            resultContainer.style.display = 'block'; // Ensure visibility
        }

        if (scoreEl) {
            scoreEl.innerText = report.score;
            scoreEl.style.color = report.score > 80 ? 'var(--c-success)' : (report.score > 50 ? 'var(--c-primary)' : 'var(--c-alert)');
        }

        let issuesHtml = '';
        if (report.issues && report.issues.length > 0) {
            issuesHtml = report.issues.map(issue => `
                <div class="scan-issue-item ${issue.severity}">
                    <div class="issue-header">
                        <span class="issue-code">${issue.code}</span>
                        <span class="issue-sys">${issue.system}</span>
                    </div>
                    <div class="issue-desc">${issue.description}</div>
                </div>
            `).join('');
            
            // Highlight in 3D
            report.issues.forEach(issue => {
                let position = { x: 0, y: 1.5, z: 0 }; 
                
                // Better mapping using Diagnostics Engine
                const dbEntry = this.diagnostics.getDTC(issue.code);
                if (dbEntry) {
                    position = dbEntry.position;
                    
                    // Trigger highlighting for known parts
                    const severity = dbEntry.severity || 'warning';
                    if (dbEntry.target_part) {
                        this.sceneManager.highlightPartMesh(dbEntry.target_part, position, severity);
                    } else if (dbEntry.description_jp.includes("タイヤ")) {
                         this.sceneManager.highlightPartMesh("Wheel", position, severity);
                    } else if (dbEntry.description_jp.includes("ABS")) {
                         this.sceneManager.highlightPartMesh("Wheel", position, severity); // ABS usually on wheel hub
                    } else if (dbEntry.description_jp.includes("バッテリー")) {
                         this.sceneManager.highlightPartMesh("Battery", position, severity); // Assumes Battery mesh
                    } else {
                         this.sceneManager.highlightPartMesh("Engine", position, severity);
                    }
                }
                
                const type = issue.severity === 'critical' ? 'critical' : 'warning';
                // Use Code as Title for consistency
                this.sceneManager.createARLabel(position, issue.code, issue.description, type);
            });
        } else {
            issuesHtml = `<div style="text-align:center; padding: 20px; color: var(--c-success);"><i class="fa-solid fa-check-circle"></i> 異常なし</div>`;
        }

        if (reportBox) {
            reportBox.innerHTML = `
                <div style="margin-bottom: 15px; font-size: 14px; line-height: 1.5; color: #fff; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                    ${report.summary}
                </div>
                <div class="scan-issues-list">${issuesHtml}</div>
            `;
        }
    }

    async processAIInput(text) {
        this.uiManager.addChatMessage('ai', 'Thinking...');
        this.sceneManager.setMascotState('thinking');
        
        // Handle Client-side commands first
        if (text.includes("分解") || text.includes("explode") || text.includes("中身")) {
            this.sceneManager.toggleExplodeView();
            this.uiManager.addChatMessage('ai', "分解ビューモードに切り替えました。");
            if (this.lastInputSource === 'voice') {
                this.voiceManager.speak("分解モードを展開します。");
            }
            this.sceneManager.setMascotState('idle');
            return;
        }
        
        if (text.includes("元に戻") || text.includes("reset") || text.includes("リセット")) {
            if (this.sceneManager.isExploded) this.sceneManager.toggleExplodeView();
            this.sceneManager.resetCamera();
            this.uiManager.addChatMessage('ai', "ビューをリセットしました。");
            this.sceneManager.setMascotState('idle');
            return;
        }

        if (text.includes("ショールーム") || text.includes("シネマ") || text.includes("cinematic")) {
            this.sceneManager.toggleCinematicMode();
            this.uiManager.addChatMessage('ai', "ショールームモードを開始します。");
            return;
        }

        if (text.includes("予測") || text.includes("予知") || text.includes("predict")) {
            this.uiManager.addChatMessage('ai', "AI予知保全分析を実行中...");
            // Trigger Real Qwen Simulation
            // We need a context code. If one is active, use it. Otherwise default to P0300.
            const code = this.sceneManager.activeCode || "P0300";
            const desc = this.diagnostics.getDTC(code)?.description_jp || "エンジン異常振動";
            
            this.triggerFutureImpact(code, desc);
            return;
        }
        
        // Build Context
        const systemPrompt = PromptManager.getSystemPrompt({
            dtcList: Object.keys(this.diagnostics.dtcDatabase)
        });
        
        try {
            const messages = [
                { role: "system", content: systemPrompt },
                ...this.chatHistory.slice(-5),
                { role: "user", content: text }
            ];

            const model = this.lastInputSource === 'voice' ? "qwen-plus" : "qwen-max";
            console.log(`[AI] Using model: ${model}`);

            const aiData = await this.apiService.chat(messages, model);

            // Cleanup Thinking
            const history = document.getElementById('chat-history');
            if (history && history.lastChild.innerText === 'Thinking...') {
                history.removeChild(history.lastChild);
            }

            // Visualize Thought Process (Neural Log)
            if (aiData.thought_process) {
                this.uiManager.addNeuralLog("THOUGHT_CHAIN", aiData.thought_process);
            }

            // Save History
            this.chatHistory.push({ role: "user", content: text });
            this.chatHistory.push({ role: "assistant", content: aiData.message });

            // Display
            this.uiManager.addChatMessage('ai', aiData.message);
            if (this.lastInputSource === 'voice') {
                this.voiceManager.speak(aiData.message);
            } else {
                this.lastInputSource = 'text';
            }

            // Handle Actions
            this.handleAIActions(aiData);

        } catch (error) {
            console.warn("AI Chat Failed:", error);
            // Fallback
            const fallback = this.diagnostics.processLocalFallback(text);
            this.uiManager.addChatMessage('ai', fallback.message);
            this.textToSpeech(fallback.message); // Use local TTS helper if needed, or voiceManager
            if (this.lastInputSource === 'voice') this.voiceManager.speak(fallback.message);

            this.handleAIActions(fallback);
        }
    }

    handleAIActions(data) {
        if (data.shops && data.shops.length > 0) {
             let shopHtml = `<div class="shop-list" style="margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 5px;">`;
             data.shops.forEach(shop => {
                 shopHtml += `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 13px;">
                        <span style="color: var(--c-primary);"><i class="fa-solid fa-location-dot"></i> ${shop.name}</span>
                        <span style="color: var(--c-text-dim);">${shop.dist}</span>
                    </div>`;
             });
             shopHtml += `</div>`;
             this.uiManager.addChatMessage('ai', shopHtml, true);
        }

        if (data.action === 'focus_dtc') {
            const code = data.dtc_code || data.code;
            const dtc = this.diagnostics.getDTC(code) || (data.dtcData); // Handle fallback structure

            if (dtc) {
                this.sceneManager.focusOnPosition(dtc.position);
                
                // Highlight Logic
                const severity = dtc.severity || 'warning';
                if (dtc.description_jp.includes("タイヤ")) {
                    this.sceneManager.highlightPartMesh("Wheel", dtc.position, severity);
                } else if (dtc.description_jp.includes("ブレーキ")) {
                    this.sceneManager.highlightPartMesh("Wheel", dtc.position, severity);
                } else if (dtc.target_part) {
                    this.sceneManager.highlightPartMesh(dtc.target_part, dtc.position, severity);
                } else {
                    this.sceneManager.highlightPartMesh("Engine", null, severity);
                }

                const type = (dtc.severity === 'critical' || data.status === 'critical') ? 'critical' : 'warning';
                
                if (type === 'critical') {
                    this.triggerFaultWithCode(code, dtc.description_jp, dtc.position);
                } else {
                    this.sceneManager.highlightMarker(code);
                    this.sceneManager.createARLabel(dtc.position, code, dtc.description_jp);
                    this.uiManager.showRepairButton('close');
                }
                
                // Auto-trigger Market Analysis for better UX
                this.triggerMarketAnalysis(code, dtc);
            }
        } else if (data.action === 'engine_fault') {
            this.triggerFault("Engine Anomaly Detected", {x:0, y:1.0, z:0});
        } else if (data.action === 'focus_battery') {
            this.sceneManager.focusPart('battery'); // Assuming scene manager handles this name or we map it
        } else if (data.action === 'focus_part' && data.target_part) {
            this.sceneManager.focusPart(data.target_part);
        } else if (data.action === 'predict_impact') {
             // Handle future simulation
             this.uiManager.addChatMessage('ai', "Qwen-Thinking モデルを使用して、将来の故障リスクをシミュレーションしています...");
             
             // Simulate calling API for impact
             // In reality, we should call a separate API endpoint, but for hackathon demo speed:
             // We can re-use the chat or a specialized method.
             // Let's assume we want to trigger it.
             this.triggerFutureImpact(data.dtc_code || "P0300", "Engine Misfire detected");
        } else {
            // Force Fallback inference if AI didn't return an action but message implies fault
            const inferred = this.diagnostics.inferCodeFromText(data.message);
            if (inferred) {
                const dtc = this.diagnostics.getDTC(inferred);
                if (dtc) {
                    // Re-run as focus_dtc
                    this.handleAIActions({
                        action: 'focus_dtc',
                        dtc_code: inferred,
                        dtcData: dtc,
                        status: dtc.severity
                    });
                }
            }
        }
    }

    // --- Future Impact Simulation ---
    async triggerFutureImpact(code, description) {
        this.sceneManager.setMascotState('thinking');
        
        try {
            const prompt = PromptManager.getFutureImpactPrompt(code, description);
            const messages = [{ role: "system", content: prompt }, { role: "user", content: "Analyze Future Impact" }];
            
            // Use Thinking Model
            const data = await this.apiService.chat(messages, "qwen-max"); // Should be qwen-thinking but using max for reliability in demo
            
            this.uiManager.showTimeline(data.timeline);
            this.uiManager.addChatMessage('ai', data.summary);
            this.sceneManager.setMascotState('idle');

        } catch (e) {
            console.error(e);
            this.sceneManager.setMascotState('idle');
            // Fallback
            this.uiManager.showTimeline([
                { period: "1ヶ月後", impact: "燃費が15%悪化", severity: "warning" },
                { period: "6ヶ月後", impact: "触媒コンバータの破損", severity: "critical" },
                { period: "1年後", impact: "エンジン完全停止・修理費100万円超", severity: "fatal" }
            ]);
        }
    }

    // --- Vision ---
    async triggerVisionAnalysis() {
        const canvas = document.getElementById('canvas-webgl');
        if (!canvas) return;
        
        this.sceneManager.renderer.render(this.sceneManager.scene, this.sceneManager.camera);
        const dataURL = canvas.toDataURL('image/jpeg', 0.8);
        
        this.uiManager.addChatMessage('user', '<i class="fa-solid fa-camera"></i> [画像データを送信中...]');
        this.uiManager.addChatMessage('ai', '<i class="fa-solid fa-eye fa-beat"></i> 視覚情報を解析中... (Qwen-VL)');
        this.sceneManager.setMascotState('thinking');

        const telemetry = this.sceneManager.getSceneTelemetry();
        const telemetryStr = JSON.stringify(telemetry, null, 2);

        try {
            const result = await this.apiService.analyzeVision(dataURL, telemetryStr);
            
            this.uiManager.addChatMessage('ai', `[視覚診断結果]\n${result.analysis}`);
            
            if (this.lastInputSource === 'voice') {
                this.voiceManager.speak(result.analysis);
            }
            
            if (result.faulty_part_name) {
                // Determine severity from analysis or default to warning
                const severity = result.analysis.includes("重大") || result.analysis.includes("critical") ? 'critical' : 'warning';
                this.sceneManager.highlightPartMesh(result.faulty_part_name, null, severity);
            }
            this.sceneManager.setMascotState('idle');

        } catch (e) {
            this.uiManager.addChatMessage('ai', "視覚解析に失敗しました。");
            this.sceneManager.setMascotState('idle');
        }
    }

    // --- Voice Hooks ---
    handleVoiceInput(text) {
        console.log(`[App] Voice Input: ${text}`);
        this.lastInputSource = 'voice';
        this.uiManager.addChatMessage('user', text);
        this.processAIInput(text);
    }

    handleVoiceStateChange(state) {
        console.log(`[App] Voice State: ${state}`);
        const btn = document.getElementById('btn-mic');
        if (!btn) return;

        btn.classList.remove('listening', 'speaking');
        btn.innerHTML = '<i class="fa-solid fa-microphone"></i>';

        switch (state) {
            case 'LISTENING':
                btn.classList.add('listening');
                btn.innerHTML = '<i class="fa-solid fa-microphone-lines"></i>';
                this.sceneManager.setMascotState('listening');
                break;
            case 'SPEAKING':
                btn.classList.add('speaking');
                btn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                this.sceneManager.setMascotState('speaking');
                break;
            case 'PROCESSING':
                this.sceneManager.setMascotState('thinking');
                break;
            case 'IDLE':
            default:
                this.sceneManager.setMascotState('idle');
                break;
        }
    }

    handleVoiceError(err) {
        if (err === 'MOCK_REQUIRED') {
            this.uiManager.addChatMessage('system', "音声認識が利用できないため、シミュレーションモードに切り替えます。");
            this.openVoiceModal();
        }
    }

    toggleVoiceInteraction(btn) {
        this.voiceManager.toggle();
    }
    
    openVoiceModal() {
        // Simple forward to existing UI method if present, or reimplement
        // For brevity, assuming simple DOM manipulation here or reusing old logic
        const modal = document.getElementById('voice-input-modal');
        if (modal) modal.classList.remove('hidden');
        // ... (Simpler implementation needed here or kept from old code)
    }

    // --- Fault Triggers ---
    triggerFault(msg = "CRITICAL FAULT", pos = null) {
        this.sceneManager.triggerGlitch();
        const p = pos || {x: 0, y: 1.5, z: 0};
        this.sceneManager.createARLabel(p, "SYSTEM FAULT", msg);
        this.uiManager.showRepairButton('repair');
        this.uiManager.log(`FAULT DETECTED: ${msg}`, "error");
    }

    triggerFaultWithCode(code, msg, pos) {
        this.sceneManager.triggerGlitch();
        this.sceneManager.createARLabel(pos, code, msg);
        this.sceneManager.highlightMarker(code);
        this.uiManager.showRepairButton('repair');
        this.uiManager.log(`FAULT DETECTED: ${msg}`, "error");
    }

    resolveFault(quiet = false) {
        this.uiManager.hideAlert();
        this.sceneManager.resolveGlitch();
        if (!quiet) {
            this.uiManager.log("Fault resolved. System nominal.");
            this.uiManager.addChatMessage('ai', "障害対応完了。システムは正常に戻りました。");
        }
        setTimeout(() => this.sceneManager.resetCamera(), 1000);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
