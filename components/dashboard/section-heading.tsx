type SectionHeadingProps = {
  title: string;
  description?: string;
};

export function SectionHeading({ description, title }: SectionHeadingProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm shadow-slate-950/[0.03]">
      <h2 className="text-base font-semibold tracking-normal text-slate-950">
        {title}
      </h2>
      {description ? (
        <p className="mt-1 max-w-5xl text-sm leading-6 text-slate-600">
          {description}
        </p>
      ) : null}
    </div>
  );
}
