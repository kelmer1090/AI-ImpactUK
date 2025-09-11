// frontend/approuter/src/app/lib/policyMap/iso.ts
import type { PolicyMap } from "./index";

export const iso42001PolicyMap: PolicyMap = {
  // ——— Core management-system clauses (4–10) ————————————————
  "ISO 42001 §4.1 Context": {
    label:
      "ISO 42001 §4.1 Understanding the organisation & its context",
    text:
      "The organisation shall determine external and internal issues relevant to its purpose that affect its ability to achieve the intended result(s) of its AI management system (AIMS).",
    link: "https://www.iso.org/standard/81259.html",
    category: "Accountability",
    document: "ISO/IEC 42001:2023",
    phase: "deployment",
    dimension: "resilience",
  },
  "ISO 42001 §4.2 Interested-Parties": {
    label: "ISO 42001 §4.2 Needs & expectations of interested parties",
    text:
      "The organisation shall determine the interested parties relevant to the AIMS and the requirements of those parties that are applicable to the AIMS.",
    link: "https://www.iso.org/standard/81259.html",
    category: "Accountability",
    document: "ISO/IEC 42001:2023",
    phase: "deployment",
    dimension: "resilience",
  },
  "ISO 42001 §4.3 Scope": {
    label: "ISO 42001 §4.3 Scope of the AIMS",
    text:
      "The organisation shall determine the boundaries and applicability of the AIMS, taking into account external & internal issues and interested-party requirements, and shall maintain documented information stating the scope.",
    link: "https://www.iso.org/standard/81259.html",
    category: "Accountability",
    document: "ISO/IEC 42001:2023",
    phase: "deployment",
    dimension: "resilience",
  },
  "ISO 42001 §5.2 AI-Policy": {
    label: "ISO 42001 §5.2 AI Policy",
    text:
      "Top management shall establish, implement and maintain an AI policy that is appropriate to the purpose of the organisation, includes a commitment to responsible development and use of AI systems and to continual improvement of the AIMS, and is communicated within the organisation and made available to interested parties, as appropriate.",
    link: "https://www.iso.org/standard/81259.html",
    category: "Transparency",
    document: "ISO/IEC 42001:2023",
    phase: "deployment",
    dimension: "explainability",
  },
  "ISO 42001 §6.1 Risk-Opportunities": {
    label: "ISO 42001 §6.1 Actions to address risks & opportunities",
    text:
      "The organisation shall determine AI-related risks and opportunities that need to be addressed to give assurance that the AIMS can achieve its intended result(s), prevent or reduce undesired impact(s) and achieve continual improvement.",
    link: "https://www.iso.org/standard/81259.html",
    category: "Safety",
    document: "ISO/IEC 42001:2023",
    phase: "deployment",
    dimension: "robustness",
  },
  "ISO 42001 §6.2 AI-Objectives": {
    label: "ISO 42001 §6.2 AI Objectives & planning to achieve them",
    text:
      "The organisation shall establish AI objectives at relevant functions and levels. Objectives shall be measurable (if practicable), monitored, communicated, updated and supported by plans that define responsible parties, resources, timelines and evaluation methods.",
    link: "https://www.iso.org/standard/81259.html",
    category: "Accountability",
    document: "ISO/IEC 42001:2023",
    phase: "deployment",
    dimension: "resilience",
  },
  "ISO 42001 §7.2 Competence": {
    label: "ISO 42001 §7.2 Competence",
    text:
      "The organisation shall determine the competence necessary for those doing work under its control that affects AI performance and reliability, ensure they are competent on the basis of appropriate education, training or experience, and retain documented information as evidence.",
    link: "https://www.iso.org/standard/81259.html",
    category: "Diversity & Inclusion",
    document: "ISO/IEC 42001:2023",
    phase: "deployment",
    dimension: "resilience",
  },
  "ISO 42001 §7.3 Awareness": {
    label: "ISO 42001 §7.3 Awareness",
    text:
      "Persons doing work under the organisation’s control shall be aware of the AI policy, their contribution to the effectiveness of the AIMS and the implications of not conforming to its requirements.",
    link: "https://www.iso.org/standard/81259.html",
    category: "Transparency",
    document: "ISO/IEC 42001:2023",
    phase: "deployment",
    dimension: "explainability",
  },
  "ISO 42001 §7.5 Documented-Information": {
    label: "ISO 42001 §7.5 Documented information",
    text:
      "The AIMS shall include documented information required by this Standard and as determined by the organisation for effectiveness and confidence. Documented information shall be controlled to ensure it is available, suitable and adequately protected.",
    link: "https://www.iso.org/standard/81259.html",
    category: "Accountability",
    document: "ISO/IEC 42001:2023",
    phase: "deployment",
    dimension: "resilience",
  },
  "ISO 42001 §8.2 Data-Management": {
    label: "ISO 42001 §8.2 Data management",
    text:
      "The organisation shall establish criteria and procedures to ensure data used in AI systems are relevant, representative, accurate, complete and up to date; data lineage shall be documented and quality monitored throughout the AI life cycle.",
    link: "https://www.iso.org/standard/81259.html",
    category: "Data Governance",
    document: "ISO/IEC 42001:2023",
    phase: "data",
    dimension: "accuracy",
  },
  "ISO 42001 §8.3 Design-Development": {
    label: "ISO 42001 §8.3 Design & development of AI systems",
    text:
      "The organisation shall plan and control design and development of AI systems, including verification & validation activities to ensure outputs meet input requirements and intended use, with records of reviews and approvals maintained.",
    link: "https://www.iso.org/standard/81259.html",
    category: "Accuracy",
    document: "ISO/IEC 42001:2023",
    phase: "model",
    dimension: "robustness",
  },
  "ISO 42001 §8.5 Performance-Monitoring": {
    label: "ISO 42001 §8.5 Monitoring & measurement of AI performance",
    text:
      "Performance of AI systems shall be monitored and measured against planned results at defined intervals; where necessary, corrective actions shall be taken to maintain required accuracy, robustness and reliability.",
    link: "https://www.iso.org/standard/81259.html",
    category: "Reliability",
    document: "ISO/IEC 42001:2023",
    phase: "deployment",
    dimension: "reliability",
  },
  "ISO 42001 §8.7 Incident-Management": {
    label: "ISO 42001 §8.7 Incident & change management",
    text:
      "The organisation shall establish processes to identify, report, investigate and act on AI-related incidents or non-conformities, including security or safety issues, and control changes to AI systems to prevent unintended consequences.",
    link: "https://www.iso.org/standard/81259.html",
    category: "Security/Resilience",
    document: "ISO/IEC 42001:2023",
    phase: "deployment",
    dimension: "security",
  },
  "ISO 42001 §9.2 Internal-Audit": {
    label: "ISO 42001 §9.2 Internal audit",
    text:
      "The organisation shall conduct internal audits at planned intervals to determine whether the AIMS conforms to the requirements of this Standard and is effectively implemented and maintained.",
    link: "https://www.iso.org/standard/81259.html",
    category: "Accountability",
    document: "ISO/IEC 42001:2023",
    phase: "deployment",
    dimension: "resilience",
  },
  "ISO 42001 §10.1 Corrective-Action": {
    label: "ISO 42001 §10.1 Nonconformity & corrective action",
    text:
      "When a non-conformity occurs, the organisation shall react to it, evaluate the need for action to eliminate the cause, implement any action needed, review the effectiveness and make changes to the AIMS if necessary.",
    link: "https://www.iso.org/standard/81259.html",
    category: "Accountability",
    document: "ISO/IEC 42001:2023",
    phase: "deployment",
    dimension: "resilience",
  },

  // ——— Annex A controls ————————————————————————————————————————————
  "ISO 42001 AnnexA A.6.2 Data-Quality": {
    label: "ISO 42001 Annex A 6.2 Data quality",
    text:
      "Controls shall be in place to ensure data used for AI is of sufficient quality, including relevance, representativeness, accuracy, completeness, consistency and timeliness, with responsibilities assigned for data quality assurance.",
    link: "https://www.iso.org/standard/81259.html",
    category: "Accuracy",
    document: "ISO/IEC 42001:2023",
    phase: "data",
    dimension: "accuracy",
  },
  "ISO 42001 AnnexA A.6.5 Robustness-Accuracy": {
    label: "ISO 42001 Annex A 6.5 Robustness & accuracy of AI systems",
    text:
      "The organisation shall implement controls to detect, prevent and mitigate errors, faults and unexpected behaviour in AI systems, ensuring robust performance across the intended operating range.",
    link: "https://www.iso.org/standard/81259.html",
    category: "Robustness",
    document: "ISO/IEC 42001:2023",
    phase: "model",
    dimension: "robustness",
  },
  "ISO 42001 AnnexA A.6.6 Bias-Fairness": {
    label: "ISO 42001 Annex A 6.6 Bias & fairness",
    text:
      "Procedures shall exist to identify, assess and mitigate bias in data, models and outcomes, supporting fair and non-discriminatory AI performance.",
    link: "https://www.iso.org/standard/81259.html",
    category: "Managing Bias",
    document: "ISO/IEC 42001:2023",
    phase: "model",
    dimension: "bias",
  },
  "ISO 42001 AnnexA A.6.7 Security": {
    label: "ISO 42001 Annex A 6.7 Security of AI systems",
    text:
      "Security controls shall protect AI systems and assets against threats including adversarial manipulation, model extraction, data poisoning and privacy attacks, maintaining confidentiality, integrity and availability.",
    link: "https://www.iso.org/standard/81259.html",
    category: "Security/Resilience",
    document: "ISO/IEC 42001:2023",
    phase: "deployment",
    dimension: "security",
  },
  "ISO 42001 AnnexA A.6.8 Explainability": {
    label: "ISO 42001 Annex A 6.8 Explainability & interpretability",
    text:
      "The organisation shall ensure that explanations of AI system behaviour are available, appropriate for the context and audience, and provide sufficient information for users to understand outputs.",
    link: "https://www.iso.org/standard/81259.html",
    category: "Explainability",
    document: "ISO/IEC 42001:2023",
    phase: "deployment",
    dimension: "explainability",
  },
  "ISO 42001 AnnexA A.6.9 Transparency": {
    label: "ISO 42001 Annex A 6.9 Transparency & traceability",
    text:
      "Traceability of data, models and decisions shall be maintained; relevant information about the AI system’s purpose, limitations and performance shall be made available to stakeholders.",
    link: "https://www.iso.org/standard/81259.html",
    category: "Transparency",
    document: "ISO/IEC 42001:2023",
    phase: "deployment",
    dimension: "explainability",
  },
  "ISO 42001 AnnexA A.6.10 Privacy": {
    label: "ISO 42001 Annex A 6.10 Privacy & data protection",
    text:
      "AI development and operation shall comply with applicable data-protection regulations, applying privacy-by-design principles and minimising personal data processing.",
    link: "https://www.iso.org/standard/81259.html",
    category: "Privacy",
    document: "ISO/IEC 42001:2023",
    phase: "data",
    dimension: "privacy",
  },
  "ISO 42001 AnnexA A.6.11 Safety-Human-Oversight": {
    label: "ISO 42001 Annex A 6.11 Safety & human oversight",
    text:
      "AI systems shall include appropriate human oversight mechanisms to prevent or mitigate harms and enable intervention when necessary.",
    link: "https://www.iso.org/standard/81259.html",
    category: "Safety",
    document: "ISO/IEC 42001:2023",
    phase: "deployment",
    dimension: "resilience",
  },
  "ISO 42001 AnnexA A.6.12 Accountability-Roles": {
    label: "ISO 42001 Annex A 6.12 Accountability & roles",
    text:
      "Roles and responsibilities for AI governance, risk management and compliance shall be defined, assigned and communicated across the organisation.",
    link: "https://www.iso.org/standard/81259.html",
    category: "Accountability",
    document: "ISO/IEC 42001:2023",
    phase: "deployment",
    dimension: "resilience",
  },
  "ISO 42001 AnnexA A.6.13 Diversity-Inclusion": {
    label: "ISO 42001 Annex A 6.13 Diversity & inclusion",
    text:
      "The organisation shall consider diversity and inclusion throughout the AI life cycle, engaging a diverse range of stakeholders and avoiding exclusionary impacts.",
    link: "https://www.iso.org/standard/81259.html",
    category: "Diversity & Inclusion",
    document: "ISO/IEC 42001:2023",
    phase: "deployment",
    dimension: "bias",
  },
  "ISO 42001 AnnexA A.7 Impact-Assessment": {
    label: "ISO 42001 Annex A 7 AI system impact assessment",
    text:
      "A formal, documented AI system impact assessment shall be performed to identify, evaluate and address impacts on individuals, groups or society arising from AI use.",
    link: "https://www.iso.org/standard/81259.html",
    category: "Safety",
    document: "ISO/IEC 42001:2023",
    phase: "deployment",
    dimension: "resilience",
  },
  "ISO 42001 AnnexA A.8 Data-Governance": {
    label: "ISO 42001 Annex A 8 Data governance",
    text:
      "Controls shall govern data collection, storage, processing and deletion, ensuring compliance with data-quality requirements and lifecycle policies.",
    link: "https://www.iso.org/standard/81259.html",
    category: "Data Governance",
    document: "ISO/IEC 42001:2023",
    phase: "data",
    dimension: "reliability",
  },
  "ISO 42001 AnnexA A.9 Design-Controls": {
    label: "ISO 42001 Annex A 9 Design & development controls",
    text:
      "Design and development of AI systems shall follow documented processes that incorporate risk assessment, requirements traceability and validation against user needs.",
    link: "https://www.iso.org/standard/81259.html",
    category: "Robustness",
    document: "ISO/IEC 42001:2023",
    phase: "model",
    dimension: "robustness",
  },
  "ISO 42001 AnnexA A.10 Lifecycle-Operations": {
    label: "ISO 42001 Annex A 10 AI life-cycle operations",
    text:
      "Operational controls shall cover deployment, monitoring, maintenance and retirement of AI systems to ensure ongoing reliability and alignment with intended purpose.",
    link: "https://www.iso.org/standard/81259.html",
    category: "Reliability",
    document: "ISO/IEC 42001:2023",
    phase: "deployment",
    dimension: "reliability",
  },
  "ISO 42001 AnnexA A.11 Incident-Response": {
    label: "ISO 42001 Annex A 11 Incident response & remediation",
    text:
      "The organisation shall establish and maintain processes for timely detection, reporting and remediation of AI-related incidents, with lessons learned feeding back into continual improvement.",
    link: "https://www.iso.org/standard/81259.html",
    category: "Security/Resilience",
    document: "ISO/IEC 42001:2023",
    phase: "deployment",
    dimension: "security",
  },
  "ISO 42001 AnnexA A.12 Transparency-Info": {
    label: "ISO 42001 Annex A 12 Information for transparency",
    text:
      "Information provided to users and stakeholders shall include the AI system’s purpose, capabilities, limitations, performance metrics and any significant risks, enabling informed decision-making.",
    link: "https://www.iso.org/standard/81259.html",
    category: "Transparency",
    document: "ISO/IEC 42001:2023",
    phase: "deployment",
    dimension: "explainability",
  },
};
