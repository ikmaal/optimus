"use client";

import { BnsvScannerHeader } from "@/components/inspection/BnsvScannerHeader";
import {
  EXTERIOR_CAPTURES,
  READING_CAPTURES,
  type CaptureKind,
  type CaptureTile,
} from "@/lib/inspection/capture-kinds";
import "./bnsv-scanner.css";

type Props = {
  carLabel: string;
  previews: Partial<Record<CaptureKind, string | null>>;
  captured: Partial<Record<CaptureKind, boolean>>;
  scanning: boolean;
  scanError: string | null;
  notConfigured: boolean;
  allowSkip: boolean;
  onPick: (kind: CaptureKind) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBack: () => void;
  onScan: () => void;
  onSkip: () => void;
};

function CaptureSection({
  label,
  intro,
  tiles,
  previews,
  captured,
  onPick,
  gridClass,
}: {
  label: string;
  intro?: string;
  tiles: CaptureTile[];
  previews: Partial<Record<CaptureKind, string | null>>;
  captured: Partial<Record<CaptureKind, boolean>>;
  onPick: (kind: CaptureKind) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  gridClass?: string;
}) {
  return (
    <section className="bnsv-scanner__section">
      <p className="bnsv-scanner__section-label">{label}</p>
      {intro ? <p className="bnsv-scanner__section-intro">{intro}</p> : null}
      <div className={`bnsv-scanner__tiles${gridClass ? ` ${gridClass}` : ""}`}>
        {tiles.map((tile) => {
          const preview = previews[tile.kind] ?? null;
          const filled = Boolean(captured[tile.kind]);
          return (
            <label
              key={tile.kind}
              className={`bnsv-scanner__tile${filled ? " bnsv-scanner__tile--filled" : ""}`}
            >
              <div className="bnsv-scanner__tile-head">
                <span className="bnsv-scanner__tile-icon" aria-hidden>
                  {tile.icon}
                </span>
                <span className="bnsv-scanner__tile-text">
                  <span className="bnsv-scanner__tile-title">{tile.title}</span>
                  <span className="bnsv-scanner__tile-desc">{tile.desc}</span>
                </span>
              </div>
              <div className="bnsv-scanner__frame">
                {preview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt={`${tile.title} preview`} />
                    <span className="bnsv-scanner__badge">Ready</span>
                  </>
                ) : (
                  <div className="bnsv-scanner__frame-placeholder">
                    <span>📷</span>
                    <span>Tap to take photo</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={onPick(tile.kind)}
              />
            </label>
          );
        })}
      </div>
    </section>
  );
}

export function BnsvVehicleCheck({
  carLabel,
  previews,
  captured,
  scanning,
  scanError,
  notConfigured,
  allowSkip,
  onPick,
  onBack,
  onScan,
  onSkip,
}: Props) {
  const ready = [...READING_CAPTURES, ...EXTERIOR_CAPTURES].every((tile) => captured[tile.kind]);

  return (
    <div className="bnsv-scanner">
      <BnsvScannerHeader carLabel={carLabel} />

      <div className="bnsv-scanner__body">
        <p className="bnsv-scanner__intro">
          Photograph the instrument cluster, cashcard screen, and all four sides of the vehicle.
          beefnoodlesoup Vision will read odometer, fuel, balance, and timestamp automatically.
        </p>

        <CaptureSection
          label="Capture readings"
          tiles={READING_CAPTURES}
          previews={previews}
          captured={captured}
          onPick={onPick}
        />

        <CaptureSection
          label="Exterior photos"
          intro="Walk around the car and capture each side before continuing."
          tiles={EXTERIOR_CAPTURES}
          previews={previews}
          captured={captured}
          onPick={onPick}
          gridClass="bnsv-scanner__tiles--exterior"
        />

        {notConfigured ? (
          <div className="bnsv-scanner__alert">
            AI scanning isn&apos;t configured in this environment.
            {allowSkip ? " You can skip while developing." : " Please contact an administrator."}
          </div>
        ) : null}

        {scanError ? <p className="bnsv-scanner__error">{scanError}</p> : null}
      </div>

      <footer className="bnsv-scanner__footer">
        <button type="button" className="bnsv-scanner__back" onClick={onBack}>
          ← Back
        </button>
        <div className="bnsv-scanner__actions">
          {notConfigured && allowSkip ? (
            <button type="button" className="bnsv-scanner__skip" onClick={onSkip}>
              Skip (dev)
            </button>
          ) : null}
          <button
            type="button"
            className="bnsv-scanner__scan"
            disabled={!ready || scanning || notConfigured}
            onClick={onScan}
          >
            {scanning ? (
              <>
                <span className="bnsv-scanner__spinner" aria-hidden />
                Reading…
              </>
            ) : (
              <>
                <span className="bnsv-scanner__scan-icon" aria-hidden>
                  ✨
                </span>
                Read with AI
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
