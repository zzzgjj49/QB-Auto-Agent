# MeltingHack - 下一代汽车 AI 诊断数字孪生系统
## 项目技术详细设计书 & 分析报告

### 1. 项目概要 (Executive Summary)

**MeltingHack** 是一款旨在解决汽车维修行业“信息不对称”问题的 AI 驱动型 3D 可视化诊断系统。
它将专业的故障代码（DTC）转化为普通用户也能直观理解的“3D 视觉效果”和“通俗语言”，从而提高维修过程的透明度和用户的信任感。

本项目是一个融合了 **阿里云通义千问 (Qwen)** 大语言模型强大的推理能力与 **Three.js** 高度互动的 WebGL 表现力的 Web 端数字孪生应用。

---

### 2. 核心价值 (Core Value Proposition)

1.  **可视化 (Visualization)**:
    *   在 3D 模型上实时定位并高亮显示容易被“黑盒化”的车辆故障。
    *   通过“分解模式 (Exploded View)”，透视并展开车辆内部结构，直观展示故障部位。
2.  **翻译与解读 (Translation)**:
    *   利用 Qwen AI 将晦涩难懂的 DTC 代码（如 `P0300`）解析为用户友好的自然语言说明。
    *   通过 **Neural Log (思维链可视化)**，将 AI 诊断的逻辑推理过程透明化展示，拒绝“黑箱操作”。
3.  **预测性维护 (Prediction)**:
    *   搭载 **Future Impact Simulator (未来影响模拟器)**，推演“如果现在不修，一年后会发生什么”，有效促进预防性维修。

---

### 3. 技术栈 (Technical Stack)

#### 前端核心 (Frontend Core)
*   **框架**: Vanilla JavaScript (ES6+), 模块化架构 (Modular Architecture)
*   **3D 引擎**: **Three.js (r128+)**
    *   GLTF Loader (支持 Draco 压缩)
    *   自定义着色器 (Custom Shaders: 故障抖动特效、全息材质)
    *   射线检测 (Raycasting) 实现 3D 交互
*   **动画引擎**: **GSAP (GreenSock Animation Platform)**
    *   相机运镜 (Camera Transitions)
    *   UI 动效
    *   分解视图插值动画
*   **样式**: CSS3 自定义属性 (Variables), Flexbox/Grid 布局, 玻璃拟态 (Glassmorphism), 赛博朋克美学 (Cyberpunk Aesthetics)

#### AI 与后端集成 (AI & Backend Integration)
*   **LLM 提供商**: **阿里云通义千问 (Alibaba Cloud Qwen)**
    *   模型: `qwen-max` (复杂推理), `qwen-plus` (极速响应)
    *   集成: 通过 Fetch API 进行直接接口调用
*   **提示词工程 (Prompt Engineering)**: 上下文感知系统提示词 (Context-aware system prompts), 思维链 (CoT) 强制, JSON 结构化输出。
*   **服务器**: Python `http.server` (本地开发) / Vercel (生产环境部署)

---

### 4. 系统架构详解 (Architecture Analysis)

项目采用严格的功能模块化设计，确保了代码的可维护性和扩展性。

#### 📂 目录结构解析

```text
js/
├── core/
│   ├── app.js           # 【Controller】 应用全生命周期管理、事件总线与调停 (原 main.js)
│   └── config.js        # 【Config】 全局常量、API 密钥配置、配色方案
├── components/
│   ├── scene.js         # 【View/3D】 Three.js 场景管理、模型操作、着色器与相机控制
│   └── ui.js            # 【View/DOM】 HTML UI 操作、图表绘制、Neural Log 显示
├── services/
│   ├── api.js           # 【Model/AI】 Qwen API 通信封装、错误处理
│   ├── diagnostics.js   # 【Logic】 诊断核心逻辑、DTC 代码解析、本地兜底策略
│   ├── simulation.js    # 【Logic】 寿命衰减模拟引擎
│   └── voiceManager.js  # 【Input】 语音识别 (Web Speech API) & 语音合成 (TTS)
├── data/
│   ├── domain.js        # 【Model】 领域模型与产品配置
│   ├── dtc_data.js      # 【Data】 DTC 静态数据库（3D 坐标、严重等级、多语言描述）
│   ├── fleet_data.js    # 【Data】 模拟车辆数据与维保记录
│   └── prompts.js       # 【Model/Prompt】 提示词工程管理（角色定义、输出约束）
└── utils/               # 【Utils】 通用工具函数
```

#### 🔑 关键模块深度解析

**1. `js/scene.js` - 3D 可视化的核心**
*   **Proximity Search (近接探索算法)**:
    *   基于 DTC 数据定义的空间坐标 (`x,y,z`)，自动搜索该坐标周边的 3D 网格（Mesh）并进行高亮。即使部件名称不完全匹配，也能通过空间位置锁定故障零件。
*   **Dynamic Material System (动态材质系统)**:
    *   根据状态动态切换材质：正常（线框蓝）、警告（琥珀色）、危急（红色故障/抖动特效）。
*   **Exploded View Logic (分解视图逻辑)**:
    *   计算每个零部件的世界坐标向量，从中心点向外辐射状展开，实现平滑的分解动画。

**2. `js/prompts.js` & `js/api.js` - AI 大脑**
*   **Structured Output (结构化输出)**:
    *   强制 AI 输出严格的 JSON 格式。将 `thought_process`（思考过程）、`message`（用户回答）和 `action`（控制指令）分离，实现了“既能对话，又能控车”。
*   **Prompt Strategy (提示词策略)**:
    *   角色扮演定义：“你是一辆沃尔沃 S90 的专家级维修技师”。
    *   语言锁死：始终强制使用日语/中文回答 (`ALWAYS RESPOND IN TARGET LANGUAGE`)。

**3. `js/main.js` - 编排器 (Orchestrator)**
*   **Async Synchronization (异步同步)**:
    *   利用 `Promise.all` 将前端的“伪扫描动画”与后端的“真实数据请求”完美同步，保证用户体验的流畅性。
*   **Fallback Mechanism (兜底机制)**:
    *   采用双重保障架构：当 AI API 响应超时或异常时，自动回退到本地 `js/dtc_data.js` 数据库，确保基本诊断功能永不掉线。

---

### 5. 黑客松 "Wow" 亮点功能 (Hackathon Highlights)

#### 🧠 Neural Log (思维链可视化)
*   **功能**: 当 Qwen AI 生成回答时，将其“内心独白”和推理过程以绿色的代码流形式实时打印在聊天界面中。
*   **技术意义**: 像《黑客帝国》一样展示 LLM 不是简单的搜索引擎，而是具备“逻辑思考”能力的智能体。这是 Chain-of-Thought (CoT) 技术的直观可视化应用。

#### 🔮 Future Impact Simulator (未来影响模拟器)
*   **功能**: 针对当前检测到的轻微故障（如 P0300 失火），AI 会推演并生成一份“未来报告”，展示如果现在不修，1个月、6个月、1年后车辆会恶化成什么样。
*   **技术意义**: 利用生成式 AI 的因果推断能力，将枯燥的维修建议转化为具有视觉冲击力的“预警故事”，极大地促进了用户的行动意愿。

#### 🎌 Japanese Localization Logic (深度本地化)
*   **功能**: 针对日本市场，通过 System Prompt 层面强制锁定日语输出，并配合本地映射表，将专业术语（如 TPMS）自动转换为通俗日语（轮胎气压传感器）。

---

### 6. 未来路线图 (Future Roadmap)

1.  **实时 OBD-II 硬件互联**:
    *   接入蓝牙 OBD-II 适配器，读取真实的车辆实时数据流。
2.  **VR/AR 混合现实模式**:
    *   利用 WebXR 技术，用户举起手机对准实车，即可透视内部故障（MR 模式）。
3.  **维修服务智能匹配**:
    *   基于诊断结果和地理位置，API 实时拉取附近合作维修厂的空闲工位并一键预约。

---

### 7. 结论 (Conclusion)

MeltingHack 绝不仅仅是一个“3D 汽车展示 App”。
它是**将“AI 的超级大脑”与“数字孪生的感知能力”深度融合的下一代汽车服务基础设施原型。**
如果没有阿里云通义千问 (Qwen) 卓越的推理与生成能力，这种级别的智能化整合方案将无法实现。
