// frontend/app/utils/mapWizardAnswersToApi.ts
export function mapWizardAnswersToApi(answers: Record<string, any>) {
  const title =
    answers["project_title"] ||
    answers["projectName"] ||
    answers["project_name"] ||
    "Untitled Project";

  const description =
    answers["P1"] || // the narrative question
    answers["description"] ||
    answers["project_narrative"] ||
    "";

  let data_types: string[] = [];
  if (Array.isArray(answers["data_types"])) {
    data_types = answers["data_types"];
  } else if (answers["P2"]) {
    data_types = [answers["P2"]]; // sector as a proxy
  }

  const model_type =
    answers["model_type"] ||
    answers["primary_model_family"] ||
    answers["P5"] ||
    "Unknown";

  const deployment_env =
    answers["deployment_env"] ||
    answers["environment"] ||
    answers["P4"] ||
    "Unknown";

  return {
    title,
    description,
    data_types,
    model_type,
    deployment_env,
  };
}
