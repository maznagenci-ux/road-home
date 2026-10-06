'use client';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'del'] as const;

type Key = (typeof KEYS)[number];

export function TvKeypad({
  onDigit,
  onDelete,
  onClear,
  ariaLabel = 'Number pad',
}: {
  onDigit: (d: string) => void;
  onDelete: () => void;
  onClear: () => void;
  ariaLabel?: string;
}) {
  const press = (key: Key) => {
    if (key === 'del') onDelete();
    else if (key === 'clear') onClear();
    else onDigit(key);
  };

  return (
    <div className="rh-tv-keypad" role="group" aria-label={ariaLabel}>
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          className="rh-tv-key"
          data-tv-focus
          onClick={() => press(key)}
        >
          {key === 'del' ? '⌫' : key === 'clear' ? 'C' : key}
        </button>
      ))}
    </div>
  );
}
