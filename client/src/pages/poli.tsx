import { useEffect, useState } from "react";
import { fetchPoLi } from "@/lib/poli";
import type { PoLiSnapshot } from "@shared/poli";

export default function PoLiPage() {
  const [data, setData] = useState<PoLiSnapshot | null>(null);

  useEffect(() => {
    fetchPoLi({ mock: true }).then(setData).catch(console.error);
  }, []);

  if (!data) return <div>Loading PoLi…</div>;

  return (
    <div className="p-6 space-y-2">
      <h1 className="text-xl font-semibold">PoLi</h1>

      <div>Status: {data.status}</div>
      <div>Score: {data.score}</div>
      <div>Rating: {data.rating}</div>
      <div>Band: {data.band}</div>
      <div>Venue: {data.context.venue}</div>

      <pre className="text-xs opacity-70">
        {JSON.stringify(Object.keys(data.pillars), null, 2)}
      </pre>
    </div>
  );
}