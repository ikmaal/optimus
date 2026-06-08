"use client";

import { BnsvScannerHeader } from "@/components/inspection/BnsvScannerHeader";
import "./bnsv-scanner.css";

type Props = {
  carLabel: string;
  tankLitres: number;
  fuelPercent: number | null;
  lastOdometerKm: number | null | undefined;
  lowConfidence: boolean;
  scanNotes: string | null;
  odoDecrease: boolean;
  driverName: string;
  odoInput: string;
  litresInput: string;
  cashcardInput: string;
  cashcardAtInput: string;
  saveError: string | null;
  saving: boolean;
  onDriverNameChange: (value: string) => void;
  onOdoChange: (value: string) => void;
  onLitresChange: (value: string) => void;
  onCashcardChange: (value: string) => void;
  onCashcardAtChange: (value: string) => void;
  onRetake: () => void;
  onSave: () => void;
};

export function BnsvReviewReadings({
  carLabel,
  tankLitres,
  fuelPercent,
  lastOdometerKm,
  lowConfidence,
  scanNotes,
  odoDecrease,
  driverName,
  odoInput,
  litresInput,
  cashcardInput,
  cashcardAtInput,
  saveError,
  saving,
  onDriverNameChange,
  onOdoChange,
  onLitresChange,
  onCashcardChange,
  onCashcardAtChange,
  onRetake,
  onSave,
}: Props) {
  const fuelLabel =
    fuelPercent !== null ? `Fuel (litres of ${tankLitres}) · ${fuelPercent}%` : `Fuel (litres of ${tankLitres})`;

  return (
    <div className="bnsv-scanner">
      <BnsvScannerHeader carLabel={carLabel} context="Review readings" />

      <div className="bnsv-scanner__body">
        <p className="bnsv-scanner__intro">
          beefnoodlesoup Vision filled these in from your photos. Check each value and edit if
          needed before saving.
        </p>

        {lowConfidence ? (
          <div className="bnsv-scanner__alert">
            Low confidence reading — please double-check the values.
            {scanNotes ? ` ${scanNotes}` : ""}
          </div>
        ) : null}

        <p className="bnsv-scanner__section-label">Confirm values</p>

        <div className="bnsv-scanner__form">
          <BnsvField label="Your name">
            <input
              type="text"
              value={driverName}
              onChange={(e) => onDriverNameChange(e.target.value)}
              placeholder="Driver name"
              className="bnsv-scanner__input"
            />
          </BnsvField>

          <BnsvField label="Odometer (km)">
            <input
              type="number"
              inputMode="decimal"
              value={odoInput}
              onChange={(e) => onOdoChange(e.target.value)}
              placeholder="e.g. 234304"
              className="bnsv-scanner__input bnsv-scanner__input--mono"
            />
            {odoDecrease && lastOdometerKm != null ? (
              <p className="bnsv-scanner__hint bnsv-scanner__hint--warn">
                Lower than last recorded {lastOdometerKm.toLocaleString()} km
              </p>
            ) : null}
          </BnsvField>

          <BnsvField label={fuelLabel}>
            <input
              type="number"
              inputMode="decimal"
              value={litresInput}
              onChange={(e) => onLitresChange(e.target.value)}
              placeholder="e.g. 54"
              className="bnsv-scanner__input bnsv-scanner__input--mono"
            />
          </BnsvField>

          <BnsvField label="Cashcard balance ($)">
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={cashcardInput}
              onChange={(e) => onCashcardChange(e.target.value)}
              placeholder="e.g. 74.21"
              className="bnsv-scanner__input bnsv-scanner__input--mono"
            />
          </BnsvField>

          <BnsvField label="Cashcard date & time">
            <input
              type="datetime-local"
              value={cashcardAtInput}
              onChange={(e) => onCashcardAtChange(e.target.value)}
              className="bnsv-scanner__input"
            />
          </BnsvField>
        </div>

        {saveError ? <p className="bnsv-scanner__error">{saveError}</p> : null}
      </div>

      <footer className="bnsv-scanner__footer">
        <button type="button" className="bnsv-scanner__back" onClick={onRetake}>
          ← Retake
        </button>
        <div className="bnsv-scanner__actions">
          <button
            type="button"
            className="bnsv-scanner__scan"
            disabled={saving}
            onClick={onSave}
          >
            {saving ? (
              <>
                <span className="bnsv-scanner__spinner" aria-hidden />
                Saving…
              </>
            ) : (
              <>
                <span className="bnsv-scanner__scan-icon" aria-hidden>
                  ✓
                </span>
                Save & finish
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}

function BnsvField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="bnsv-scanner__field">
      <span className="bnsv-scanner__field-label">{label}</span>
      <div className="bnsv-scanner__field-control">{children}</div>
    </label>
  );
}
