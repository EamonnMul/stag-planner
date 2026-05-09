export function Spinner({ size = 5 }: { size?: number }) {
  return (
    <div
      className={`inline-block animate-spin rounded-full border-2 border-gray-200 border-t-brand-600`}
      style={{ width: size * 4, height: size * 4 }}
    />
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner size={8} />
    </div>
  );
}
