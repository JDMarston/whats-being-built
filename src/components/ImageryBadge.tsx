type ImageryBadgeProps = {
  dateText: string;
  sourceText: string;
};

export default function ImageryBadge({ dateText, sourceText }: ImageryBadgeProps) {
  return (
    <div className="imagery-badge" aria-live="polite">
      <strong>{dateText}</strong>
      <span>{sourceText}</span>
    </div>
  );
}
