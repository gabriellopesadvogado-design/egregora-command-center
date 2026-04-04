import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Send, StopCircle, Headphones, Trash2, RotateCcw } from "lucide-react";
import { MediaSendParams } from "./MessageInputContainer";
import { useToast } from "@/hooks/use-toast";

interface AudioRecorderProps {
  onSend: (params: MediaSendParams) => void;
  onCancel: () => void;
}

export const AudioRecorder = ({ onSend, onCancel }: AudioRecorderProps) => {
  const [duration, setDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    startRecording();
    return () => {
      stopRecording();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Detecta o melhor formato suportado pelo browser e aceito pela Meta API
  const getSupportedMimeType = (): string => {
    // Formatos aceitos pela Meta API (em ordem de preferência)
    const preferredTypes = [
      'audio/mp4',           // Chrome/Safari — AAC — aceito pelo Meta ✅
      'audio/ogg;codecs=opus', // Firefox — Opus em OGG — aceito pelo Meta ✅
      'audio/ogg',           // Firefox fallback
      'audio/mpeg',          // MP3 — aceito pelo Meta ✅
    ];

    for (const type of preferredTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log('[AudioRecorder] Using format:', type);
        return type;
      }
    }

    // Fallback — webm (pode falhar no Meta, mas funciona no Z-API)
    console.warn('[AudioRecorder] No preferred format supported, falling back to webm');
    return 'audio/webm;codecs=opus';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Erro ao gravar áudio",
        description: "Não foi possível acessar o microfone. Verifique as permissões.",
        variant: "destructive",
      });
      onCancel();
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const handleStopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    mediaRecorderRef.current.onstop = () => {
      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/mp4';
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setAudioBlob(blob);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setIsPreviewing(true);
    };

    mediaRecorderRef.current.stop();
    stopRecording();
    setIsRecording(false);
  };

  const handleRerecord = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPreviewing(false);
    setDuration(0);
    startRecording();
  };

  const handleConfirmSend = () => {
    if (!audioBlob) return;
    
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Usa o mime type real do blob (mp4, ogg, etc.) — não força webm
      const mimeType = audioBlob.type || 'audio/mp4';
      onSend({
        messageType: 'audio',
        mediaBase64: base64,
        mediaMimetype: mimeType,
      });
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  };

  const handleCancel = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    stopRecording();
    onCancel();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isPreviewing && audioUrl) {
    return (
      <div className="flex flex-col gap-3 py-2">
        <div className="flex items-center gap-2">
          <Headphones className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Áudio gravado</span>
          <span className="text-sm text-muted-foreground">{formatDuration(duration)}</span>
        </div>
        
        <audio 
          src={audioUrl} 
          controls 
          className="w-full h-10 rounded"
        />
        
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            <Trash2 className="w-4 h-4 mr-2" />
            Descartar
          </Button>
          <Button variant="outline" size="sm" onClick={handleRerecord}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Regravar
          </Button>
          <Button size="sm" onClick={handleConfirmSend}>
            <Send className="w-4 h-4 mr-2" />
            Enviar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 py-2">
      <div className="flex items-center gap-2 flex-1">
        <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
        <span className="text-sm font-medium">Gravando...</span>
        <span className="text-sm text-muted-foreground">{formatDuration(duration)}</span>
      </div>
      
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancel}
        >
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button
          size="sm"
          onClick={handleStopRecording}
          disabled={duration < 1}
        >
          <StopCircle className="w-4 h-4 mr-2" />
          Parar
        </Button>
      </div>
    </div>
  );
};
