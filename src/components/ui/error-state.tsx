type ErrorStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
};

export function ErrorState({ title, description, actionLabel = "重新检查" }: ErrorStateProps) {
  return (
    <section className="rounded-md border border-rose-200 bg-rose-50 px-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-rose-700">错误提示</p>
          <h2 className="mt-1 text-lg font-semibold text-rose-950">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-rose-800">{description}</p>
        </div>
        <button className="rounded-md border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-800 transition hover:bg-rose-100">
          {actionLabel}
        </button>
      </div>
    </section>
  );
}
