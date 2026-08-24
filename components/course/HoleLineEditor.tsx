import { useCallback, useEffect, useRef, useState } from 'react';
import { WebView } from 'react-native-webview';
import {
  buildHoleEditorHtml,
  holeEditorState,
  parseHoleEditorMessage,
  type CourseAerial,
  type HoleLine,
  type HoleEditorMessage,
} from '@/lib/courseMapHtml';

export interface HoleLineEditorProps {
  course: CourseAerial;
  holes: HoleLine[];
  activeHoleNumber: number;
  onEdit: (message: HoleEditorMessage) => void;
}

/**
 * The document is built once and then fed state, never rebuilt. Handing the
 * WebView a new `source` for every placed point would reload Leaflet and all
 * of its satellite tiles - which is exactly what makes editing feel like the
 * map is reloading under you.
 */
export function HoleLineEditor({ course, holes, activeHoleNumber, onEdit }: HoleLineEditorProps) {
  const webViewRef = useRef<WebView>(null);
  const [source] = useState(() => ({ html: buildHoleEditorHtml({ course, holes, activeHoleNumber }) }));

  const serializedState = JSON.stringify(holeEditorState(holes, activeHoleNumber));
  // The initial document already carries the state it was built with.
  const sentState = useRef(serializedState);
  const [documentReady, setDocumentReady] = useState(false);

  useEffect(() => {
    if (!documentReady) return;
    if (serializedState === sentState.current) return;
    sentState.current = serializedState;
    webViewRef.current?.injectJavaScript(`window.__applyState(${serializedState}); true;`);
  }, [documentReady, serializedState]);

  const handleMessage = useCallback(
    (data: string) => {
      try {
        if (JSON.parse(data)?.type === 'ready') {
          setDocumentReady(true);
          return;
        }
      } catch {
        // Not JSON at all - fall through and let the parser reject it.
      }
      const message = parseHoleEditorMessage(data);
      if (message) onEdit(message);
    },
    [onEdit]
  );

  return (
    <WebView
      ref={webViewRef}
      testID="hole-line-editor"
      originWhitelist={['*']}
      source={source}
      onMessage={(event) => handleMessage(event.nativeEvent.data)}
      style={{ flex: 1 }}
    />
  );
}
