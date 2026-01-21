
// Configuration Constants

export const CONFIG = {
    APP_NAME: "MeltingHack v5.0",
    API_KEY: "sk-11dd6e37e3414e059be298ed8b1a0e59",
    API_URL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
    
    // 3D Settings
    COLORS: {
        PRIMARY: 0x00f3ff,
        ALERT: 0xff003c,
        SUCCESS: 0x00ff88,
        WARNING: 0xffaa00,
        BACKGROUND_NORMAL: 0x030507,
        BACKGROUND_SCAN: 0x001122
    },
    
    // Animation Settings
    ANIMATION: {
        EXPLODE_DISTANCE: 1.5,
        EXPLODE_DURATION: 1.0,
        CAMERA_MOVE_DURATION: 1.5
    },

    // Models
    MODELS: {
        CAR_URL: './volvo_s90_recharge_free.glb'
    },

    // Voice
    VOICE: {
        LANG: 'ja-JP',
        DEBOUNCE_MS: 1500
    }
};
