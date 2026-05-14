import type { ImageryMode } from '../lib/imageryLayers';

export type ImageryOption = {
  value: ImageryMode;
  label: string;
};

type HeaderControlsProps = {
  projectCountText: string;
  imageryNote: string;
  imageryOptions: ImageryOption[];
  selectedImageryMode: ImageryMode;
  is3DEnabled: boolean;
  onImageryChange: (mode: ImageryMode) => void;
  on3DToggle: () => void;
};

export default function HeaderControls({
  projectCountText,
  imageryNote,
  imageryOptions,
  selectedImageryMode,
  is3DEnabled,
  onImageryChange,
  on3DToggle
}: HeaderControlsProps) {
  return (
    <header>
      <div className="brand">
        <h1>What's Being Built in St. Petersburg</h1>
        <div className="meta">
          <span>{projectCountText}</span>
          <span>{imageryNote}</span>
        </div>
      </div>
      <div className="toolbar">
        <select
          aria-label="Imagery layer"
          value={selectedImageryMode}
          onChange={(event) => onImageryChange(event.target.value as ImageryMode)}
        >
          {imageryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={is3DEnabled ? 'active' : undefined}
          aria-pressed={is3DEnabled}
          title="Toggle 3D view"
          onClick={on3DToggle}
        >
          3D
        </button>
      </div>
    </header>
  );
}
