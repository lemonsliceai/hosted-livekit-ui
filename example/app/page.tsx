import { LemonSliceCall } from "@lemonslice/hosted-call";

export default function Home() {
  return (
    <main className="page">
      <LemonSliceCall startCallUrl="/api/lemonslice/start-call" />
    </main>
  );
}
