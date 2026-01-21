export class UIManager {
    constructor() {
        this.app = null;
        this.mainContent = document.getElementById('main-content');
        this.loadingScreen = document.getElementById('loading-screen');
        this.alertModal = document.getElementById('alert-modal');
        this.currentView = null;
        
        // Templates
        this.templates = {
            dashboard: `
                <div class="view-dashboard fade-in">
                    <div class="panel-left">
                        <div class="glass-card">
                            <div class="card-title"><i class="fa-solid fa-sitemap"></i> アーキテクチャ</div>
                            <ul class="nav-list">
                                <li class="active" onclick="window.app.focusPart('overview')">概要</li>
                                <li onclick="window.app.focusPart('engine')">エンジンルーム</li>
                                <li onclick="window.app.focusPart('battery')">バッテリーパック</li>
                                <li onclick="window.app.focusPart('chassis')">シャーシ</li>
                            </ul>
                        </div>
                        <div class="glass-card">
                            <div class="card-title"><i class="fa-solid fa-chart-line"></i> リアルタイム監視</div>
                            
                            <!-- Engine Temp -->
                            <div class="stat-item">
                                <span class="stat-label">冷却水温度</span> <span class="stat-val" id="val-temp">85°C</span>
                            </div>
                            <div class="stat-bar-bg"><div class="stat-bar-fill" style="width: 40%"></div></div>
                            <br>
                            
                            <!-- RPM -->
                            <div class="stat-item">
                                <span class="stat-label">エンジン回転数</span> <span class="stat-val" id="val-rpm">800 RPM</span>
                            </div>
                            <div class="stat-bar-bg"><div class="stat-bar-fill" style="width: 20%"></div></div>
                            <br>

                            <!-- Battery Voltage -->
                            <div class="stat-item">
                                <span class="stat-label">バッテリー電圧</span> <span class="stat-val">14.2 V</span>
                            </div>
                            <div class="stat-bar-bg"><div class="stat-bar-fill" style="width: 90%; background: var(--c-success)"></div></div>
                            <br>

                            <!-- Oil Pressure -->
                            <div class="stat-item">
                                <span class="stat-label">油圧</span> <span class="stat-val">350 kPa</span>
                            </div>
                            <div class="stat-bar-bg"><div class="stat-bar-fill" style="width: 60%"></div></div>
                            <br>

                            <!-- AI Load -->
                            <div class="stat-item">
                                <span class="stat-label">AI 演算負荷</span> <span class="stat-val" style="color: var(--c-primary)">12 TOPS</span>
                            </div>
                            <div class="stat-bar-bg"><div class="stat-bar-fill" style="width: 15%; background: var(--c-primary); animation: pulse 2s infinite"></div></div>
                        </div>
                    </div>
                    <div class="spacer"></div>
                    <div class="panel-right">
                        <div class="glass-card">
                             <div class="card-title"><i class="fa-solid fa-car-burst"></i> タイヤ空気圧 (TPMS)</div>
                             <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; text-align: center; font-family: var(--f-mono);">
                                <div style="border: 1px solid rgba(0,243,255,0.2); padding: 10px; border-radius: 4px;">
                                    <div style="color: var(--c-text-dim); font-size: 12px;">FL</div>
                                    <div style="color: var(--c-success); font-size: 18px;">2.4 bar</div>
                                </div>
                                <div style="border: 1px solid rgba(0,243,255,0.2); padding: 10px; border-radius: 4px;">
                                    <div style="color: var(--c-text-dim); font-size: 12px;">FR</div>
                                    <div style="color: var(--c-success); font-size: 18px;">2.4 bar</div>
                                </div>
                                <div style="border: 1px solid rgba(0,243,255,0.2); padding: 10px; border-radius: 4px;">
                                    <div style="color: var(--c-text-dim); font-size: 12px;">RL</div>
                                    <div style="color: var(--c-success); font-size: 18px;">2.5 bar</div>
                                </div>
                                <div style="border: 1px solid rgba(0,243,255,0.2); padding: 10px; border-radius: 4px;">
                                    <div style="color: var(--c-text-dim); font-size: 12px;">RR</div>
                                    <div style="color: var(--c-success); font-size: 18px;">2.5 bar</div>
                                </div>
                             </div>
                        </div>

                        <div class="glass-card" style="margin-top: 20px;">
                             <div class="card-title"><i class="fa-solid fa-bolt"></i> エネルギーフロー</div>
                             <div style="display: flex; justify-content: space-between; align-items: center; font-family: var(--f-mono);">
                                <div>
                                    <div style="color: var(--c-text-dim); font-size: 12px;">BATTERY</div>
                                    <div style="color: var(--c-success); font-size: 24px;">92%</div>
                                </div>
                                <div style="color: var(--c-primary); animation: pulse 1s infinite;"><i class="fa-solid fa-arrow-right-long"></i></div>
                                <div>
                                    <div style="color: var(--c-text-dim); font-size: 12px;">MOTOR</div>
                                    <div style="color: #fff; font-size: 24px;">0 kW</div>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            `,
            ai: `
                <div class="view-ai fade-in">
                    <div class="chat-container">
                        <div class="chat-header">
                            <div class="brand" style="font-size: 16px"><i class="fa-solid fa-robot"></i> QWEN-LINK</div>
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <div class="chat-status-dot"></div>
                                <div class="btn-refresh-chat" id="btn-refresh-chat" title="会話をリセット"><i class="fa-solid fa-rotate-right"></i></div>
                                <div class="btn-close-chat" id="btn-close-chat" title="閉じる"><i class="fa-solid fa-xmark"></i></div>
                            </div>
                        </div>
                        <div class="chat-messages" id="chat-history">
                            <div class="msg ai">システム正常。Qwen-Turbo リンク確立。車両診断を開始できます。</div>
                        </div>
                        <div class="chat-input-box">
                            <input type="text" id="ai-input" placeholder="質問やコマンドを入力..." autocomplete="off">
                            <button id="btn-mic" class="btn-icon" title="音声入力"><i class="fa-solid fa-microphone"></i></button>
                            <button id="btn-vision" class="btn-icon" title="AI視覚診断 (Qwen-VL)"><i class="fa-solid fa-eye"></i></button>
                            <button id="btn-ai-send">送信</button>
                        </div>
                        <div class="quick-actions">
                            <button class="action-chip" data-cmd="分解モード">
                                <i class="fa-solid fa-layer-group"></i> 
                                <span>分解モード</span>
                            </button>
                            <button class="action-chip" data-cmd="ショールームモード">
                                <i class="fa-solid fa-film"></i> 
                                <span>シネマティック</span>
                            </button>
                            <button class="action-chip" data-cmd="故障予測">
                                <i class="fa-solid fa-crystal-ball"></i> 
                                <span>予知保全</span>
                            </button>
                            <button class="action-chip" id="btn-reset-view" title="ビューをリセット">
                                <i class="fa-solid fa-rotate-left"></i>
                                <span>リセット</span>
                            </button>
                        </div>
                    </div>
                </div>
            `,
            '3d': `<!-- Empty for full view -->`,
            scan: `
                <div class="view-scan fade-in">
                    <div class="scan-overlay">
                        <div class="scan-header">
                            <i class="fa-solid fa-satellite-dish" id="scan-icon"></i> システム完全診断
                        </div>
                        
                        <!-- 1. Start Phase -->
                        <div id="scan-start-container">
                            <p style="margin-bottom: 30px; color: var(--c-text-dim); line-height: 1.6;">
                                AIが車両の全センサーとECUをスキャンし、<br>潜在的な問題を特定します。<br>
                                <span style="font-size: 12px; opacity: 0.7;">(所要時間: 約5秒)</span>
                            </p>
                            <button class="cyber-btn" id="btn-start-scan" style="width: 100%;">
                                <span class="btn-text"><i class="fa-solid fa-microchip"></i> AI診断を開始</span>
                            </button>
                        </div>

                        <!-- 2. Scanning Phase -->
                        <div id="scan-progress-container" class="hidden">
                            <div class="scan-status-text">センサー初期化中...</div>
                            <div class="scan-bar-bg"><div class="scan-bar-fill"></div></div>
                            <div class="scan-logs" id="scan-logs">
                                <div>[SYS] 診断プロトコルを開始...</div>
                            </div>
                        </div>

                        <!-- 3. Result Phase (Hidden initially) -->
                        <div id="scan-result-container" class="hidden" style="display: none;">
                            <div class="result-header">
                                <span class="score-label">車両健康スコア</span>
                                <span class="score-val" id="health-score">--</span>
                            </div>
                            <div class="ai-report-box" id="ai-scan-report">
                                <div class="report-loading"><i class="fa-solid fa-circle-notch fa-spin"></i> AIがデータを分析中...</div>
                            </div>
                            <button class="cyber-btn" id="btn-scan-action" style="margin-top: 20px; width: 100%;">
                                <span class="btn-text">確認 (ACKNOWLEDGE)</span>
                            </button>
                        </div>
                    </div>
                </div>
            `
        };
    }

    // Removed overlay creation as we moved logs to chat

    addNeuralLog(type, message) {
        const history = document.getElementById('chat-history');
        if (!history) return;
        
        const logDiv = document.createElement('div');
        logDiv.className = 'msg neural-log fade-in';
        logDiv.innerHTML = `
            <div style="font-family: 'Rajdhani', monospace; font-size: 11px; color: var(--c-success); border-left: 2px solid var(--c-success); padding-left: 8px; margin: 5px 0 10px 0; background: rgba(0, 255, 136, 0.05);">
                <div style="font-weight: bold; opacity: 0.8; margin-bottom: 2px;">
                    <i class="fa-solid fa-microchip"></i> QWEN_THOUGHT_PROCESS [${type}]
                </div>
                <div style="opacity: 0.9; line-height: 1.4;">${message}</div>
            </div>
        `;
        
        history.appendChild(logDiv);
        history.scrollTop = history.scrollHeight;
    }

    showTimeline(events) {
        // Create a Timeline Modal Overlay
        const modal = document.createElement('div');
        modal.className = 'timeline-modal fade-in';
        modal.style.cssText = `
            position: absolute;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: 80%;
            max-width: 800px;
            background: rgba(3, 5, 7, 0.95);
            border: 1px solid var(--c-primary);
            box-shadow: 0 0 30px rgba(0, 243, 255, 0.2);
            padding: 30px;
            border-radius: 12px;
            z-index: 2000;
            color: #fff;
        `;
        
        const stepsHtml = events.map((e, index) => `
            <div class="timeline-step ${e.severity}" style="flex: 1; text-align: center; position: relative; padding: 10px; border: 1px solid rgba(255,255,255,0.1); margin: 0 5px; border-radius: 8px; transition: all 0.3s;">
                <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px; color: var(--c-primary);">${e.period}</div>
                <div style="font-size: 14px; margin-bottom: 5px;">${e.impact}</div>
                <div style="height: 4px; background: #333; margin: 10px 0; border-radius: 2px; overflow: hidden;">
                    <div style="width: ${(index+1)*33}%; height: 100%; background: ${e.severity === 'fatal' ? 'var(--c-alert)' : (e.severity === 'critical' ? 'orange' : 'var(--c-primary)')};"></div>
                </div>
            </div>
        `).join('<div style="font-size: 24px; color: var(--c-text-dim);">→</div>');

        modal.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="font-family: 'Rajdhani'; letter-spacing: 2px; color: var(--c-primary);"><i class="fa-solid fa-clock-rotate-left"></i> FUTURE IMPACT SIMULATION</h2>
                <p style="color: var(--c-text-dim);">Qwen-Thinking AI Prediction Model</p>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: stretch;">
                ${stepsHtml}
            </div>
            <button class="cyber-btn" style="margin-top: 30px; width: 100%;" onclick="this.parentNode.remove()">
                CLOSE SIMULATION
            </button>
        `;
        
        document.body.appendChild(modal);
    }

    init(app) {
        this.app = app;
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
        
        // Setup Sidebar
        document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchView(btn.dataset.view);
            });
        });

        // Setup Resolve Button (Original Modal Button - Keep for safety)
        const btnResolve = document.getElementById('btn-resolve');
        if (btnResolve) {
            btnResolve.addEventListener('click', () => {
                this.app.resolveFault();
            });
        }

        // Setup Floating Repair Button
        this.btnRepair = document.getElementById('btn-repair-complete');
        if (this.btnRepair) {
            this.btnRepair.addEventListener('click', () => {
                // Check mode
                if (this.btnRepair.dataset.mode === 'close') {
                    this.app.resolveFault(true); // true = quiet/close mode
                } else {
                    this.app.resolveFault(false);
                }
            });
        }

        // Setup Alert Close Button
        const btnCloseAlert = document.getElementById('btn-close-alert');
        if (btnCloseAlert) {
            btnCloseAlert.addEventListener('click', () => {
                this.hideAlert();
            });
        }

        // Default View
        this.switchView('dashboard');
    }

    switchView(viewName) {
        if (this.currentView === viewName) return;
        
        // Update Sidebar Active State
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        const activeBtn = document.querySelector(`.nav-item[data-view="${viewName}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        // Render Content
        this.mainContent.innerHTML = this.templates[viewName] || '';
        this.currentView = viewName;

        // Re-attach listeners for dynamic content
        if (viewName === 'ai') {
            this.setupChatListeners();
        } else if (viewName === 'scan') {
            this.setupScanListeners();
        }

        // Trigger Camera Move
        if (this.app) {
            this.app.onViewChanged(viewName);
        }
    }

    setupScanListeners() {
        // Start Button
        const btnStart = document.getElementById('btn-start-scan');
        if (btnStart) {
            btnStart.addEventListener('click', () => {
                // UI Switch
                document.getElementById('scan-start-container').classList.add('hidden');
                document.getElementById('scan-progress-container').classList.remove('hidden');
                
                // Icon Animation
                const icon = document.getElementById('scan-icon');
                if(icon) {
                    icon.classList.add('fa-spin');
                    icon.style.setProperty('--fa-animation-duration', '3s');
                }

                // Start Logic
                this.app.startFullScan();
            });
        }

        // Acknowledge Button
        const btnAck = document.getElementById('btn-scan-action');
        if (btnAck) {
            btnAck.addEventListener('click', () => {
                // Switch to AI view to show controls
                this.switchView('ai');
                
                // Trigger Explode View automatically for better detail
                if (this.app) {
                    this.app.sceneManager.toggleExplodeView();
                    this.addChatMessage('ai', "詳細確認のため、分解ビューモードを展開しました。");
                    this.app.sceneManager.setMascotState('idle');
                }
            });
        }
    }

    setupChatListeners() {
        const input = document.getElementById('ai-input');
        const btn = document.getElementById('btn-ai-send');
        const btnMic = document.getElementById('btn-mic');
        const btnVision = document.getElementById('btn-vision');
        const btnClose = document.getElementById('btn-close-chat');
        const btnRefresh = document.getElementById('btn-refresh-chat');

        if (btnClose) {
            btnClose.addEventListener('click', () => {
                this.switchView('3d'); // Switch to clean 3D view
            });
        }

        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => {
                this.resetChat();
            });
        }

        if (btnMic) {
            btnMic.addEventListener('click', () => {
                this.app.toggleVoiceInteraction(btnMic);
            });
        }
        
        if (btnVision) {
            btnVision.addEventListener('click', () => {
                this.app.lastInputSource = 'text'; // Ensure silent mode for button click
                this.app.triggerVisionAnalysis();
            });
        }
        
        // Quick Actions
        document.querySelectorAll('.action-chip[data-cmd]').forEach(btn => {
            btn.addEventListener('click', () => {
                const cmd = btn.dataset.cmd;
                this.app.lastInputSource = 'text'; // Treat as text command
                this.addChatMessage('user', cmd);
                this.app.processAIInput(cmd);
            });
        });
        
        // Reset View Button
        const btnReset = document.getElementById('btn-reset-view');
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                if (this.app && this.app.sceneManager) {
                    this.app.sceneManager.resetView();
                    this.addChatMessage('system', 'ビューとハイライトをリセットしました。');
                }
            });
        }
        
        const send = () => {
            const text = input.value.trim();
            if (text) {
                this.app.lastInputSource = 'text';
                this.addChatMessage('user', text);
                this.app.processAIInput(text);
                input.value = '';
            }
        };

        btn.addEventListener('click', send);
        input.addEventListener('keypress', (e) => { if (e.key === 'Enter') send(); });
        input.focus();
    }

    resetChat() {
        const history = document.getElementById('chat-history');
        if (history) {
            history.innerHTML = '';
            // Re-add initial system message
            this.addChatMessage('system', 'システム正常。Qwen-Turbo リンク確立。車両診断を開始できます。');
        }
    }

    addChatMessage(role, text, isHtml = false) {
        const history = document.getElementById('chat-history');
        if (!history) return;

        const div = document.createElement('div');
        div.className = `msg ${role}`;
        
        if (isHtml) {
            div.innerHTML = text;
        } else {
            div.innerText = text;
        }
        
        history.appendChild(div);
        history.scrollTop = history.scrollHeight;
    }

    updateTime() {
        const now = new Date();
        document.getElementById('sys-time').innerText = now.toLocaleTimeString('en-US', {hour12: false});
    }

    setLoading(progress) {
        const bar = document.querySelector('.loading-progress');
        const text = document.querySelector('.loading-text');
        if (bar) bar.innerText = Math.round(progress) + '%';
        if (text) text.setAttribute('data-text', `LOADING... ${Math.round(progress)}%`);
        
        if (progress >= 100) {
            setTimeout(() => {
                this.loadingScreen.style.opacity = 0;
                setTimeout(() => this.loadingScreen.style.display = 'none', 500);
            }, 500);
        }
    }

    log(msg, type='info') {
        const container = document.getElementById('sys-logs');
        if (!container) return; // Might not exist in current view
        
        const div = document.createElement('div');
        div.style.marginBottom = '5px';
        div.style.color = type === 'error' ? 'var(--c-alert)' : 'inherit';
        div.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
        container.prepend(div);
    }

    showAlert(title, desc) {
        // Deprecated: Use showARLabel instead
    }

    hideAlert() {
        this.hideRepairButton();
    }

    showRepairButton(mode = 'repair') {
        if (this.btnRepair) {
            this.btnRepair.classList.remove('hidden');
            this.btnRepair.dataset.mode = mode;
            
            if (mode === 'close') {
                this.btnRepair.innerHTML = '<i class="fa-solid fa-xmark"></i> 表示を閉じる';
                this.btnRepair.style.borderColor = 'var(--c-text-dim)';
                this.btnRepair.style.color = 'var(--c-text-dim)';
            } else {
                this.btnRepair.innerHTML = '<i class="fa-solid fa-rotate-left"></i> システム正常化';
                this.btnRepair.style.borderColor = 'var(--c-success)';
                this.btnRepair.style.color = 'var(--c-success)';
            }
        }
    }

    hideRepairButton() {
        if (this.btnRepair) {
            this.btnRepair.classList.add('hidden');
        }
    }
}
