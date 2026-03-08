export const FLEET_DATA = [
    { id: "V90-001", model: "Volvo S90", status: "online", location: "Shanghai Jing'an District", mileage: 12405, health: 98, faults: [] },
    { id: "XC60-042", model: "Volvo XC60", status: "warning", location: "Hangzhou Binjiang District", mileage: 45120, health: 85, faults: ["P0106"] },
    { id: "V90-103", model: "Volvo V90", status: "online", location: "Suzhou Industrial Park", mileage: 8900, health: 100, faults: [] },
    { id: "S90-221", model: "Volvo S90", status: "critical", location: "Nanjing Jianye District", mileage: 22100, health: 62, faults: ["P0300", "P0087"] },
    { id: "XC90-005", model: "Volvo XC90", status: "online", location: "Shanghai Pudong New Area", mileage: 5600, health: 99, faults: [] },
    { id: "XC40-088", model: "Volvo XC40", status: "offline", location: "Ningbo Yinzhou District", mileage: 1500, health: 0, faults: [] },
    { id: "S60-012", model: "Volvo S60", status: "warning", location: "Hefei Shushan District", mileage: 33400, health: 88, faults: ["TPMS_LF"] },
    { id: "V60-099", model: "Volvo V60", status: "online", location: "Wuxi Binhu District", mileage: 18200, health: 97, faults: [] },
    { id: "XC60-155", model: "Volvo XC60", status: "critical", location: "Changzhou Xinbei District", mileage: 51000, health: 55, faults: ["C1095"] },
    { id: "S90-301", model: "Volvo S90", status: "online", location: "Nantong Chongchuan District", mileage: 9200, health: 96, faults: [] },
    // ... Generate more programmatically if needed
];

export const MAINTENANCE_LOGS = [
    { id: "WO-2024-001", date: "2024-03-01", vehicleId: "S90-221", code: "P0300", action: "Replace spark plugs x4", cost: 1200 },
    { id: "WO-2024-002", date: "2024-02-28", vehicleId: "XC60-042", code: "P0106", action: "Clean MAP sensor", cost: 450 },
    { id: "WO-2024-003", date: "2024-02-15", vehicleId: "S60-012", code: "TPMS_LF", action: "Tire inflation calibration", cost: 0 },
    { id: "WO-2024-004", date: "2024-01-20", vehicleId: "XC60-155", code: "C1095", action: "Replace ABS pump assembly", cost: 8500 },
];

export const QC_DATA = {
    dailyOutput: [820, 835, 850, 842, 860, 855, 848], // Last 7 days
    yieldRate: [97.5, 98.0, 96.8, 98.2, 98.5, 97.9, 98.1],
    defects: [
        { type: "Gap Tolerance", count: 12 },
        { type: "Paint Scratch", count: 5 },
        { type: "Connector Loose", count: 3 },
        { type: "Missing Label", count: 8 }
    ]
};
