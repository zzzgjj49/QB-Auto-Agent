
export class APIService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.apiUrl = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";
        this.defaultModel = "qwen-plus";
    }

    setDefaultModel(modelName) {
        if (modelName && typeof modelName === 'string') {
            this.defaultModel = modelName;
        }
    }

    parseJsonContent(content, fallback = {}) {
        const cleanJson = (content || '').replace(/```json/g, '').replace(/```/g, '').trim();
        try {
            return JSON.parse(cleanJson);
        } catch (e) {
            return fallback;
        }
    }

    async chat(messages, model = this.defaultModel) {
        try {
            const response = await fetch(this.apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const json = await response.json();
            const content = json.choices[0].message.content;
            return this.parseJsonContent(content, { message: content, action: null });

        } catch (error) {
            console.error("API Chat Error:", error);
            throw error;
        }
    }

    async analyzeVision(dataURL, telemetryStr) {
        try {
            const response = await fetch(this.apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: "qwen-vl-max",
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: `
This image is a 3D automotive model. Telemetry data is provided below.
Correlate both sources and accurately identify what is currently happening on screen, including which component is highlighted with warnings.

[Telemetry Data]
${telemetryStr}

[Instructions]
1. Inspect red highlights and warning labels in the image.
2. Cross-check telemetry fields (active_warnings, highlighted_part) to identify the exact component.
3. Briefly explain the impact of this component fault on the vehicle.

Respond in JSON format only:
{
  "faulty_part_name": "...",
  "analysis": "..."
}` },
                                { type: "image_url", image_url: { url: dataURL } }
                            ]
                        }
                    ]
                })
            });

            if (!response.ok) throw new Error("Vision API Error");

            const json = await response.json();
            const content = json.choices[0].message.content;
            return this.parseJsonContent(content, { analysis: content, faulty_part_name: null });

        } catch (error) {
            console.error("Vision API Error:", error);
            throw error;
        }
    }

    async analyzeMarketPrice(code, description) {
        const systemPrompt = `
You are an enterprise maintenance cost estimation assistant.
Task: for the specified DTC, provide a repair recommendation and market cost estimate in CNY.
Vehicle: Volvo S90

Input DTC: ${code}
Input System Description: ${description}

Rules:
1. For tire-pressure/tire issues, prioritize inflation, leak repair, or inspection; recommend sensor replacement only when a sensor fault is explicit.
2. For electrical faults, prioritize circuit diagnostics plus sensor/actuator validation.
3. Recommendations must be tightly correlated to the fault description and avoid generic advice.

Output JSON only, no markdown:
{
  "recommendation": "Concise recommendation in English",
  "action_type": "REPLACE" | "REPAIR" | "INSPECT",
  "price_min": Number,
  "price_max": Number
}
`;

        try {
            const response = await fetch(this.apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.defaultModel,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: `Provide a maintenance cost estimate for ${code}` }
                    ],
                    temperature: 0.5
                })
            });

            if (!response.ok) throw new Error("API Error");

            const json = await response.json();
            const content = json.choices[0].message.content;
            return this.parseJsonContent(content, { recommendation: "Recommend offline re-inspection", action_type: "INSPECT", price_min: 300, price_max: 800 });

        } catch (error) {
            console.error("Market API Error:", error);
            throw error;
        }
    }

    async generateScanReport() {
        const systemPrompt = `
You are a full-vehicle diagnostic engine for enterprise fleets.
Task: output one full-system health report in JSON.
Requirements:
1. Randomly generate 0-1 critical issue(s) and 1-2 warning issue(s).
2. Provide an overall health score (0-100).
3. Issue codes must come from this list:
P0300,P0301,P0171,P0172,P0106,P0234,P0087,P0420,P0745,P0746,C1095,C1140,C1234,C0031,TPMS_LF,TPMS_RF,TPMS_LR,TPMS_RR,P0560

Output JSON only:
{
  "score": Number,
  "status": "HEALTHY" | "WARNING" | "CRITICAL",
  "issues": [
    { "system": "Engine/Brake/etc", "code": "Pxxxx", "severity": "critical"|"warning", "description": "Concise English description" }
  ],
  "summary": "English summary"
}
`;
        try {
            const response = await fetch(this.apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.defaultModel,
                    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: "Run full-vehicle diagnosis" }],
                    temperature: 0.7
                })
            });

            if (!response.ok) throw new Error("API Error");
            const json = await response.json();
            const content = json.choices[0].message.content;
            return this.parseJsonContent(content, { score: 88, status: "WARNING", issues: [], summary: "Scan completed. Review high-risk systems." });
        } catch (error) {
            console.error("Scan API Error:", error);
            throw error;
        }
    }
}
