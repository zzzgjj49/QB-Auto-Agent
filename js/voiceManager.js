
export class VoiceManager {
    constructor(callbacks) {
        this.callbacks = {
            onInput: callbacks.onInput || (() => {}),
            onStateChange: callbacks.onStateChange || (() => {}),
            onError: callbacks.onError || (() => {})
        };

        this.state = 'IDLE'; // IDLE, LISTENING, PROCESSING, SPEAKING
        this.isContinuous = false;
        this.recognition = null;
        this.debounceTimer = null;
        this.useMock = false;

        // Check support
        if (!('webkitSpeechRecognition' in window)) {
            console.warn("Speech Recognition not supported. Fallback to mock.");
            this.useMock = true;
        } else {
            this.setupRecognition();
        }
    }

    setupRecognition() {
        try {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.lang = 'ja-JP';
            this.recognition.interimResults = false;
            this.recognition.maxAlternatives = 1;

            this.recognition.onresult = (event) => this.handleResult(event);
            this.recognition.onend = () => this.handleEnd();
            this.recognition.onerror = (event) => this.handleError(event);
        } catch (e) {
            console.error("Failed to setup recognition:", e);
            this.useMock = true;
        }
    }

    setState(newState) {
        if (this.state === newState) return;
        console.log(`[VoiceManager] State: ${this.state} -> ${newState}`);
        this.state = newState;
        this.callbacks.onStateChange(newState);
    }

    toggle(continuous = true) {
        if (this.state === 'IDLE') {
            this.startListening(continuous);
        } else {
            this.stopListening();
        }
    }

    startListening(continuous = true) {
        if (this.state === 'SPEAKING') {
            window.speechSynthesis.cancel(); // Stop talking if asked to listen
        }

        this.isContinuous = continuous;
        
        if (this.useMock) {
            // Trigger mock UI via error callback or special handling
            this.callbacks.onError('MOCK_REQUIRED');
            return;
        }

        try {
            this.recognition.start();
            this.setState('LISTENING');
        } catch (e) {
            // Sometimes it's already started
            if (e.name !== 'NotAllowedError') { 
                console.warn("Start error:", e);
                this.setState('LISTENING'); // Assume it's working or will fail in onError
            }
        }
    }

    stopListening() {
        this.isContinuous = false; // Disable continuous mode on manual stop
        this.setState('IDLE');
        
        if (this.recognition) {
            this.recognition.abort(); // Abort is faster than stop
        }
        
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        window.speechSynthesis.cancel();
    }

    handleResult(event) {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);

        const transcript = event.results[0][0].transcript;
        console.log(`[ASR] Partial: ${transcript}`);

        // Update UI immediately (optional, via a partial callback if needed)
        // For now, we wait for debounce
        
        this.debounceTimer = setTimeout(() => {
            console.log(`[ASR] Final: ${transcript}`);
            this.setState('PROCESSING');
            this.callbacks.onInput(transcript);
        }, 1500); // 1.5s debounce
    }

    handleEnd() {
        // If we were listening and it ended naturally...
        if (this.state === 'LISTENING') {
             // If continuous mode is on, we should technically restart, 
             // BUT only if we didn't just get a result that moved us to PROCESSING.
             // Usually, onresult fires before onend. 
             // If onend fires without processing, it means silence timeout.
             
             if (this.isContinuous) {
                 console.log("[ASR] Restarting (Continuous Mode)...");
                 try {
                     this.recognition.start();
                 } catch(e) {
                     console.warn("Restart failed", e);
                     this.setState('IDLE');
                 }
             } else {
                 this.setState('IDLE');
             }
        }
        // If we are in PROCESSING or SPEAKING state, onend is expected, do nothing.
    }

    handleError(event) {
        console.error("[ASR] Error:", event.error);
        if (event.error === 'not-allowed' || event.error === 'network') {
            this.useMock = true;
            this.callbacks.onError('MOCK_REQUIRED');
        }
        this.setState('IDLE');
    }

    speak(text) {
        if (!('speechSynthesis' in window)) {
            console.warn("TTS not supported");
            return;
        }

        // Stop listening while speaking
        if (this.recognition) {
            this.recognition.abort(); // Stop ASR
        }
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = 1.2;
        utterance.pitch = 1.1;

        utterance.onstart = () => {
            this.setState('SPEAKING');
        };

        utterance.onend = () => {
            // Finished speaking
            if (this.isContinuous) {
                console.log("[TTS] Finished. Resuming listening...");
                try {
                    this.recognition.start();
                    this.setState('LISTENING');
                } catch (e) {
                    console.warn("Resume failed", e);
                    this.setState('IDLE');
                }
            } else {
                this.setState('IDLE');
            }
        };

        utterance.onerror = (e) => {
            console.error("TTS Error:", e);
            this.setState('IDLE');
        };

        window.speechSynthesis.speak(utterance);
    }
}
