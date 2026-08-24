import { useEffect, useRef, useState } from 'react';
import { buildHoleEditorHtml, holeEditorState, parseHoleEditorMessage } from '@/lib/courseMapHtml';
import type { HoleLineEditorProps } from './HoleLineEditor';

export type { HoleLineEditorProps };

/**
 * Web twin of the native editor: the iframe's srcDoc is built once and state
 * is posted into the live document afterwards, so an edit never reloads
 * Leaflet or its tiles.
 */
export function HoleLineEditor({ course, holes, activeHoleNumber, onEdit }: HoleLineEditorProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [srcDoc] = useState(() => buildHoleEditorHtml({ course, holes, activeHoleNumber }));

  const serializedState = JSON.stringify(holeEditorState(holes, activeHoleNumber));
  const sentState = useRef(serializedState);
  const [documentReady, setDocumentReady] = useState(false);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (typeof event.data !== 'string') return;
      try {
        if (JSON.parse(event.data)?.type === 'ready') {
          setDocumentReady(true);
          return;
        }
      } catch {
        // Not JSON - let the parser reject it below.
      }
      const message = parseHoleEditorMessage(event.data);
      if (message) onEdit(message);
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onEdit]);

  useEffect(() => {
    if (!documentReady) return;
    if (serializedState === sentState.current) return;
    sentState.current = serializedState;
    frameRef.current?.contentWindow?.postMessage(
      JSON.stringify({ type: 'state', state: JSON.parse(serializedState) }),
      '*'
    );
  }, [documentReady, serializedState]);

  return (
    <iframe
      ref={frameRef}
      data-testid="hole-line-editor"
      title={`${course.name} hole lines`}
      srcDoc={srcDoc}
      style={{ flex: 1, width: '100%', height: '100%', border: 'none' }}
    />
  );
}
