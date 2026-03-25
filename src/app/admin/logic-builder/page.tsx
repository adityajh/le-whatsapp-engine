import LogicBuilderCanvas from '@/components/logic-builder/Builder';

export const metadata = {
  title: 'Logic Builder | Admin Dashboard',
};

export default function LogicBuilderPage() {
  return (
    <main className="w-full h-[calc(100vh-49px)] bg-gray-50 flex flex-col m-0 p-0 overflow-hidden">
      <LogicBuilderCanvas />
    </main>
  );
}
