'use client';

import { useTransition } from 'react';
import Icon from '@/components/Icon';
import { cikisYap } from '@/lib/panel-eylemler';

export default function CikisButonu() {
  const [bekliyor, basla] = useTransition();
  return (
    <button
      type="button" className="icon-btn" title="Çıkış yap" aria-label="Çıkış yap"
      disabled={bekliyor} onClick={() => basla(() => { void cikisYap(); })}
    >
      <Icon n={bekliyor ? 'clock' : 'key'} s={17} />
    </button>
  );
}
