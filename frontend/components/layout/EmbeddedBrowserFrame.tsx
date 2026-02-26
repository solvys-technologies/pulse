import { isElectron } from '../../lib/platform';

interface EmbeddedBrowserFrameProps {
  title: string;
  src: string;
  className?: string;
}

export function EmbeddedBrowserFrame({ title, src, className = 'w-full h-full bg-white' }: EmbeddedBrowserFrameProps) {
  if (isElectron()) {
    return (
      <webview
        title={title}
        src={src}
        className={className}
        allowpopups
      />
    );
  }

  return (
    <iframe
      title={title}
      src={src}
      className={className}
      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
    />
  );
}
