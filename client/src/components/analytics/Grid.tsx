type Props = {
  cols?: number;
  gap?: number;
  children: React.ReactNode;
};

export function Grid({ cols = 3, gap = 12, children }: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap,
      }}
    >
      {children}
    </div>
  );
}
