import type {
  ComponentImpact,
  ImpactComponent,
  ImpactReport,
} from "../impact/types";
import type {
  ControllableParameter,
  ParameterChange,
} from "../optimizer/types";
import type {
  DecisionRecommendation,
  RecommendationEvidence,
  RecommendationPriority,
} from "./types";

const PARAMETER_COMPONENT: Readonly<
  Record<ControllableParameter, ImpactComponent>
> = {
  thermostatTemperatureC: "hvac",
  lightingLevelPercent: "lighting",
  devicePowerW: "devices",
};

const COMPONENT_LABEL: Readonly<Record<ImpactComponent, string>> = {
  hvac: "HVAC",
  lighting: "lighting",
  devices: "device",
};

function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    useGrouping: false,
  }).format(value);
}

function getPriority(contributionPercent: number): RecommendationPriority {
  if (contributionPercent >= 50) return "high";
  if (contributionPercent >= 25) return "medium";
  return "low";
}

function createAction(change: ParameterChange): string {
  const before = formatNumber(change.before);
  const after = formatNumber(change.after);

  if (change.parameter === "thermostatTemperatureC") {
    const verb = change.after > change.before ? "Raise" : "Lower";
    return `${verb} the thermostat from ${before} ${change.unit} to ${after} ${change.unit}.`;
  }

  if (change.parameter === "lightingLevelPercent") {
    const verb = change.after < change.before ? "Reduce" : "Increase";
    return `${verb} the lighting level from ${before}${change.unit} to ${after}${change.unit}.`;
  }

  const verb = change.after < change.before ? "Reduce" : "Increase";
  return `${verb} the device power allowance from ${before} ${change.unit} to ${after} ${change.unit}.`;
}

function describeComponentChange(componentImpact: ComponentImpact): string {
  const amount = formatNumber(Math.abs(componentImpact.energyKWh.difference), 3);
  const contribution = formatNumber(componentImpact.contributionPercent, 1);

  if (componentImpact.energyKWh.direction === "improvement") {
    return `Modeled ${COMPONENT_LABEL[componentImpact.component]} energy falls by ${amount} kWh/day, accounting for ${contribution}% of the gross component change.`;
  }
  if (componentImpact.energyKWh.direction === "degradation") {
    return `Modeled ${COMPONENT_LABEL[componentImpact.component]} energy rises by ${amount} kWh/day, accounting for ${contribution}% of the gross component change.`;
  }
  return `Modeled ${COMPONENT_LABEL[componentImpact.component]} energy is unchanged.`;
}

function describeOverallImpact(impactReport: ImpactReport): string {
  const annualEnergy = formatNumber(
    Math.abs(impactReport.energyKWh.annual.difference),
    1,
  );
  const annualCO2 = formatNumber(
    Math.abs(impactReport.co2Kg.annual.difference),
    1,
  );
  const annualCost = formatNumber(
    Math.abs(impactReport.cost.annual.difference),
    2,
  );

  if (impactReport.direction === "improvement") {
    return `Together, the optimized plan saves ${annualEnergy} kWh, ${annualCO2} kg CO2, and $${annualCost} per year in the model.`;
  }
  if (impactReport.direction === "degradation") {
    return `Within the supplied constraints, the plan adds ${annualEnergy} kWh, ${annualCO2} kg CO2, and $${annualCost} per year in the model.`;
  }
  return "The optimized plan has no modeled energy, emissions, or cost change.";
}

function createEvidence(
  componentImpact: ComponentImpact | undefined,
  impactReport: ImpactReport,
): RecommendationEvidence {
  return {
    component: componentImpact?.component ?? null,
    componentDailyEnergyChangeKWh:
      componentImpact?.energyKWh.difference ?? 0,
    componentContributionPercent: componentImpact?.contributionPercent ?? 0,
    annualEnergyChangeKWh: impactReport.energyKWh.annual.difference,
    annualCO2ChangeKg: impactReport.co2Kg.annual.difference,
    annualCostChange: impactReport.cost.annual.difference,
  };
}

/**
 * Turns optimizer changes and impact-analysis evidence into stable, readable
 * actions. It does not recalculate any simulator or optimizer quantity.
 */
export function generateDecisionRecommendations(
  changedParameters: readonly ParameterChange[],
  impactReport: Readonly<ImpactReport>,
): DecisionRecommendation[] {
  if (changedParameters.length === 0) {
    return [
      {
        id: "maintain-current-controls",
        priority: "none",
        action: "Maintain the current classroom control settings.",
        explanation:
          "No control changes improve modeled energy within the supplied usability constraints. " +
          describeOverallImpact(impactReport),
        parameterChange: null,
        evidence: createEvidence(undefined, impactReport),
      },
    ];
  }

  return changedParameters.map((change) => {
    const component = PARAMETER_COMPONENT[change.parameter];
    const componentImpact = impactReport.components.find(
      (candidate) => candidate.component === component,
    );

    if (!componentImpact) {
      throw new Error(`Impact report is missing the ${component} component.`);
    }

    return {
      id: `adjust-${change.parameter}`,
      priority: getPriority(componentImpact.contributionPercent),
      action: createAction(change),
      explanation: `${change.reason} ${describeComponentChange(componentImpact)} ${describeOverallImpact(impactReport)}`,
      parameterChange: { ...change },
      evidence: createEvidence(componentImpact, impactReport),
    };
  });
}
