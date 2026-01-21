
export class APIService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.apiUrl = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";
    }

    async chat(messages, model = "qwen-max") {
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
            
            // Clean up JSON
            const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
            try {
                return JSON.parse(cleanJson);
            } catch (e) {
                // If not JSON, return object with message
                return { message: content, action: null };
            }

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
この画像は自動車の3Dモデルです。システムテレメトリデータを提供します。
これらを組み合わせて、現在画面上で何が起きているか（どの部品が警告表示されているか）を正確に特定してください。

【テレメトリデータ】
${telemetryStr}

【指示】
1. 画像内の赤い強調表示や警告ラベルを確認してください。
2. テレメトリデータ（active_warnings, highlighted_part）と照合して、正確な部品名を特定してください。
3. その部品の故障が車両に与える影響を簡潔に述べてください。

JSON形式で答えてください: 
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
            
            const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
            try {
                return JSON.parse(cleanJson);
            } catch (e) {
                return { analysis: content, faulty_part_name: null };
            }

        } catch (error) {
            console.error("Vision API Error:", error);
            throw error;
        }
    }

    async analyzeMarketPrice(code, description) {
        const systemPrompt = `
You are an expert automotive mechanic AI.
Task: Provide a repair recommendation and estimated market price (in JPY) for a specific vehicle fault code.
Vehicle: Volvo S90 (High-end Sedan)

Input Code: ${code}
Input System: ${description}

**CRITICAL INSTRUCTION:**
- If the fault is related to **pressure (e.g., TPMS, Tire)**, recommend "Inspection & Refill" or "Puncture Repair" unless the code explicitly says "Sensor Fault".
- If the fault is a "Circuit Malfunction", recommend "Sensor Replacement".
- Match the recommendation to the specific description provided.

Output Format (JSON ONLY, no markdown):
{
  "recommendation": "One short sentence in Japanese. (e.g., '右前タイヤのパンク修理・空気圧調整' or 'ABSポンプ交換')",
  "action_type": "REPLACE" | "REPAIR" | "INSPECT",
  "price_min": Number (in JPY),
  "price_max": Number (in JPY)
}
Estimate the price realistically for a Volvo S90 part + labor in Japan.
`;

        try {
            const response = await fetch(this.apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: "qwen3-next-80b-a3b-thinking", // Or qwen-max
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
            return JSON.parse(cleanJson);

        } catch (error) {
            console.error("Market API Error:", error);
            throw error;
        }
    }

    async generateScanReport() {
        const systemPrompt = `
You are an advanced vehicle diagnostic AI for a Volvo S90.
Task: Generate a full system health report JSON.
Randomly simulate:
- 1 Major Issue (Critical) OR 0 Major Issues (Healthy)
- 1-2 Minor Warnings
- Calculate an overall health score (0-100).

**ALLOWED DTC CODES (MUST Pick from this list):**
- Engine: P0300 (Misfire), P0301, P0171 (Lean), P0172 (Rich), P0106 (MAP), P0234 (Turbo), P0087 (Fuel Pressure)
- Exhaust: P0420 (Catalyst)
- Transmission: P0745, P0746
- Brake/Chassis: C1095 (ABS Pump), C1140, C1234, C0031 (Speed Sensor)
- Tire: TPMS_LF (Left Front), TPMS_RF, TPMS_LR, TPMS_RR
- Battery: P0560

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
            const response = await fetch(this.apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: "qwen3-next-80b-a3b-thinking",
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
            console.error("Scan API Error:", error);
            throw error;
        }
    }
}
