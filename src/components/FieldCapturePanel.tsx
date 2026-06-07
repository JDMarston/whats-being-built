import { useMemo, useState } from 'react';
import type { Project } from '../lib/projects';

type FieldCapturePanelProps = {
  onProjectCreate: (project: Project) => void;
};

type CaptureStatus = 'idle' | 'locating' | 'ready' | 'saving' | 'error';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function readImageAsDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export default function FieldCapturePanel({ onProjectCreate }: FieldCapturePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<CaptureStatus>('idle');
  const [message, setMessage] = useState('Use this while standing at a mystery construction site.');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [name, setName] = useState('Unknown construction site');
  const [notes, setNotes] = useState('Field photo/site visit: early sitework, grading, utility or prep work visible. Needs permit lookup.');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);

  const canSave = useMemo(() => Number.isFinite(lat) && Number.isFinite(lng), [lat, lng]);

  function locateNow() {
    if (!navigator.geolocation) {
      setStatus('error');
      setMessage('This browser does not expose location.');
      return;
    }
    if (!window.isSecureContext) {
      setStatus('error');
      setMessage('Phone GPS needs HTTPS. Use the Netlify URL, not a raw LAN/IP URL, for field capture.');
      return;
    }
    setStatus('locating');
    setMessage('Waiting for GPS permission...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
        setAccuracy(position.coords.accuracy || null);
        setStatus('ready');
        setMessage(`Location captured${position.coords.accuracy ? `, accuracy about ${Math.round(position.coords.accuracy)}m` : ''}.`);
      },
      (error) => {
        setStatus('error');
        setMessage(error.code === error.PERMISSION_DENIED
          ? 'Location was denied. Reload and tap Allow, or check browser location permissions.'
          : 'Could not get location right now. Try again outside or near a window.');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
  }

  async function handlePhotoChange(file: File | undefined) {
    if (!file) return;
    const dataUrl = await readImageAsDataUrl(file);
    setPhotoDataUrl(dataUrl);
    if (dataUrl) {
      setMessage('Photo attached locally. Capture GPS before saving the site.');
    }
  }

  function saveSite() {
    if (!canSave || lat === null || lng === null) {
      setStatus('error');
      setMessage('Capture GPS first so this can become a map pin.');
      return;
    }

    setStatus('saving');
    const capturedAt = todayIsoDate();
    const project: Project = {
      id: `field-${Date.now()}`,
      name: name.trim() || 'Unknown construction site',
      address: 'Field capture - address needs lookup',
      lat,
      lng,
      status: 'under_construction',
      completed_at: null,
      built: null,
      expected_open: null,
      last_verified: capturedAt,
      summary: notes.trim() || 'Field capture from phone. Needs permit lookup.',
      sources: [],
      photoDataUrl,
      capturedAt,
      locationAccuracyMeters: accuracy
    };
    onProjectCreate(project);
    setStatus('ready');
    setMessage('Saved as a local field-capture pin. Next step: permit lookup / identify project.');
    setIsOpen(false);
  }

  return (
    <aside className={`field-capture ${isOpen ? 'is-open' : ''} status-${status}`} aria-label="Field capture">
      <button type="button" className="field-capture-toggle" onClick={() => setIsOpen((current) => !current)}>
        {isOpen ? 'Close capture' : 'Add site here'}
      </button>
      {isOpen ? (
        <div className="field-capture-panel">
          <div className="field-capture-heading">
            <strong>Field capture</strong>
            <span>{message}</span>
          </div>
          <label>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            Notes
            <textarea value={notes} rows={4} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <label>
            Photo
            <input type="file" accept="image/*" capture="environment" onChange={(event) => handlePhotoChange(event.target.files?.[0])} />
          </label>
          {photoDataUrl ? <img className="field-capture-preview" src={photoDataUrl} alt="Attached field capture" /> : null}
          <div className="field-capture-location">
            <span>{lat && lng ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : 'No GPS captured yet'}</span>
            {accuracy ? <span>±{Math.round(accuracy)}m</span> : null}
          </div>
          <div className="field-capture-actions">
            <button type="button" onClick={locateNow} className={status === 'locating' ? 'active' : undefined}>
              {status === 'locating' ? 'Locating...' : 'Use my GPS'}
            </button>
            <button type="button" onClick={saveSite} disabled={!canSave}>Save pin</button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
