import { SceneManager } from './scene.js';
import { UIManager } from './ui.js';

// API Configuration
const API_KEY = "sk-11dd6e37e3414e059be298ed8b1a0e59";
const API_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";

// DTC Database (Diagnostic Trouble Codes)
const DTC_DATABASE = {
    // Intake / MAP (Engine Front-Top)
    "P0105": { description_jp: "MAPセンサー回路異常 (Manifold Absolute Pressure)", position: {x:1.8, y:1.2, z:0}, severity: "warning" },
    "P0106": { description_jp: "MAPセンサー範囲/性能不良", position: {x:1.8, y:1.2, z:0}, severity: "warning" },
    "P0107": { description_jp: "MAPセンサー入力低電圧", position: {x:1.8, y:1.2, z:0}, severity: "warning" },
    "P0108": { description_jp: "MAPセンサー入力高電圧", position: {x:1.8, y:1.2, z:0}, severity: "critical" },
    
    // Turbo (Engine Right Side)
    "P0234": { description_jp: "ターボ過給圧過大", position: {x:1.5, y:1.0, z:0.5}, severity: "critical" },
    "P0236": { description_jp: "ターボ過給圧センサー性能異常", position: {x:1.5, y:1.0, z:0.5}, severity: "warning" },
    "P0243": { description_jp: "ウェイストゲートソレノイドA故障", position: {x:1.5, y:1.0, z:0.5}, severity: "warning" },
    "P0245": { description_jp: "ウェイストゲートソレノイドA回路低", position: {x:1.5, y:1.0, z:0.5}, severity: "warning" },
    "P0246": { description_jp: "ウェイストゲートソレノイドA回路高", position: {x:1.5, y:1.0, z:0.5}, severity: "warning" },

    // Fuel (Engine Left/Center)
    "P0087": { description_jp: "燃料レール圧力過低", position: {x:1.6, y:0.9, z:-0.3}, severity: "critical" },
    "P0088": { description_jp: "燃料レール圧力過高", position: {x:1.6, y:0.9, z:-0.3}, severity: "critical" },
    "P0090": { description_jp: "燃料圧力レギュレータ制御回路", position: {x:1.6, y:0.9, z:-0.3}, severity: "warning" },
    "P0091": { description_jp: "燃料圧力レギュレータ制御回路低", position: {x:1.6, y:0.9, z:-0.3}, severity: "warning" },
    "P0092": { description_jp: "燃料圧力レギュレータ制御回路高", position: {x:1.6, y:0.9, z:-0.3}, severity: "warning" },

    // Transmission (Center Underbody)
    "P0745": { description_jp: "圧力制御ソレノイドA故障", position: {x:0.5, y:0.4, z:0}, severity: "warning" },
    "P0746": { description_jp: "圧力制御ソレノイドA性能/スタック", position: {x:0.5, y:0.4, z:0}, severity: "critical" },
    "P0747": { description_jp: "圧力制御ソレノイドA ON固着", position: {x:0.5, y:0.4, z:0}, severity: "critical" },
    "P0748": { description_jp: "圧力制御ソレノイドA電気的故障", position: {x:0.5, y:0.4, z:0}, severity: "warning" },
    "P0776": { description_jp: "圧力制御ソレノイドB性能/スタック", position: {x:0.5, y:0.4, z:0}, severity: "critical" },

    // Chassis / Brake / Tires (Wheels)
    "C1095": { description_jp: "ABS油圧ポンプモーター回路故障", position: {x:2.8, y:0.5, z:1.0}, severity: "critical" }, // Front Left Wheel area
    "C1140": { description_jp: "ブレーキエア圧センサー異常", position: {x:2.8, y:0.5, z:-1.0}, severity: "warning" }, // Front Right
    "C1234": { description_jp: "ブレーキ圧力信号無効/欠落", position: {x:-2.8, y:0.5, z:1.0}, severity: "warning" }, // Rear Left
    
    // Tires (Specific Wheel Positions)
    "C0031": { description_jp: "左前輪速度センサー信号消失", position: {x:2.8, y:0.3, z:1.0}, severity: "warning" },
    "C0034": { description_jp: "右前輪速度センサー信号消失", position: {x:2.8, y:0.3, z:-1.0}, severity: "warning" },
    "TPMS_LF": { description_jp: "左前タイヤ空気圧低下", position: {x:2.8, y:0.6, z:1.2}, severity: "warning" }, // Front Left Outer
    "TPMS_RF": { description_jp: "右前タイヤ空気圧低下", position: {x:2.8, y:0.6, z:-1.2}, severity: "warning" }, // Front Right Outer
    
    // Battery (Front Right / Trunk depending on car, assume Front Right Engine Bay for S90)
    "P0560": { description_jp: "システム電圧異常 (バッテリー)", position: {x:2.0, y:1.0, z:-0.8}, severity: "warning" }
};

// Offline Keyword Mapping
const KEYWORD_MAP = [
    { keywords: ["ブレーキ", "刹车", "brake", "止まらない", "abs"], code: "C1095" },
    { keywords: ["ターボ", "加速", "turbo", "boost", "遅い"], code: "P0234" },
    { keywords: ["燃料", "ガス欠", "fuel", "pressure", "ポンプ"], code: "P0087" },
    { keywords: ["変速", "ギア", "gear", "transmission", "shift"], code: "P0746" },
    { keywords: ["吸気", "空気", "air", "map", "sensor"], code: "P0106" },
    { keywords: ["振動", "揺れ", "vibration", "shake"], code: "P0300" } // Virtual code for general engine fault
];

class App {
    constructor() {
        this.canvas = document.getElementById('canvas-webgl');
        this.sceneManager = new SceneManager(this.canvas);
        this.uiManager = new UIManager();
        this.init();
        console.log("MeltingHack v4.0 Loaded - API Enabled");
    }

    async init() {
        // Init UI
        this.uiManager.init(this);

        // Load Model
        try {
            await this.sceneManager.loadCar((percent) => {
                this.uiManager.setLoading(percent);
            });
            this.uiManager.log("Vehicle twin loaded successfully.");
            
            // Add Diagnostic Hotspots
            this.sceneManager.addSensorMarkers(DTC_DATABASE, (code) => {
                this.handleSensorClick(code);
            });

        } catch (e) {
            console.error(e);
            this.uiManager.log("Failed to load vehicle model.", "error");
        }
    }

    handleSensorClick(code) {
        // Simulate AI diagnosis when marker is clicked
        const dtc = DTC_DATABASE[code];
        
        if (!dtc) {
            console.warn(`DTC code not found in database: ${code}`);
            return;
        }

        // Short delay to simulate processing
        setTimeout(() => {
            // More natural message
            const msg = `センサー検知: ${code}\nシステム: ${dtc.description_jp}`;
            this.uiManager.addChatMessage('ai', msg);

            this.sceneManager.focusOnPosition(dtc.position);
            this.sceneManager.highlightMarker(code); // Highlight clicked marker
            
            if (dtc.severity === 'critical') {
                this.triggerFaultWithCode(code, dtc.description_jp, dtc.position);
            } else {
                // For non-critical, just show label but ALSO show repair button (Close Mode)
                this.sceneManager.createARLabel(dtc.position, "DIAGNOSTIC", dtc.description_jp);
                this.uiManager.showRepairButton('close');
            }
            
            // Trigger Market Analysis
            this.triggerMarketAnalysis(code, dtc);
        }, 500);
    }

    async triggerMarketAnalysis(code, dtc) {
        // 1. Searching Message
        this.uiManager.addChatMessage('ai', `<i class="fa-solid fa-magnifying-glass fa-beat"></i> 修理ソリューションと市場価格を検索中...`, true);

        try {
            // Construct Prompt for Market Analysis
            const systemPrompt = `
You are an expert automotive mechanic AI.
Task: Provide a repair recommendation and estimated market price (in JPY) for a specific vehicle fault code.
Vehicle: Volvo S90 (High-end Sedan)

Input Code: ${code}
Input System: ${dtc.description_jp}

Output Format (JSON ONLY, no markdown):
{
  "recommendation": "One short sentence in Japanese about what needs to be done (e.g., 'ABSポンプユニットの交換推奨' or 'センサーの清掃と再調整')",
  "action_type": "REPLACE" or "REPAIR",
  "price_min": Number (in JPY, e.g. 30000),
  "price_max": Number (in JPY, e.g. 50000)
}
Estimate the price realistically for a Volvo S90 part + labor in Japan.
`;

            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: "qwen-max",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: `Analyze cost for ${code}` }
                    ],
                    temperature: 0.5
                })
            });

            if (!response.ok) throw new Error("API Error");

            const json = await response.json();
            const content = json.choices[0].message.content;
            const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(cleanJson);

            // Render Result
            const color = data.action_type === 'REPLACE' ? "var(--c-alert)" : "var(--c-success)";
            const resultMsg = `
                <div class="analysis-result" style="border: 1px solid var(--c-primary); padding: 12px; margin-top: 5px; border-radius: 6px; background: rgba(0, 243, 255, 0.05);">
                    <div style="color: var(--c-text-dim); font-size: 11px; letter-spacing: 1px; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">
                        <i class="fa-solid fa-clipboard-check"></i> AI RECOMMENDATION
                    </div>
                    <div style="font-weight: bold; font-size: 16px; color: ${color}; margin-bottom: 8px;">
                        ${data.recommendation}
                    </div>
                    <div style="font-family: var(--f-mono); color: #fff; font-size: 14px;">
                        <i class="fa-solid fa-tags" style="color: var(--c-primary)"></i> 市場価格目安 (部品+工賃):<br>
                        <span style="font-size: 18px; color: var(--c-success);">¥${data.price_min.toLocaleString()} - ¥${data.price_max.toLocaleString()}</span>
                    </div>
                </div>
            `;
            
            this.uiManager.addChatMessage('ai', resultMsg, true);

        } catch (error) {
            console.warn("Market Analysis Failed, falling back to demo logic", error);
            // Fallback to random if API fails
            this.triggerMarketAnalysisFallback(code, dtc);
        }
    }

    triggerMarketAnalysisFallback(code, dtc) {
        // Random Logic for Demo (Fallback)
        const isReplace = Math.random() > 0.4; 
        const action = isReplace ? "部品交換 (REPLACE)" : "修理・調整 (REPAIR)";
        const color = isReplace ? "var(--c-alert)" : "var(--c-success)";
        
        const basePrice = Math.floor(Math.random() * 80) * 1000 + 8000;
        const priceMin = basePrice;
        const priceMax = basePrice + Math.floor(Math.random() * 20) * 1000;
        
        const resultMsg = `
            <div class="analysis-result" style="border: 1px solid var(--c-primary); padding: 12px; margin-top: 5px; border-radius: 6px; background: rgba(0, 243, 255, 0.05);">
                <div style="color: var(--c-text-dim); font-size: 11px; letter-spacing: 1px; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">
                    <i class="fa-solid fa-clipboard-check"></i> AI RECOMMENDATION (OFFLINE)
                </div>
                <div style="font-weight: bold; font-size: 16px; color: ${color}; margin-bottom: 8px;">
                    ${action} 推奨
                </div>
                <div style="font-family: var(--f-mono); color: #fff; font-size: 14px;">
                    <i class="fa-solid fa-tags" style="color: var(--c-primary)"></i> 市場価格目安:<br>
                    <span style="font-size: 18px; color: var(--c-success);">¥${priceMin.toLocaleString()} - ¥${priceMax.toLocaleString()}</span>
                </div>
            </div>
        `;
        
        this.uiManager.addChatMessage('ai', resultMsg, true);
    }

    onViewChanged(mode) {
        // Delegate camera movement to SceneManager
        this.sceneManager.moveCameraTo(mode);
        
        if (mode === 'scan') {
            // Do NOT start scan automatically anymore.
            // this.startFullScan();
        }
    }

    async startFullScan() {
        console.log("Starting Full Scan...");
        
        // 1. UI Updates (Progress)
        const logs = [
            { t: 500, msg: "ECU接続中..." },
            { t: 1200, msg: "エンジン制御モジュール応答... OK" },
            { t: 2000, msg: "トランスミッション油圧チェック... OK" },
            { t: 2800, msg: "ABS/ESPセンサー較正... 完了" },
            { t: 3500, msg: "バッテリーセル電圧バランス... 正常" },
            { t: 4200, msg: "テレメトリデータをダウンロード中..." },
            { t: 5000, msg: "分析完了。AIレポート生成中..." }
        ];

        const bar = document.querySelector('.scan-bar-fill');
        const statusText = document.querySelector('.scan-status-text');
        const logContainer = document.getElementById('scan-logs');
        
        // Reset UI
        if(bar) bar.style.width = '0%';
        if(logContainer) logContainer.innerHTML = '';
        
        // Start Camera Animation
        this.sceneManager.startScanningEffect();

        // Run Progress Loop
        let startTime = Date.now();
        const duration = 5500;
        
        const updateProgress = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const pct = Math.min(100, (elapsed / duration) * 100);
            
            if (bar) bar.style.width = `${pct}%`;
            if (statusText) statusText.innerText = `SYSTEM SCANNING... ${Math.round(pct)}%`;
            
            if (pct >= 100) clearInterval(updateProgress);
        }, 50);

        // Run Logs
        logs.forEach(item => {
            setTimeout(() => {
                if(logContainer) {
                    const div = document.createElement('div');
                    div.innerText = `> ${item.msg}`;
                    logContainer.appendChild(div);
                    logContainer.scrollTop = logContainer.scrollHeight;
                }
            }, item.t);
        });

        // 2. Fetch AI Report
        try {
            // Clear old labels before scan
            this.sceneManager.clearARLabels();
            
            const report = await this.generateAIReport();
            
            // 3. Finish Scan
            setTimeout(() => {
                this.sceneManager.stopScanningEffect();
                this.showScanResult(report);
            }, duration + 500);

        } catch (e) {
            console.error(e);
            this.sceneManager.stopScanningEffect();
        }
    }

    async generateAIReport() {
        // Construct Prompt
        const systemPrompt = `
You are an advanced vehicle diagnostic AI for a Volvo S90.
Task: Generate a full system health report JSON.
Randomly simulate:
- 1 Major Issue (Critical) OR 0 Major Issues (Healthy)
- 1-2 Minor Warnings
- Calculate an overall health score (0-100).

Output Format (JSON ONLY):
{
  "score": Number,
  "status": "HEALTHY" | "WARNING" | "CRITICAL",
  "issues": [
    { "system": "Engine/Brake/etc", "code": "Pxxxx", "severity": "critical"|"warning", "description": "Short Japanese description" }
  ],
  "summary": "Short Japanese summary of the vehicle condition."
}
`;
        
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: "qwen-max",
                    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: "Run Diagnostics" }],
                    temperature: 0.7
                })
            });

            if (!response.ok) throw new Error("API Error");
            const json = await response.json();
            const content = json.choices[0].message.content;
            const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJson);

        } catch (error) {
            console.warn("AI Report Failed, using fallback", error);
            return {
                score: 78,
                status: "WARNING",
                issues: [
                    { system: "Tires", code: "TPMS_LF", severity: "warning", description: "左前タイヤ空気圧低下 (2.1 bar)" },
                    { system: "Engine", code: "P0106", severity: "warning", description: "MAPセンサー範囲外信号" }
                ],
                summary: "全体的に良好ですが、タイヤ空気圧と吸気系センサーに軽微な異常が見られます。早めの点検を推奨します。"
            };
        }
    }

    showScanResult(report) {
        const progressContainer = document.getElementById('scan-progress-container');
        const resultContainer = document.getElementById('scan-result-container');
        const scoreEl = document.getElementById('health-score');
        const reportBox = document.getElementById('ai-scan-report');

        if (progressContainer) progressContainer.classList.add('hidden');
        if (resultContainer) resultContainer.classList.remove('hidden');

        // Animate Score
        if (scoreEl) {
            scoreEl.innerText = report.score;
            scoreEl.style.color = report.score > 80 ? 'var(--c-success)' : (report.score > 50 ? 'var(--c-primary)' : 'var(--c-alert)');
        }

        // Render Issues
        let issuesHtml = '';
        if (report.issues && report.issues.length > 0) {
            issuesHtml = report.issues.map(issue => {
                // Generate random price for demo
                const priceMin = Math.floor(Math.random() * 30 + 10) * 1000;
                const priceMax = priceMin + 15000;
                
                return `
                <div class="scan-issue-item ${issue.severity}">
                    <div class="issue-header">
                        <span class="issue-code">エラーコード: ${issue.code}</span>
                        <span class="issue-sys">${issue.system}</span>
                    </div>
                    <div class="issue-desc">${issue.description}</div>
                    <div class="issue-price" style="margin-top: 8px; font-size: 13px; color: var(--c-success); font-family: var(--f-mono);">
                        <i class="fa-solid fa-calculator"></i> AI修理見積もり: ¥${priceMin.toLocaleString()} - ¥${priceMax.toLocaleString()}
                    </div>
                    <div class="issue-action">
                        ${issue.severity === 'critical' ? '<i class="fa-solid fa-triangle-exclamation"></i> 要修理 (REPAIR REQUIRED)' : '<i class="fa-solid fa-circle-info"></i> 点検推奨 (CHECK ADVISED)'}
                    </div>
                </div>
            `}).join('');
            
            // Highlight in 3D
            report.issues.forEach(issue => {
                let position = { x: 0, y: 1.5, z: 0 }; // Default to Engine center

                if (DTC_DATABASE[issue.code]) {
                    position = DTC_DATABASE[issue.code].position;
                } else {
                    console.warn(`Code ${issue.code} not in DB, using default position`);
                }
                
                // Determine type based on severity
                const type = issue.severity === 'critical' ? 'critical' : 'warning';
                // Determine title
                const title = issue.severity === 'critical' ? 'CRITICAL FAULT' : 'SYSTEM WARNING';
                
                this.sceneManager.createARLabel(position, title, issue.description, type);
            });

        } else {
            issuesHtml = `<div style="text-align:center; padding: 20px; color: var(--c-success);"><i class="fa-solid fa-check-circle" style="font-size: 30px; margin-bottom: 10px;"></i><br>異常なし (NO ISSUES DETECTED)</div>`;
        }

        if (reportBox) {
            reportBox.innerHTML = `
                <div style="margin-bottom: 15px; font-size: 14px; line-height: 1.5; color: #fff; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                    ${report.summary}
                </div>
                <div class="scan-issues-list">
                    ${issuesHtml}
                </div>
            `;
        }
    }

    focusPart(part) {
        this.sceneManager.focusPart(part);
        this.uiManager.log(`Focused on ${part}`);
    }

    async processAIInput(text) {
        this.uiManager.addChatMessage('ai', 'Thinking...');
        
        // Regex for Fault Codes (Pxxxx or Cxxxx)
        const codeMatch = text.match(/\b([PC][0-9]{4})\b/i);
        let detectedCode = codeMatch ? codeMatch[1].toUpperCase() : null;

        // Context Construction
        let systemPrompt = `
You are the advanced AI onboard computer of a Volvo S90, named "MeltingHack".
Your role is to analyze user input and vehicle telemetry, then provide a diagnosis.

**CRITICAL TASK: SYMPTOM TO DTC MAPPING**
The user will describe a problem in natural language (Chinese or Japanese). 
You MUST map their description to one of the following DTC codes if applicable.
Even if the user is vague, try to infer the most likely code from the list below.

**Available DTC Codes & Symptoms (You MUST map to one of these):**
- **P0105 (MAP Circuit)**: "intake", "air", "sensor", "power loss"
- **P0234 (Turbo Overboost)**: "turbo", "boost", "acceleration", "fast", "slow"
- **P0087 (Fuel Pressure Low)**: "fuel", "gas", "pump", "stall"
- **P0746 (Trans Solenoid)**: "gear", "shift", "transmission", "clunk"
- **C1095 (ABS Pump)**: "brake", "stop", "abs", "skid", "braking"
- **P0300 (Random Misfire)**: "vibration", "shake", "noise", "engine sound"
- **TPMS_LF (Left Tire)**: "left tire", "left wheel", "flat left"
- **TPMS_RF (Right Tire)**: "right tire", "right wheel", "flat right"
- **P0560 (Battery Voltage)**: "battery", "voltage", "power", "start", "electric"

**Capabilities:**
1.  **Fault Code Analysis:** If the user mentions a DTC code, analyze it.
2.  **Symptom Inference:** If the user describes a symptom (e.g. "brakes are weird"), return the corresponding DTC (e.g. C1095) in the 'dtc_code' field.
3.  **System Control:** You can control the vehicle's 3D visualization.

**Output Format (JSON ONLY):**
You must strictly return a valid JSON object. Do not include markdown formatting like \`\`\`json.
{
  "message": "The response message to show to the user (in Japanese). Keep it professional, concise, and sci-fi style. Mention the detected system and code.",
  "action": "One of: 'focus_dtc', 'engine_fault', 'focus_battery', 'focus_part', or null",
  "dtc_code": "The inferred or detected DTC code (e.g., 'C1095'). If uncertain, pick the best match from the list above.",
  "target_part": "If action is 'focus_part', specify the part name",
  "status": "One of: 'normal', 'warning', 'critical'"
}

**Context Data:**
- User Input: "${text}"
- Detected DTC in Regex: "${detectedCode || 'None'}"
`;

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: "qwen-max",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: text }
                    ],
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const json = await response.json();
            const content = json.choices[0].message.content;
            
            // Clean up potential markdown formatting if the model disobeys
            const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
            const aiData = JSON.parse(cleanJson);

            // Remove "Thinking..."
            const history = document.getElementById('chat-history');
            if (history && history.lastChild.innerText === 'Thinking...') {
                history.removeChild(history.lastChild);
            }

            // Logic Handling
            let finalMessage = aiData.message;
            let dtcData = null;

            // 1. If AI detected a DTC code that exists in our DB, enrich the data
            if (aiData.dtc_code) {
                // Handle cases where AI returns multiple codes or slight variations
                // For now, exact match
                if (DTC_DATABASE[aiData.dtc_code]) {
                    dtcData = DTC_DATABASE[aiData.dtc_code];
                    aiData.action = 'focus_dtc';
                } else {
                    console.warn(`AI returned unknown DTC: ${aiData.dtc_code}`);
                }
            } else if (detectedCode && DTC_DATABASE[detectedCode]) {
                // Fallback: If regex caught it but AI didn't explicitly return it
                dtcData = DTC_DATABASE[detectedCode];
                aiData.action = 'focus_dtc';
            }

            // Display Message
            this.uiManager.addChatMessage('ai', finalMessage);

            // Execute Actions
            if (aiData.action === 'focus_dtc' && dtcData) {
                this.sceneManager.focusOnPosition(dtcData.position);
                if (dtcData.severity === 'critical' || aiData.status === 'critical') {
                    this.triggerFaultWithCode(aiData.dtc_code, dtcData.description_jp, dtcData.position);
                } else {
                    // Even if not critical, highlight it
                    this.sceneManager.highlightMarker(aiData.dtc_code);
                    this.sceneManager.createARLabel(dtcData.position, "DIAGNOSTIC", dtcData.description_jp);
                    this.uiManager.showRepairButton('close');
                }
            } else if (aiData.action === 'engine_fault') {
                this.triggerFault("Engine Anomaly Detected", {x:0, y:1.0, z:0});
            } else if (aiData.action === 'focus_battery') {
                this.focusPart('battery');
            } else if (aiData.action === 'focus_part' && aiData.target_part) {
                this.focusPart(aiData.target_part);
            } else if (aiData.status === 'critical') {
                this.triggerFault("System Critical");
            }

        } catch (error) {
            console.warn("AI Connection Failed:", error.message);
            
            // Special handling for 401 (Invalid Key)
            if (error.message.includes('401')) {
                this.uiManager.addChatMessage('ai', "【システム警告】APIキーが無効、または認証に失敗しました。オフライン診断モードに切り替えます。");
            }
            
            // Fallback to local logic
            this.processLocalFallback(text, detectedCode);
        }
    }

    processLocalFallback(text, detectedCode) {
        // Remove "Thinking..." if it exists (might be handled by caller but safe to check)
        const history = document.getElementById('chat-history');
        if (history && history.lastChild.innerText === 'Thinking...') {
            history.removeChild(history.lastChild);
        }

        let response = { message: "申し訳ありません。そのコマンドはオフラインモードではサポートされていません。", action: null };

        // 0. Keyword Inference (New Logic)
        let inferredCode = null;
        if (!detectedCode) {
            for (const entry of KEYWORD_MAP) {
                if (entry.keywords.some(k => text.toLowerCase().includes(k))) {
                    inferredCode = entry.code;
                    break;
                }
            }
        }

        // 1. DTC Codes (Explicit or Inferred)
        const targetCode = detectedCode || inferredCode;

        if (targetCode && DTC_DATABASE[targetCode]) {
            const dtc = DTC_DATABASE[targetCode];
            const prefix = detectedCode ? "故障コード" : "症状分析";
            response = {
                message: `[オフライン診断] ${prefix}から可能性のある故障を特定しました。\nコード: ${targetCode}\n内容: ${dtc.description_jp}\n位置データを特定し、カメラを誘導します。`,
                action: "focus_dtc",
                dtcData: dtc
            };
        } 
        // 2. Fallback for general engine vibration (P0300 virtual)
        else if (targetCode === "P0300" || text.includes('音') || text.includes('sound')) {
             response = {
                message: "症状からエンジン異常振動(P0300相当)が疑われます。エンジンルームの点検を推奨します。",
                action: "engine_fault"
            };
        }
        else if (text.includes('バッテリー') || text.includes('電池') || text.includes('battery')) {
            response = { 
                message: "バッテリーステータス: 92% (良好)。充電システムの異常はありません。", 
                action: "focus_battery" 
            };
        }
        else if (text.includes('エンジン') || text.includes('engine')) {
            response = {
                message: "エンジン・テレメトリ正常。オイル圧: 350kPa, 水温: 85°C。",
                action: "focus_part",
                target_part: "engine"
            };
        }
        else if (text.includes('タイヤ') || text.includes('空気圧') || text.includes('tire')) {
            response = {
                message: "TPMSデータ: 全タイヤ正常 (2.4-2.5 bar)。",
                action: "focus_part",
                target_part: "chassis"
            };
        }
        else if (text.includes('こんにちは') || text.includes('hello') || text.includes('你好')) {
            response = {
                message: "こんにちは。MeltingHack オフライン診断システムです。故障コードの入力、または部位の指定をしてください。",
                action: null
            };
        }
        else {
            // Generic fallback help
            response = {
                message: "API接続不可のため、簡易モードで動作中。以下のキーワードを試してください：\n・故障コード (例: P0105)\n・エンジン、バッテリー、タイヤ\n・異音",
                action: null
            };
        }

        this.uiManager.addChatMessage('ai', response.message);

        // Execute Actions
        if (response.action === 'focus_dtc') {
            this.sceneManager.focusOnPosition(response.dtcData.position);
            this.sceneManager.highlightMarker(targetCode); // Highlight specific marker
            
            if (response.dtcData.severity === 'critical') {
                this.triggerFaultWithCode(targetCode, response.dtcData.description_jp, response.dtcData.position);
            } else {
                this.sceneManager.createARLabel(response.dtcData.position, "DIAGNOSTIC", response.dtcData.description_jp);
                this.uiManager.showRepairButton('close');
            }

            // Trigger Market Analysis
            this.triggerMarketAnalysis(targetCode, response.dtcData);
            
        } else if (response.action === 'engine_fault') {
            this.triggerFault("Offline Fault: Vibration", {x:0, y:1.0, z:0});
        } else if (response.action === 'focus_battery') {
            this.focusPart('battery');
        } else if (response.action === 'focus_part' && response.target_part) {
            this.focusPart(response.target_part);
        }
    }

    triggerFault(msg = "CRITICAL FAULT", pos = null) {
        this.sceneManager.triggerGlitch();
        // Use AR Label instead of full screen alert
        if (pos) {
            this.sceneManager.createARLabel(pos, "SYSTEM WARNING", msg);
        } else {
            // Fallback position if none provided (e.g. engine)
            this.sceneManager.createARLabel({x: 0, y: 1.5, z: 0}, "SYSTEM WARNING", msg);
        }
        this.uiManager.showRepairButton('repair'); // Show repair button
        this.uiManager.log(`FAULT DETECTED: ${msg}`, "error");
    }

    // New method to trigger fault with specific code
    triggerFaultWithCode(code, msg, pos) {
        this.sceneManager.triggerGlitch();
        this.sceneManager.createARLabel(pos, "SYSTEM WARNING", msg);
        this.sceneManager.highlightMarker(code); // Only show this specific marker
        this.uiManager.showRepairButton('repair'); // Show repair button
        this.uiManager.log(`FAULT DETECTED: ${msg}`, "error");
    }

    resolveFault(quiet = false) {
        this.uiManager.hideAlert();
        this.sceneManager.resolveGlitch();
        
        if (!quiet) {
            this.uiManager.log("Fault resolved. System nominal.");
            this.uiManager.addChatMessage('ai', "障害対応完了。システムは正常に戻りました。");
        } else {
            this.uiManager.log("Diagnostic view closed.");
        }
        
        setTimeout(() => this.sceneManager.resetCamera(), 1000);
    }
}

// Start
window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
