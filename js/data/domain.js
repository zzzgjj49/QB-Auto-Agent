export const PRODUCT_PROFILE = {
    name: 'QB',
    title: 'Full-Lifecycle Automotive Intelligence Platform',
    architecture: 'Edge Models + AI Agents',
    mission: 'Unified Production QA and After-Sales Intelligence'
};

export const VIEW_POLICY = {
    dataViews: ['dashboard', 'vehicles', 'history'],
    sceneViews: ['qc', 'scan', 'twin']
};

export const PRODUCTION_QC_TEMPLATE = [
    { id: 1, name: 'Front bumper assembly gap', target: 'Bumper Front', position: { x: 0, y: 0.8, z: 2.5 } },
    { id: 2, name: 'Front-left headlight assembly alignment', target: 'Glass Headlight', position: { x: 0.8, y: 0.9, z: 2.1 } },
    { id: 3, name: 'Hood surface flatness', target: 'Hood', position: { x: 0, y: 1.2, z: 1.0 } },
    { id: 4, name: 'Front-left rim and tire-pressure module', target: 'Rim FL', position: { x: 1.0, y: 0.4, z: 1.5 } },
    { id: 5, name: 'Front-left door sealing and flatness', target: 'Door Front', position: { x: 1.1, y: 1.0, z: 0.5 } },
    { id: 6, name: 'Panoramic sunroof glass integrity', target: 'SunRoof', position: { x: 0, y: 1.5, z: 0 } },
    { id: 7, name: 'Trunk latch and gap', target: 'Trunk', position: { x: 0, y: 1.1, z: -2.2 } },
    { id: 8, name: 'Rear-right taillight assembly', target: 'Taillight glass', position: { x: -0.8, y: 0.9, z: -2.1 } },
    { id: 9, name: 'Underbody clearance and shield condition', target: 'Underbody', position: { x: 0, y: 0.2, z: 0 } }
];

export function createQCItems() {
    return PRODUCTION_QC_TEMPLATE.map(item => ({
        ...item,
        status: 'pending',
        defect: null
    }));
}

export function evaluateQCItem(item, index) {
    const defectByTarget = {
        'Rim FL': 'TPMS calibration deviation',
        'Door Front': 'Door gap tolerance exceeded by 1.8mm',
        'SunRoof': 'Micro-scratch on glass coating'
    };
    if (defectByTarget[item.target] && index % 2 === 1) {
        return { status: 'fail', defect: defectByTarget[item.target] };
    }
    return { status: 'pass', defect: null };
}
