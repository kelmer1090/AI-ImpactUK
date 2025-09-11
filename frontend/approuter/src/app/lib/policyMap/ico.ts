// frontend/approuter/src/app/lib/policyMap/ico.ts
import type { PolicyMap } from "./index";

export const icoAuditPolicyMap: PolicyMap = {
  // ── Accountability & Governance ─────────────────────────────────────────────
  "ICO-Audit DPIA-Requirement": {
    label: "ICO-Audit DPIA Requirement",
    text:
      "Using AI to process personal data is likely to result in high risk, so you must complete a Data Protection Impact Assessment (DPIA) and, where residual high risk remains, consult the ICO before processing.",
    link:
      "https://ico.org.uk/media/about-the-ico/documents/2619990/guidance-on-the-ai-auditing-framework.pdf",
    category: "Accountability",
    document: "ICO AI Auditing Framework",
    phase: "deployment",
    dimension: "resilience",
  },
  "ICO-Audit Accountability-Documentation": {
    label: "ICO-Audit Accountability & Documentation",
    text:
      "You should document and demonstrate how your AI system is compliant and be able to justify the choices you have made across its life-cycle.",
    link:
      "https://ico.org.uk/media/about-the-ico/documents/2619990/guidance-on-the-ai-auditing-framework.pdf",
    category: "Accountability",
    document: "ICO AI Auditing Framework",
    phase: "deployment",
    dimension: "resilience",
  },
  "ICO-Audit Controller-Processor-Determination": {
    label: "ICO-Audit Controller / Processor Determination",
    text:
      "For each AI processing operation, you must determine whether you are a controller, joint controller or processor, and allocate corresponding responsibilities and contractual terms.",
    link:
      "https://ico.org.uk/media/about-the-ico/documents/2619990/guidance-on-the-ai-auditing-framework.pdf",
    category: "Accountability",
    document: "ICO AI Auditing Framework",
    phase: "deployment",
    dimension: "resilience",
  },

  // ── Data Governance ─────────────────────────────────────────────────────────
  "ICO-Audit Data-Governance-Framework": {
    label: "ICO-Audit Data Governance Framework",
    text:
      "Put in place a data governance framework describing how all personal data used for training, testing or evaluating an AI system is correct, relevant, representative, complete and up to date.",
    link:
      "https://ico.org.uk/media/about-the-ico/documents/2619990/guidance-on-the-ai-auditing-framework.pdf",
    category: "Data Governance",
    document: "ICO AI Auditing Framework",
    phase: "data",
    dimension: "reliability",
  },
  "ICO-Audit Access-Controls": {
    label: "ICO-Audit Access Controls & Segregation of Duties",
    text:
      "Document access-management controls and segregation of duties so that changes to AI systems are made and signed off only by authorised personnel, with audit evidence retained.",
    link:
      "https://ico.org.uk/media/about-the-ico/documents/2619990/guidance-on-the-ai-auditing-framework.pdf",
    category: "Data Governance",
    document: "ICO AI Auditing Framework",
    phase: "deployment",
    dimension: "security",
  },

  // ── Accuracy / Transparency of outputs ──────────────────────────────────────
  "ICO-Audit Statistical-Accuracy-Monitoring": {
    label: "ICO-Audit Statistical Accuracy Monitoring",
    text:
      "From design onwards, establish accuracy metrics, adopt common terminology, and monitor model performance at a frequency proportionate to the potential harm of incorrect outputs, retraining as needed to address concept drift.",
    link:
      "https://ico.org.uk/media/about-the-ico/documents/2619990/guidance-on-the-ai-auditing-framework.pdf",
    category: "Accuracy",
    document: "ICO AI Auditing Framework",
    phase: "model",
    dimension: "accuracy",
  },
  "ICO-Audit Inference-Labeling": {
    label: "ICO-Audit Inference Labelling",
    text:
      "Ensure records clearly mark AI outputs as statistically-informed guesses rather than facts, including provenance details of the data and model that generated each inference.",
    link:
      "https://ico.org.uk/media/about-the-ico/documents/2619990/guidance-on-the-ai-auditing-framework.pdf",
    category: "Transparency",
    document: "ICO AI Auditing Framework",
    phase: "deployment",
    dimension: "explainability",
  },

  // ── Reliability & Robustness ────────────────────────────────────────────────
  "ICO-Audit Concept-Drift": {
    label: "ICO-Audit Concept Drift Management",
    text:
      "Define thresholds for acceptable performance degradation, detect drift and retrain the model on new data within timeframes appropriate to the use-case (e.g. every two years for dynamic recruitment criteria).",
    link:
      "https://ico.org.uk/media/about-the-ico/documents/2619990/guidance-on-the-ai-auditing-framework.pdf",
    category: "Reliability",
    document: "ICO AI Auditing Framework",
    phase: "model",
    dimension: "reliability",
  },
  "ICO-Audit Pre-Deployment-Testing": {
    label: "ICO-Audit Pre-deployment Testing",
    text:
      "Maintain a documented policy for pre-implementation testing and peer review of any AI system or significant change before go-live, retaining evidence of test results and approvals.",
    link:
      "https://ico.org.uk/media/about-the-ico/documents/2619990/guidance-on-the-ai-auditing-framework.pdf",
    category: "Robustness",
    document: "ICO AI Auditing Framework",
    phase: "model",
    dimension: "robustness",
  },

  // ── Security / Resilience ───────────────────────────────────────────────────
  "ICO-Audit Supply-Chain-Security": {
    label: "ICO-Audit Supply-Chain Security",
    text:
      "Assess security risks in externally-maintained code and frameworks, subscribe to vulnerability advisories, and enforce secure coding and source-code review processes.",
    link:
      "https://ico.org.uk/media/about-the-ico/documents/2619990/guidance-on-the-ai-auditing-framework.pdf",
    category: "Security/Resilience",
    document: "ICO AI Auditing Framework",
    phase: "deployment",
    dimension: "security",
  },
  "ICO-Audit Isolated-Dev-Env": {
    label: "ICO-Audit Isolated Development Environment",
    text:
      "Mitigate third-party code risks by developing ML models inside isolated virtual machines or containers, or by converting models into safer languages prior to deployment.",
    link:
      "https://ico.org.uk/media/about-the-ico/documents/2619990/guidance-on-the-ai-auditing-framework.pdf",
    category: "Security/Resilience",
    document: "ICO AI Auditing Framework",
    phase: "model",
    dimension: "security",
  },
  "ICO-Audit Security-Risk-Assessment": {
    label: "ICO-Audit Security Risk Assessment",
    text:
      "You must assess and manage AI-specific security risks – including adversarial attacks and data leakage – adopting measures proportionate to the nature, scope and context of the processing.",
    link:
      "https://ico.org.uk/media/about-the-ico/documents/2619990/guidance-on-the-ai-auditing-framework.pdf",
    category: "Security/Resilience",
    document: "ICO AI Auditing Framework",
    phase: "deployment",
    dimension: "security",
  },

  // ── Privacy & Data minimisation ─────────────────────────────────────────────
  "ICO-Audit Data-Minimisation-Techniques": {
    label: "ICO-Audit Data Minimisation Techniques",
    text:
      "Where large datasets are required, apply privacy-preserving approaches (e.g., differential privacy, federated learning, synthetic data) to comply with the data minimisation principle while maintaining model utility.",
    link:
      "https://ico.org.uk/media/about-the-ico/documents/2619990/guidance-on-the-ai-auditing-framework.pdf",
    category: "Privacy",
    document: "ICO AI Auditing Framework",
    phase: "data",
    dimension: "privacy",
  },
  "ICO-Audit Privacy-Attack-Mitigation": {
    label: "ICO-Audit Privacy Attack Mitigation",
    text:
      "Evaluate susceptibility to membership inference, model inversion and other AI-specific privacy attacks, and put controls in place to prevent disclosure of training data via model outputs.",
    link:
      "https://ico.org.uk/media/about-the-ico/documents/2619990/guidance-on-the-ai-auditing-framework.pdf",
    category: "Privacy",
    document: "ICO AI Auditing Framework",
    phase: "model",
    dimension: "privacy",
  },

  // ── Explainability & Interpretability ───────────────────────────────────────
  "ICO-Audit Black-Box-Limitations": {
    label: "ICO-Audit Black-Box Limitations",
    text:
      "Deploy ‘black-box’ models only after assessing their impacts, ensuring your organisation can responsibly manage them, and supplementing them with interpretability tools that provide adequate explanations.",
    link:
      "https://ico.org.uk/media/about-the-ico/documents/2619990/guidance-on-the-ai-auditing-framework.pdf",
    category: "Explainability",
    document: "ICO AI Auditing Framework",
    phase: "model",
    dimension: "explainability",
  },
  "ICO-Audit Supplemental-Interpretability": {
    label: "ICO-Audit Supplemental Interpretability",
    text:
      "Complex AI systems must include domain-appropriate interpretability techniques to support both individual explanations and internal oversight.",
    link:
      "https://ico.org.uk/media/about-the-ico/documents/2619990/guidance-on-the-ai-auditing-framework.pdf",
    category: "Interpretability",
    document: "ICO AI Auditing Framework",
    phase: "model",
    dimension: "explainability",
  },

  // ── Fairness & Bias ─────────────────────────────────────────────────────────
  "ICO-Audit Algorithmic-Fairness-Monitoring": {
    label: "ICO-Audit Algorithmic Fairness Monitoring",
    text:
      "Regularly monitor models for algorithmic fairness using appropriate statistical measures, documenting reviews and corrective actions.",
    link:
      "https://ico.org.uk/media/about-the-ico/documents/2619990/guidance-on-the-ai-auditing-framework.pdf",
    category: "Managing Bias",
    document: "ICO AI Auditing Framework",
    phase: "model",
    dimension: "bias",
  },
  "ICO-Audit Fairness-Constraints": {
    label: "ICO-Audit Fairness Constraints",
    text:
      "Where discrimination is detected, add or remove data, retrain models with fairness constraints, or retrain designers to resolve biased performance.",
    link:
      "https://ico.org.uk/media/about-the-ico/documents/2619990/guidance-on-the-ai-auditing-framework.pdf",
    category: "Fairness",
    document: "ICO AI Auditing Framework",
    phase: "model",
    dimension: "bias",
  },
  "ICO-Audit Diversity-Attestation": {
    label: "ICO-Audit Diversity Attestation",
    text:
      "Require documented approval and attestation to the diversity and representation of training and test data before it is used in an AI system.",
    link:
      "https://ico.org.uk/media/about-the-ico/documents/2619990/guidance-on-the-ai-auditing-framework.pdf",
    category: "Diversity & Inclusion",
    document: "ICO AI Auditing Framework",
    phase: "data",
    dimension: "bias",
  },

  // ── Transparency of decisions ───────────────────────────────────────────────
  "ICO-Audit Output-Context": {
    label: "ICO-Audit Output Context Transparency",
    text:
      "Where AI outputs are subjective or probabilistic, records and downstream decisions must reflect those limitations to avoid misinterpreting them as factual.",
    link:
      "https://ico.org.uk/media/about-the-ico/documents/2619990/guidance-on-the-ai-auditing-framework.pdf",
    category: "Transparency",
    document: "ICO AI Auditing Framework",
    phase: "deployment",
    dimension: "explainability",
  },

  // ── Safety (rights & freedoms) ──────────────────────────────────────────────
  "ICO-Audit Risk-Assessment": {
    label: "ICO-Audit Risk Assessment & Mitigation",
    text:
      "Assess risks to individuals’ rights and freedoms whenever you design or deploy an AI system, implement proportional controls, and be prepared to halt deployment if risks cannot be managed.",
    link:
      "https://ico.org.uk/media/about-the-ico/documents/2619990/guidance-on-the-ai-auditing-framework.pdf",
    category: "Safety",
    document: "ICO AI Auditing Framework",
    phase: "deployment",
    dimension: "robustness",
  },

  "ICO-Audit Article22-Classification": {
    label: "ICO-Audit Human Oversight & Article 22 Classification",
    text:
      "Senior management must sign-off whether an AI system supports human decision-making or makes solely automated decisions, with clear lines of accountability and risk-management policies aligned to GDPR Article 22.",
    link:
      "https://ico.org.uk/media/about-the-ico/documents/2619990/guidance-on-the-ai-auditing-framework.pdf",
    category: "Accountability",
    document: "ICO AI Auditing Framework",
    phase: "deployment",
    dimension: "resilience",
  },

  "ICO-Audit Automation-Bias": {
    label: "ICO-Audit Automation Bias Controls",
    text:
      "From the design stage, put controls in place to mitigate automation bias—eg, reviewer training, interpretability tools, and requirements that support meaningful human challenge of AI outputs.",
    link:
      "https://ico.org.uk/media/about-the-ico/documents/2619990/guidance-on-the-ai-auditing-framework.pdf",
    category: "Managing Bias",
    document: "ICO AI Auditing Framework",
    phase: "deployment",
    dimension: "bias",
  },

  "ICO-Audit Human-Review-Monitoring": {
    label: "ICO-Audit Human Review Monitoring",
    text:
      "Continuously analyse how often human reviewers accept or reject AI outputs; if they routinely agree without genuine assessment, treat the process as solely automated and introduce additional safeguards or scrutiny.",
    link:
      "https://ico.org.uk/media/about-the-ico/documents/2619990/guidance-on-the-ai-auditing-framework.pdf",
    category: "Accountability",
    document: "ICO AI Auditing Framework",
    phase: "deployment",
    dimension: "resilience",
  },

  "ICO-Audit Rights-AI-Outputs": {
    label: "ICO-Audit Individual Rights – AI Outputs",
    text:
      "When AI predictions are stored in a user profile, they are subject to the rights of access, rectification and erasure; organisations must be able to correct or delete inaccurate outputs that affect individuals.",
    link:
      "https://ico.org.uk/media/about-the-ico/documents/2619990/guidance-on-the-ai-auditing-framework.pdf",
    category: "Privacy",
    document: "ICO AI Auditing Framework",
    phase: "deployment",
    dimension: "privacy",
  },

  "ICO-Audit Rights-Training-Data": {
    label: "ICO-Audit Individual Rights – Training Data",
    text:
      "You must consider and respond to access, rectification or erasure requests concerning personal data in training datasets, even if this necessitates re-training or deleting the model unless an Article 11 exemption applies.",
    link:
      "https://ico.org.uk/media/about-the-ico/documents/2619990/guidance-on-the-ai-auditing-framework.pdf",
    category: "Privacy",
    document: "ICO AI Auditing Framework",
    phase: "data",
    dimension: "privacy",
  },
};
