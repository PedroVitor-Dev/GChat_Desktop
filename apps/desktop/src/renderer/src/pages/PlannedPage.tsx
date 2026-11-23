import { Card } from '../components/Card';

export function PlannedPage({ phase, items }: { phase: string; items: string[] }) {
  return (
    <Card>
      <p className="text-muted mb-3 text-xs font-medium tracking-wide uppercase">
        Em desenvolvimento · {phase}
      </p>
      <ul className="list-disc space-y-1 pl-5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Card>
  );
}
