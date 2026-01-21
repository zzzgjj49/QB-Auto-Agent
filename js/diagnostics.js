
import { DTC_DATABASE, KEYWORD_MAP } from './dtc_data.js';

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
        const isLeft = lowerText.includes("左") || lowerText.includes("left");
        const isRight = lowerText.includes("右") || lowerText.includes("right");
        const isFront = lowerText.includes("前") || lowerText.includes("front");
        const isRear = lowerText.includes("後") || lowerText.includes("rear") || lowerText.includes("back");
        const isTire = lowerText.includes("タイヤ") || lowerText.includes("tire") || lowerText.includes("wheel") || lowerText.includes("輪");

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
                message: `[オフライン診断] 可能性のある故障を特定しました。\nコード: ${inferredCode}\n内容: ${dtc.description_jp}\n位置データを特定し、カメラを誘導します。`,
                action: "focus_dtc",
                dtcData: dtc,
                code: inferredCode
            };
        } 
        
        // 2. Generic Fallbacks
        if (inferredCode === "P0300" || text.includes('音') || text.includes('sound')) {
             return {
                message: "症状からエンジン異常振動(P0300相当)が疑われます。エンジンルームの点検を推奨します。",
                action: "engine_fault"
            };
        }
        if (text.includes('バッテリー') || text.includes('電池') || text.includes('battery')) {
            return { 
                message: "バッテリーステータス: 92% (良好)。充電システムの異常はありません。", 
                action: "focus_battery" 
            };
        }
        if (text.includes('エンジン') || text.includes('engine')) {
            return {
                message: "エンジン・テレメトリ正常。オイル圧: 350kPa, 水温: 85°C。",
                action: "focus_part",
                target_part: "engine"
            };
        }
        if (text.includes('タイヤ') || text.includes('空気圧') || text.includes('tire')) {
            return {
                message: "TPMSデータ: 全タイヤ正常 (2.4-2.5 bar)。",
                action: "focus_part",
                target_part: "chassis"
            };
        }
        if (text.includes('こんにちは') || text.includes('hello') || text.includes('你好')) {
            return {
                message: "こんにちは。MeltingHack オフライン診断システムです。故障コードの入力、または部位の指定をしてください。",
                action: null
            };
        }

        // Default
        return {
            message: "API接続不可のため、簡易モードで動作中。以下のキーワードを試してください：\n・故障コード (例: P0105)\n・エンジン、バッテリー、タイヤ\n・異音",
            action: null
        };
    }

    getFallbackMarketAnalysis(isReplace = true) {
         const action = isReplace ? "部品交換 (REPLACE)" : "修理・調整 (REPAIR)";
         // Randomize price
         const basePrice = Math.floor(Math.random() * 80) * 1000 + 8000;
         return {
             recommendation: `${action} 推奨`,
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
                { system: "Tires", code: "TPMS_LF", severity: "warning", description: "左前タイヤ空気圧低下 (2.1 bar)" },
                { system: "Engine", code: "P0106", severity: "warning", description: "MAPセンサー範囲外信号" }
            ],
            summary: "全体的に良好ですが、タイヤ空気圧と吸気系センサーに軽微な異常が見られます。早めの点検を推奨します。"
        };
    }
}
