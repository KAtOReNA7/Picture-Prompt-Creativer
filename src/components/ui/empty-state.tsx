import Link from "next/link";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

export function EmptyState({ title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <section className="rounded-md border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-cyan-50 text-lg font-semibold text-cyan-700">
        空
      </div>
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">{description}</p>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className="mt-5 inline-flex rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700">
          {actionLabel}
        </Link>
      ) : actionLabel ? (
        <button className="mt-5 rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700">
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
