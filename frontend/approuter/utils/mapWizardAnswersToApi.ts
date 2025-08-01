// Example mapping -- adjust as needed!
export function mapWizardAnswersToApi(answers: Record<string, any>) {
  return {
    title: answers['project_title'],
    description: answers['P1'],
    data_types: [answers['P2'] || "Unknown"], // sector, for demo
    model_type: answers['P5'] || "Unknown",
    deployment_env: answers['P4'] || "Unknown"
  }
}
