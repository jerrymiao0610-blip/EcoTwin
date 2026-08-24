"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  explanationRequestKey,
  isExplanationResultStale,
  type ExplanationApiRequest,
  type ExplanationResult,
} from "@/lib/explanation";
import type { ImpactChange } from "@/lib/impact/types";
import type { ClassroomConfig } from "@/lib/simulation";
import type { ScenarioResponseModel } from "@/lib/workspace/scenarioResponseTypes";
import type { ScenarioWorkspaceModel } from "@/lib/workspace/scenarioTypes";
import type { WorkspaceModel, WorkspacePipelineEvidence } from "@/lib/workspace/types";
import {
  currentExplanationRequest,
  explanationSourceLabel,
  fallbackStatusText,
  scenarioExplanationRequest,
} from "./groundedExplanationPresentation";

type GroundedExplanationProps =
  | {
      mode: "current";
      configuration: Readonly<ClassroomConfig>;
      model: Readonly<WorkspaceModel>;
    }
  | {
      mode: "scenario";
      configuration: Readonly<ClassroomConfig>;
      scenario: Readonly<ScenarioWorkspaceModel>;
      response: Readonly<ScenarioResponseModel>;
    };

interface StoredExplanation {
  requestKey: string;
  result: ExplanationResult;
}

const formatNumber = (value: number, maximumFractionDigits = 1) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);

export function GroundedExplanation(props: GroundedExplanationProps) {
  const request = useMemo<ExplanationApiRequest>(
    () =>
      props.mode === "current"
        ? currentExplanationRequest(props.configuration)
        : scenarioExplanationRequest(props.configuration, props.scenario.id),
    [props],
  );
  const requestKey = explanationRequestKey(request);
  const [stored, setStored] = useState<StoredExplanation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const inFlightKeyRef = useRef<string | null>(null);
  const stale = stored
    ? isExplanationResultStale(stored.requestKey, requestKey)
    : false;
  const result = stored && !stale ? stored.result : null;
  const pipeline = pipelineEvidence(props);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );

  const requestExplanation = async () => {
    if (inFlightKeyRef.current === requestKey) return;

    const controller = new AbortController();
    inFlightKeyRef.current = requestKey;
    controllerRef.current?.abort();
    controllerRef.current = controller;
    setIsLoading(true);
    setRequestError(null);

    try {
      const response = await fetch("/api/explanation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Explanation request failed.");

      const nextResult = (await response.json()) as ExplanationResult;
      setStored({ requestKey, result: nextResult });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setRequestError(
        "EcoTwin could not prepare the evidence summary. Please try again.",
      );
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        inFlightKeyRef.current = null;
        setIsLoading(false);
      }
    }
  };

  return (
    <section
      className={`grounded-explanation ${result ? "has-explanation" : ""}`}
      aria-labelledby="grounded-explanation-title"
    >
      <header className="grounded-explanation-header">
        <div>
          <span className="eyebrow">Grounded explanation</span>
          <h2 id="grounded-explanation-title">
            {props.mode === "current"
              ? "Understand this decision plan"
              : `Understand the ${props.scenario.title} response`}
          </h2>
          <p>
            Numerical results remain grounded in EcoTwin&apos;s simulation and
            optimization pipeline.
          </p>
        </div>
        <button
          type="button"
          className="explain-action"
          onClick={requestExplanation}
          disabled={isLoading}
          aria-describedby="explanation-request-status"
        >
          <span aria-hidden="true">{isLoading ? "◌" : "↗"}</span>
          {isLoading
            ? "Preparing explanation"
            : props.mode === "current"
              ? "Explain this plan"
              : "Explain this response"}
        </button>
      </header>

      <div
        id="explanation-request-status"
        className="explanation-request-status"
        role="status"
        aria-live="polite"
      >
        {isLoading ? "Requesting a grounded explanation." : null}
        {stale ? "Inputs changed. The previous explanation is no longer shown." : null}
        {requestError}
      </div>

      {result ? (
        <div className="grounded-explanation-body">
          <section className="explanation-narrative" aria-labelledby="explanation-summary-title">
            <div className="explanation-source-line">
              <span>{explanationSourceLabel(result.source)}</span>
              <small>{fallbackStatusText(result.source)}</small>
            </div>
            <h3 id="explanation-summary-title">{result.summary}</h3>

            <div className="explanation-reasons">
              <span>Why this changed</span>
              <ul>
                {result.whyItChanged.map((reason, index) => (
                  <li key={`${reason.comparisonBasis.label}-${index}`}>
                    <small>{reason.comparisonBasis.label}</small>
                    <p>{reason.explanation}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="trusted-impact" aria-labelledby="trusted-impact-title">
            <div className="trusted-section-heading">
              <div>
                <span>Trusted modeled impact</span>
                <h3 id="trusted-impact-title">{result.modeledImpact.comparisonBasis.label}</h3>
              </div>
              <small>EcoTwin data</small>
            </div>
            <p>{result.modeledImpact.explanation}</p>
            <div className="trusted-impact-grid">
              <TrustedImpactMetric
                label="Annual energy"
                change={result.modeledImpact.impact.energyKWh.annual}
                unit="kWh"
              />
              <TrustedImpactMetric
                label="Annual CO₂"
                change={result.modeledImpact.impact.co2Kg.annual}
                unit="kg"
              />
              <TrustedImpactMetric
                label="Annual cost"
                change={result.modeledImpact.impact.cost.annual}
                unit="USD"
                prefix="$"
              />
            </div>
            <dl className="explanation-trace">
              <div><dt>Configurations evaluated</dt><dd>{formatNumber(pipeline.optimizerSearchSpaceSize, 0)}</dd></div>
              <div><dt>Controls changed</dt><dd>{pipeline.changedParameterCount}</dd></div>
              <div><dt>Actions retained</dt><dd>{pipeline.recommendationCount}</dd></div>
            </dl>
          </section>

          <section className="explanation-actions" aria-labelledby="explanation-actions-title">
            <div className="trusted-section-heading">
              <div>
                <span>Trusted action context</span>
                <h3 id="explanation-actions-title">EcoTwin recommendations</h3>
              </div>
              <small>Pipeline output</small>
            </div>
            <ol>
              {result.recommendedActions.map(({ recommendation, rationale }) => (
                <li key={recommendation.id}>
                  <strong>{recommendation.action}</strong>
                  {recommendation.parameterChange ? (
                    <div className="trusted-parameter-change">
                      <span>{formatNumber(recommendation.parameterChange.before)} {recommendation.parameterChange.unit}</span>
                      <i aria-hidden="true">→</i>
                      <span>{formatNumber(recommendation.parameterChange.after)} {recommendation.parameterChange.unit}</span>
                    </div>
                  ) : null}
                  <p>{rationale}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="explanation-assumptions" aria-labelledby="explanation-assumptions-title">
            <div className="trusted-section-heading">
              <div>
                <span>Assumptions &amp; limits</span>
                <h3 id="explanation-assumptions-title">Modeled, not certified</h3>
              </div>
              <small>Simulation scope</small>
            </div>
            <ul>
              {result.assumptions.map((assumption) => (
                <li key={assumption.state}>
                  <strong>{stateLabel(assumption.state)}</strong>
                  <p>{assumption.explanation}</p>
                  <small>
                    COP {formatNumber(assumption.values.hvacCop)} · Thermal load {formatNumber(assumption.values.thermalLoadWPerM2PerC, 0)} W/m²·°C · Occupant gain {formatNumber(assumption.values.occupantHeatGainW, 0)} W
                  </small>
                </li>
              ))}
            </ul>
            {result.warnings.length > 0 ? (
              <div className="explanation-warnings" role="note">
                <strong>Evidence note</strong>
                {result.warnings.map((warning) => <span key={warning}>{warning}</span>)}
              </div>
            ) : null}
          </section>

          <footer className="explanation-provenance">
            <span>Numbers: EcoTwin pipeline {result.provenance.pipelineVersion}</span>
            <span>Explanation: {result.source.providerId}</span>
            <span>Evidence schema {result.provenance.evidenceSchemaVersion}</span>
          </footer>
        </div>
      ) : (
        <div className="explanation-ready-state">
          <span aria-hidden="true">EVIDENCE → EXPLANATION</span>
          <p>
            Request a concise interpretation of the existing modeled evidence.
            No controls, recommendations, or numerical results will be generated by AI.
          </p>
        </div>
      )}
    </section>
  );
}

function TrustedImpactMetric({
  label,
  change,
  unit,
  prefix = "",
}: {
  label: string;
  change: Readonly<ImpactChange>;
  unit: string;
  prefix?: string;
}) {
  const magnitude = Math.abs(change.difference);
  const qualifier =
    change.direction === "improvement"
      ? "avoided"
      : change.direction === "degradation"
        ? "additional"
        : "no modeled change";
  const percentage =
    change.percentageChange === null
      ? "Undefined from zero baseline"
      : `${formatNumber(Math.abs(change.percentageChange))}% ${qualifier}`;

  return (
    <div>
      <span>{label}</span>
      <strong>{prefix}{formatNumber(magnitude, unit === "USD" ? 2 : 1)} <small>{unit}</small></strong>
      <em>{percentage}</em>
    </div>
  );
}

function pipelineEvidence(props: GroundedExplanationProps): WorkspacePipelineEvidence {
  return props.mode === "current"
    ? props.model.evidence.pipeline
    : props.response.evidence.pipeline;
}

function stateLabel(state: ExplanationResult["assumptions"][number]["state"]): string {
  if (state === "current") return "Current";
  if (state === "scenario-without-response") return "Scenario without response";
  return "EcoTwin response";
}
