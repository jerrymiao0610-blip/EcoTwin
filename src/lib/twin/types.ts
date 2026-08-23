/** Fixed identity and physical properties of a classroom twin. */
export interface TwinDefinition {
  readonly id: string;
  readonly name: string;
  readonly physicalProperties: {
    readonly roomAreaM2: number;
    readonly lightingPowerDensityWPerM2: number;
  };
}

/** Values that can be changed directly by a classroom operator. */
export interface TwinState {
  readonly thermostatTemperatureC: number;
  /** 0–100, where 100 means the lighting system is used at full output. */
  readonly lightingLevelPercent: number;
  readonly devicePowerW: number;
  readonly hvacEnabled: boolean;
  readonly lightsEnabled: boolean;
  readonly devicesEnabled: boolean;
}

/** External and operational conditions observed by, but not part of, the twin. */
export interface TwinContext {
  readonly occupants: number;
  readonly outsideTemperatureC: number;
  readonly operatingHoursPerDay: number;
  readonly operatingDaysPerMonth: number;
  readonly operatingDaysPerYear: number;
  readonly electricityPricePerKWh: number;
  readonly carbonIntensityKgPerKWh: number;
}

/** Identifies where the snapshot data came from. */
export interface TwinProvenance {
  readonly source: string;
  readonly sourceVersion?: string;
}

/** Version and provenance information generated for every snapshot. */
export interface TwinSnapshotMetadata {
  readonly schemaVersion: string;
  readonly capturedAt: string;
  readonly provenance: TwinProvenance;
  /** Canonical FNV-1a fingerprint of definition, state, and context. */
  readonly contentHash: string;
}

/** An immutable, point-in-time representation of a classroom digital twin. */
export interface TwinSnapshot {
  readonly definition: TwinDefinition;
  readonly state: TwinState;
  readonly context: TwinContext;
  readonly metadata: TwinSnapshotMetadata;
}

/** Caller-owned data required to create a validated twin snapshot. */
export interface CreateTwinSnapshotInput {
  readonly definition: TwinDefinition;
  readonly state: TwinState;
  readonly context: TwinContext;
  /** ISO 8601 time at which the represented classroom state was captured. */
  readonly capturedAt: string;
  readonly provenance: TwinProvenance;
}
