import { useRef, useState } from "react";
import Button from "../ui/Button";

interface VoiceRecorderProps {
  onChange: (blob: Blob | null) => void;
}

export default function VoiceRecorder({ onChange }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        onChange(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError("Couldn't access your microphone. Check your browser permissions.");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  function reset() {
    setAudioUrl(null);
    onChange(null);
  }

  return (
    <div className="flex flex-col gap-3">
      {!audioUrl && !recording && (
        <Button type="button" variant="ghost" onClick={start}>Record a voice message</Button>
      )}
      {recording && (
        <Button type="button" variant="danger" onClick={stop}>Stop recording</Button>
      )}
      {audioUrl && (
        <div className="flex flex-col gap-2">
          <audio src={audioUrl} controls className="w-full" />
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={start}>Record again</Button>
            <Button type="button" variant="ghost" size="sm" onClick={reset}>Delete</Button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
