import { useState } from 'react';
import ConnectionPanel from '../components/ConnectionPanel.tsx';
import { boardConnection, useConnection } from '../connection.ts';

export default function SettingsPage() {
  const connection = useConnection();
  const [address, setAddress] = useState(connection.address);
  const [notice, setNotice] = useState('');
  function connect() {
    try { boardConnection.connect(address); setNotice(''); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Neplatná adresa terče.'); }
  }
  return <div className="page">
    <div className="page-heading"><div><h1>Nastavení</h1><p>Připojení k Autodarts Board Manageru.</p></div></div>
    <ConnectionPanel address={address} state={connection.state} onAddress={setAddress} onConnect={connect} onDisconnect={() => boardConnection.disconnect()} />
    {notice && <div className="notice" role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Zavřít oznámení">×</button></div>}
  </div>;
}
