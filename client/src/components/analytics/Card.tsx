type Props = {
  title: string;
  children: React.ReactNode;
};

export default function Card({ title, children }: Props) {
  return (
    <div
      style={{
        background: "#0b1020",
        borderRadius: 12,
        padding: 16,
        border: "1px solid #1a2138",
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: "#8ea3c7",
          marginBottom: 12,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {title}
      </div>
      <div style={{ color: "#e1e6ef" }}>{children}</div>
    </div>
  );
}
