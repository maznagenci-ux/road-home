import { redirect } from 'next/navigation';

/** Short bookmark URL for Smart TVs: https://zmkh-roadhome.com/tv */
export default function TvShortcutPage() {
  redirect('/ckb/tv');
}
