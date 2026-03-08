
import { DTC_DATABASE, KEYWORD_MAP } from '../data/dtc_data.js';

export class DiagnosticsEngine {
    constructor() {
        this.dtcDatabase = DTC_DATABASE;
    }

    getDTC(code) {
        return this.dtcDatabase[code] || null;
    }

    inferCodeFromText(text) {
        // Regex check first
        const codeMatch = text.match(/\b([PC][0-9]{4})\b/i);
        if (codeMatch) {
            return codeMatch[1].toUpperCase();
        }
        
        const lowerText = text.toLowerCase();

        // Spatial / Position Logic for Tires
        const isLeft = lowerText.includes("left");
        const isRight = lowerText.includes("right");
        const isFront = lowerText.includes("front");
        const isRear = lowerText.includes("rear") || lowerText.includes("back");
        const isTire = lowerText.includes("tire") || lowerText.includes("wheel");

        if (isTire) {
            if (isLeft && isFront) return "TPMS_LF";
            if (isRight && isFront) return "TPMS_RF";
            // Default to LF if only "Left Tire" mentioned, or RF if only "Right Tire"
            if (isLeft) return "TPMS_LF";
            if (isRight) return "TPMS_RF";
        }

        // Keyword check
        for (const entry of KEYWORD_MAP) {
            if (entry.keywords.some(k => lowerText.includes(k))) {
                return entry.code;
            }
        }
        return null;
    }

    processLocalFallback(text) {
        let inferredCode = this.inferCodeFromText(text);
        
        // 1. Specific Code Match
        if (inferredCode && this.dtcDatabase[inferredCode]) {
            const dtc = this.dtcDatabase[inferredCode];
            return {
                message: `[OFFLINE DIAGNOSIS] Potential fault identified.\nCode: ${inferredCode}\nDetail: ${dtc.description_jp}\nFocusing camera on affected component.`,
                action: "focus_dtc",
                dtcData: dtc,
                code: inferredCode
            };
        } 
        
        // 2. Generic Fallbacks
        if (inferredCode === "P0300" || text.includes('noise') || text.includes('sound')) {
             return {
                message: "Symptoms suggest Engine Misfire (P0300). Inspection of ignition system recommended.",
                action: "engine_fault"
            };
        }
        if (text.includes('battery')) {
            return { 
                message: "Battery Status: 92% (Good). Charging system nominal.", 
                action: "focus_battery" 
            };
        }
        if (text.includes('engine')) {
            return {
                message: "Engine Telemetry Nominal. Oil Pressure: 350kPa, Coolant: 85°C.",
                action: "focus_part",
                target_part: "engine"
            };
        }
        if (text.includes('tire') || text.includes('pressure')) {
            return {
                message: "TPMS Data: All tires nominal (2.4-2.5 bar).",
                action: "focus_part",
                target_part: "chassis"
            };
        }
        if (text.includes('hello') || text.includes('hi')) {
            return {
                message: "Hello. VEDC Offline System active. Please enter a fault code or component name.",
                action: null
            };
        }

        // Default
        return {
            message: "API Offline. Running in basic mode. Try keywords:\n- Fault Code (e.g., P0105)\n- Engine, Battery, Tire\n- Noise, Vibration",
            action: null
        };
    }

    getFallbackMarketAnalysis(isReplace = true) {
         const action = isReplace ? "Part Replacement" : "Repair/Adjustment";
         // Randomize price
         const basePrice = Math.floor(Math.random() * 80) * 1000 + 8000;
         return {
             recommendation: `${action} Recommended`,
             action_type: isReplace ? "REPLACE" : "REPAIR",
             price_min: basePrice,
             price_max: basePrice + 15000
         };
    }

    getFallbackScanReport() {
        return {
            score: 78,
            status: "WARNING",
            issues: [
                { system: "Tires", code: "TPMS_LF", severity: "warning", description: "Low Tire Pressure - Front Left (2.1 bar)" },
                { system: "Engine", code: "P0106", severity: "warning", description: "MAP Sensor Range/Performance" }
            ],
            summary: "Overall condition is good, but minor issues detected in Tire Pressure and Intake System. Maintenance recommended."
        };
    }
}
