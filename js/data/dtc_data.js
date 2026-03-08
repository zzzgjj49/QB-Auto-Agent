
// DTC Database (Diagnostic Trouble Codes)
// Updated with Real Mesh Names from GLB Analysis
export const DTC_DATABASE = {
    // Intake / MAP (Engine Front-Top) -> Mapped to Hood/Grille area
    "P0105": { description_jp: "MAP sensor circuit malfunction (Manifold Absolute Pressure)", position: {x:0, y:1.0, z:1.5}, severity: "warning", target_part: "Hood" },
    "P0106": { description_jp: "MAP sensor range/performance issue", position: {x:0, y:1.0, z:1.5}, severity: "warning", target_part: "Hood" },
    "P0107": { description_jp: "MAP sensor low input voltage", position: {x:0, y:1.0, z:1.5}, severity: "warning", target_part: "Hood" },
    "P0108": { description_jp: "MAP sensor high input voltage", position: {x:0, y:1.0, z:1.5}, severity: "critical", target_part: "Hood" },
    
    // Turbo (Engine Right Side) -> Mapped to Hood
    "P0234": { description_jp: "Turbocharger overboost condition", position: {x:0.5, y:1.0, z:1.5}, severity: "critical", target_part: "Hood" },
    "P0236": { description_jp: "Turbo boost sensor A circuit range/performance", position: {x:0.5, y:1.0, z:1.5}, severity: "warning", target_part: "Hood" },
    "P0243": { description_jp: "Wastegate solenoid A malfunction", position: {x:0.5, y:1.0, z:1.5}, severity: "warning", target_part: "Hood" },
    "P0245": { description_jp: "Wastegate solenoid A circuit low", position: {x:0.5, y:1.0, z:1.5}, severity: "warning", target_part: "Hood" },
    "P0246": { description_jp: "Wastegate solenoid A circuit high", position: {x:0.5, y:1.0, z:1.5}, severity: "warning", target_part: "Hood" },

    // Fuel (Engine Left/Center) -> Mapped to Hood
    "P0087": { description_jp: "Fuel rail/system pressure too low", position: {x:0, y:1.0, z:1.5}, severity: "critical", target_part: "Hood" },
    "P0088": { description_jp: "Fuel rail/system pressure too high", position: {x:0, y:1.0, z:1.5}, severity: "critical", target_part: "Hood" },
    "P0090": { description_jp: "Fuel pressure regulator control circuit issue", position: {x:0, y:1.0, z:1.5}, severity: "warning", target_part: "Hood" },
    "P0091": { description_jp: "Fuel pressure regulator control circuit low", position: {x:0, y:1.0, z:1.5}, severity: "warning", target_part: "Hood" },
    "P0092": { description_jp: "Fuel pressure regulator control circuit high", position: {x:0, y:1.0, z:1.5}, severity: "warning", target_part: "Hood" },
    "P0171": { description_jp: "System too lean (Bank 1)", position: {x:0, y:1.0, z:1.5}, severity: "warning", target_part: "Hood" },
    "P0172": { description_jp: "System too rich (Bank 1)", position: {x:0, y:1.0, z:1.5}, severity: "warning", target_part: "Hood" },

    // Ignition / Engine Mechanical -> Mapped to Hood
    "P0300": { description_jp: "Random/multiple cylinder misfire detected", position: {x:0, y:1.0, z:1.5}, severity: "critical", target_part: "Hood" },
    "P0301": { description_jp: "Cylinder 1 misfire detected", position: {x:0, y:1.0, z:1.5}, severity: "critical", target_part: "Hood" },
    "P0302": { description_jp: "Cylinder 2 misfire detected", position: {x:0, y:1.0, z:1.5}, severity: "critical", target_part: "Hood" },
    "P0303": { description_jp: "Cylinder 3 misfire detected", position: {x:0, y:1.0, z:1.5}, severity: "critical", target_part: "Hood" },
    "P0304": { description_jp: "Cylinder 4 misfire detected", position: {x:0, y:1.0, z:1.5}, severity: "critical", target_part: "Hood" },

    // Exhaust / Catalyst -> Mapped to Exhaust System or Underbody
    "P0420": { description_jp: "Catalyst system efficiency below threshold (Bank 1)", position: {x:0, y:0.2, z:-1.0}, severity: "warning", target_part: "Exhaust System" },

    // Transmission (Center Underbody) -> Mapped to Shifter or Underbody
    "P0745": { description_jp: "Pressure control solenoid A malfunction", position: {x:0, y:0.5, z:0}, severity: "warning", target_part: "Shifterknob" },
    "P0746": { description_jp: "Pressure control solenoid A performance/stuck", position: {x:0, y:0.5, z:0}, severity: "critical", target_part: "Shifterknob" },
    "P0747": { description_jp: "Pressure control solenoid A stuck on", position: {x:0, y:0.5, z:0}, severity: "critical", target_part: "Shifterknob" },
    "P0748": { description_jp: "Pressure control solenoid A electrical fault", position: {x:0, y:0.5, z:0}, severity: "warning", target_part: "Shifterknob" },
    "P0776": { description_jp: "Pressure control solenoid B performance/stuck", position: {x:0, y:0.5, z:0}, severity: "critical", target_part: "Shifterknob" },

    // Chassis / Brake / Tires (Wheels)
    "C1095": { description_jp: "ABS hydraulic pump motor circuit fault", position: {x:1.0, y:0.5, z:1.5}, severity: "critical", target_part: "Brake Disc FL" }, 
    "C1140": { description_jp: "Brake pressure sensor fault", position: {x:-1.0, y:0.5, z:1.5}, severity: "warning", target_part: "Brake Disc FR" }, 
    "C1234": { description_jp: "Brake pressure signal invalid/lost", position: {x:1.0, y:0.5, z:-1.5}, severity: "warning", target_part: "Brake Disc RL" }, 
    
    // Tires (Specific Wheel Positions)
    "C0031": { description_jp: "Front-left wheel speed sensor signal lost", position: {x:1.0, y:0.5, z:1.5}, severity: "warning", target_part: "Tire FL" },
    "C0034": { description_jp: "Front-right wheel speed sensor signal lost", position: {x:-1.0, y:0.5, z:1.5}, severity: "warning", target_part: "Tire FR" },
    "TPMS_LF": { description_jp: "Front-left tire pressure low", position: {x:1.0, y:0.5, z:1.5}, severity: "warning", target_part: "Tire FL" },
    "TPMS_RF": { description_jp: "Front-right tire pressure low", position: {x:-1.0, y:0.5, z:1.5}, severity: "warning", target_part: "Tire FR" },
    
    // Battery -> Hood
    "P0560": { description_jp: "System voltage malfunction (battery)", position: {x:0.5, y:1.0, z:1.2}, severity: "warning", target_part: "Hood" }
};

// Offline Keyword Mapping
export const KEYWORD_MAP = [
    { keywords: ["brake", "stopping", "abs"], code: "C1095" },
    { keywords: ["turbo", "boost", "slow", "lag"], code: "P0234" },
    { keywords: ["fuel", "gas", "pump", "pressure"], code: "P0087" },
    { keywords: ["gear", "shift", "transmission", "clutch"], code: "P0746" },
    { keywords: ["air", "map", "sensor", "intake"], code: "P0106" },
    { keywords: ["vibration", "shake", "misfire", "rough"], code: "P0300" }, // Virtual code
    { keywords: ["battery", "voltage", "power", "start"], code: "P0560" },
    { keywords: ["tire", "pressure", "flat", "tpms"], code: "TPMS_LF" } // Generic fallback to Left Front if no direction
];
