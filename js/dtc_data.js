
// DTC Database (Diagnostic Trouble Codes)
export const DTC_DATABASE = {
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
    "P0087": { description_jp: "燃料レール圧力過低", position: {x:1.6, y:0.9, z:-0.3}, severity: "critical", target_part: "Engine" },
    "P0088": { description_jp: "燃料レール圧力過高", position: {x:1.6, y:0.9, z:-0.3}, severity: "critical", target_part: "Engine" },
    "P0090": { description_jp: "燃料圧力レギュレータ制御回路", position: {x:1.6, y:0.9, z:-0.3}, severity: "warning", target_part: "Engine" },
    "P0091": { description_jp: "燃料圧力レギュレータ制御回路低", position: {x:1.6, y:0.9, z:-0.3}, severity: "warning", target_part: "Engine" },
    "P0092": { description_jp: "燃料圧力レギュレータ制御回路高", position: {x:1.6, y:0.9, z:-0.3}, severity: "warning", target_part: "Engine" },
    "P0171": { description_jp: "燃料システム希薄 (バンク1)", position: {x:1.8, y:1.1, z:0.4}, severity: "warning", target_part: "Engine" },
    "P0172": { description_jp: "燃料システム過濃 (バンク1)", position: {x:1.8, y:1.1, z:0.4}, severity: "warning", target_part: "Engine" },

    // Ignition / Engine Mechanical
    "P0300": { description_jp: "多気筒不点火検出", position: {x:2.0, y:0.9, z:0.0}, severity: "critical", target_part: "Engine" },
    "P0301": { description_jp: "シリンダー1 不点火", position: {x:2.2, y:0.9, z:0.2}, severity: "critical", target_part: "Engine" },
    "P0302": { description_jp: "シリンダー2 不点火", position: {x:2.0, y:0.9, z:0.2}, severity: "critical", target_part: "Engine" },
    "P0303": { description_jp: "シリンダー3 不点火", position: {x:1.8, y:0.9, z:0.2}, severity: "critical", target_part: "Engine" },
    "P0304": { description_jp: "シリンダー4 不点火", position: {x:1.6, y:0.9, z:0.2}, severity: "critical", target_part: "Engine" },

    // Exhaust / Catalyst
    "P0420": { description_jp: "触媒システム効率低下 (バンク1)", position: {x:0.5, y:0.3, z:0.0}, severity: "warning", target_part: "Chassis" },

    // Transmission (Center Underbody)
    "P0745": { description_jp: "圧力制御ソレノイドA故障", position: {x:0.5, y:0.4, z:0}, severity: "warning", target_part: "Transmission" },
    "P0746": { description_jp: "圧力制御ソレノイドA性能/スタック", position: {x:0.5, y:0.4, z:0}, severity: "critical", target_part: "Transmission" },
    "P0747": { description_jp: "圧力制御ソレノイドA ON固着", position: {x:0.5, y:0.4, z:0}, severity: "critical" },
    "P0748": { description_jp: "圧力制御ソレノイドA電気的故障", position: {x:0.5, y:0.4, z:0}, severity: "warning" },
    "P0776": { description_jp: "圧力制御ソレノイドB性能/スタック", position: {x:0.5, y:0.4, z:0}, severity: "critical" },

    // Chassis / Brake / Tires (Wheels)
    "C1095": { description_jp: "ABS油圧ポンプモーター回路故障", position: {x:2.8, y:0.5, z:1.0}, severity: "critical" }, // Front Left Wheel area
    "C1140": { description_jp: "ブレーキエア圧センサー異常", position: {x:2.8, y:0.5, z:-1.0}, severity: "warning" }, // Front Right
    "C1234": { description_jp: "ブレーキ圧力信号無効/欠落", position: {x:-2.8, y:0.5, z:1.0}, severity: "warning" }, // Rear Left
    
    // Tires (Specific Wheel Positions)
    "C0031": { description_jp: "左前輪速度センサー信号消失", position: {x:2.8, y:0.3, z:1.0}, severity: "warning", target_part: "Wheel" },
    "C0034": { description_jp: "右前輪速度センサー信号消失", position: {x:2.8, y:0.3, z:-1.0}, severity: "warning", target_part: "Wheel" },
    "TPMS_LF": { description_jp: "左前タイヤ空気圧低下", position: {x:2.8, y:0.6, z:1.2}, severity: "warning", target_part: "Wheel" }, // Front Left Outer
    "TPMS_RF": { description_jp: "右前タイヤ空気圧低下", position: {x:2.8, y:0.6, z:-1.2}, severity: "warning", target_part: "Wheel" }, // Front Right Outer
    
    // Battery (Front Right / Trunk depending on car, assume Front Right Engine Bay for S90)
    "P0560": { description_jp: "システム電圧異常 (バッテリー)", position: {x:2.0, y:1.0, z:-0.8}, severity: "warning" }
};

// Offline Keyword Mapping
export const KEYWORD_MAP = [
    { keywords: ["ブレーキ", "刹车", "brake", "止まらない", "abs"], code: "C1095" },
    { keywords: ["ターボ", "加速", "turbo", "boost", "遅い"], code: "P0234" },
    { keywords: ["燃料", "ガス欠", "fuel", "pressure", "ポンプ"], code: "P0087" },
    { keywords: ["変速", "ギア", "gear", "transmission", "shift"], code: "P0746" },
    { keywords: ["吸気", "空気", "air", "map", "sensor"], code: "P0106" },
    { keywords: ["振動", "揺れ", "vibration", "shake", "エンジントラブル"], code: "P0300" }, // Virtual code
    { keywords: ["バッテリー", "電圧", "battery", "power"], code: "P0560" },
    { keywords: ["タイヤ", "空気圧", "パンク", "tire", "pressure"], code: "TPMS_LF" } // Generic fallback to Left Front if no direction
];
