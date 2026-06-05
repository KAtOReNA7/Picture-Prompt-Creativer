type PromptCardProps = {
  title: string;
  style: string;
  score: string;
  createdAt: string;
  summary: string;
};

export function PromptCard({ title, style, score, createdAt, summary }: PromptCardProps) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{summary}</p>
        </div>
        <span className="rounded-md bg-cyan-50 px-3 py-1 text-sm font-medium text-cyan-700">{style}</span>
      </div>
      <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-500">
        <span>评分：{score}</span>
        <span>创建时间：{createdAt}</span>
      </div>
    </article>
  );
}
