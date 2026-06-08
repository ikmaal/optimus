"use client";

import { useEffect, useMemo, useState } from "react";
import { BnsvReviewReadings } from "@/components/inspection/BnsvReviewReadings";
import { BnsvVehicleCheck } from "@/components/inspection/BnsvVehicleCheck";
import { CarparkMap, type CarMarker } from "@/components/map/CarparkMap";
import { fuelPercent } from "@/lib/fleet/fuel";
import type { FleetCar } from "@/lib/fleet/queries";
import { downscaleImage } from "@/lib/image/downscale";
import {
  ALL_CAPTURE_KINDS,
  type CaptureKind,
} from "@/lib/inspection/capture-kinds";
import type { InspectionConfig } from "@/lib/inspection/config";

type Step = "ready" | "navigating" | "arrived" | "capture" | "review" | "done";

type ScanResult = {
  odometerKm: number | null;
  fuelFraction: number | null;
  fuelLitres: number | null;
  fuelTankLitres: number;
  cashcardBalance: number | null;
  cashcardCapturedAt: string | null;
  confidence: string | null;
  notes: string | null;
  photoPaths: string[];
  aiRaw: unknown;
};

type Props = {
  car: FleetCar;
  /** All active cars, used to show every vehicle as a pin on the map. */
  cars?: FleetCar[];
  /** Fired once the booker confirms they've reached the vehicle. */
  onArrived?: (car: FleetCar) => void;
  /** Fired with the updated car after a successful inspection save. */
  onCarUpdated?: (car: FleetCar) => void;
};

export function CheckInFlow({ car, cars, onArrived, onCarUpdated }: Props) {
  const [step, setStep] = useState<Step>("ready");
  const [config, setConfig] = useState<InspectionConfig | null>(null);

  // Capture state — one file + preview per photo slot.
  const [captureFiles, setCaptureFiles] = useState<Partial<Record<CaptureKind, File>>>({});
  const [capturePreviews, setCapturePreviews] = useState<Partial<Record<CaptureKind, string>>>({});
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Review state.
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [odoInput, setOdoInput] = useState("");
  const [litresInput, setLitresInput] = useState("");
  const [cashcardInput, setCashcardInput] = useState("");
  const [cashcardAtInput, setCashcardAtInput] = useState("");
  const [driverName, setDriverName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/inspection/config")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: InspectionConfig | null) => {
        if (!cancelled && data) setConfig(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const urls = Object.values(capturePreviews);
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [capturePreviews]);

  const resetCapture = () => {
    setCaptureFiles({});
    setCapturePreviews({});
    setScan(null);
    setScanError(null);
    setSaveError(null);
    setWarnings([]);
    setOdoInput("");
    setLitresInput("");
    setCashcardInput("");
    setCashcardAtInput("");
  };

  // Reset to the start whenever the chosen car changes.
  const carKey = car.id;
  const [lastCar, setLastCar] = useState(carKey);
  if (lastCar !== carKey) {
    setLastCar(carKey);
    setStep("ready");
    resetCapture();
  }

  const markers: CarMarker[] = useMemo(() => {
    const list = cars && cars.length ? cars : [car];
    return list.map((c) => ({ carId: c.id, label: c.label, lot: c.parkedLot ?? null }));
  }, [cars, car]);

  const lotLabel = car.parkedLot;

  const handlePick = (kind: CaptureKind) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const scaled = await downscaleImage(file);
    const url = URL.createObjectURL(scaled);
    setCaptureFiles((prev) => ({ ...prev, [kind]: scaled }));
    setCapturePreviews((prev) => ({ ...prev, [kind]: url }));
  };

  const allCapturesReady = ALL_CAPTURE_KINDS.every((kind) => Boolean(captureFiles[kind]));

  const runScan = async () => {
    if (!allCapturesReady) return;
    setScanning(true);
    setScanError(null);
    try {
      const form = new FormData();
      for (const kind of ALL_CAPTURE_KINDS) {
        const file = captureFiles[kind];
        if (file) form.append(kind, file);
      }
      const res = await fetch(`/api/cars/${car.id}/inspection/scan`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      const result = data as ScanResult;
      setScan(result);
      setOdoInput(result.odometerKm !== null ? String(result.odometerKm) : "");
      setLitresInput(result.fuelLitres !== null ? String(result.fuelLitres) : "");
      setCashcardInput(result.cashcardBalance !== null ? String(result.cashcardBalance) : "");
      if (result.cashcardCapturedAt) {
        const d = new Date(result.cashcardCapturedAt);
        if (!Number.isNaN(d.getTime())) {
          const pad = (n: number) => String(n).padStart(2, "0");
          setCashcardAtInput(
            `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
          );
        }
      }
      setStep("review");
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const saveInspection = async () => {
    if (!driverName.trim()) {
      setSaveError("Please enter your name.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const odometerKm = odoInput.trim() === "" ? null : Number(odoInput);
      const fuelLitres = litresInput.trim() === "" ? null : Number(litresInput);
      const fuelFraction =
        fuelLitres !== null && scan && scan.fuelTankLitres > 0
          ? Math.min(1, Math.max(0, fuelLitres / scan.fuelTankLitres))
          : (scan?.fuelFraction ?? null);

      const cashcardBalance = cashcardInput.trim() === "" ? null : Number(cashcardInput);
      const cashcardCapturedAt =
        cashcardAtInput.trim() === "" ? null : new Date(cashcardAtInput).toISOString();

      const res = await fetch(`/api/cars/${car.id}/inspection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverName: driverName.trim(),
          odometerKm,
          fuelLitres,
          fuelFraction,
          cashcardBalance,
          cashcardCapturedAt,
          photoPaths: scan?.photoPaths ?? [],
          aiConfidence: scan?.confidence ?? null,
          aiRaw: scan?.aiRaw ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setWarnings(Array.isArray(data.warnings) ? data.warnings : []);
      if (data.car) onCarUpdated?.(data.car as FleetCar);
      setStep("done");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const skipDev = () => {
    setStep("done");
  };

  if (step === "ready") {
    return (
      <div className="space-y-4">
        <div
          className="rounded-[var(--radius-lg)] border px-5 py-6 text-center shadow-[var(--shadow-card)]"
          style={{ borderColor: "var(--border-subtle)", background: "var(--surface-elevated)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>
            Collect your vehicle
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
            {car.label}
          </h2>
          {car.plate ? (
            <p className="mt-1 font-mono text-sm" style={{ color: "var(--text-secondary)" }}>
              {car.plate}
            </p>
          ) : null}

          {lotLabel ? (
            <>
              <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                When you&apos;re ready, check in and Optimus will tell you where the car is parked and guide you there.
              </p>
              <button
                type="button"
                className="mt-5 inline-flex items-center justify-center rounded-[var(--radius-sm)] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: "var(--accent)" }}
                onClick={() => setStep("navigating")}
              >
                Check in
              </button>
            </>
          ) : (
            <div
              className="mt-4 rounded-[var(--radius-md)] border px-4 py-3 text-sm leading-relaxed"
              style={{ borderColor: "var(--border-subtle)", background: "var(--surface-muted)", color: "var(--text-secondary)" }}
            >
              The parking location for {car.label} hasn&apos;t been reported yet. Ask the previous driver to report it,
              or check the basement directly.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === "navigating") {
    return (
      <div className="space-y-4">
        <div
          className="rounded-[var(--radius-lg)] border px-4 py-4"
          style={{ borderColor: "var(--border-subtle)", background: "var(--surface-muted)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Checked in · {car.label}
          </p>
          <p className="mt-1.5 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            Your car is parked at {lotLabel}
          </p>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Enter the basement from the passenger lobby and follow the highlighted route to your vehicle.
          </p>
        </div>

        <CarparkMap
          targetLot={lotLabel}
          showRoute
          interactive
          carMarkers={markers}
          heightClass="h-[min(60vh,460px)]"
        />

        <div className="flex flex-wrap justify-between gap-3">
          <button
            type="button"
            className="rounded-[var(--radius-sm)] px-4 py-2.5 text-sm font-medium transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onClick={() => setStep("ready")}
          >
            Back
          </button>
          <button
            type="button"
            className="rounded-[var(--radius-sm)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)" }}
            onClick={() => {
              setStep("arrived");
              onArrived?.(car);
            }}
          >
            I&apos;m at the vehicle
          </button>
        </div>
      </div>
    );
  }

  if (step === "arrived") {
    return (
      <div className="space-y-4">
        <div
          className="rounded-[var(--radius-lg)] border px-5 py-6 text-center shadow-[var(--shadow-card)]"
          style={{ borderColor: "var(--border-subtle)", background: "var(--surface-elevated)" }}
        >
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "color-mix(in srgb, #16a34a 16%, transparent)", color: "#16a34a" }}
            aria-hidden
          >
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="mt-3 text-xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
            You&apos;ve reached {car.label}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {lotLabel ? `Parked at ${lotLabel}.` : ""} Photograph the dashboard, cashcard, and all four sides of the car to finish checking in.
          </p>

          <button
            type="button"
            className="mt-5 inline-flex items-center justify-center rounded-[var(--radius-sm)] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)" }}
            onClick={() => setStep("capture")}
          >
            Start vehicle check
          </button>
        </div>
      </div>
    );
  }

  if (step === "capture") {
    const notConfigured = config !== null && !config.enabled;
    return (
      <BnsvVehicleCheck
        carLabel={car.label}
        previews={capturePreviews}
        captured={Object.fromEntries(
          ALL_CAPTURE_KINDS.map((kind) => [kind, Boolean(captureFiles[kind])]),
        )}
        scanning={scanning}
        scanError={scanError}
        notConfigured={notConfigured}
        allowSkip={config?.allowSkip ?? false}
        onPick={handlePick}
        onBack={() => setStep("arrived")}
        onScan={runScan}
        onSkip={skipDev}
      />
    );
  }

  if (step === "review") {
    const tank = scan?.fuelTankLitres ?? car.fuelTankLitres;
    const litresNum = litresInput.trim() === "" ? null : Number(litresInput);
    const pct =
      litresNum !== null && Number.isFinite(litresNum)
        ? Math.round(fuelPercent(litresNum, tank))
        : null;
    const lowConfidence =
      typeof scan?.confidence === "string" && scan.confidence.toLowerCase() === "low";
    const odoNum = odoInput.trim() === "" ? null : Number(odoInput);
    const odoDecrease =
      odoNum !== null &&
      car.odometerKm !== null &&
      car.odometerKm !== undefined &&
      odoNum < car.odometerKm;

    return (
      <BnsvReviewReadings
        carLabel={car.label}
        tankLitres={tank}
        fuelPercent={pct}
        lastOdometerKm={car.odometerKm}
        lowConfidence={lowConfidence}
        scanNotes={scan?.notes ?? null}
        odoDecrease={odoDecrease}
        driverName={driverName}
        odoInput={odoInput}
        litresInput={litresInput}
        cashcardInput={cashcardInput}
        cashcardAtInput={cashcardAtInput}
        saveError={saveError}
        saving={saving}
        onDriverNameChange={setDriverName}
        onOdoChange={setOdoInput}
        onLitresChange={setLitresInput}
        onCashcardChange={setCashcardInput}
        onCashcardAtChange={setCashcardAtInput}
        onRetake={() => setStep("capture")}
        onSave={saveInspection}
      />
    );
  }

  // done
  return (
    <div className="space-y-4">
      <div
        className="rounded-[var(--radius-lg)] border px-5 py-6 text-center shadow-[var(--shadow-card)]"
        style={{ borderColor: "var(--border-subtle)", background: "var(--surface-elevated)" }}
      >
        <div
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: "color-mix(in srgb, #16a34a 16%, transparent)", color: "#16a34a" }}
          aria-hidden
        >
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="mt-3 text-xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Check-in complete
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {car.label} is ready for your trip. Drive safely!
        </p>

        {warnings.length ? (
          <div
            className="mt-4 rounded-[var(--radius-md)] border px-4 py-3 text-left text-sm leading-relaxed"
            style={{ borderColor: "#f59e0b", background: "color-mix(in srgb, #f59e0b 12%, transparent)", color: "var(--text-secondary)" }}
          >
            {warnings.map((w) => (
              <p key={w}>{w}</p>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          className="mt-5 rounded-[var(--radius-sm)] px-4 py-2.5 text-sm font-medium transition-colors"
          style={{ color: "var(--text-secondary)" }}
          onClick={() => {
            resetCapture();
            setStep("ready");
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
