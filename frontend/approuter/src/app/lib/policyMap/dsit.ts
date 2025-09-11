// frontend/approuter/src/app/lib/policyMap/dsit.ts
import type { PolicyMap } from "./index";

/** DSIT White Paper clauses with phase + dimension tags.
 *  Phase maps to the lifecycle bucket for the stacked bars.
 *  Dimension maps to the radar axes (0..1 risk scale in the UI).
 */
export const dsitPolicyMap: PolicyMap = {
  // ── §3.2.3 – Cross-sector principles ────────────────────────────────────────
  "DSIT §3.2.3 Safety": {
    label: "DSIT §3.2.3 Safety, Security & Robustness",
    text:
      "AI systems should function in a robust, secure and safe way throughout the AI life cycle, and risks should be continually identified, assessed and managed.",
    link:
      "https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach/white-paper#section-3-2-3",
    category: "Safety",
    document: "DSIT White Paper",
    phase: "model",
    dimension: "robustness",
  },

  "DSIT §3.2.3 Reliability": {
    label: "DSIT §3.2.3 Reliability",
    text:
      "AI systems should be technically secure and should reliably function as intended and described.",
    link:
      "https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach/white-paper#section-3-2-3",
    category: "Reliability",
    document: "DSIT White Paper",
    phase: "model",
    dimension: "reliability",
  },

  "DSIT §3.2.3 Transparency": {
    label: "DSIT §3.2.3 Transparency & Explainability",
    text: "AI systems should be appropriately transparent and explainable.",
    link:
      "https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach/white-paper#section-3-2-3",
    category: "Explainability",
    document: "DSIT White Paper",
    phase: "deployment",
    dimension: "explainability",
  },

  "DSIT §3.2.3 Fairness": {
    label: "DSIT §3.2.3 Fairness",
    text:
      "AI systems should not undermine legal rights, discriminate unfairly against individuals or create unfair market outcomes.",
    link:
      "https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach/white-paper#section-3-2-3",
    category: "Fairness",
    document: "DSIT White Paper",
    phase: "model",
    dimension: "bias",
  },

  "DSIT §3.2.3 Accountability": {
    label: "DSIT §3.2.3 Accountability & Governance",
    text:
      "Governance measures should ensure effective oversight of AI systems, with clear lines of accountability established across the AI life cycle.",
    link:
      "https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach/white-paper#section-3-2-3",
    category: "Accountability",
    document: "DSIT White Paper",
    phase: "deployment",
    dimension: "resilience",
  },

  "DSIT §3.2.3 Contestability": {
    label: "DSIT §3.2.3 Contestability & Redress",
    text:
      "Users, impacted third parties and AI actors should be able to contest an AI decision or outcome that is harmful or creates a material risk of harm.",
    link:
      "https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach/white-paper#section-3-2-3",
    category: "Accountability",
    document: "DSIT White Paper",
    phase: "deployment",
    dimension: "explainability",
  },

  // ── Annex A – Implementation factors for regulators ─────────────────────────
  // Safety, Security & Robustness
  "DSIT AnnexA Cybersecurity": {
    label: "Annex A - Cybersecurity guidance",
    text:
      "Regulators should provide guidance on good cybersecurity practices (e.g. NCSC principles for securing machine-learning models).",
    link:
      "https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach/white-paper#annex-a",
    category: "Security/Resilience",
    document: "DSIT White Paper",
    phase: "deployment",
    dimension: "security",
  },

  "DSIT AnnexA Privacy": {
    label: "Annex A - Privacy safeguards",
    text:
      "Guidance should cover privacy practices such as limiting access to authorised users and safeguarding against bad actors.",
    link:
      "https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach/white-paper#annex-a",
    category: "Privacy",
    document: "DSIT White Paper",
    phase: "data",
    dimension: "privacy",
  },

  "DSIT AnnexA Risk-Management": {
    label: "Annex A - Risk-management framework",
    text:
      "Regulators should refer AI life-cycle actors to an appropriate risk-management framework and require models to be reviewed over time.",
    link:
      "https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach/white-paper#annex-a",
    category: "Robustness",
    document: "DSIT White Paper",
    phase: "model",
    dimension: "robustness",
  },

  "DSIT AnnexA Safety-Standards": {
    label: "Annex A - Safety & robustness standards",
    text:
      "Regulators should consider technical standards (e.g. ISO/IEC 24029-2, 5259 series, TR 5469) to support implementation of risk treatment measures.",
    link:
      "https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach/white-paper#annex-a",
    category: "Robustness",
    document: "DSIT White Paper",
    phase: "model",
    dimension: "robustness",
  },

  // Transparency & Explainability
  "DSIT AnnexA Info-Duties": {
    label: "Annex A - Information duties",
    text:
      "AI actors must provide information on the system’s purpose, data (including training data), logic/process, and accountability for outcomes.",
    link:
      "https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach/white-paper#annex-a",
    category: "Transparency",
    document: "DSIT White Paper",
    phase: "deployment",
    dimension: "explainability",
  },

  "DSIT AnnexA Explainability-Reqs": {
    label: "Annex A - Explainability requirements",
    text:
      "Regulators should set explainability requirements – particularly for higher-risk systems – balancing enforcement needs and system robustness.",
    link:
      "https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach/white-paper#annex-a",
    category: "Explainability",
    document: "DSIT White Paper",
    phase: "deployment",
    dimension: "explainability",
  },

  "DSIT AnnexA Transparency-Standards": {
    label: "Annex A - Transparency standards",
    text:
      "Regulators should reference standards such as IEEE 7001 and ISO/IEC TS 6254 to support transparency and explainability.",
    link:
      "https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach/white-paper#annex-a",
    category: "Explainability",
    document: "DSIT White Paper",
    phase: "deployment",
    dimension: "explainability",
  },

  // Fairness & Bias
  "DSIT AnnexA Fairness-Define": {
    label: "Annex A - Define fairness",
    text:
      "Regulators should interpret and articulate ‘fairness’ for their sector or domain and decide where it is relevant.",
    link:
      "https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach/white-paper#annex-a",
    category: "Fairness",
    document: "DSIT White Paper",
    phase: "model",
    dimension: "bias",
  },

  "DSIT AnnexA Fairness-Governance": {
    label: "Annex A - Fairness governance",
    text:
      "Regulators should design, implement and enforce governance requirements for fairness applicable to regulated entities.",
    link:
      "https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach/white-paper#annex-a",
    category: "Fairness",
    document: "DSIT White Paper",
    phase: "deployment",
    dimension: "bias",
  },

  "DSIT AnnexA Legal-Justification": {
    label: "Annex A - Decision justification",
    text:
      "Where AI decisions have a legal or similarly significant effect, regulators should consider requiring operators to provide appropriate justification to affected parties.",
    link:
      "https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach/white-paper#annex-a",
    category: "Managing Bias",
    document: "DSIT White Paper",
    phase: "deployment",
    dimension: "bias",
  },

  "DSIT AnnexA Vulnerable-Users": {
    label: "Annex A - Protect vulnerable users",
    text:
      "AI systems should comply with rules protecting vulnerable individuals; regulators must consider how AI may alter or intensify user vulnerability.",
    link:
      "https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach/white-paper#annex-a",
    category: "Diversity & Inclusion",
    document: "DSIT White Paper",
    phase: "deployment",
    dimension: "bias",
  },

  "DSIT AnnexA Bias-Standards": {
    label: "Annex A - Bias-mitigation standards",
    text:
      "Regulators should consider standards (e.g. ISO/IEC TR 24027, TR 24368) that address AI fairness and bias-mitigation.",
    link:
      "https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach/white-paper#annex-a",
    category: "Managing Bias",
    document: "DSIT White Paper",
    phase: "model",
    dimension: "bias",
  },

  // Accountability & Governance
  "DSIT AnnexA Accountability-Assign": {
    label: "Annex A - Assign accountability",
    text:
      "Regulators should determine who is accountable for compliance with existing regulation and the AI principles.",
    link:
      "https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach/white-paper#annex-a",
    category: "Accountability",
    document: "DSIT White Paper",
    phase: "deployment",
    dimension: "resilience",
  },

  "DSIT AnnexA Governance-Mechanisms": {
    label: "Annex A - Governance mechanisms",
    text:
      "Regulators should provide guidance on governance mechanisms including risk-management and reporting processes.",
    link:
      "https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach/white-paper#annex-a",
    category: "Data Governance",
    document: "DSIT White Paper",
    phase: "deployment",
    dimension: "resilience",
  },

  "DSIT AnnexA Governance-Standards": {
    label: "Annex A - Governance standards",
    text:
      "Regulators should consider standards (e.g. ISO/IEC 23894, 42001) to maintain accountability within organisations.",
    link:
      "https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach/white-paper#annex-a",
    category: "Data Governance",
    document: "DSIT White Paper",
    phase: "deployment",
    dimension: "resilience",
  },

  // Contestability & Redress
  "DSIT AnnexA Redress-Guidance": {
    label: "Annex A - Routes to redress",
    text:
      "Regulators should create or update guidance on where affected parties can direct complaints or disputes about AI harms.",
    link:
      "https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach/white-paper#annex-a",
    category: "Accountability",
    document: "DSIT White Paper",
    phase: "deployment",
    dimension: "explainability",
  },
};
