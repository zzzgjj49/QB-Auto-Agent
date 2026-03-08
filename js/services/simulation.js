
// Degradation Simulation Engine
// Core Logic for Patent Point A: "Vehicle Component Health Decay Simulation Method based on Multi-dimensional Fault Features"
// Patent core algorithm: multi-dimensional fault-feature-based vehicle component health decay simulation

export class DegradationEngine {
    constructor() {
        // Define decay models based on physics types
        this.decayModels = {
            'thermal': (t) => Math.exp(-0.1 * t), // Exponential decay (Overheating)
            'mechanical': (t) => 1 - (0.05 * t + 0.01 * t * t), // Accelerated wear (Friction/Vibration)
            'electrical': (t) => Math.random() > 0.8 ? 0 : 1, // Random failure (Short circuit) - Step function
            'fluid': (t) => 1 - 0.1 * t // Linear leak (Pressure loss)
        };
    }

    /**
     * Simulate health degradation over time
     * @param {string} faultType - Type of fault (thermal, mechanical, electrical, fluid)
     * @param {number} initialSeverity - 0.0 to 1.0 (1.0 = Critical)
     * @param {number} timeSteps - Number of months to simulate
     * @returns {Array} Array of health scores (0-100) over time
     */
    simulateDecay(faultType, initialSeverity, timeSteps = 12) {
        const model = this.decayModels[faultType] || this.decayModels['mechanical'];
        const curve = [];
        
        // Base health starts at 100 - (severity impact)
        let currentHealth = 100 - (initialSeverity * 20); 

        for (let t = 0; t < timeSteps; t++) {
            // Apply physics-based decay factor
            const decayFactor = model(t);
            
            // Add stochastic noise (Simulation of real-world variables)
            const noise = (Math.random() - 0.5) * 2; 
            
            // Calculate new health
            // If severity is high, decay is faster
            const acceleratedDecay = (1 + initialSeverity); 
            
            if (faultType === 'thermal') {
                currentHealth *= (0.95 / acceleratedDecay); // Heat accumulates damage
            } else if (faultType === 'mechanical') {
                currentHealth -= (2 * acceleratedDecay) + noise;
            } else if (faultType === 'fluid') {
                currentHealth -= (1.5 * acceleratedDecay);
            }

            // Clamp between 0 and 100
            currentHealth = Math.max(0, Math.min(100, currentHealth));
            
            curve.push({
                month: t + 1,
                health: Math.round(currentHealth),
                status: this.getStatusFromHealth(currentHealth)
            });
        }
        
        return curve;
    }

    getStatusFromHealth(score) {
        if (score > 80) return 'normal';
        if (score > 50) return 'warning';
        return 'critical';
    }

    /**
     * Map DTC code to physical fault type for simulation
     */
    mapDTCToPhysics(code) {
        if (code.startsWith('P03')) return 'mechanical'; // Misfire -> Vibration
        if (code.startsWith('P02')) return 'thermal';    // Injector -> Heat
        if (code.startsWith('P01')) return 'fluid';      // Fuel/Air -> Pressure
        if (code.startsWith('C')) return 'electrical';   // Chassis/Sensor -> Circuit
        if (code.includes('TPMS')) return 'fluid';       // Air pressure
        return 'mechanical'; // Default
    }
}
