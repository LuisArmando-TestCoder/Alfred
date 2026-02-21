import AlfredInterface from "./components/AlfredInterface";
import Matrix from "./components/Matrix";

export default function Home() {
  return (
    <main className="relative min-h-screen">
      <Matrix />
      <AlfredInterface />
    </main>
  );
}
