import { redirect } from 'next/navigation';

export default function Home() {
  // Always redirect the naked domain or root directly to the Operations Dashboard Console
  redirect('/admin');
}
