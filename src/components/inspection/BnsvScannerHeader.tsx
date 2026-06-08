type Props = {
  carLabel: string;
  context?: string;
};

export function BnsvScannerHeader({ carLabel, context = "Vehicle check" }: Props) {
  return (
    <header className="bnsv-scanner__header">
      <div className="bnsv-scanner__brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/bns_logo.png" alt="" className="bnsv-scanner__logo" />
        <span className="bnsv-scanner__name">beefnoodlesoup</span>
      </div>
      <p className="bnsv-scanner__tagline">stirring data into discovery</p>
      <p className="bnsv-scanner__context">
        {context} · {carLabel}
      </p>
    </header>
  );
}
