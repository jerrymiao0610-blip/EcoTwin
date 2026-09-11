"use client";

import {
  SPACE_PRESETS,
  SPACE_PRESET_IDS,
  type SpacePreset,
  type SpaceTypeId,
} from "@/lib/spaces/presets";

export type SpaceTypeSelection = SpaceTypeId | "custom";

interface SpaceTypeSelectorProps {
  activeId: SpaceTypeSelection;
  onSelect: (preset: SpacePreset) => void;
}

export function SpaceTypeSelector({
  activeId,
  onSelect,
}: SpaceTypeSelectorProps) {
  return (
    <section className="space-type-selector" aria-label="Space type">
      <div className="space-type-heading">
        <span className="eyebrow">Space type</span>
        <small>Same deterministic engine — different typical operating profiles</small>
      </div>
      <div
        className="space-type-options"
        role="radiogroup"
        aria-label="Choose a space type"
      >
        {SPACE_PRESET_IDS.map((id) => {
          const preset = SPACE_PRESETS[id];
          const active = activeId === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              className={active ? "active" : ""}
              onClick={() => onSelect(preset)}
            >
              <strong>{preset.label}</strong>
              <small>{preset.description}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}
