import { ReactNode } from "react";

export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white/50 p-8 text-center">
      <div className="font-semibold text-gray-900">{title}</div>
      {body && <div className="mt-1 text-sm text-gray-600">{body}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
