import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Send, StopCircle, Headphones, Trash2, RotateCcw, Loader2 } from "lucide-react";
import { MediaSendParams } from "./MessageInputContainer";
import { useToast } from "@/hooks/use-toast";
// @ts-ignore
const { Mp3Encoder } = require("lamejs");

interface AudioRecorderProps {
  onSend: (params: MediaSendParams) => void;
  onCancel: () => void;
}

export const AudioRecorder = ({ onSend, onCancel }: AudioRecorderProps) => {
  const [duration, setDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
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
  }, []);

  /**
   * Converte um Blob de áudio (qualquer formato) para MP3 usando lamejs.
   * MP3 (audio/mpeg) é aceito pela Meta API.
   */
  const convertToMp3 = async (inputBlob: Blob): Promise<Blob> => {
    // Decodifica o áudio usando Web Audio API
    const arrayBuffer = await inputBlob.arrayBuffer();
    const audioCtx = new AudioContext();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const sampleRate = audioBuffer.sampleRate;
    const numChannels = audioBuffer.numberOfChannels;

    // Pega os samples do canal esquerdo (e direito se estéreo)
    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = numChannels > 1 ? audioBuffer.getChannelData(1) : leftChannel;

    // Inicializa o encoder MP3
    const mp3Encoder = new Mp3Encoder(numChannels, sampleRate, 128);
    const mp3Data: Uint8Array[] = [];
    const blockSize = 1152;

    for (let i = 0; i < leftChannel.length; i += blockSize) {
      const leftChunk = floatTo16Bit(leftChannel.slice(i, i + blockSize));
      const rightChunk = floatTo16Bit(rightChannel.slice(i, i + blockSize));

      const mp3buf = numChannels > 1
        ? mp3Encoder.encodeBuffer(leftChunk, rightChunk)
        : mp3Encoder.encodeBuffer(leftChunk);

      if (mp3buf.length > 0) {
        mp3Data.push(new Uint8Array(mp3buf));
      }
    }

    // Flush final
    const finalBuf = mp3Encoder.flush();
    if (finalBuf.length > 0) {
      mp3Data.push(new Uint8Array(finalBuf));
    }

    await audioCtx.close();
    return new Blob(mp3Data, { type: 'audio/mpeg' });
  };

  /** Converte Float32Array para Int16Array (formato esperado pelo lamejs) */
  const floatTo16Bit = (float32Array: Float32Array): Int16Array => {
    const int16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Chrome só grava webm — não importa, vamos converter para MP3 depois
      const mediaRecorder = new MediaRecorder(stream);
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

    mediaRecorderRef.current.onstop = async () => {
      setIsConverting(true);
      try {
        const rawBlob = new Blob(chunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });

        // Converte para MP3 (aceito pelo Meta API)
        const mp3Blob = await convertToMp3(rawBlob);
        setAudioBlob(mp3Blob);

        const url = URL.createObjectURL(mp3Blob);
        setAudioUrl(url);
        setIsPreviewing(true);
      } catch (error) {
        console.error('[AudioRecorder] Conversion error:', error);
        toast({
          title: "Erro ao processar áudio",
          description: "Não foi possível converter o áudio. Tente novamente.",
          variant: "destructive",
        });
        onCancel();
      } finally {
        setIsConverting(false);
      }
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
      onSend({
        messageType: 'audio',
        mediaBase64: base64,
        mediaMimetype: 'audio/mpeg',
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

  // Estado: convertendo
  if (isConverting) {
    return (
      <div className="flex items-center gap-3 py-2">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Processando áudio...</span>
      </div>
    );
  }

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
