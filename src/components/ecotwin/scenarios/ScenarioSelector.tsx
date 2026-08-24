import type { BuiltInScenarioId } from "@/lib/scenarios/types";
import type { ClassroomConfig } from "@/lib/simulation";
import type { ScenarioWorkspaceModel } from "@/lib/workspace/scenarioTypes";
import type { KeyboardEvent } from "react";

export type ScenarioSelectionId = "current" | BuiltInScenarioId;

interface ScenarioSelectorProps {
  baseline: Readonly<ClassroomConfig>;
  models: readonly ScenarioWorkspaceModel[];
  selectedId: ScenarioSelectionId;
  onChange: (id: ScenarioSelectionId) => void;
}

export function ScenarioSelector({
  baseline,
  models,
  selectedId,
  onChange,
}: ScenarioSelectorProps) {
  const options = [
    {
      id: "current" as const,
      label: "Current",
      detail: `${baseline.outsideTemperatureC} °C · ${baseline.occupants} people`,
    },
    ...models.map((model) => ({
      id: model.id,
      label: model.title,
      detail: model.changes[0]
        ? model.changes[0].explanation
        : "Existing modeled scenario",
    })),
  ];
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
    const backward = event.key === "ArrowLeft" || event.key === "ArrowUp";
    const activate = event.key === "Enter" || event.key === " ";
    if (!forward && !backward && !activate) return;

    event.preventDefault();
    const nextIndex = forward
      ? (index + 1) % options.length
      : backward
        ? (index - 1 + options.length) % options.length
        : index;
    const nextOption = options[nextIndex];
    onChange(nextOption.id);
    requestAnimationFrame(() => {
      document.getElementById(`scenario-${nextOption.id}`)?.focus();
    });
  };

  return (
    <section className="scenario-selector" aria-labelledby="scenario-selector-title">
      <header>
        <span className="mission-index">01</span>
        <div>
          <span className="eyebrow">Operating condition</span>
          <h2 id="scenario-selector-title">What happens if?</h2>
        </div>
      </header>

      <fieldset>
        <legend>Choose the modeled state shown in the digital twin</legend>
        <div className="scenario-options">
          {options.map((option, index) => (
            <div className="scenario-option" key={option.id}>
              <input
                type="radio"
                id={`scenario-${option.id}`}
                name="digital-twin-scenario"
                value={option.id}
                checked={selectedId === option.id}
                onChange={() => onChange(option.id)}
                onKeyDown={(event) => handleKeyDown(event, index)}
              />
              <label htmlFor={`scenario-${option.id}`}>
                <span>{option.id === "current" ? "LIVE BASELINE" : `WHAT-IF ${String(index).padStart(2, "0")}`}</span>
                <strong>{option.label}</strong>
                <small>{option.detail}</small>
                <i aria-hidden="true" />
              </label>
            </div>
          ))}
        </div>
      </fieldset>

      <p className="scenario-selector-note">
        Scenarios model a changed condition without altering your Current controls.
      </p>
    </section>
  );
}
