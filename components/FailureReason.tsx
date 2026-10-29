// Shows a friendly failure message with its trailing "(ERROR_CODE 401)" pulled
// out into a small badge, so the fix reads first and the code stays findable.
export default function FailureReason({ reason }: { reason: string }) {
  const match = reason.match(/^(.*?)\s*\(([A-Z_]+(?: \d{3})?)\)\s*$/);
  const message = match ? match[1] : reason;
  const code = match?.[2];
  return (
    <>
      <span>{message}</span>
      {code && (
        <code className="ml-1.5 inline-block whitespace-nowrap rounded-sm bg-berry-bg px-1.5 py-px font-mono text-[0.6875rem] font-medium text-berry-text ring-1 ring-berry/20">
          {code}
        </code>
      )}
    </>
  );
}
